import type { EmittedWsfeInvoice } from "../arca/wsfe.js"
import type { EmittedWsfexInvoice } from "../arca/wsfex.js"
import { fromArcaDate, toArcaDate } from "../arca/date.js"
import { ArcaError } from "../arca/errors.js"
import { getSupabaseAdmin } from "./supabase-admin.js"

type EmittedArcaInvoice = EmittedWsfeInvoice | EmittedWsfexInvoice

export type PersistedInvoiceRow = {
  user_id: string
  payment_id: string | null
  invoice_type: "Factura C" | "Factura E"
  point_of_sale: number
  number: string
  issue_date: string
  client: string
  description: string
  amount: number
  currency_id: string
  exchange_rate: number
  amount_ars: number
  cae: string
  cae_expires_at: string | null
  status: "issued"
}

export type BuildPersistedInvoiceInput = {
  userId: string
  paymentId?: string | null
  clientName?: string | null
  receiverCuit?: string | null
  result: EmittedArcaInvoice
}

export function buildPersistedInvoiceRow({
  userId,
  paymentId,
  clientName,
  receiverCuit,
  result,
}: BuildPersistedInvoiceInput): PersistedInvoiceRow {
  return {
    user_id: userId,
    payment_id: paymentId || null,
    invoice_type: invoiceTypeLabel(result.invoice.invoiceType),
    point_of_sale: result.invoice.pointOfSale,
    number: formatInvoiceNumber(
      result.invoice.pointOfSale,
      result.invoice.number
    ),
    issue_date: result.invoice.date ?? todayDate(),
    client: normalizeClientName(
      clientName,
      receiverCuit,
      result.invoice.invoiceType
    ),
    description: result.invoice.description,
    amount: result.invoice.amount,
    currency_id: getInvoiceCurrencyId(result),
    exchange_rate: getInvoiceExchangeRate(result),
    amount_ars: getInvoiceAmountArs(result),
    cae: result.cae,
    cae_expires_at: result.caeExpiresAt,
    status: "issued",
  }
}

export async function persistEmittedInvoice(
  row: PersistedInvoiceRow,
  { receiverCuit }: { receiverCuit?: string | null } = {}
) {
  const { data, error } = await getSupabaseAdmin().rpc(
    "persist_emitted_invoice_and_mark_payment",
    {
      p_amount: row.amount,
      p_amount_ars: row.amount_ars,
      p_cae: row.cae,
      p_cae_expires_at: row.cae_expires_at,
      p_client: row.client,
      p_currency_id: row.currency_id,
      p_description: row.description,
      p_exchange_rate: row.exchange_rate,
      p_invoice_type: row.invoice_type,
      p_issue_date: row.issue_date,
      p_number: row.number,
      p_payment_id: row.payment_id,
      p_point_of_sale: row.point_of_sale,
      p_receiver_cuit: receiverCuit ?? null,
      p_status: row.status,
      p_user_id: row.user_id,
    }
  )

  if (error) {
    throw new ArcaError(
      "ARCA autorizó la factura, pero no se pudo guardar localmente.",
      500,
      {
        code: error.code,
        message: error.message,
      }
    )
  }

  return data
}

export function formatInvoiceNumber(pointOfSale: number, number: number) {
  return `${String(pointOfSale).padStart(4, "0")}-${String(number).padStart(
    8,
    "0"
  )}`
}

function invoiceTypeLabel(invoiceType: "C" | "E") {
  return invoiceType === "E" ? "Factura E" : "Factura C"
}

function normalizeClientName(
  clientName: string | null | undefined,
  receiverCuit: string | null | undefined,
  invoiceType: "C" | "E"
) {
  const trimmedClientName = clientName?.trim()

  if (trimmedClientName) {
    return trimmedClientName
  }

  if (receiverCuit) {
    return `CUIT ${receiverCuit}`
  }

  return invoiceType === "E" ? "Cliente del exterior" : "Consumidor final"
}

function getInvoiceCurrencyId(result: EmittedArcaInvoice) {
  return result.invoice.currencyId
}

function getInvoiceExchangeRate(result: EmittedArcaInvoice) {
  return result.invoice.currencyRate
}

function getInvoiceAmountArs(result: EmittedArcaInvoice) {
  return result.invoice.amountArs
}

function todayDate() {
  return fromArcaDate(toArcaDate())!
}
