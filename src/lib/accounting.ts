import type {
  GeneratedInvoice,
  IncomePayment,
  ProactiveAlert,
  RevenuePoint,
  TaxCategory,
  TaxDue,
  TaxPayment,
  UserFiscalProfile,
} from "@/types/accounting"

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

export type FiscalEvaluationMode = "filing-window" | "preventive"

export type FiscalEvaluationPeriod = {
  startDate: string
  endDate: string
  label: string
  recategorizationLabel: string
  filingStartDate: string
  filingEndDate: string
  isFilingWindow: boolean
  mode: FiscalEvaluationMode
  statusLabel: string
  counterLabel: string
}

export type FinancialMetrics = {
  currentMonthKey: string
  previousMonthKey: string
  currentMonthRevenue: number
  previousMonthRevenue: number
  evaluationPeriod: FiscalEvaluationPeriod
  annualTotal: number
  annualLimitRemaining: number
  annualUsage: number
  currentVsPrevious: number
  projectedAnnual: number
  projectedLimitRemaining: number
  periodElapsedDays: number
  periodTotalDays: number
  periodElapsedRatio: number
  monthlyTarget: number
  riskScore: number
  projectedBreachDate: string | null
  daysUntilBreach: number | null
  monthsWithoutInvoices: number
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

export function formatFiscalPeriodRange(period: FiscalEvaluationPeriod) {
  return `${formatDateForDisplay(period.startDate)} al ${formatDateForDisplay(
    period.endDate
  )}`
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

export function getFiscalEvaluationPeriod(
  referenceDate = new Date()
): FiscalEvaluationPeriod {
  const today = startOfDay(referenceDate)
  const year = today.getFullYear()
  const januaryWindow = {
    start: new Date(year, 0, 1),
    end: new Date(year, 1, 5),
  }
  const julyWindow = {
    start: new Date(year, 6, 1),
    end: new Date(year, 7, 5),
  }

  if (isDateInRange(today, januaryWindow.start, januaryWindow.end)) {
    return buildFiscalEvaluationPeriod("january", year, true)
  }

  if (isDateInRange(today, julyWindow.start, julyWindow.end)) {
    return buildFiscalEvaluationPeriod("july", year, true)
  }

  if (today < julyWindow.start) {
    return buildFiscalEvaluationPeriod("july", year, false)
  }

  return buildFiscalEvaluationPeriod("january", year + 1, false)
}

export function getPaymentsInFiscalPeriod(
  payments: IncomePayment[],
  period: FiscalEvaluationPeriod
) {
  return payments.filter(
    (payment) =>
      payment.date >= period.startDate && payment.date <= period.endDate
  )
}

export function getFinancialMetrics(
  payments: IncomePayment[],
  category: TaxCategory,
  referenceDate = new Date()
): FinancialMetrics {
  const currentMonthKey = getMonthKey(referenceDate)
  const previousMonthKey = getPreviousMonthKey(currentMonthKey)
  const evaluationPeriod = getFiscalEvaluationPeriod(referenceDate)
  const currentMonthRevenue = sumPayments(
    payments.filter((payment) => getMonthKey(payment.date) === currentMonthKey)
  )
  const previousMonthRevenue = sumPayments(
    payments.filter((payment) => getMonthKey(payment.date) === previousMonthKey)
  )
  const periodPayments = getPaymentsInFiscalPeriod(payments, evaluationPeriod)
  const annualTotal = sumPayments(periodPayments)
  const annualLimitRemaining = category.annualLimit - annualTotal
  const annualUsage = annualTotal / category.annualLimit
  const currentVsPrevious =
    previousMonthRevenue === 0
      ? 0
      : (currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue
  const { elapsedDays: periodElapsedDays, totalDays: periodTotalDays } =
    getFiscalPeriodProgress(evaluationPeriod, referenceDate)
  const projectedAnnual =
    annualTotal > 0
      ? (annualTotal / Math.max(periodElapsedDays, 1)) * periodTotalDays
      : 0
  const projectedLimitRemaining = category.annualLimit - projectedAnnual
  const monthlyTarget = category.annualLimit / 12
  const projectedBreach = getProjectedBreach({
    annualTotal,
    category,
    evaluationPeriod,
    periodElapsedDays,
    referenceDate,
  })
  const monthsWithoutInvoices = getMonthsWithoutInvoices(
    periodPayments,
    evaluationPeriod,
    referenceDate
  )
  const riskScore = getRiskScore({
    annualUsage,
    daysUntilBreach: projectedBreach.daysUntilBreach,
    monthsWithoutInvoices,
  })

  return {
    currentMonthKey,
    previousMonthKey,
    currentMonthRevenue,
    previousMonthRevenue,
    evaluationPeriod,
    annualTotal,
    annualLimitRemaining,
    annualUsage,
    currentVsPrevious,
    projectedAnnual,
    projectedLimitRemaining,
    periodElapsedDays,
    periodTotalDays,
    periodElapsedRatio: periodElapsedDays / periodTotalDays,
    monthlyTarget,
    riskScore,
    projectedBreachDate: projectedBreach.projectedBreachDate,
    daysUntilBreach: projectedBreach.daysUntilBreach,
    monthsWithoutInvoices,
  }
}

export function getBillingScenario({
  addedAmount,
  allCategories,
  category,
  payments,
  repeatCount,
  referenceDate = new Date(),
}: {
  addedAmount: number
  allCategories: TaxCategory[]
  category: TaxCategory
  payments: IncomePayment[]
  repeatCount: number
  referenceDate?: Date
}): BillingScenario {
  const metrics = getFinancialMetrics(payments, category, referenceDate)
  const normalizedAmount = Math.max(0, addedAmount)
  const normalizedRepeatCount = Math.max(1, Math.round(repeatCount))
  const additionalTotal = normalizedAmount * normalizedRepeatCount
  const annualTotalAfter = metrics.annualTotal + additionalTotal
  const recommendedCategory =
    allCategories.find((item) => annualTotalAfter <= item.annualLimit) ??
    allCategories[allCategories.length - 1]

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
  const daysUntilDue = getDaysBetween(
    referenceDate,
    parseInputDate(nextDueDate)
  )
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )
  const pendingTotal = sumPayments(pendingPayments)
  const arcaDifference = getArcaAppDifference(
    payments,
    metrics.evaluationPeriod
  )
  const oldestPending = pendingPayments
    .map((payment) =>
      getDaysBetween(parseInputDate(payment.date), referenceDate)
    )
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
      title: "Ya pasaste el limite del periodo",
      description: `El acumulado supera la categoria ${
        category.key
      } por ${formatARS(Math.abs(metrics.annualLimitRemaining))} en ${
        metrics.evaluationPeriod.label
      }.`,
      severity: "critical",
      action: "Revisar recategorizacion",
    })
  } else if (
    metrics.daysUntilBreach !== null &&
    metrics.daysUntilBreach <= 60
  ) {
    alerts.push({
      id: "projected-breach-soon",
      title: "Tu ritmo cruza el limite pronto",
      description: `Si seguis igual, cruzarias el tope en ${
        metrics.daysUntilBreach
      } dias, alrededor del ${formatLongDate(metrics.projectedBreachDate!)}.`,
      severity: metrics.daysUntilBreach < 30 ? "critical" : "warning",
      action: "Ver proyeccion",
    })
  } else if (metrics.annualUsage >= category.warningAt) {
    alerts.push({
      id: "category-warning",
      title: "Estas cerca del limite del periodo",
      description: `Usaste ${formatPercent(
        metrics.annualUsage
      )} del tope. Quedan ${formatARS(metrics.annualLimitRemaining)} para ${
        metrics.evaluationPeriod.recategorizationLabel
      }.`,
      severity: "warning",
      action: "Simular cobro nuevo",
    })
  } else if (metrics.projectedAnnual >= category.annualLimit) {
    alerts.push({
      id: "projected-limit",
      title: "Tu ritmo actual proyecta recategorizacion",
      description: `Con este promedio anualizarias ${formatARS(
        metrics.projectedAnnual
      )} en ${metrics.evaluationPeriod.label}, por encima de la categoria ${
        category.key
      }.`,
      severity: "warning",
      action: "Ver proyeccion",
    })
  }

  if (
    metrics.evaluationPeriod.isFilingWindow &&
    (metrics.annualUsage >= 0.8 ||
      metrics.projectedAnnual >= category.annualLimit)
  ) {
    alerts.push({
      id: "recategorization-window-risk",
      title: "Recategorizacion activa con riesgo",
      description: `Estas en ventana de tramite hasta el ${formatLongDate(
        metrics.evaluationPeriod.filingEndDate
      )}. Revisá categoria ${category.key} con ${formatPercent(
        metrics.annualUsage
      )} del limite usado.`,
      severity: metrics.annualUsage >= 0.95 ? "critical" : "warning",
      action: "Revisar categoria",
    })
  }

  if (metrics.monthsWithoutInvoices >= 2) {
    alerts.push({
      id: "months-without-invoices",
      title: "Hay meses sin facturas emitidas",
      description: `${metrics.monthsWithoutInvoices} meses seguidos sin facturas registradas. Si hubo actividad, conviene revisar comprobantes y pagos.`,
      severity: "warning",
      action: "Revisar facturacion",
    })
  }

  if (arcaDifference && arcaDifference.ratio > 0.1) {
    alerts.push({
      id: "arca-app-delta",
      title: "ARCA y la app no coinciden",
      description: `La diferencia entre facturacion ARCA (${formatARS(
        arcaDifference.arcaTotal
      )}) y registros de la app (${formatARS(
        arcaDifference.appTotal
      )}) supera el 10%.`,
      severity: "warning",
      action: "Conciliar datos",
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
      title: "Completá tu perfil para que Conta te dé consejos más precisos",
      description:
        "Actividad, categoria e ingreso esperado hacen que los avisos sean mucho mas precisos desde el dia 1.",
      severity: "info",
      action: "Completar perfil",
    })
  }

  return alerts.sort(compareAlertsBySeverity).slice(0, 6)
}

