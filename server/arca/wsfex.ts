import { config } from "../config.js"
import type { UserArcaCredentials } from "../lib/arca-credentials.js"
import { fromArcaDate, roundMoney, toArcaDate } from "./date.js"
import { ArcaError, nonZeroCode } from "./errors.js"
import { record } from "./objects.js"
import { getSoapClient } from "./soap.js"
import { withArcaRequestTimeout } from "./timeout.js"
import { getAccessTicket } from "./wsaa.js"

const FACTURA_E = 19
const TIPO_EXPORTACION_SERVICIOS = 2

export interface WsfexInvoiceInput {
  amount: number
  description: string
  currencyId?: "DOL" | "PES" | string
  exchangeRate?: number
  clientCuit?: string
  clientName?: string
  clientAddress?: string
  clientTaxId?: string
  destinationCountryCode?: number
  foreignClientData?: {
    countryCode: string
    taxId?: string
    name: string
    address?: string
  }
  serviceFrom?: string
  serviceTo?: string
  dueDate?: string
}

export interface EmittedWsfexInvoice {
  cae: string
  caeExpiresAt: string | null
  result: string
  invoice: {
    invoiceType: "E"
    invoiceTypeCode: number
    pointOfSale: number
    number: number
    date: string | null
    amount: number
    description: string
  }
  arca: unknown
}

export interface WsfexInvoiceSummaryItem {
  number: number
  date: string | null
  amount: number
  currencyId: string
  currencyRate: number
  amountArs: number
  authorizationCode: string | null
  result: string | null
}

export interface WsfexAnnualSummary {
  source: "wsfex"
  invoiceType: "E"
  invoiceTypeCode: number
  pointOfSale: number
  year: number
  total: number
  count: number
  lastAuthorizedNumber: number
  queried: number
  truncated: boolean
  invoices: WsfexInvoiceSummaryItem[]
}

export interface WsfexHistoricalSummary {
  source: "wsfex"
  invoiceType: "E"
  invoiceTypeCode: number
  pointOfSale: number
  total: number
  count: number
  lastAuthorizedNumber: number
  queried: number
  invoices: WsfexInvoiceSummaryItem[]
}

export type WsfexHistoricalQueryOptions = {
  limit?: number
  offset?: number
}

interface WsfexSoapClient {
  FEXGetLast_IDAsync(args: unknown): Promise<[unknown]>
  FEXGetLast_CMPAsync(args: unknown): Promise<[unknown]>
  FEXAuthorizeAsync(args: unknown): Promise<[unknown]>
  FEXGetCMPAsync(args: unknown): Promise<[unknown]>
}

interface ArcaAuth {
  Token: string
  Sign: string
  Cuit: number
}

function auth(
  credentials: UserArcaCredentials,
  token: string,
  sign: string
): ArcaAuth {
  return {
    Token: token,
    Sign: sign,
    Cuit: Number(credentials.cuit),
  }
}

function ensureNoFexError(result: unknown, operation: string): void {
  const error = record(result).FEXErr
  const errorRecord = record(error)

  if (error && nonZeroCode(errorRecord.ErrCode)) {
    throw new ArcaError("ARCA rechazó la operación.", 502, errorRecord)
  }
}

async function getNextRequestId(
  client: WsfexSoapClient,
  authData: ArcaAuth
): Promise<number> {
  const [response] = await withArcaRequestTimeout(
    "FEXGetLast_ID",
    client.FEXGetLast_IDAsync({ Auth: authData })
  )
  const result = record(response).FEXGetLast_IDResult
  ensureNoFexError(result, "FEXGetLast_ID")

  return Number(record(record(result).FEXResultGet).Id ?? 0) + 1
}

async function getNextInvoiceNumber(
  client: WsfexSoapClient,
  authData: ArcaAuth,
  pointOfSale: number
): Promise<number> {
  return (
    (await getLastAuthorizedInvoiceNumber(client, authData, pointOfSale)) + 1
  )
}

async function getLastAuthorizedInvoiceNumber(
  client: WsfexSoapClient,
  authData: ArcaAuth,
  pointOfSale: number
): Promise<number> {
  const [response] = await withArcaRequestTimeout(
    "FEXGetLast_CMP",
    client.FEXGetLast_CMPAsync({
      Auth: {
        ...authData,
        Pto_venta: pointOfSale,
        Cbte_Tipo: FACTURA_E,
      },
    })
  )

  const result = record(response).FEXGetLast_CMPResult
  ensureNoFexError(result, "FEXGetLast_CMP")

  return Number(record(record(result).FEXResult_LastCMP).Cbte_nro ?? 0)
}

