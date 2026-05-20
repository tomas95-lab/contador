import type { Request, Response } from "express"
import { z } from "zod"

import { roundMoney } from "../arca/date.js"
import { ArcaError } from "../arca/errors.js"
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
} from "../arca/wsfex.js"

export const emitInvoiceSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(4000),
  invoiceType: z.enum(["C", "E"]),
  clientCuit: z.string().trim().min(1).optional(),
  receiverIvaConditionId: z.coerce.number().int().positive().optional(),
  clientName: z.string().trim().min(1).max(200).optional(),
  clientAddress: z.string().trim().min(1).max(300).optional(),
  clientTaxId: z.string().trim().min(1).max(50).optional(),
  destinationCountryCode: z.coerce.number().int().positive().optional(),
  serviceFrom: z.string().optional(),
  serviceTo: z.string().optional(),
  dueDate: z.string().optional(),
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
  wsfe: z.string().default("2,4"),
  wsfex: z.string().default("1,3"),
})

export async function emitInvoice(req: Request, res: Response): Promise<void> {
  const payload = emitInvoiceSchema.parse(req.body)

  const result =
    payload.invoiceType === "C"
      ? await emitFacturaC(payload)
      : await emitFacturaE(payload)

  res.status(201).json(result)
}

export async function getAnnualArcaSummary(
  req: Request,
  res: Response
): Promise<void> {
  const { year } = annualSummarySchema.parse(req.query)
  const results = await Promise.allSettled([
    getFacturaCAnnualSummary(year),
    getFacturaEAnnualSummary(year),
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
      error: error.message,
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
}

export async function getArcaPointOfSales(
  _req: Request,
  res: Response
): Promise<void> {
  const wsfe = await getWsfePointOfSales()

  res.json({
    wsfe,
  })
}

export async function getHistoricalArcaInvoices(
  req: Request,
  res: Response
): Promise<void> {
  const query = historicalQuerySchema.parse(req.query)
  const wsfePoints = parsePointList(query.wsfe)
  const wsfexPoints = parsePointList(query.wsfex)
  const results = await Promise.allSettled([
    ...wsfePoints.map((pointOfSale) =>
      getFacturaCHistoricalSummary(pointOfSale)
    ),
    ...wsfexPoints.map((pointOfSale) =>
      getFacturaEHistoricalSummary(pointOfSale)
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
        amountArs: "amountArs" in invoice ? invoice.amountArs : invoice.amount,
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
}

function formatSummaryError(error: unknown) {
  if (error instanceof ArcaError) {
    return {
      message: error.message,
      details: error.details,
    }
  }

  return {
    message: error instanceof Error ? error.message : "Unknown ARCA error",
    details: null,
  }
}

function parsePointList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}
