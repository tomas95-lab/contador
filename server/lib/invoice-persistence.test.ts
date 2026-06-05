import { describe, expect, it } from "vitest"

import { buildPersistedInvoiceRow } from "./invoice-persistence.js"
import type { EmittedWsfeInvoice } from "../arca/wsfe.js"
import type { EmittedWsfexInvoice } from "../arca/wsfex.js"

describe("buildPersistedInvoiceRow", () => {
  it("maps an authorized Factura C to the invoices table shape", () => {
    const emitted: EmittedWsfeInvoice = {
      cae: "12345678901234",
      caeExpiresAt: "2026-06-15",
      result: "A",
      invoice: {
        amount: 12500.5,
        date: "2026-06-05",
        description: "Servicio mensual",
        invoiceType: "C",
        invoiceTypeCode: 11,
        number: 37,
        pointOfSale: 4,
      },
      arca: {},
    }

    expect(
      buildPersistedInvoiceRow({
        clientName: "Cliente local",
        paymentId: "98b33054-8d7f-466a-87b6-5ae67d5fbbef",
        receiverCuit: "20123456786",
        result: emitted,
        userId: "a8ece75b-f46a-46f3-9e7d-a26e04ef8c46",
      })
    ).toEqual({
      amount: 12500.5,
      cae: "12345678901234",
      cae_expires_at: "2026-06-15",
      client: "Cliente local",
      description: "Servicio mensual",
      invoice_type: "Factura C",
      issue_date: "2026-06-05",
      number: "0004-00000037",
      payment_id: "98b33054-8d7f-466a-87b6-5ae67d5fbbef",
      point_of_sale: 4,
      status: "issued",
      user_id: "a8ece75b-f46a-46f3-9e7d-a26e04ef8c46",
    })
  })

  it("maps Factura E and falls back to a safe client label", () => {
    const emitted: EmittedWsfexInvoice = {
      cae: "98765432109876",
      caeExpiresAt: null,
      result: "A",
      invoice: {
        amount: 300,
        date: "2026-06-05",
        description: "Export service",
        invoiceType: "E",
        invoiceTypeCode: 19,
        number: 8,
        pointOfSale: 6,
      },
      arca: {},
    }

    expect(
      buildPersistedInvoiceRow({
        result: emitted,
        userId: "a8ece75b-f46a-46f3-9e7d-a26e04ef8c46",
      })
    ).toMatchObject({
      cae: "98765432109876",
      client: "Cliente del exterior",
      invoice_type: "Factura E",
      number: "0006-00000008",
      payment_id: null,
      point_of_sale: 6,
    })
  })
})
