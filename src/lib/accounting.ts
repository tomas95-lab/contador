import type {
  GeneratedInvoice,
  IncomePayment,
  ProactiveAlert,
  RevenuePoint,
  TaxCategory,
  TaxDue,
  UserFiscalProfile,
} from "@/types/accounting"
import { taxCategories } from "@/data/accounting"

const numberFormatter = new Intl.NumberFormat("es-AR")
const compactFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
  notation: "compact",
})

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
})

const shortMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
})

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
})

export type FinancialMetrics = {
  currentMonthKey: string
  previousMonthKey: string
  currentMonthRevenue: number
  previousMonthRevenue: number
  annualTotal: number
  annualLimitRemaining: number
  annualUsage: number
  currentVsPrevious: number
  projectedAnnual: number
  monthlyTarget: number
}

export type BillingScenario = {
  addedAmount: number
  repeatCount: number
  additionalTotal: number
  annualTotalAfter: number
  usageAfter: number
  remainingAfter: number
  recommendedCategory: TaxCategory
  monthlyTaxDelta: number
}

export function formatARS(value: number) {
  const sign = value < 0 ? "-" : ""

  return `${sign}$${numberFormatter.format(Math.abs(Math.round(value)))}`
}

export function formatCompactARS(value: number) {
  const sign = value < 0 ? "-" : ""

  return `${sign}$${compactFormatter.format(Math.abs(value))}`
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function getMonthKey(date: Date | string) {
  if (typeof date === "string") {
    return date.slice(0, 7)
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0")

  return `${date.getFullYear()}-${month}`
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 2, 1)

  return getMonthKey(date)
}

export function formatMonthName(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const value = monthFormatter.format(new Date(year, month - 1, 1))

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export function formatShortMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)

  return shortMonthFormatter.format(new Date(year, month - 1, 1))
}

export function formatPaymentDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day))
}

export function formatLongDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)

  return longDateFormatter.format(new Date(year, month - 1, day))
}

export function sortPaymentsByDate(payments: IncomePayment[]) {
  return [...payments].sort((a, b) => b.date.localeCompare(a.date))
}

export function sortInvoicesByDate(invoices: GeneratedInvoice[]) {
  return [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))
}

export function sumPayments(payments: IncomePayment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0)
}

