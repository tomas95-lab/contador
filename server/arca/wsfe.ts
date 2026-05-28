import { config } from "../config.js"
import type { UserArcaCredentials } from "../lib/arca-credentials.js"
import { fromArcaDate, roundMoney, toArcaDate } from "./date.js"
import { ArcaError, asArray } from "./errors.js"
import { record } from "./objects.js"
import { getSoapClient } from "./soap.js"
import { withArcaRequestTimeout } from "./timeout.js"
import { getAccessTicket } from "./wsaa.js"

const FACTURA_C = 11
const DOC_CUIT = 80
const DOC_CONSUMIDOR_FINAL = 99
const CONCEPTO_SERVICIOS = 2

export interface WsfeInvoiceInput {
  amount: number
  description: string
  clientCuit?: string
  receiverIvaConditionId?: number
  serviceFrom?: string
  serviceTo?: string
  dueDate?: string
}

export interface EmittedWsfeInvoice {
  cae: string
  caeExpiresAt: string | null
  result: string
  invoice: {
    invoiceType: "C"
    invoiceTypeCode: number
    pointOfSale: number
    number: number
    date: string | null
    amount: number
    description: string
  }
  arca: unknown
}

export interface WsfeInvoiceSummaryItem {
  number: number
  date: string | null
  amount: number
  authorizationCode: string | null
  result: string | null
}

export interface WsfeAnnualSummary {
  source: "wsfe"
  invoiceType: "C"
  invoiceTypeCode: number
  pointOfSale: number
  year: number
  total: number
  count: number
  lastAuthorizedNumber: number
  queried: number
  truncated: boolean
  invoices: WsfeInvoiceSummaryItem[]
}

export interface WsfeHistoricalSummary {
  source: "wsfe"
  invoiceType: "C"
  invoiceTypeCode: number
  pointOfSale: number
  total: number
  count: number
  lastAuthorizedNumber: number
  queried: number
  invoices: WsfeInvoiceSummaryItem[]
}

export interface WsfePointOfSale {
  number: number
  blocked: string | null
  issueType: string | null
  dropDate: string | null
}

export type WsfeHistoricalQueryOptions = {
  limit?: number
  offset?: number
}

interface WsfeSoapClient {
  FECompUltimoAutorizadoAsync(args: unknown): Promise<[unknown]>
  FECAESolicitarAsync(args: unknown): Promise<[unknown]>
  FECompConsultarAsync(args: unknown): Promise<[unknown]>
  FEParamGetPtosVentaAsync(args: unknown): Promise<[unknown]>
}

function auth(credentials: UserArcaCredentials, token: string, sign: string) {
  return {
    Token: token,
    Sign: sign,
    Cuit: Number(credentials.cuit),
  }
}

function ensureNoWsfeErrors(result: unknown, operation: string): void {
  const errors = asArray(record(record(result).Errors).Err)
  if (errors.length > 0) {
    throw new ArcaError(`${operation} was rejected by WSFE.`, 502, errors)
  }
}

async function getNextInvoiceNumber(
  client: WsfeSoapClient,
  authData: unknown,
  pointOfSale: number
): Promise<number> {
  return (
    (await getLastAuthorizedInvoiceNumber(client, authData, pointOfSale)) + 1
  )
}

async function getLastAuthorizedInvoiceNumber(
  client: WsfeSoapClient,
  authData: unknown,
  pointOfSale: number
): Promise<number> {
  const [response] = await withArcaRequestTimeout(
    "FECompUltimoAutorizado",
    client.FECompUltimoAutorizadoAsync({
      Auth: authData,
      PtoVta: pointOfSale,
      CbteTipo: FACTURA_C,
    })
  )

  const result = record(response).FECompUltimoAutorizadoResult
  ensureNoWsfeErrors(result, "FECompUltimoAutorizado")

  return Number(record(result).CbteNro ?? 0)
}

