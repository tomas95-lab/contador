import type { Request, Response } from "express"
import { z } from "zod"

import { roundMoney } from "../arca/date.js"
import { ArcaError, translateArcaError } from "../arca/errors.js"
import { config } from "../config.js"
import {
  emitFacturaC,
  getFacturaCHistoricalSummary,
  getFacturaCAnnualSummary,
  getWsfePointOfSales,
} from "../arca/wsfe.js"
import {
  emitFacturaE,
  getFacturaEAnnualSummary,
  getFacturaEHistoricalSummary,
  getWsfexDestinationCountries,
} from "../arca/wsfex.js"
import {
  getUserArcaCredentials,
  type UserArcaCredentials,
} from "../lib/arca-credentials.js"
import {
  logAuthorizedInvoiceSaveFailure,
  logInvoiceEmissionAudit,
  sanitizeAuditError,
} from "../lib/audit-log.js"
import { normalizeCuit } from "../lib/cuit.js"
import {
  buildPersistedInvoiceRow,
  persistEmittedInvoice,
} from "../lib/invoice-persistence.js"
import {
  claimPaymentForInvoiceEmission,
  releasePaymentEmissionClaim,
} from "../lib/payment-emission.js"

const invoiceDateSchema = z
  .string()
  .trim()
  .refine(isValidInvoiceDate, {
    message:
      "Ingresá una fecha válida en formato AAAA-MM-DD o AAAAMMDD, dentro de los 12 meses anteriores o posteriores.",
  })

export const emitInvoiceSchema = z
  .object({
    amount: z.coerce.number().positive(),
    description: z.string().trim().min(1).max(4000),
    invoiceType: z.enum(["C", "E"]),
    paymentId: z.string().uuid().optional(),
    payment_id: z.string().uuid().optional(),
    clientCuit: z.string().trim().min(1).optional(),
    receiverIvaConditionId: z.coerce
      .number()
      .int()
      .refine((value) => [1, 4, 5, 6].includes(value), {
        message: "La condición de IVA del receptor no es válida.",
      })
      .optional(),
    clientName: z.string().trim().min(1).max(200).optional(),
    clientAddress: z.string().trim().min(1).max(300).optional(),
    clientTaxId: z.string().trim().min(1).max(50).optional(),
    destinationCountryCode: z.coerce.number().int().positive().optional(),
    currencyId: z.enum(["DOL", "PES"]).default("PES"),
    exchangeRate: z.coerce
      .number()
      .refine(Number.isFinite, "Tipo de cambio inválido.")
      .default(1),
    foreignClientCountryCode: z.string().trim().min(1).max(3).optional(),
    foreignClientTaxId: z.string().trim().min(1).max(80).optional(),
    foreignClientName: z.string().trim().min(1).max(200).optional(),
    foreignClientAddress: z.string().trim().min(1).max(300).optional(),
    foreignClientPlatform: z.string().trim().min(1).max(80).optional(),
    serviceFrom: invoiceDateSchema.optional(),
    serviceTo: invoiceDateSchema.optional(),
    dueDate: invoiceDateSchema.optional(),
  })
  .superRefine((payload, context) => {
    if (payload.invoiceType !== "E") {
      return
    }

    const hasCountry =
      Boolean(payload.foreignClientCountryCode) ||
      Boolean(payload.destinationCountryCode)
    const hasName = Boolean(payload.foreignClientName ?? payload.clientName)

    if (!hasCountry) {
      context.addIssue({
        code: "custom",
        message: "Factura E requiere país del cliente exterior.",
        path: ["foreignClientCountryCode"],
      })
    }

    if (!hasName) {
      context.addIssue({
        code: "custom",
        message: "Factura E requiere nombre del cliente exterior.",
        path: ["foreignClientName"],
      })
    }

    if (
      payload.currencyId === "DOL" &&
      (!Number.isFinite(payload.exchangeRate) || payload.exchangeRate <= 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Factura E en USD requiere un tipo de cambio positivo.",
        path: ["exchangeRate"],
      })
    }
  })
  .superRefine((payload, context) => {
    if (
      payload.serviceFrom &&
      payload.serviceTo &&
      normalizeComparableDate(payload.serviceTo) <
        normalizeComparableDate(payload.serviceFrom)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "La fecha hasta del servicio no puede ser anterior a la fecha desde.",
        path: ["serviceTo"],
      })
    }
  })

const annualSummarySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
})

const historicalQuerySchema = z.object({
  wsfe: z.string().optional(),
  wsfex: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function emitInvoice(req: Request, res: Response): Promise<void> {
  const payload = emitInvoiceSchema.parse(req.body)
  let credentials: UserArcaCredentials | undefined
  let result:
    | Awaited<ReturnType<typeof emitFacturaC>>
    | Awaited<ReturnType<typeof emitFacturaE>>
    | undefined
  let claimedPaymentId: string | undefined

  try {
    credentials = await getRequestArcaCredentials(req)
    claimedPaymentId = payload.paymentId ?? payload.payment_id

    if (claimedPaymentId) {
      await claimPaymentForInvoiceEmission({
        paymentId: claimedPaymentId,
        userId: credentials.userId,
      })
    }

    const invoiceInput = buildEmissionPayload(payload)
    result =
      payload.invoiceType === "C"
        ? await emitFacturaC(credentials, invoiceInput)
        : await emitFacturaE(credentials, invoiceInput)
    const persistedInvoice = buildPersistedInvoiceRow({
      clientName:
        payload.invoiceType === "E"
          ? payload.foreignClientName ?? payload.clientName
          : payload.clientName,
      paymentId: payload.paymentId ?? payload.payment_id,
      receiverCuit: invoiceInput.clientCuit,
      result,
      userId: credentials.userId,
    })

    const savedInvoice = await persistEmittedInvoice(persistedInvoice, {
      receiverCuit: invoiceInput.clientCuit,
    })
    logInvoiceEmissionAudit({
      amount: result.invoice.amount,
      invoiceType: result.invoice.invoiceType,
      number: result.invoice.number,
      pointOfSale: result.invoice.pointOfSale,
      result: "authorized_saved",
      userId: credentials.userId,
    })

    res.status(201).json({
      ...result,
      invoiceRecord: savedInvoice,
    })
  } catch (error) {
    if (!result && credentials && claimedPaymentId) {
      await releasePaymentEmissionClaim({
        paymentId: claimedPaymentId,
        userId: credentials.userId,
      })
    }

    if (result && credentials) {
      logAuthorizedInvoiceSaveFailure({
        cae: result.cae,
        invoiceType: result.invoice.invoiceType,
        number: result.invoice.number,
        pointOfSale: result.invoice.pointOfSale,
        userId: credentials.userId,
      })
      logInvoiceEmissionAudit({
        amount: result.invoice.amount,
        error: sanitizeAuditError(error),
        invoiceType: result.invoice.invoiceType,
        number: result.invoice.number,
        pointOfSale: result.invoice.pointOfSale,
        result: "authorized_local_save_failed",
        userId: credentials.userId,
      })
      res.status(500).json({
        error: `ARCA autorizó la factura ${result.invoice.invoiceType} ${result.invoice.pointOfSale}-${result.invoice.number} con CAE ${result.cae}, pero no se pudo guardar localmente. Contactá soporte antes de volver a emitirla.`,
        details: {
          cae: result.cae,
          invoiceType: result.invoice.invoiceType,
          number: result.invoice.number,
          pointOfSale: result.invoice.pointOfSale,
        },
      })
      return
    }

    logInvoiceEmissionAudit({
      amount: payload.amount,
      error: sanitizeAuditError(error),
      invoiceType: payload.invoiceType,
      pointOfSale:
        payload.invoiceType === "E"
          ? credentials?.wsfexPointOfSale
          : credentials?.wsfePointOfSale,
      result: "error",
      userId: req.userId ?? "unknown",
    })

    if (sendTranslatedArcaError(error, res)) {
      return
    }

    throw error
  }
}

export async function getAnnualArcaSummary(
  req: Request,
  res: Response
): Promise<void> {
  const { year } = annualSummarySchema.parse(req.query)

  try {
    const credentials = await getRequestArcaCredentials(req)
    const results = await Promise.allSettled([
      getFacturaCAnnualSummary(credentials, year),
      getFacturaEAnnualSummary(credentials, year),
    ])
    const summaries = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => formatSummaryError(result.reason))

    if (summaries.length === 0 && errors.length > 0) {
      const [error] = errors

      res.status(502).json({
        ...toClientArcaError(error),
        errors,
      })
      return
    }

    res.json({
      year,
      total: roundMoney(
        summaries.reduce((total, summary) => total + summary.total, 0)
      ),
      count: summaries.reduce((total, summary) => total + summary.count, 0),
      pointOfSale: null,
      invoiceTypes: summaries.map((summary) => summary.invoiceType),
      summaries,
      errors,
    })
  } catch (error) {
    if (sendTranslatedArcaError(error, res)) {
      return
    }

    throw error
  }
}

export async function getArcaPointOfSales(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const credentials = await getRequestArcaCredentials(req)
    const wsfe = await getWsfePointOfSales(credentials)

    res.json({
      wsfe,
    })
  } catch (error) {
    if (sendTranslatedArcaError(error, res)) {
      return
    }

    throw error
  }
}