export function getFinancialMetrics(
  payments: IncomePayment[],
  category: TaxCategory,
  referenceDate = new Date()
): FinancialMetrics {
  const currentMonthKey = getMonthKey(referenceDate)
  const previousMonthKey = getPreviousMonthKey(currentMonthKey)
  const currentYear = currentMonthKey.slice(0, 4)
  const currentMonthRevenue = sumPayments(
    payments.filter((payment) => getMonthKey(payment.date) === currentMonthKey)
  )
  const previousMonthRevenue = sumPayments(
    payments.filter((payment) => getMonthKey(payment.date) === previousMonthKey)
  )
  const annualTotal = sumPayments(
    payments.filter((payment) => payment.date.startsWith(currentYear))
  )
  const annualLimitRemaining = category.annualLimit - annualTotal
  const annualUsage = annualTotal / category.annualLimit
  const currentVsPrevious =
    previousMonthRevenue === 0
      ? 0
      : (currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue
  const monthNumber = Number(currentMonthKey.split("-")[1])
  const projectedAnnual = (annualTotal / monthNumber) * 12
  const monthlyTarget = category.annualLimit / 12

  return {
    currentMonthKey,
    previousMonthKey,
    currentMonthRevenue,
    previousMonthRevenue,
    annualTotal,
    annualLimitRemaining,
    annualUsage,
    currentVsPrevious,
    projectedAnnual,
    monthlyTarget,
  }
}

export function getBillingScenario({
  addedAmount,
  category,
  payments,
  repeatCount,
}: {
  addedAmount: number
  category: TaxCategory
  payments: IncomePayment[]
  repeatCount: number
}): BillingScenario {
  const metrics = getFinancialMetrics(payments, category)
  const normalizedAmount = Math.max(0, addedAmount)
  const normalizedRepeatCount = Math.max(1, Math.round(repeatCount))
  const additionalTotal = normalizedAmount * normalizedRepeatCount
  const annualTotalAfter = metrics.annualTotal + additionalTotal
  const recommendedCategory =
    taxCategories.find((item) => annualTotalAfter <= item.annualLimit) ??
    taxCategories[taxCategories.length - 1]

  return {
    addedAmount: normalizedAmount,
    repeatCount: normalizedRepeatCount,
    additionalTotal,
    annualTotalAfter,
    usageAfter: annualTotalAfter / category.annualLimit,
    remainingAfter: category.annualLimit - annualTotalAfter,
    recommendedCategory,
    monthlyTaxDelta: recommendedCategory.monthlyTax - category.monthlyTax,
  }
}

export function getProactiveAlerts({
  category,
  payments,
  profile,
  referenceDate = new Date(),
}: {
  category: TaxCategory
  payments: IncomePayment[]
  profile?: UserFiscalProfile
  referenceDate?: Date
}): ProactiveAlert[] {
  const metrics = getFinancialMetrics(payments, category, referenceDate)
  const alerts: ProactiveAlert[] = []
  const nextDueDate = getNextMonotributoDueDate(referenceDate)
  const daysUntilDue = getDaysBetween(referenceDate, parseInputDate(nextDueDate))
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )
  const pendingTotal = sumPayments(pendingPayments)
  const oldestPending = pendingPayments
    .map((payment) => getDaysBetween(parseInputDate(payment.date), referenceDate))
    .sort((a, b) => b - a)[0]

  if (daysUntilDue >= 0 && daysUntilDue <= 3) {
    alerts.push({
      id: "monotributo-due",
      title:
        daysUntilDue <= 1
          ? "Ojo: el 20 vence tu cuota"
          : `El ${formatLongDate(nextDueDate)} vence tu cuota`,
      description: `Monotributo categoria ${category.key}: ${formatARS(
        category.monthlyTax
      )}. Conviene dejarlo preparado antes del vencimiento.`,
      severity: daysUntilDue <= 1 ? "warning" : "info",
      action: "Preparar pago",
    })
  }

  if (metrics.annualUsage >= 1) {
    alerts.push({
      id: "category-exceeded",
      title: "Ya pasaste el limite de tu categoria",
      description: `El acumulado supera la categoria ${
        category.key
      } por ${formatARS(Math.abs(metrics.annualLimitRemaining))}.`,
      severity: "critical",
      action: "Revisar recategorizacion",
    })
  } else if (metrics.annualUsage >= category.warningAt) {
    alerts.push({
      id: "category-warning",
      title: "Estas cerca del limite anual",
      description: `Usaste ${formatPercent(
        metrics.annualUsage
      )} del tope. Quedan ${formatARS(metrics.annualLimitRemaining)}.`,
      severity: "warning",
      action: "Simular cobro nuevo",
    })
  } else if (metrics.projectedAnnual >= category.annualLimit) {
    alerts.push({
      id: "projected-limit",
      title: "Tu ritmo actual proyecta recategorizacion",
      description: `Con este promedio anualizarias ${formatARS(
        metrics.projectedAnnual
      )}, por encima de la categoria ${category.key}.`,
      severity: "warning",
      action: "Ver proyeccion",
    })
  }

  if (pendingPayments.length > 0) {
    alerts.push({
      id: "pending-invoices",
      title: "Tenes cobros pendientes de facturar",
      description:
        oldestPending && oldestPending > 2
          ? `${formatARS(pendingTotal)} sin factura. El mas antiguo tiene ${oldestPending} dias.`
          : `${formatARS(pendingTotal)} esperando comprobante fiscal.`,
      severity: "warning",
      action: "Emitir facturas",
    })
  }

  if (profile?.expectedMonthlyIncome) {
    const expectedAnnual = profile.expectedMonthlyIncome * 12

    if (expectedAnnual >= category.annualLimit * category.warningAt) {
      alerts.push({
        id: "expected-income-risk",
        title: "Tu ingreso esperado pide seguimiento",
        description: `El onboarding proyecta ${formatARS(
          expectedAnnual
        )} al año. Conviene mirar categoria antes de aceptar nuevos trabajos.`,
        severity: "info",
        action: "Actualizar contexto",
      })
    }
  }

  if (profile && hasComplexFiscalCase(profile)) {
    alerts.push({
      id: "complex-case",
      title: "Caso fiscal con reglas especiales",
      description:
        "Detecte exterior, cripto o relacion de dependencia en tu contexto. Conta va a responder con mas cautela en esos temas.",
      severity: "info",
      action: "Ver contexto",
    })
  }

  if (profile && !isFiscalProfileComplete(profile)) {
    alerts.push({
      id: "profile-incomplete",
      title: "Falta completar tu onboarding fiscal",
      description:
        "Actividad, categoria e ingreso esperado hacen que los avisos sean mucho mas precisos desde el dia 1.",
      severity: "info",
      action: "Completar perfil",
    })
  }

  return alerts.slice(0, 5)
}

