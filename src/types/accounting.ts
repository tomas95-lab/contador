export type AppSection =
  | "resumen"
  | "cobros"
  | "asistente"
  | "facturacion"
  | "proyecciones"
  | "clientes"
  | "arca"
  | "configuracion"
  | "ayuda"

export type IncomeMethod = "Transferencia" | "Mercado Pago" | "Efectivo"

export type InvoiceStatus = "facturado" | "pendiente"

export type GeneratedInvoiceStatus = "draft" | "issued"

export type InvoiceKind = "C" | "E"

export type UserFiscalProfile = {
  activity: string
  workStatus: string
  currentCategory: string
  expectedMonthlyIncome: number | null
  notes: string
  updatedAt: string | null
}

export type IncomePayment = {
  id: string
  date: string
  amount: number
  client: string
  description: string
  method: IncomeMethod
  invoiceStatus: InvoiceStatus
  source?: string
  invoiceType?: string | null
  pointOfSale?: number | null
  cae?: string | null
  receiverCuit?: string | null
}

export type GeneratedInvoice = {
  id: string
  paymentId: string | null
  number: string
  invoiceType: "Factura C" | "Factura E"
  pointOfSale: number
  issueDate: string
  client: string
  description: string
  amount: number
  cae: string | null
  caeExpiresAt: string | null
  status: GeneratedInvoiceStatus
}

export type TaxCategory = {
  key: string
  annualLimit: number
  monthlyTax: number
  warningAt: number
}

export type AssistantMessage = {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: string
}

export type RevenuePoint = {
  month: string
  revenue: number
  target: number
}

export type ProactiveAlertSeverity = "critical" | "warning" | "info"

export type ProactiveAlert = {
  id: string
  title: string
  description: string
  severity: ProactiveAlertSeverity
  action: string
}

export type TaxDueStatus = "paid" | "pending" | "due-soon" | "overdue"

export type TaxDue = {
  id: string
  monthKey: string
  dueDate: string
  amount: number
  status: TaxDueStatus
  paidAt: string | null
}

export type TaxPayment = {
  id: string
  monthKey: string
  amount: number
  paidAt: string
}

export type ManagedClientStatus = "ok" | "watch" | "action"

export type ManagedClient = {
  id: string
  name: string
  cuit: string
  category: string
  monthlyRevenue: number
  annualUsage: number
  pendingInvoices: number
  nextAction: string
  status: ManagedClientStatus
}
