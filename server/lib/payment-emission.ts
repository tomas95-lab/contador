import { ArcaError } from "../arca/errors.js"
import { getSupabaseAdmin } from "./supabase-admin.js"

type ClaimPaymentInput = {
  paymentId: string
  userId: string
}

export async function claimPaymentForInvoiceEmission({
  paymentId,
  userId,
}: ClaimPaymentInput) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("payments")
    .update({ invoice_status: "emitiendo" })
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("invoice_status", "pendiente")
    .select("id")
    .maybeSingle()

  if (error) {
    throw new ArcaError("No pudimos bloquear el cobro para emitir.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  if (data) {
    return
  }

  const { data: payment, error: fetchError } = await admin
    .from("payments")
    .select("invoice_status")
    .eq("id", paymentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError) {
    throw new ArcaError("No pudimos verificar el estado del cobro.", 500, {
      code: fetchError.code,
      message: fetchError.message,
    })
  }

  if (!payment) {
    throw new ArcaError(
      "No encontramos ese cobro pendiente para facturar.",
      404
    )
  }

  if (payment.invoice_status === "facturado") {
    throw new ArcaError(
      "Ese cobro ya fue marcado como facturado. Actualizá la pantalla antes de volver a emitir.",
      409
    )
  }

  if (payment.invoice_status === "emitiendo") {
    throw new ArcaError(
      "Ese cobro ya está en emisión. Esperá a que termine o revisá el historial antes de volver a intentar.",
      409
    )
  }

  throw new ArcaError("Ese cobro no está pendiente de facturar.", 409)
}

export async function releasePaymentEmissionClaim({
  paymentId,
  userId,
}: ClaimPaymentInput) {
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update({ invoice_status: "pendiente" })
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("invoice_status", "emitiendo")

  if (error) {
    console.error(
      JSON.stringify({
        event: "arca.invoice_emission_claim_release_failed",
        timestamp: new Date().toISOString(),
        userId,
        paymentId,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    )
  }
}
