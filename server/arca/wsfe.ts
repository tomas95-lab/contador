import { config } from "../config.js"
import { fromArcaDate, roundMoney, toArcaDate } from "./date.js"
import { ArcaError, asArray } from "./errors.js"
import { record } from "./objects.js"
import { getSoapClient } from "./soap.js"
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

interface WsfeSoapClient {
  FECompUltimoAutorizadoAsync(args: unknown): Promise<[unknown]>
  FECAESolicitarAsync(args: unknown): Promise<[unknown]>
  FECompConsultarAsync(args: unknown): Promise<[unknown]>
  FEParamGetPtosVentaAsync(args: unknown): Promise<[unknown]>
}

function auth(token: string, sign: string) {
  return {
    Token: token,
    Sign: sign,
    Cuit: Number(config.arca.cuit),
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
  authData: unknown
): Promise<number> {
  return (await getLastAuthorizedInvoiceNumber(client, authData)) + 1
}

async function getLastAuthorizedInvoiceNumber(
  client: WsfeSoapClient,
  authData: unknown,
  pointOfSale = config.arca.wsfePointOfSale
): Promise<number> {
  const [response] = await client.FECompUltimoAutorizadoAsync({
    Auth: authData,
    PtoVta: pointOfSale,
    CbteTipo: FACTURA_C,
  })

  const result = record(response).FECompUltimoAutorizadoResult
  ensureNoWsfeErrors(result, "FECompUltimoAutorizado")

  return Number(record(result).CbteNro ?? 0)
}

export async function emitFacturaC(
  input: WsfeInvoiceInput
): Promise<EmittedWsfeInvoice> {
  const ticket = await getAccessTicket("wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const invoiceNumber = await getNextInvoiceNumber(client, authData)
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

  const [response] = await client.FECAESolicitarAsync({
    Auth: authData,
    FeCAEReq: {
      FeCabReq: {
        CantReg: 1,
        PtoVta: config.arca.wsfePointOfSale,
        CbteTipo: FACTURA_C,
      },
      FeDetReq: {
        FECAEDetRequest: [detail],
      },
    },
  })

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
      pointOfSale: config.arca.wsfePointOfSale,
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
  year = new Date().getFullYear()
): Promise<WsfeAnnualSummary> {
  const ticket = await getAccessTicket("wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    config.arca.wsfePointOfSale
  )
  const invoices: WsfeInvoiceSummaryItem[] = []
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  let queried = 0

  for (let number = lastAuthorizedNumber; number >= 1; number -= 1) {
    const invoice = await consultFacturaC(
      client,
      authData,
      config.arca.wsfePointOfSale,
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
    source: "wsfe",
    invoiceType: "C",
    invoiceTypeCode: FACTURA_C,
    pointOfSale: config.arca.wsfePointOfSale,
    year,
    total: roundMoney(
      invoices.reduce((total, invoice) => total + invoice.amount, 0)
    ),
    count: invoices.length,
    lastAuthorizedNumber,
    queried,
    invoices,
  }
}

export async function getFacturaCHistoricalSummary(
  pointOfSale: number
): Promise<WsfeHistoricalSummary> {
  const ticket = await getAccessTicket("wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const lastAuthorizedNumber = await getLastAuthorizedInvoiceNumber(
    client,
    authData,
    pointOfSale
  )
  const invoices: WsfeInvoiceSummaryItem[] = []

  for (let number = 1; number <= lastAuthorizedNumber; number += 1) {
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
    queried: lastAuthorizedNumber,
    invoices,
  }
}

export async function getWsfePointOfSales(): Promise<WsfePointOfSale[]> {
  const ticket = await getAccessTicket("wsfe")
  const client = (await getSoapClient(
    config.arca.endpoints.wsfeUrl
  )) as unknown as WsfeSoapClient
  const authData = auth(ticket.token, ticket.sign)
  const [response] = await client.FEParamGetPtosVentaAsync({
    Auth: authData,
  })
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
  const [response] = await client.FECompConsultarAsync({
    Auth: authData,
    FeCompConsReq: {
      CbteTipo: FACTURA_C,
      CbteNro: number,
      PtoVta: pointOfSale,
    },
  })
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