export async function getArcaDestinationCountries(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const credentials = await getRequestArcaCredentials(req)
    const countries = await getWsfexDestinationCountries(credentials)

    res.json({ countries })
  } catch (error) {
    if (sendTranslatedArcaError(error, res)) {
      return
    }

    throw error
  }
}

export async function getHistoricalArcaInvoices(
  req: Request,
  res: Response
): Promise<void> {
  const query = historicalQuerySchema.parse(req.query)

  try {
    const credentials = await getRequestArcaCredentials(req)
    const pagination = {
      limit: Math.min(
        query.limit ?? config.arca.historical.pageSize,
        config.arca.historical.maxInvoicesPerQuery
      ),
      offset: query.offset ?? 0,
    }
    const wsfePoints = parsePointList(
      query.wsfe ?? String(credentials.wsfePointOfSale)
    )
    const wsfexPoints = parsePointList(
      query.wsfex ?? String(credentials.wsfexPointOfSale)
    )
    const results = await Promise.allSettled([
      ...wsfePoints.map((pointOfSale) =>
        getFacturaCHistoricalSummary(credentials, pointOfSale, pagination)
      ),
      ...wsfexPoints.map((pointOfSale) =>
        getFacturaEHistoricalSummary(credentials, pointOfSale, pagination)
      ),
    ])
    const summaries = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => formatSummaryError(result.reason))
    const invoices = summaries
      .flatMap((summary) =>
        summary.invoices.map((invoice) => ({
          source: summary.source,
          invoiceType: summary.invoiceType,
          invoiceTypeCode: summary.invoiceTypeCode,
          pointOfSale: summary.pointOfSale,
          number: invoice.number,
          formattedNumber: `${String(summary.pointOfSale).padStart(
            4,
            "0"
          )}-${String(invoice.number).padStart(8, "0")}`,
          date: invoice.date,
          amount: invoice.amount,
          amountArs:
            "amountArs" in invoice ? invoice.amountArs : invoice.amount,
          currencyId: "currencyId" in invoice ? invoice.currencyId : "PES",
          currencyRate: "currencyRate" in invoice ? invoice.currencyRate : 1,
          cae: invoice.authorizationCode,
          result: invoice.result,
        }))
      )
      .sort((a, b) => {
        const dateOrder = (a.date ?? "").localeCompare(b.date ?? "")

        if (dateOrder !== 0) {
          return dateOrder
        }

        if (a.pointOfSale !== b.pointOfSale) {
          return a.pointOfSale - b.pointOfSale
        }

        return a.number - b.number
      })

    res.json({
      pagination,
      queriedPoints: {
        wsfe: wsfePoints,
        wsfex: wsfexPoints,
      },
      total: roundMoney(
        invoices.reduce((total, invoice) => total + invoice.amountArs, 0)
      ),
      count: invoices.length,
      summaries: summaries.map((summary) => ({
        source: summary.source,
        invoiceType: summary.invoiceType,
        invoiceTypeCode: summary.invoiceTypeCode,
        pointOfSale: summary.pointOfSale,
        total: summary.total,
        count: summary.count,
        lastAuthorizedNumber: summary.lastAuthorizedNumber,
        queried: summary.queried,
      })),
      invoices,
      errors,
    })
  } catch (error) {
    if (sendTranslatedArcaError(error, res)) {
      return
    }

    throw error
  }
}

