import { describe, expect, it } from "vitest"

import { parseStoredAuthorizedResult } from "./invoice-emission-attempt.js"

describe("parseStoredAuthorizedResult", () => {
  it("accepts the minimal authorized result stored for reconciliation", () => {
    const result = parseStoredAuthorizedResult({
      cae: "12345678901234",
      caeExpiresAt: "2026-06-20",
      result: "A",
      invoice: {
        amount: 1000,
        amountArs: 1000,
        currencyId: "PES",
        currencyRate: 1,
        date: "2026-06-09",
        description: "Servicio",
        invoiceType: "C",
        invoiceTypeCode: 11,
        number: 10,
        pointOfSale: 4,
      },
      arca: {
        reconciliationSource: "emission-response",
      },
    })

    expect(result.cae).toBe("12345678901234")
    expect(result.invoice.number).toBe(10)
  })

  it("rejects untrusted or incomplete stored results", () => {
    expect(() => parseStoredAuthorizedResult({ cae: "123" })).toThrow()
  })
})