export function getTaxDueHistory(
  category: TaxCategory,
  referenceDate = new Date()
): TaxDue[] {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()
  const today = startOfDay(referenceDate)

  return Array.from({ length: currentMonth + 1 }, (_, index) => {
    const dueDate = new Date(currentYear, index, 20)
    const dueDateValue = formatDateInputValue(dueDate)
    const isPastMonth = index < currentMonth
    const daysUntilDue = getDaysBetween(today, dueDate)
    const status: TaxDue["status"] = isPastMonth
      ? "paid"
      : dueDate < today
        ? "overdue"
        : daysUntilDue <= 3
          ? "due-soon"
          : "pending"

    return {
      id: `${currentYear}-${String(index + 1).padStart(2, "0")}`,
      monthKey: `${currentYear}-${String(index + 1).padStart(2, "0")}`,
      dueDate: dueDateValue,
      amount: category.monthlyTax,
      status,
    }
  }).reverse()
}

export function getNextMonotributoDueDate(referenceDate = new Date()) {
  const today = startOfDay(referenceDate)
  let dueDate = new Date(today.getFullYear(), today.getMonth(), 20)

  if (today > dueDate) {
    dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 20)
  }

  return formatDateInputValue(dueDate)
}

export function isFiscalProfileComplete(profile: UserFiscalProfile) {
  return Boolean(
    profile.activity.trim() &&
      profile.workStatus.trim() &&
      profile.currentCategory.trim() &&
      profile.expectedMonthlyIncome
  )
}

export function hasComplexFiscalCase(profile: UserFiscalProfile) {
  const normalized = `${profile.activity} ${profile.workStatus} ${profile.notes}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

  return /cripto|crypto|exterior|export|usd|dolar|relacion de dependencia|dependencia/.test(
    normalized
  )
}

export function buildRevenueSeries(
  payments: IncomePayment[],
  category: TaxCategory,
  referenceDate = new Date()
): RevenuePoint[] {
  const currentMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  )

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - (5 - index),
      1
    )
    const month = getMonthKey(date)

    return {
      month,
      revenue: sumPayments(
        payments.filter((payment) => getMonthKey(payment.date) === month)
      ),
      target: category.annualLimit / 12,
    }
  })
}

export function buildInvoiceDraft(
  payment: IncomePayment,
  existingInvoices: GeneratedInvoice[]
): Omit<GeneratedInvoice, "id"> {
  const nextNumber = existingInvoices.length + 1

  return {
    paymentId: payment.id,
    number: `0001-${String(nextNumber).padStart(8, "0")}`,
    invoiceType: "Factura C",
    pointOfSale: 1,
    issueDate: getTodayInputValue(),
    client: payment.client,
    description: payment.description,
    amount: payment.amount,
    cae: null,
    caeExpiresAt: null,
    status: "draft",
  }
}

export function getTodayInputValue() {
  return formatDateInputValue(new Date())
}

function parseInputDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)

  return new Date(year, month - 1, day)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDaysBetween(from: Date, to: Date) {
  const fromDate = startOfDay(from)
  const toDate = startOfDay(to)
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round((toDate.getTime() - fromDate.getTime()) / millisecondsPerDay)
}

function formatDateInputValue(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${date.getFullYear()}-${month}-${day}`
}