function formatSummaryError(error: unknown) {
  const translated = translateArcaError(getRawArcaError(error))

  return {
    message: translated.title,
    explanation: translated.explanation,
    action: translated.action,
    severity: translated.severity,
    ...(includeRawArcaError() ? { raw: translated.raw } : {}),
  }
}

function buildEmissionPayload(payload: z.infer<typeof emitInvoiceSchema>) {
  const normalizedClientCuit = payload.clientCuit
    ? normalizeCuit(payload.clientCuit)
    : undefined
  const normalizedPayload = {
    ...payload,
    clientCuit: normalizedClientCuit,
    exchangeRate: payload.currencyId === "DOL" ? payload.exchangeRate : 1,
  }

  if (payload.invoiceType !== "E") {
    return normalizedPayload
  }

  const foreignClientName =
    normalizedPayload.foreignClientName ?? normalizedPayload.clientName
  const foreignClientCountryCode =
    normalizedPayload.foreignClientCountryCode ??
    (normalizedPayload.destinationCountryCode
      ? String(normalizedPayload.destinationCountryCode)
      : undefined)

  return {
    ...normalizedPayload,
    clientAddress:
      normalizedPayload.foreignClientAddress ?? normalizedPayload.clientAddress,
    clientName: foreignClientName,
    clientTaxId:
      normalizedPayload.foreignClientTaxId ?? normalizedPayload.clientTaxId,
    destinationCountryCode: foreignClientCountryCode
      ? Number(foreignClientCountryCode)
      : normalizedPayload.destinationCountryCode,
    foreignClientData:
      foreignClientName && foreignClientCountryCode
        ? {
            address:
              normalizedPayload.foreignClientAddress ??
              normalizedPayload.clientAddress,
            countryCode: foreignClientCountryCode,
            name: foreignClientName,
            taxId:
              normalizedPayload.foreignClientTaxId ??
              normalizedPayload.clientTaxId,
          }
        : undefined,
  }
}

async function getRequestArcaCredentials(
  req: Request
): Promise<UserArcaCredentials> {
  if (!req.userId) {
    throw new ArcaError("Unauthorized", 401)
  }

  return getUserArcaCredentials(req.userId)
}

function parsePointList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function sendTranslatedArcaError(error: unknown, res: Response) {
  if (!(error instanceof ArcaError) || error.statusCode !== 502) {
    return false
  }

  res
    .status(error.statusCode)
    .json(toClientArcaError(formatSummaryError(error)))
  return true
}

function toClientArcaError(error: ReturnType<typeof formatSummaryError>) {
  return {
    error: error.message,
    explanation: error.explanation,
    action: error.action,
    severity: error.severity,
    ...("raw" in error ? { raw: error.raw } : {}),
  }
}

function getRawArcaError(error: unknown): string {
  if (error instanceof ArcaError) {
    return [error.message, extractDetailText(error.details)]
      .filter(Boolean)
      .join(" ")
  }

  if (error instanceof Error) {
    return error.message
  }

  return (
    extractDetailText(error) ||
    "Ocurrió un error inesperado. Intentá de nuevo o contactá soporte desde Ayuda."
  )
}

function extractDetailText(value: unknown): string {
  if (value == null) {
    return ""
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(extractDetailText).filter(Boolean).join(" ")
  }

  if (typeof value === "object") {
    return Object.values(value).map(extractDetailText).filter(Boolean).join(" ")
  }

  return ""
}

function includeRawArcaError() {
  return process.env.NODE_ENV !== "production"
}

function isValidInvoiceDate(value: string) {
  const timestamp = parseInvoiceDate(value)

  if (timestamp === null) {
    return false
  }

  const today = new Date()
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  )
  const oneYearMs = 366 * 24 * 60 * 60 * 1000

  return timestamp >= todayUtc - oneYearMs && timestamp <= todayUtc + oneYearMs
}

function parseInvoiceDate(value: string) {
  const normalized = normalizeComparableDate(value)

  if (!/^\d{8}$/.test(normalized)) {
    return null
  }

  const year = Number(normalized.slice(0, 4))
  const month = Number(normalized.slice(4, 6))
  const day = Number(normalized.slice(6, 8))
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return timestamp
}

function normalizeComparableDate(value: string) {
  return value.replaceAll("-", "")
}
