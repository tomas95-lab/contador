import { z } from "zod"

import type { EmittedWsfeInvoice } from "../arca/wsfe.js"
import type { EmittedWsfexInvoice } from "../arca/wsfex.js"
import { ArcaError } from "../arca/errors.js"
import { getSupabaseAdmin } from "./supabase-admin.js"

type EmittedArcaInvoice = EmittedWsfeInvoice | EmittedWsfexInvoice

const storedAuthorizedResultSchema = z.object({
  cae: z.string().min(1),
  caeExpiresAt: z.string().nullable(),
  result: z.string(),
  invoice: z.object({
    amount: z.number(),
    amountArs: z.number(),
    currencyId: z.string(),
    currencyRate: z.number(),
    date: z.string().nullable(),
    description: z.string(),
    invoiceType: z.enum(["C", "E"]),
    invoiceTypeCode: z.number(),
    number: z.number(),
    pointOfSale: z.number(),
  }),
  arca: z.object({
    reconciliationSource: z.literal("emission-response"),
  }),
})

export type InvoiceEmissionAttempt = {
  id: string
  userId: string
  paymentId: string
  invoiceType: "C" | "E"
  pointOfSale: number
  invoiceNumber: number | null
  status: "prepared" | "authorized" | "persisted" | "failed"
  authorizedResult: unknown
  clientName: string | null
  receiverCuit: string | null
}

export async function prepareInvoiceEmissionAttempt({
  clientName,
  invoiceType,
  paymentId,
  pointOfSale,
  receiverCuit,
  userId,
}: {
  clientName?: string | null
  invoiceType: "C" | "E"
  paymentId: string
  pointOfSale: number
  receiverCuit?: string | null
  userId: string
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("arca_invoice_emission_attempts")
    .upsert(
      {
        authorized_result: null,
        client_name: clientName ?? null,
        invoice_number: null,
        invoice_type: invoiceType,
        payment_id: paymentId,
        point_of_sale: pointOfSale,
        receiver_cuit: receiverCuit ?? null,
        status: "prepared",
        updated_at: new Date().toISOString(),
        user_id: userId,
      },
      { onConflict: "user_id,payment_id" }
    )
    .select("id")
    .single()

  if (error) {
    throw new ArcaError("No pudimos registrar el intento de emisión.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  return String(data.id)
}

export async function recordInvoiceEmissionNumber({
  attemptId,
  invoiceNumber,
  userId,
}: {
  attemptId: string
  invoiceNumber: number
  userId: string
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("arca_invoice_emission_attempts")
    .update({
      invoice_number: invoiceNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("status", "prepared")
    .select("id")
    .maybeSingle()

  if (error || !data) {
    throw new ArcaError(
      "No pudimos registrar el número que se intentará emitir.",
      500,
      {
        code: error?.code,
        message: error?.message,
      }
    )
  }
}

export async function recordAuthorizedInvoiceEmission(
  attemptId: string,
  userId: string,
  result: EmittedArcaInvoice
) {
  await bestEffortAttemptUpdate(
    attemptId,
    userId,
    {
      authorized_result: serializeAuthorizedResult(result),
      status: "authorized",
      updated_at: new Date().toISOString(),
    },
    "arca.invoice_emission_attempt_authorized_save_failed"
  )
}

export async function markInvoiceEmissionAttemptPersisted(
  attemptId: string,
  userId: string
) {
  await bestEffortAttemptUpdate(
    attemptId,
    userId,
    {
      status: "persisted",
      updated_at: new Date().toISOString(),
    },
    "arca.invoice_emission_attempt_persisted_save_failed"
  )
}

export async function markInvoiceEmissionAttemptFailed(
  attemptId: string,
  userId: string
) {
  await bestEffortAttemptUpdate(
    attemptId,
    userId,
    {
      status: "failed",
      updated_at: new Date().toISOString(),
    },
    "arca.invoice_emission_attempt_failed_save_failed"
  )
}

export async function getInvoiceEmissionAttempt(
  paymentId: string,
  userId: string
): Promise<InvoiceEmissionAttempt | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("arca_invoice_emission_attempts")
    .select(
      "id, user_id, payment_id, invoice_type, point_of_sale, invoice_number, status, authorized_result, client_name, receiver_cuit"
    )
    .eq("payment_id", paymentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new ArcaError("No pudimos consultar el intento de emisión.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  if (!data) {
    return null
  }

  return {
    authorizedResult: data.authorized_result,
    clientName: data.client_name,
    id: data.id,
    invoiceNumber: data.invoice_number,
    invoiceType: data.invoice_type,
    paymentId: data.payment_id,
    pointOfSale: data.point_of_sale,
    receiverCuit: data.receiver_cuit,
    status: data.status,
    userId: data.user_id,
  } as InvoiceEmissionAttempt
}

export async function findPersistedInvoiceByPayment(
  paymentId: string,
  userId: string
) {
  const { data, error } = await getSupabaseAdmin()
    .from("invoices")
    .select("*")
    .eq("payment_id", paymentId)
    .eq("user_id", userId)
    .eq("status", "issued")
    .maybeSingle()

  if (error) {
    throw new ArcaError("No pudimos verificar la factura emitida.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  return data
}

export function parseStoredAuthorizedResult(
  value: unknown
): EmittedArcaInvoice {
  const parsed = storedAuthorizedResultSchema.safeParse(value)

  if (!parsed.success) {
    throw new ArcaError(
      "El resultado autorizado guardado no es válido para reconciliar.",
      500
    )
  }

  return parsed.data as EmittedArcaInvoice
}

function serializeAuthorizedResult(result: EmittedArcaInvoice) {
  return {
    cae: result.cae,
    caeExpiresAt: result.caeExpiresAt,
    result: result.result,
    invoice: result.invoice,
    arca: {
      reconciliationSource: "emission-response",
    },
  }
}

async function bestEffortAttemptUpdate(
  attemptId: string,
  userId: string,
  values: Record<string, unknown>,
  event: string
) {
  const { error } = await getSupabaseAdmin()
    .from("arca_invoice_emission_attempts")
    .update(values)
    .eq("id", attemptId)
    .eq("user_id", userId)

  if (error) {
    console.error(
      JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        attemptId,
        userId,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    )
  }
}