export async function emitFacturaC(
  credentials: UserArcaCredentials,
  input: WsfeInvoiceInput
): Promise<EmittedWsfeInvoice> {
  const ticket = await getAccessTicket(credentials, "wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const pointOfSale = credentials.wsfePointOfSale
  const invoiceNumber = await getNextInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const amount = roundMoney(input.amount)
  const today = toArcaDate()
  const clientCuit = input.clientCuit?.replace(/\D/g, "")
  const receiverIvaConditionId =
    input.receiverIvaConditionId ??
    (clientCuit ? config.arca.defaultReceiverIvaConditionId : 5)

  const detail = {
    Concepto: CONCEPTO_SERVICIOS,
    DocTipo: clientCuit ? DOC_CUIT : DOC_CONSUMIDOR_FINAL,
    DocNro: clientCuit ? Number(clientCuit) : 0,
    CbteDesde: invoiceNumber,
    CbteHasta: invoiceNumber,
    CbteFch: today,
    ImpTotal: amount,
    ImpTotConc: 0,
    ImpNeto: amount,
    ImpOpEx: 0,
    ImpTrib: 0,
    ImpIVA: 0,
    FchServDesde: toArcaDate(input.serviceFrom ?? today),
    FchServHasta: toArcaDate(input.serviceTo ?? today),
    FchVtoPago: toArcaDate(input.dueDate ?? today),
    MonId: "PES",
    MonCotiz: 1,
    CondicionIVAReceptorId: receiverIvaConditionId,
  }

  const [response] = await withArcaRequestTimeout(
    "FECAESolicitar",
    client.FECAESolicitarAsync({
      Auth: authData,
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: pointOfSale,
          CbteTipo: FACTURA_C,
        },
        FeDetReq: {
          FECAEDetRequest: [detail],
        },
      },
    })
  )

  const result = record(response).FECAESolicitarResult
  ensureNoWsfeErrors(result, "FECAESolicitar")

  const resultRecord = record(result)
  const detailResponse = record(
    asArray(record(resultRecord.FeDetResp).FECAEDetResponse)[0]
  )

  if (!detailResponse.CAE) {
    throw new ArcaError("WSFE did not approve the invoice.", 502, {
      result,
      observations: detailResponse.Observaciones,
    })
  }

  return {
    cae: String(detailResponse.CAE),
    caeExpiresAt: fromArcaDate(String(detailResponse.CAEFchVto ?? "")),
    result: String(
      detailResponse.Resultado ?? record(resultRecord.FeCabResp).Resultado ?? ""
    ),
    invoice: {
      invoiceType: "C",
      invoiceTypeCode: FACTURA_C,
      pointOfSale,
      number: Number(detailResponse.CbteDesde ?? invoiceNumber),
      date: fromArcaDate(String(detailResponse.CbteFch ?? today)),
      amount,
      description: input.description,
    },
    arca: {
      header: resultRecord.FeCabResp,
      detail: detailResponse,
      events: resultRecord.Events,
    },
  }
}

export async function getFacturaCAnnualSummary(
  credentials: UserArcaCredentials,
  year = new Date().getFullYear()
): Promise<WsfeAnnualSummary> {
  const ticket = await getAccessTicket(credentials, "wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const pointOfSale = credentials.wsfePointOfSale
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const invoices: WsfeInvoiceSummaryItem[] = []
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
    const invoice = await consultFacturaC(client, authData, pointOfSale, number)
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
    source: "wsfe",
    invoiceType: "C",
    invoiceTypeCode: FACTURA_C,
    pointOfSale,
    year,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amount, 0)
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

export async function getFacturaCHistoricalSummary(
  credentials: UserArcaCredentials,
  pointOfSale: number,
  options: WsfeHistoricalQueryOptions = {}
): Promise<WsfeHistoricalSummary> {
  const ticket = await getAccessTicket(credentials, "wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
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
  const invoices: WsfeInvoiceSummaryItem[] = []

  for (let number = fromNumber; number <= toNumber; number += 1) {
    invoices.push(await consultFacturaC(client, authData, pointOfSale, number))
  }

  return {
    source: "wsfe",
    invoiceType: "C",
    invoiceTypeCode: FACTURA_C,
    pointOfSale,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amount, 0)
    ),
    count: invoices.length,
    lastAuthorizedNumber,
    queried: invoices.length,
    invoices,
  }
}

export async function getWsfePointOfSales(
  credentials: UserArcaCredentials
): Promise<WsfePointOfSale[]> {
  const ticket = await getAccessTicket(credentials, "wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(credentials, ticket.token, ticket.sign)
  const [response] = await withArcaRequestTimeout(
    "FEParamGetPtosVenta",
    client.FEParamGetPtosVentaAsync({
      Auth: authData,
    })
  )
  const result = record(response).FEParamGetPtosVentaResult
  ensureNoWsfeErrors(result, "FEParamGetPtosVenta")

  return asArray(record(record(result).ResultGet).PtoVenta).map((item) => {
    const itemRecord = record(item)

    return {
      number: Number(itemRecord.Nro ?? 0),
      blocked: itemRecord.Bloqueado ? String(itemRecord.Bloqueado) : null,
      issueType: itemRecord.EmisionTipo ? String(itemRecord.EmisionTipo) : null,
      dropDate: itemRecord.FchBaja
        ? fromArcaDate(String(itemRecord.FchBaja))
        : null,
    }
  })
}

async function consultFacturaC(
  client: WsfeSoapClient,
  authData: unknown,
  pointOfSale: number,
  number: number
): Promise<WsfeInvoiceSummaryItem> {
  const [response] = await withArcaRequestTimeout(
    "FECompConsultar",
    client.FECompConsultarAsync({
      Auth: authData,
      FeCompConsReq: {
        CbteTipo: FACTURA_C,
        CbteNro: number,
        PtoVta: pointOfSale,
      },
    })
  )
  const result = record(response).FECompConsultarResult
  ensureNoWsfeErrors(result, "FECompConsultar")

  const detail = record(record(result).ResultGet)

  return {
    number: Number(detail.CbteDesde ?? number),
    date: fromArcaDate(String(detail.CbteFch ?? "")),
    amount: roundMoney(Number(detail.ImpTotal ?? 0)),
    authorizationCode: detail.CodAutorizacion
      ? String(detail.CodAutorizacion)
      : null,
    result: detail.Resultado ? String(detail.Resultado) : null,
  }
}

function getHistoricalWindow(
  lastAuthorizedNumber: number,
  options: WsfeHistoricalQueryOptions
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
