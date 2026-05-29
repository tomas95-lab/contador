import { taxCategories, initialPayments } from "@/data/accounting"
import type { ArcaAnnualSummary } from "@/lib/arca-api"
import type {
  AssistantMessage,
  GeneratedInvoice,
  IncomePayment,
  TaxCategory,
  TaxPayment,
  UserFiscalProfile,
} from "@/types/accounting"

export const demoArcaCuit = "20-30111222-3"

export const demoUser = {
  name: "María García",
  email: "maria.garcia@gmail.com",
  avatar: "",
}

export const demoTaxCategory: TaxCategory =
  taxCategories.find((category) => category.key === "C") ?? taxCategories[0]

export const demoFiscalProfile: UserFiscalProfile = {
  activity: "Servicios de diseño y desarrollo web",
  workStatus: "Monotributista",
  currentCategory: "C",
  expectedMonthlyIncome: 850000,
  notes: "",
  updatedAt: "2026-05-01T12:00:00.000Z",
}

export const demoTaxPayments: TaxPayment[] = [
  {
    id: "demo-tax-2026-03",
    monthKey: "2026-03",
    amount: demoTaxCategory.monthlyTax,
    paidAt: "2026-03-18",
  },
  {
    id: "demo-tax-2026-04",
    monthKey: "2026-04",
    amount: demoTaxCategory.monthlyTax,
    paidAt: "2026-04-16",
  },
]

export const demoAssistantMessages: AssistantMessage[] = [
  {
    id: "demo-msg-1",
    role: "assistant",
    content:
      "Hola María. Tu categoría C va al 68% del tope anual. Tenés dos cobros pendientes de facturar este mes.",
    timestamp: "09:12",
  },
  {
    id: "demo-msg-2",
    role: "user",
    content: "¿Conviene facturar los pendientes ahora o esperar a junio?",
    timestamp: "09:14",
  },
  {
    id: "demo-msg-3",
    role: "assistant",
    content:
      "Conviene emitir las facturas C antes del cierre de mayo para no acumular ingresos sin respaldo. Si querés, te guío con los dos cobros pendientes.",
    timestamp: "09:15",
  },
]

function addDaysToIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function createDemoInvoices(payments: IncomePayment[]): GeneratedInvoice[] {
  let sequence = 1

  return payments
    .filter((payment) => payment.invoiceStatus === "facturado")
    .map((payment) => {
      const invoiceSequence = sequence++
      const cae = `7${String(41000000000000 + invoiceSequence).slice(0, 13)}`

      return {
        id: `demo-inv-${payment.id}`,
        paymentId: payment.id,
        number: `0005-${String(invoiceSequence).padStart(8, "0")}`,
        invoiceType: "Factura C",
        pointOfSale: 5,
        issueDate: payment.date,
        client: payment.client,
        description: payment.description,
        amount: payment.amount,
        cae,
        caeExpiresAt: addDaysToIsoDate(payment.date, 10),
        status: "issued",
      }
    })
}

export function createDemoInvoiceFromPayment(
  payment: IncomePayment,
  existingCount: number
): GeneratedInvoice {
  const sequence = existingCount + 1
  const cae = `7${String(41000000000000 + sequence).slice(0, 13)}`

  return {
    id: crypto.randomUUID(),
    paymentId: payment.id,
    number: `0005-${String(sequence).padStart(8, "0")}`,
    invoiceType: "Factura C",
    pointOfSale: 5,
    issueDate: payment.date,
    client: payment.client,
    description: payment.description,
    amount: payment.amount,
    cae,
    caeExpiresAt: addDaysToIsoDate(payment.date, 10),
    status: "issued",
  }
}

export function createDemoArcaAnnualSummary(
  invoices: GeneratedInvoice[],
  year: number
): ArcaAnnualSummary {
  const facturaC = invoices.filter((invoice) => invoice.invoiceType === "Factura C")
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)

  return {
    year,
    total,
    count: invoices.length,
    pointOfSale: 5,
    invoiceTypes: [...new Set(invoices.map((invoice) => invoice.invoiceType))],
    summaries: [
      {
        source: "wsfe",
        invoiceType: "C",
        invoiceTypeCode: 11,
        pointOfSale: 5,
        year,
        total: facturaC.reduce((sum, invoice) => sum + invoice.amount, 0),
        count: facturaC.length,
        lastAuthorizedNumber: facturaC.length,
        queried: facturaC.length,
        invoices: facturaC.map((invoice) => ({
          number: Number(invoice.number.split("-")[1] ?? 0),
          date: invoice.issueDate,
          amount: invoice.amount,
          authorizationCode: invoice.cae,
          result: "A",
        })),
      },
    ],
  }
}

export function getDemoSessionState() {
  const payments = initialPayments
  const invoices = createDemoInvoices(payments)
  const year = new Date().getFullYear()

  return {
    payments,
    invoices,
    category: demoTaxCategory,
    fiscalProfile: demoFiscalProfile,
    taxPayments: demoTaxPayments,
    assistantMessages: demoAssistantMessages,
    arcaCuit: demoArcaCuit,
    arcaSummary: createDemoArcaAnnualSummary(invoices, year),
  }
}
