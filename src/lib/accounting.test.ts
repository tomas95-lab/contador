import { describe, expect, it } from "vitest"

import {
  getBillingScenario,
  getFinancialMetrics,
  getFiscalEvaluationPeriod,
  getProactiveAlerts,
  getTaxDueHistory,
} from "@/lib/accounting"
import type {
  IncomePayment,
  TaxCategory,
  UserFiscalProfile,
} from "@/types/accounting"

const categoryA: TaxCategory = {
  key: "A",
  annualLimit: 1000,
  monthlyTax: 100,
  warningAt: 0.85,
}

const categoryB: TaxCategory = {
  key: "B",
  annualLimit: 2000,
  monthlyTax: 200,
  warningAt: 0.85,
}

const allCategories = [categoryA, categoryB]
const referenceDate = new Date(2026, 4, 30)

function payment(
  amount: number,
  date = "2026-03-15",
  invoiceStatus: IncomePayment["invoiceStatus"] = "facturado",
  source?: string
): IncomePayment {
  return {
    amount,
    client: "Cliente",
    date,
    description: "Servicio",
    id: crypto.randomUUID(),
    invoiceStatus,
    method: "Transferencia",
    source,
  }
}

function profile(
  overrides: Partial<UserFiscalProfile> = {}
): UserFiscalProfile {
  return {
    activity: "",
    currentCategory: "",
    expectedMonthlyIncome: null,
    notes: "",
    updatedAt: null,
    workStatus: "",
    ...overrides,
  }
}

describe("getFinancialMetrics", () => {
  it("retorna annualTotal correcto sumando pagos del período", () => {
    const metrics = getFinancialMetrics(
      [payment(200, "2026-01-10"), payment(300, "2026-05-20")],
      categoryA,
      referenceDate
    )

    expect(metrics.annualTotal).toBe(500)
  })

  it("retorna annualUsage como porcentaje correcto", () => {
    const metrics = getFinancialMetrics(
      [payment(250, "2026-01-10")],
      categoryA,
      referenceDate
    )

    expect(metrics.annualUsage).toBe(0.25)
  })

  it("retorna annualLimitRemaining correcto", () => {
    const metrics = getFinancialMetrics(
      [payment(250, "2026-01-10")],
      categoryA,
      referenceDate
    )

    expect(metrics.annualLimitRemaining).toBe(750)
  })

  it("con pagos vacíos retorna todo en cero", () => {
    const metrics = getFinancialMetrics([], categoryA, referenceDate)

    expect(metrics.currentMonthRevenue).toBe(0)
    expect(metrics.previousMonthRevenue).toBe(0)
    expect(metrics.annualTotal).toBe(0)
    expect(metrics.annualUsage).toBe(0)
    expect(metrics.projectedAnnual).toBe(0)
  })

  it("ignora pagos fuera del período fiscal", () => {
    const metrics = getFinancialMetrics(
      [
        payment(400, "2026-01-10"),
        payment(900, "2025-06-30"),
        payment(800, "2026-07-01"),
      ],
      categoryA,
      referenceDate
    )

    expect(metrics.annualTotal).toBe(400)
  })

  it("excluye cobros pendientes y cuenta cobros con CAE", () => {
    const pendingWithCae = payment(300, "2026-03-15", "pendiente")
    pendingWithCae.cae = "12345678901234"

    const metrics = getFinancialMetrics(
      [
        payment(700, "2026-03-15", "pendiente"),
        payment(200, "2026-03-15", "facturado"),
        pendingWithCae,
      ],
      categoryA,
      referenceDate
    )

    expect(metrics.annualTotal).toBe(500)
  })
})

