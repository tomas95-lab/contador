import { ArcaError } from "../arca/errors.js"

type InvoiceAuditEvent = {
  userId: string
  invoiceType: "C" | "E"
  pointOfSale?: number
  number?: number | string
  amount: number
  result: string
  error?: {
    code?: string
    message: string
  }
}

type EmergencySaveFailureEvent = {
  userId: string
  invoiceType: "C" | "E"
  pointOfSale: number
  number: number | string
  cae: string
}

export function logInvoiceEmissionAudit(event: InvoiceAuditEvent) {
  console.info(
    JSON.stringify({
      event: "arca.invoice_emission",
      timestamp: new Date().toISOString(),
      userId: event.userId,
      invoiceType: event.invoiceType,
      pointOfSale: event.pointOfSale,
      number: event.number,
      amount: event.amount,
      result: event.result,
      error: event.error,
    })
  )
}

export function logAuthorizedInvoiceSaveFailure(
  event: EmergencySaveFailureEvent
) {
  console.error(
    JSON.stringify({
      event: "arca.invoice_authorized_local_save_failed",
      timestamp: new Date().toISOString(),
      userId: event.userId,
      invoiceType: event.invoiceType,
      pointOfSale: event.pointOfSale,
      number: event.number,
      cae: event.cae,
    })
  )
}

export function sanitizeAuditError(error: unknown) {
  if (error instanceof ArcaError) {
    return {
      code: extractSafeErrorCode(error.details) ?? String(error.statusCode),
      message: error.message,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    }
  }

  return {
    message: "Ocurrió un error inesperado.",
  }
}

function extractSafeErrorCode(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined
  }

  const record = details as Record<string, unknown>
  const code = record.code ?? record.faultCode

  if (typeof code === "string" || typeof code === "number") {
    return String(code)
  }

  return undefined
}
