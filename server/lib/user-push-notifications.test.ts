import { describe, expect, it } from "vitest"

import {
  buildInvoiceAuthorizedPush,
  buildRiskAlertsPush,
} from "./user-push-notifications.js"

describe("buildInvoiceAuthorizedPush", () => {
  it("builds a safe notification without exposing the CAE", () => {
    expect(
      buildInvoiceAuthorizedPush({
        invoiceType: "C",
        number: 37,
        pointOfSale: 4,
      })
    ).toEqual({
      body: "Factura C 0004-00000037 autorizada y guardada.",
      tag: "invoice-authorized-C-4-37",
      title: "Factura autorizada",
      url: "/app",
    })
  })
})

describe("buildRiskAlertsPush", () => {
  it("uses the alert details when there is only one new alert", () => {
    expect(
      buildRiskAlertsPush([
        {
          description: "La cuota vence pronto.",
          id: "tax/due soon",
          severity: "warning",
          title: "Vencimiento cercano",
        },
      ])
    ).toEqual({
      body: "La cuota vence pronto.",
      tag: "risk-alert-tax-due-soon",
      title: "Vencimiento cercano",
      url: "/app",
    })
  })

  it("summarizes multiple alerts and highlights critical ones", () => {
    expect(
      buildRiskAlertsPush([
        {
          description: "Primera",
          id: "first",
          severity: "critical",
          title: "Primera",
        },
        {
          description: "Segunda",
          id: "second",
          severity: "info",
          title: "Segunda",
        },
      ])
    ).toMatchObject({
      body: "1 requiere atención inmediata. Revisalas en Contable.",
      tag: "risk-alerts-new",
      title: "Tenés 2 alertas fiscales nuevas",
    })
  })
})