function buildExportClient(input: WsfexInvoiceInput) {
  const foreignClient = input.foreignClientData
  const destinationCountryCode =
    parseCountryCode(foreignClient?.countryCode) ??
    input.destinationCountryCode ??
    config.arca.exportDefaults.destinationCountryCode

  if (!destinationCountryCode) {
    throw new ArcaError(
      "Factura E requires ARCA_EXPORT_DST_CMP or destinationCountryCode.",
      400
    )
  }

  const clientCountryCuit =
    input.clientCuit?.replace(/\D/g, "") ??
    config.arca.exportDefaults.clientCountryCuit
  const clientTaxId =
    foreignClient?.taxId ??
    input.clientTaxId ??
    config.arca.exportDefaults.clientTaxId ??
    "NO_DECLARADO"

  return {
    destinationCountryCode,
    clientCountryCuit,
    clientTaxId,
    clientName:
      foreignClient?.name ??
      input.clientName ??
      config.arca.exportDefaults.clientName,
    clientAddress:
      foreignClient?.address ??
      input.clientAddress ??
      config.arca.exportDefaults.clientAddress,
  }
}

export async function getFacturaEAnnualSummary(
  credentials: UserArcaCredentials,
  year = new Date().getFullYear()
): Promise<WsfexAnnualSummary> {
  const ticket = await getAccessTicket(credentials, "wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const pointOfSale = credentials.wsfexPointOfSale
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const invoices: WsfexInvoiceSummaryItem[] = []
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const maxQueried = Math.max(1, config.arca.historical.maxInvoicesPerQuery)
  let queried = 0
  let reachedPeriodStart = false

  for (
    let number = lastAuthorizedNumber;
    number >= 1 && queried < maxQueried;
    number -= 1
  ) {
    const invoice = await consultFacturaE(client, authData, pointOfSale, number)
    queried += 1

    if (!invoice.date) {
      continue
    }

    if (invoice.date >= startDate && invoice.date <= endDate) {
      invoices.push(invoice)
      continue
    }

    if (invoice.date < startDate) {
      reachedPeriodStart = true
      break
    }
  }

  invoices.reverse()

  return {
    source: "wsfex",
    invoiceType: "E",
    invoiceTypeCode: FACTURA_E,
    pointOfSale,
    year,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amountArs, 0)
    ),
    count: invoices.length,
    lastAuthorizedNumber,
    queried,
    truncated:
      !reachedPeriodStart &&
      lastAuthorizedNumber > queried &&
      queried >= maxQueried,
    invoices,
  }
}

export async function getFacturaEHistoricalSummary(
  credentials: UserArcaCredentials,
  pointOfSale: number,
  options: WsfexHistoricalQueryOptions = {}
): Promise<WsfexHistoricalSummary> {
  const ticket = await getAccessTicket(credentials, "wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const { fromNumber, toNumber } = getHistoricalWindow(
    lastAuthorizedNumber,
    options
  )
  const invoices: WsfexInvoiceSummaryItem[] = []

  for (let number = fromNumber; number <= toNumber; number += 1) {
    invoices.push(await consultFacturaE(client, authData, pointOfSale, number))
  }

  return {
    source: "wsfex",
    invoiceType: "E",
    invoiceTypeCode: FACTURA_E,
    pointOfSale,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amountArs, 0)
    ),
    count: invoices.length,
    lastAuthorizedNumber,
    queried: invoices.length,
    invoices,
  }
}

async function consultFacturaE(
  client: WsfexSoapClient,
  authData: ArcaAuth,
  pointOfSale: number,
  number: number
): Promise<WsfexInvoiceSummaryItem> {
  const [response] = await withArcaRequestTimeout(
    "FEXGetCMP",
    client.FEXGetCMPAsync({
      Auth: authData,
      Cmp: {
        Cbte_Tipo: FACTURA_E,
        Punto_vta: pointOfSale,
        Cbte_nro: number,
      },
    })
  )
  const result = record(response).FEXGetCMPResult
  ensureNoFexError(result, "FEXGetCMP")

  const detail = record(result).FEXResultGet
  const detailRecord = record(detail)
  const amount = roundMoney(Number(detailRecord.Imp_total ?? 0))
  const currencyId = String(detailRecord.Moneda_Id ?? "PES")
  const currencyRate = Number(detailRecord.Moneda_ctz ?? 1)

  return {
    number: Number(detailRecord.Cbte_nro ?? number),
    date: fromArcaDate(String(detailRecord.Fecha_cbte ?? "")),
    amount,
    currencyId,
    currencyRate,
    amountArs: roundMoney(
      amount * (Number.isFinite(currencyRate) ? currencyRate : 1)
    ),
    authorizationCode: detailRecord.Cae ? String(detailRecord.Cae) : null,
    result: detailRecord.Resultado ? String(detailRecord.Resultado) : null,
  }
}

