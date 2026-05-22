import { currentTaxCategory } from "@/data/accounting"
import { supabase } from "@/lib/supabase"
import type {
  AssistantMessage,
  GeneratedInvoice,
  GeneratedInvoiceStatus,
  IncomeMethod,
  IncomePayment,
  InvoiceStatus,
  TaxCategory,
  TaxPayment,
  UserFiscalProfile,
} from "@/types/accounting"
import type { Database } from "@/types/database"

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"]
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]
type AssistantMessageRow =
  Database["public"]["Tables"]["assistant_messages"]["Row"]
type TaxSettingsRow = Database["public"]["Tables"]["tax_settings"]["Row"]
type TaxPaymentRow = Database["public"]["Tables"]["tax_payments"]["Row"]
type UserFiscalProfileRow =
  Database["public"]["Tables"]["user_fiscal_profiles"]["Row"]

type AssistantMessageInput = Pick<AssistantMessage, "content" | "role">

export const emptyFiscalProfile: UserFiscalProfile = {
  activity: "",
  workStatus: "",
  currentCategory: "",
  expectedMonthlyIncome: null,
  notes: "",
  updatedAt: null,
}

export async function fetchPayments() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("payments")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data.map(mapPaymentRow)
}

export async function createPayment(payment: Omit<IncomePayment, "id">) {
  assertSupabase()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase!
    .from("payments")
    .insert({
      date: payment.date,
      amount: payment.amount,
      client: payment.client,
      description: payment.description,
      method: payment.method,
      invoice_status: payment.invoiceStatus,
      user_id: userId,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapPaymentRow(data)
}

export async function updatePayment(payment: IncomePayment) {
  assertSupabase()

  const { data, error } = await supabase!
    .from("payments")
    .update({
      date: payment.date,
      amount: payment.amount,
      client: payment.client,
      description: payment.description,
      method: payment.method,
      invoice_status: payment.invoiceStatus,
    })
    .eq("id", payment.id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapPaymentRow(data)
}

export async function deletePayment(paymentId: string) {
  assertSupabase()

  const { error } = await supabase!
    .from("payments")
    .delete()
    .eq("id", paymentId)

  if (error) {
    throw error
  }
}

export async function fetchInvoices() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("invoices")
    .select("*")
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data.map(mapInvoiceRow)
}

export async function createInvoice(invoice: Omit<GeneratedInvoice, "id">) {
  assertSupabase()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase!
    .from("invoices")
    .insert({
      payment_id: invoice.paymentId,
      number: invoice.number,
      invoice_type: invoice.invoiceType,
      point_of_sale: invoice.pointOfSale,
      issue_date: invoice.issueDate,
      client: invoice.client,
      description: invoice.description,
      amount: invoice.amount,
      cae: invoice.cae,
      cae_expires_at: invoice.caeExpiresAt,
      status: invoice.status,
      user_id: userId,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapInvoiceRow(data)
}

export async function markPaymentAsInvoiced(paymentId: string) {
  assertSupabase()

  const { data, error } = await supabase!
    .from("payments")
    .update({
      invoice_status: "facturado",
    })
    .eq("id", paymentId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapPaymentRow(data)
}

export async function fetchAssistantMessages() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("assistant_messages")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return data.map(mapAssistantMessageRow)
}

export async function createAssistantMessage(message: AssistantMessageInput) {
  assertSupabase()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase!
    .from("assistant_messages")
    .insert({
      role: message.role,
      content: message.content,
      user_id: userId,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapAssistantMessageRow(data)
}

export async function clearAssistantMessages() {
  assertSupabase()

  const { error } = await supabase!
    .from("assistant_messages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    throw error
  }
}

export async function fetchFiscalProfile() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("user_fiscal_profiles")
    .select("*")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapFiscalProfileRow(data) : emptyFiscalProfile
}

export async function upsertFiscalProfile(profile: UserFiscalProfile) {
  assertSupabase()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase!
    .from("user_fiscal_profiles")
    .upsert({
      user_id: userId,
      activity: profile.activity,
      work_status: profile.workStatus,
      current_category: profile.currentCategory,
      expected_monthly_income: profile.expectedMonthlyIncome,
      notes: profile.notes,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapFiscalProfileRow(data)
}

export async function fetchTaxCategory(): Promise<TaxCategory> {
  assertSupabase()

  const { data, error } = await supabase!
    .from("tax_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapTaxSettingsRow(data) : currentTaxCategory
}

export async function fetchTaxPayments() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("tax_payments")
    .select("*")
    .order("month_key", { ascending: false })

  if (error) {
    throw error
  }

  return data.map(mapTaxPaymentRow)
}

export async function markTaxPaymentAsPaid({
  amount,
  monthKey,
  paidAt,
}: {
  amount: number
  monthKey: string
  paidAt: string
}) {
  assertSupabase()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase!
    .from("tax_payments")
    .upsert(
      {
        amount,
        month_key: monthKey,
        paid_at: paidAt,
        user_id: userId,
      },
      { onConflict: "user_id,month_key" }
    )
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapTaxPaymentRow(data)
}

export async function unmarkTaxPaymentAsPaid(monthKey: string) {
  assertSupabase()

  const { error } = await supabase!
    .from("tax_payments")
    .delete()
    .eq("month_key", monthKey)

  if (error) {
    throw error
  }
}

function mapPaymentRow(row: PaymentRow): IncomePayment {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    client: row.client,
    description: row.description,
    method: row.method as IncomeMethod,
    invoiceStatus: row.invoice_status as InvoiceStatus,
    source: row.source,
    invoiceType: row.invoice_type,
    pointOfSale: row.point_of_sale,
    cae: row.cae,
    receiverCuit: row.receiver_cuit,
  }
}

function mapInvoiceRow(row: InvoiceRow): GeneratedInvoice {
  return {
    id: row.id,
    paymentId: row.payment_id,
    number: row.number,
    invoiceType: row.invoice_type === "Factura E" ? "Factura E" : "Factura C",
    pointOfSale: Number(row.point_of_sale),
    issueDate: row.issue_date,
    client: row.client,
    description: row.description,
    amount: Number(row.amount),
    cae: row.cae,
    caeExpiresAt: row.cae_expires_at,
    status: row.status as GeneratedInvoiceStatus,
  }
}

function mapAssistantMessageRow(row: AssistantMessageRow): AssistantMessage {
  return {
    id: row.id,
    role: row.role as AssistantMessage["role"],
    content: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

function mapTaxSettingsRow(row: TaxSettingsRow): TaxCategory {
  return {
    key: row.category_key,
    annualLimit: Number(row.annual_limit),
    monthlyTax: Number(row.monthly_tax),
    warningAt: Number(row.warning_at),
  }
}

function mapTaxPaymentRow(row: TaxPaymentRow): TaxPayment {
  return {
    id: row.id,
    monthKey: row.month_key,
    amount: Number(row.amount),
    paidAt: row.paid_at,
  }
}

function mapFiscalProfileRow(row: UserFiscalProfileRow): UserFiscalProfile {
  return {
    activity: row.activity,
    workStatus: row.work_status,
    currentCategory: row.current_category,
    expectedMonthlyIncome:
      row.expected_monthly_income === null
        ? null
        : Number(row.expected_monthly_income),
    notes: row.notes,
    updatedAt: row.updated_at,
  }
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }
}

async function getCurrentUserId() {
  const { data, error } = await supabase!.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error("User is not authenticated")
  }

  return data.user.id
}
