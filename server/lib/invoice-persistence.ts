import type { EmittedWsfeInvoice } from "../arca/wsfe.js"
import type { EmittedWsfexInvoice } from "../arca/wsfex.js"
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
    cae: result.cae,
    cae_expires_at: result.caeExpiresAt,
    status: "issued",
  }
}

export async function persistEmittedInvoice(row: PersistedInvoiceRow) {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .upsert(row, {
      onConflict: "user_id,invoice_type,point_of_sale,number",
    })
    .select("*")
    .single()

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

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}