export function getTaxDueHistory(
  category: TaxCategory,
  referenceDate = new Date(),
  taxPayments: TaxPayment[] = []
): TaxDue[] {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()
  const today = startOfDay(referenceDate)
  const paidByMonth = new Map(
    taxPayments.map((payment) => [payment.monthKey, payment])
  )

  return Array.from({ length: currentMonth + 1 }, (_, index) => {
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`
    const dueDate = new Date(currentYear, index, 20)
    const dueDateValue = formatDateInputValue(dueDate)
    const isPastMonth = index < currentMonth
    const daysUntilDue = getDaysBetween(today, dueDate)
    const taxPayment = paidByMonth.get(monthKey)
    const status: TaxDue["status"] = taxPayment
      ? "paid"
      : isPastMonth
        ? "paid"
        : dueDate < today
          ? "overdue"
          : daysUntilDue <= 3
            ? "due-soon"
            : "pending"

    return {
      id: monthKey,
      monthKey,
      dueDate: dueDateValue,
      amount: category.monthlyTax,
      status,
      paidAt: taxPayment?.paidAt ?? null,
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
  const normalized =
    `${profile.activity} ${profile.workStatus} ${profile.notes}`
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

function getProjectedBreach({
  annualTotal,
  category,
  evaluationPeriod,
  periodElapsedDays,
  referenceDate,
}: {
  annualTotal: number
  category: TaxCategory
  evaluationPeriod: FiscalEvaluationPeriod
  periodElapsedDays: number
  referenceDate: Date
}) {
  if (annualTotal >= category.annualLimit) {
    return {
      projectedBreachDate: formatDateInputValue(referenceDate),
      daysUntilBreach: 0,
    }
  }

  if (annualTotal <= 0) {
    return {
      projectedBreachDate: null,
      daysUntilBreach: null,
    }
  }

  const dailyAverage = annualTotal / Math.max(periodElapsedDays, 1)
  const daysUntilBreach = Math.ceil(
    (category.annualLimit - annualTotal) / dailyAverage
  )
  const breachDate = addDays(referenceDate, daysUntilBreach)
  const periodEndDate = parseInputDate(evaluationPeriod.endDate)

  if (breachDate > periodEndDate) {
    return {
      projectedBreachDate: null,
      daysUntilBreach: null,
    }
  }

  return {
    projectedBreachDate: formatDateInputValue(breachDate),
    daysUntilBreach,
  }
}

function getMonthsWithoutInvoices(
  periodPayments: IncomePayment[],
  period: FiscalEvaluationPeriod,
  referenceDate: Date
) {
  if (periodPayments.length === 0) {
    return 0
  }

  const firstActivityMonth = periodPayments
    .map((payment) => getMonthKey(payment.date))
    .sort()[0]
  const invoicedMonths = new Set(
    periodPayments
      .filter((payment) => payment.invoiceStatus === "facturado" || payment.cae)
      .map((payment) => getMonthKey(payment.date))
  )
  const currentDate = startOfDay(referenceDate)
  const periodStartDate = parseInputDate(period.startDate)
  const periodEndDate = parseInputDate(period.endDate)
  const cappedDate =
    currentDate < periodStartDate
      ? periodStartDate
      : currentDate > periodEndDate
        ? periodEndDate
        : currentDate
  let monthKey = getMonthKey(cappedDate)
  let monthsWithoutInvoices = 0

  while (monthKey >= firstActivityMonth) {
    if (invoicedMonths.has(monthKey)) {
      break
    }

    monthsWithoutInvoices += 1
    monthKey = getPreviousMonthKey(monthKey)
  }

  return monthsWithoutInvoices
}

function getRiskScore({
  annualUsage,
  daysUntilBreach,
  monthsWithoutInvoices,
}: {
  annualUsage: number
  daysUntilBreach: number | null
  monthsWithoutInvoices: number
}) {
  let score = clamp(Math.round(annualUsage * 100), 0, 100)

  if (daysUntilBreach !== null) {
    const breachScore =
      daysUntilBreach <= 0
        ? 100
        : daysUntilBreach < 30
          ? 95
          : daysUntilBreach < 60
            ? 85
            : 70

    score = Math.max(score, breachScore)
  }

  if (monthsWithoutInvoices >= 2) {
    score += Math.min(20, monthsWithoutInvoices * 5)
  }

  return clamp(score, 0, 100)
}

function getArcaAppDifference(
  payments: IncomePayment[],
  period: FiscalEvaluationPeriod
) {
  const periodPayments = getPaymentsInFiscalPeriod(payments, period)
  const arcaTotal = sumPayments(periodPayments.filter(isArcaPayment))
  const appTotal = sumPayments(
    periodPayments.filter((payment) => !isArcaPayment(payment))
  )

  if (arcaTotal <= 0 || appTotal <= 0) {
    return null
  }

  return {
    arcaTotal,
    appTotal,
    ratio: Math.abs(arcaTotal - appTotal) / Math.max(arcaTotal, appTotal),
  }
}

function isArcaPayment(payment: IncomePayment) {
  return payment.source?.startsWith("arca") === true
}

function compareAlertsBySeverity(left: ProactiveAlert, right: ProactiveAlert) {
  const severityOrder: Record<ProactiveAlert["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return severityOrder[left.severity] - severityOrder[right.severity]
}

function parseInputDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)

  return new Date(year, month - 1, day)
}

function buildFiscalEvaluationPeriod(
  window: "january" | "july",
  filingYear: number,
  isFilingWindow: boolean
): FiscalEvaluationPeriod {
  const isJanuaryWindow = window === "january"
  const startDate = isJanuaryWindow
    ? new Date(filingYear - 1, 0, 1)
    : new Date(filingYear - 1, 6, 1)
  const endDate = isJanuaryWindow
    ? new Date(filingYear - 1, 11, 31)
    : new Date(filingYear, 5, 30)
  const filingStartDate = isJanuaryWindow
    ? new Date(filingYear, 0, 1)
    : new Date(filingYear, 6, 1)
  const filingEndDate = isJanuaryWindow
    ? new Date(filingYear, 1, 5)
    : new Date(filingYear, 7, 5)
  const recategorizationLabel = isJanuaryWindow
    ? `enero/febrero ${filingYear}`
    : `julio/agosto ${filingYear}`
  const period = {
    startDate: formatDateInputValue(startDate),
    endDate: formatDateInputValue(endDate),
  }

  return {
    ...period,
    label: `${period.startDate} a ${period.endDate}`,
    recategorizationLabel,
    filingStartDate: formatDateInputValue(filingStartDate),
    filingEndDate: formatDateInputValue(filingEndDate),
    isFilingWindow,
    mode: isFilingWindow ? "filing-window" : "preventive",
    statusLabel: isFilingWindow
      ? "Ventana de recategorizacion activa"
      : "Fuera de ventana de tramite",
    counterLabel: isFilingWindow
      ? "Periodo oficial en evaluacion"
      : "Periodo preventivo para la proxima recategorizacion",
  }
}

function getFiscalPeriodProgress(
  period: FiscalEvaluationPeriod,
  referenceDate: Date
) {
  const startDate = parseInputDate(period.startDate)
  const endDate = parseInputDate(period.endDate)
  const today = startOfDay(referenceDate)
  const cappedToday =
    today < startDate ? startDate : today > endDate ? endDate : today
  const totalDays = getDaysBetween(startDate, endDate) + 1
  const elapsedDays = getDaysBetween(startDate, cappedToday) + 1

  return {
    elapsedDays: Math.min(Math.max(elapsedDays, 1), totalDays),
    totalDays,
  }
}

function formatDateForDisplay(date: string) {
  const [year, month, day] = date.split("-")

  return `${day}/${month}/${year}`
}

function isDateInRange(date: Date, start: Date, end: Date) {
  return date >= startOfDay(start) && date <= startOfDay(end)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDaysBetween(from: Date, to: Date) {
  const fromDate = startOfDay(from)
  const toDate = startOfDay(to)
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round(
    (toDate.getTime() - fromDate.getTime()) / millisecondsPerDay
  )
}

function addDays(date: Date, days: number) {
  const nextDate = startOfDay(date)

  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatDateInputValue(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${date.getFullYear()}-${month}-${day}`
}