describe("getTaxDueHistory", () => {
  it("marca cuotas vencidas sin registro como overdue", () => {
    const history = getTaxDueHistory(categoryA, referenceDate)

    expect(history).toHaveLength(5)
    expect(history.every((due) => due.status === "overdue")).toBe(true)
  })

  it("solo marca paid cuando existe un pago registrado", () => {
    const history = getTaxDueHistory(categoryA, referenceDate, [
      {
        amount: 100,
        id: "payment-1",
        monthKey: "2026-03",
        paidAt: "2026-03-20",
      },
    ])

    expect(history.find((due) => due.monthKey === "2026-03")?.status).toBe(
      "paid"
    )
    expect(history.find((due) => due.monthKey === "2026-04")?.status).toBe(
      "overdue"
    )
  })
})

describe("getBillingScenario", () => {
  it("con monto que no supera límite, recommendedCategory es la actual", () => {
    const scenario = getBillingScenario({
      addedAmount: 100,
      allCategories,
      category: categoryA,
      payments: [payment(400)],
      repeatCount: 1,
      referenceDate,
    })

    expect(scenario.recommendedCategory).toBe(categoryA)
  })

  it("con monto que supera límite, recommendedCategory sube", () => {
    const scenario = getBillingScenario({
      addedAmount: 700,
      allCategories,
      category: categoryA,
      payments: [payment(400)],
      repeatCount: 1,
      referenceDate,
    })

    expect(scenario.recommendedCategory).toBe(categoryB)
  })

  it("con repeatCount > 1 multiplica correctamente", () => {
    const scenario = getBillingScenario({
      addedAmount: 100,
      allCategories,
      category: categoryA,
      payments: [payment(400)],
      repeatCount: 3,
      referenceDate,
    })

    expect(scenario.additionalTotal).toBe(300)
    expect(scenario.annualTotalAfter).toBe(700)
  })
})

describe("getFiscalEvaluationPeriod", () => {
  it("retorna período correcto según fecha actual", () => {
    const period = getFiscalEvaluationPeriod(referenceDate)

    expect(period.startDate).toBe("2025-07-01")
    expect(period.endDate).toBe("2026-06-30")
    expect(period.recategorizationLabel).toBe("julio/agosto 2026")
  })

  it("isFilingWindow es true en febrero y agosto", () => {
    expect(getFiscalEvaluationPeriod(new Date(2026, 1, 1)).isFilingWindow).toBe(
      true
    )
    expect(getFiscalEvaluationPeriod(new Date(2026, 7, 1)).isFilingWindow).toBe(
      true
    )
  })

  it("isFilingWindow es false en otros meses", () => {
    expect(
      getFiscalEvaluationPeriod(new Date(2026, 4, 30)).isFilingWindow
    ).toBe(false)
  })
})

describe("getProactiveAlerts", () => {
  it("retorna alerta category-warning cuando usage > 0.85", () => {
    const alerts = getProactiveAlerts({
      category: categoryA,
      payments: [payment(860, "2026-05-01")],
      referenceDate,
    })

    expect(alerts.some((alert) => alert.id === "category-warning")).toBe(true)
  })

  it("retorna alerta projected-breach-soon cuando daysUntilBreach < 60", () => {
    const alerts = getProactiveAlerts({
      category: categoryA,
      payments: [payment(950, "2026-05-01")],
      referenceDate,
    })

    expect(alerts.some((alert) => alert.id === "projected-breach-soon")).toBe(
      true
    )
  })

  it("no retorna más de 6 alertas", () => {
    const alerts = getProactiveAlerts({
      category: categoryA,
      payments: [
        payment(1200, "2026-05-01", "pendiente"),
        payment(1000, "2026-04-01", "facturado", "arca_historical"),
        payment(10, "2026-04-02"),
      ],
      profile: profile({
        activity: "Exportación cripto",
        expectedMonthlyIncome: 1000,
        notes: "Cliente exterior USD",
        workStatus: "Relación de dependencia",
      }),
      referenceDate: new Date(2026, 4, 19),
    })

    expect(alerts.length).toBeLessThanOrEqual(6)
  })
})
