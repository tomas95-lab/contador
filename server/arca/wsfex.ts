import { config } from "../config.js"
import { fromArcaDate, roundMoney, toArcaDate } from "./date.js"
import { ArcaError, nonZeroCode } from "./errors.js"
import { record } from "./objects.js"
import { getSoapClient } from "./soap.js"
import { getAccessTicket } from "./wsaa.js"

const FACTURA_E = 19
const TIPO_EXPORTACION_SERVICIOS = 2

export interface WsfexInvoiceInput {
  amount: number
  description: string
  clientCuit?: string
  clientName?: string
  clientAddress?: string
  clientTaxId?: string
  destinationCountryCode?: number
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

function auth(token: string, sign: string): ArcaAuth {
  return {
    Token: token,
    Sign: sign,
    Cuit: Number(config.arca.cuit),
  }
}

function ensureNoFexError(result: unknown, operation: string): void {
  const error = record(result).FEXErr
  const errorRecord = record(error)

  if (error && nonZeroCode(errorRecord.ErrCode)) {
    throw new ArcaError(`${operation} was rejected by WSFEX.`, 502, errorRecord)
  }
}

async function getNextRequestId(
  client: WsfexSoapClient,
  authData: ArcaAuth
): Promise<number> {
  const [response] = await client.FEXGetLast_IDAsync({ Auth: authData })
  const result = record(response).FEXGetLast_IDResult
  ensureNoFexError(result, "FEXGetLast_ID")

  return Number(record(record(result).FEXResultGet).Id ?? 0) + 1
}

async function getNextInvoiceNumber(
  client: WsfexSoapClient,
  authData: ArcaAuth
): Promise<number> {
  return (await getLastAuthorizedInvoiceNumber(client, authData)) + 1
}

async function getLastAuthorizedInvoiceNumber(
  client: WsfexSoapClient,
  authData: ArcaAuth,
  pointOfSale = config.arca.wsfexPointOfSale
): Promise<number> {
  const [response] = await client.FEXGetLast_CMPAsync({
    Auth: {
      ...authData,
      Pto_venta: pointOfSale,
      Cbte_Tipo: FACTURA_E,
    },
  })

  const result = record(response).FEXGetLast_CMPResult
  ensureNoFexError(result, "FEXGetLast_CMP")

  return Number(record(record(result).FEXResult_LastCMP).Cbte_nro ?? 0)
}

function buildExportClient(input: WsfexInvoiceInput) {
  const destinationCountryCode =
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
    input.clientTaxId ?? config.arca.exportDefaults.clientTaxId

  if (!clientCountryCuit && !clientTaxId) {
    throw new ArcaError(
      "Factura E requires clientCuit, ARCA_EXPORT_CLIENT_COUNTRY_CUIT, clientTaxId, or ARCA_EXPORT_CLIENT_TAX_ID.",
      400
    )
  }

  return {
    destinationCountryCode,
    clientCountryCuit,
    clientTaxId,
    clientName: input.clientName ?? config.arca.exportDefaults.clientName,
    clientAddress:
      input.clientAddress ?? config.arca.exportDefaults.clientAddress,
  }
}

export async function getFacturaEAnnualSummary(
  year = new Date().getFullYear()
): Promise<WsfexAnnualSummary> {
  const ticket = await getAccessTicket("wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    config.arca.wsfexPointOfSale
  )
  const invoices: WsfexInvoiceSummaryItem[] = []
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  let queried = 0

  for (let number = lastAuthorizedNumber; number >= 1; number -= 1) {
    const invoice = await consultFacturaE(
      client,
      authData,
      config.arca.wsfexPointOfSale,
      number
    )
    queried += 1

    if (!invoice.date) {
      continue
    }

    if (invoice.date >= startDate && invoice.date <= endDate) {
      invoices.push(invoice)
      continue
    }

    if (invoice.date < startDate) {
      break
    }
  }

  invoices.reverse()

  return {
    source: "wsfex",
    invoiceType: "E",
    invoiceTypeCode: FACTURA_E,
    pointOfSale: config.arca.wsfexPointOfSale,
    year,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amountArs, 0)
    ),
    count: invoices.length,
    lastAuthorizedNumber,
    queried,
    invoices,
  }
}

export async function getFacturaEHistoricalSummary(
  pointOfSale: number
): Promise<WsfexHistoricalSummary> {
  const ticket = await getAccessTicket("wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const invoices: WsfexInvoiceSummaryItem[] = []

  for (let number = 1; number <= lastAuthorizedNumber; number += 1) {
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
    queried: lastAuthorizedNumber,
    invoices,
  }
}

async function consultFacturaE(
  client: WsfexSoapClient,
  authData: ArcaAuth,
  pointOfSale: number,
  number: number
): Promise<WsfexInvoiceSummaryItem> {
  const [response] = await client.FEXGetCMPAsync({
    Auth: authData,
    Cmp: {
      Cbte_Tipo: FACTURA_E,
      Punto_vta: pointOfSale,
      Cbte_nro: number,
    },
  })
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
  input: WsfexInvoiceInput
): Promise<EmittedWsfexInvoice> {
  const amount = roundMoney(input.amount)
  const today = toArcaDate()
  const exportClient = buildExportClient(input)
  const ticket = await getAccessTicket("wsfex")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfexUrl
  )) as unknown as WsfexSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const [requestId, invoiceNumber] = await Promise.all([
    getNextRequestId(client, authData),
    getNextInvoiceNumber(client, authData),
  ])

  const cmp: Record<string, unknown> = {
    Id: requestId,
    Fecha_cbte: today,
    Cbte_Tipo: FACTURA_E,
    Punto_vta: config.arca.wsfexPointOfSale,
    Cbte_nro: invoiceNumber,
    Tipo_expo: TIPO_EXPORTACION_SERVICIOS,
    Permiso_existente: "",
    Dst_cmp: exportClient.destinationCountryCode,
    Cliente: exportClient.clientName,
    Domicilio_cliente: exportClient.clientAddress,
    Moneda_Id: "PES",
    Moneda_ctz: 1,
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

  const [response] = await client.FEXAuthorizeAsync({
    Auth: authData,
    Cmp: cmp,
  })

  const result = record(response).FEXAuthorizeResult
  ensureNoFexError(result, "FEXAuthorize")

  const resultRecord = record(result)
  const authResult = record(resultRecord.FEXResultAuth)
  if (!authResult.Cae) {
    throw new ArcaError("WSFEX did not approve the invoice.", 502, {
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
      pointOfSale: config.arca.wsfexPointOfSale,
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