export async function emitFacturaE(
  credentials: UserArcaCredentials,
  input: WsfexInvoiceInput
): Promise<EmittedWsfexInvoice> {
  const amount = roundMoney(input.amount)
  const currencyId = normalizeCurrencyId(input.currencyId)
  const exchangeRate =
    currencyId === "DOL" ? Number(input.exchangeRate ?? 0) : 1

  if (
    currencyId === "DOL" &&
    (!Number.isFinite(exchangeRate) || exchangeRate <= 0)
  ) {
    throw new ArcaError(
      "Factura E en USD requiere un tipo de cambio positivo.",
      400
    )
  }

  const today = toArcaDate()
  const exportClient = buildExportClient(input)
  const ticket = await getAccessTicket(credentials, "wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const pointOfSale = credentials.wsfexPointOfSale
  const [requestId, invoiceNumber] = await Promise.all([
    getNextRequestId(client, authData),
    getNextInvoiceNumber(client, authData, pointOfSale),
  ])

  const cmp: Record<string, unknown> = {
    Id: requestId,
    Fecha_cbte: today,
    Cbte_Tipo: FACTURA_E,
    Punto_vta: pointOfSale,
    Cbte_nro: invoiceNumber,
    Tipo_expo: TIPO_EXPORTACION_SERVICIOS,
    Permiso_existente: "",
    Dst_cmp: exportClient.destinationCountryCode,
    Cliente: exportClient.clientName,
    Domicilio_cliente: exportClient.clientAddress,
    Moneda_Id: currencyId,
    Moneda_ctz: currencyId === "DOL" ? exchangeRate : 1,
    Obs_comerciales: input.description,
    Imp_total: amount,
    Forma_pago: "Transferencia",
    Idioma_cbte: config.arca.exportDefaults.language,
    Items: {
      Item: [
        {
          Pro_codigo: "SERV",
          Pro_ds: input.description,
          Pro_qty: 1,
          Pro_umed: config.arca.exportDefaults.unitOfMeasure,
          Pro_precio_uni: amount,
          Pro_bonificacion: 0,
          Pro_total_item: amount,
        },
      ],
    },
    Fecha_pago: toArcaDate(input.dueDate ?? today),
  }

  if (exportClient.clientCountryCuit) {
    cmp.Cuit_pais_cliente = Number(exportClient.clientCountryCuit)
  } else {
    cmp.ID_impositivo = exportClient.clientTaxId
  }

  const [response] = await withArcaRequestTimeout(
    "FEXAuthorize",
    client.FEXAuthorizeAsync({
      Auth: authData,
      Cmp: cmp,
    })
  )

  const result = record(response).FEXAuthorizeResult
  ensureNoFexError(result, "FEXAuthorize")

  const resultRecord = record(result)
  const authResult = record(resultRecord.FEXResultAuth)
  if (!authResult.Cae) {
    throw new ArcaError("ARCA no aprobó la factura.", 502, {
      result,
      observations: authResult.Motivos_Obs,
    })
  }

  return {
    cae: String(authResult.Cae),
    caeExpiresAt: fromArcaDate(String(authResult.Fch_venc_Cae ?? "")),
    result: String(authResult.Resultado ?? ""),
    invoice: {
      invoiceType: "E",
      invoiceTypeCode: FACTURA_E,
      pointOfSale,
      number: Number(authResult.Cbte_nro ?? invoiceNumber),
      date: fromArcaDate(String(authResult.Fch_cbte ?? today)),
      amount,
      description: input.description,
    },
    arca: {
      authorization: authResult,
      error: resultRecord.FEXErr,
      events: resultRecord.FEXEvents,
    },
  }
}

function normalizeCurrencyId(value: string | undefined) {
  return value === "DOL" ? "DOL" : "PES"
}

function parseCountryCode(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value.replace(/\D/g, ""))

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function getHistoricalWindow(
  lastAuthorizedNumber: number,
  options: WsfexHistoricalQueryOptions
) {
  const offset = Math.max(0, options.offset ?? 0)
  const requestedLimit = options.limit ?? config.arca.historical.pageSize
  const limit = Math.min(
    Math.max(1, requestedLimit),
    Math.max(1, config.arca.historical.maxInvoicesPerQuery)
  )
  const toNumber = lastAuthorizedNumber - offset

  if (toNumber < 1) {
    return {
      fromNumber: 1,
      toNumber: 0,
    }
  }

  return {
    fromNumber: Math.max(1, toNumber - limit + 1),
    toNumber,
  }
}
