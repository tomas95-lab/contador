import { describe, expect, it } from "vitest"

import { emitInvoiceSchema } from "./invoices.js"

const exportInvoice = {
  amount: 10000000,
  description: "Servicios prestados al exterior",
  foreignClientCountryCode: "200",
  foreignClientName: "Cliente exterior",
  invoiceType: "E",
} as const

describe("emitInvoiceSchema", () => {
  it("accepts Factura E in pesos without a positive exchange rate", () => {
    const parsed = emitInvoiceSchema.parse({
      ...exportInvoice,
      currencyId: "PES",
      exchangeRate: 0,
    })

    expect(parsed.currencyId).toBe("PES")
    expect(parsed.exchangeRate).toBe(0)
  })

  it("still requires a positive exchange rate for Factura E in USD", () => {
    const parsed = emitInvoiceSchema.safeParse({
      ...exportInvoice,
      currencyId: "DOL",
      exchangeRate: 0,
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe(
      "Factura E en USD requiere un tipo de cambio positivo."
    )
  })

  it("rejects invalid receiver IVA conditions", () => {
    const parsed = emitInvoiceSchema.safeParse({
      amount: 1000,
      description: "Servicio local",
      invoiceType: "C",
      receiverIvaConditionId: 99,
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe(
      "La condición de IVA del receptor no es válida."
    )
  })

  it("rejects invalid service dates before calling ARCA", () => {
    const parsed = emitInvoiceSchema.safeParse({
      amount: 1000,
      description: "Servicio local",
      invoiceType: "C",
      serviceFrom: "2026-99-99",
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain(
      "Ingresá una fecha válida"
    )
  })

  it("rejects a service end date before its start date", () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)
    const parsed = emitInvoiceSchema.safeParse({
      amount: 1000,
      description: "Servicio local",
      invoiceType: "C",
      serviceFrom: formatDate(today),
      serviceTo: formatDate(yesterday),
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.at(-1)?.message).toBe(
      "La fecha hasta del servicio no puede ser anterior a la fecha desde."
    )
  })
})

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
