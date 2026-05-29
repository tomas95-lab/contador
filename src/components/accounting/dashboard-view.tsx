import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PaymentsTable } from "@/components/accounting/payments-table"
import { MonthlyReportCard } from "@/components/accounting/monthly-report-card"
import { ProactiveAlerts } from "@/components/accounting/proactive-alerts"
import { RevenueChart } from "@/components/accounting/revenue-chart"
import { TaxDuesPanel } from "@/components/accounting/tax-dues-panel"
import { SectionCards } from "@/components/section-cards"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatLongDate,
  formatPercent,
  getFinancialMetrics,
  getProactiveAlerts,
  getTaxDueHistory,
  type FinancialMetrics,
} from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type {
  AppSection,
  GeneratedInvoice,
  IncomePayment,
  TaxCategory,
  TaxDue,
  TaxPayment,
  UserFiscalProfile,
} from "@/types/accounting"

type DashboardViewProps = {
  allCategories: TaxCategory[]
  payments: IncomePayment[]
  invoices: GeneratedInvoice[]
  category: TaxCategory
  profile: UserFiscalProfile
  taxDueActionMonthKey: string | null
  taxPayments: TaxPayment[]
  onMarkTaxDuePaid: (due: TaxDue) => Promise<void>
  onOpenSection: (section: AppSection) => void
  onUnmarkTaxDuePaid: (due: TaxDue) => Promise<void>
  onUnreadAlertsChange?: (count: number) => void
}

export function DashboardView({
  allCategories,
  category,
  invoices,
  onMarkTaxDuePaid,
  onOpenSection,
  onUnmarkTaxDuePaid,
  onUnreadAlertsChange,
  payments,
  profile,
  taxDueActionMonthKey,
  taxPayments,
}: DashboardViewProps) {
  const referenceDate = React.useMemo(() => new Date(), [])
  const metrics = React.useMemo(
    () => getFinancialMetrics(payments, category, referenceDate),
    [category, payments, referenceDate]
  )
  const alerts = React.useMemo(
    () => getProactiveAlerts({ category, payments, profile, referenceDate }),
    [category, payments, profile, referenceDate]
  )
  const dues = React.useMemo(
    () => getTaxDueHistory(category, referenceDate, taxPayments),
    [category, referenceDate, taxPayments]
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <RiskStatusCard
        category={category}
        metrics={metrics}
        onOpenProjections={() => onOpenSection("proyecciones")}
      />
      <ProactiveAlerts
        alerts={alerts}
        onOpenSection={onOpenSection}
        onUnreadCountChange={onUnreadAlertsChange}
      />
      <SectionCards
        allCategories={allCategories}
        metrics={metrics}
        category={category}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <RevenueChart payments={payments} category={category} />
        <div className="flex flex-col gap-4">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
          <CardTitle>Categoría fiscal</CardTitle>
              <CardDescription>
                {metrics.evaluationPeriod.statusLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uso del período</span>
                  <span className="font-medium tabular-nums">
                    {formatPercent(metrics.annualUsage)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 data-[risk=true]:bg-amber-500"
                    data-risk={metrics.annualUsage >= category.warningAt}
                    style={{
                      width: `${Math.min(metrics.annualUsage * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <span className="text-muted-foreground">Disponible</span>
                  <div className="mt-1 font-medium tabular-nums">
                    {formatARS(metrics.annualLimitRemaining)}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-muted-foreground">Proyectado</span>
                  <div className="mt-1 font-medium tabular-nums">
                    {formatARS(metrics.projectedAnnual)}
                  </div>
                </div>
              </div>
              <div className="w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                {metrics.evaluationPeriod.counterLabel}:{" "}
                {formatFiscalPeriodRange(metrics.evaluationPeriod)}
              </div>
            </CardContent>
          </Card>
          <TaxDuesPanel
            actionMonthKey={taxDueActionMonthKey}
            dues={dues}
            onMarkPaid={onMarkTaxDuePaid}
            onUnmarkPaid={onUnmarkTaxDuePaid}
          />
          <MonthlyReportCard
            alerts={alerts}
            category={category}
            invoices={invoices}
            payments={payments}
          />
        </div>
      </div>
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Últimos cobros</CardTitle>
          <CardDescription>Movimientos cargados recientemente</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsTable payments={payments} limit={6} />
        </CardContent>
      </Card>
    </div>
  )
}

type RiskState = "low" | "medium" | "high" | "critical"

const riskMeta: Record<
  RiskState,
  {
    badge: string
    bar: string
    card: string
    label: string
    message: (metrics: FinancialMetrics) => string
  }
> = {
  low: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    bar: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20",
    label: "BAJO",
    message: () => "Tu facturación está dentro del límite. Seguí así.",
  },
  medium: {
    badge:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300",
    bar: "bg-yellow-500",
    card: "border-yellow-200 bg-yellow-50/40 dark:border-yellow-900 dark:bg-yellow-950/20",
    label: "MEDIO",
    message: (metrics) =>
      `Estás usando ${formatPercent(
        metrics.annualUsage
      )} de tu límite anual. Prestá atención.`,
  },
  high: {
    badge:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
    bar: "bg-orange-500",
    card: "border-orange-200 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/20",
    label: "ALTO",
    message: () => "Atención: estás cerca del límite. Revisá tu ritmo.",
  },
  critical: {
    badge:
      "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
    bar: "bg-destructive",
    card: "border-destructive/30 bg-destructive/5",
    label: "CRÍTICO",
    message: () => "Riesgo de recategorización. Tomá acción ahora.",
  },
}

function RiskStatusCard({
  category,
  metrics,
  onOpenProjections,
}: {
  category: TaxCategory
  metrics: FinancialMetrics
  onOpenProjections: () => void
}) {
  const riskState = getRiskState(metrics)
  const meta = riskMeta[riskState]

  return (
    <Card className={cn("rounded-lg shadow-none", meta.card)}>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge className={meta.badge} variant="outline">
              Semáforo {meta.label}
            </Badge>
            <div>
              <CardTitle>Radar de categoría</CardTitle>
              <CardDescription className="mt-1 text-sm">
                {meta.message(metrics)}
              </CardDescription>
            </div>
          </div>
          <div className="min-w-36 rounded-lg border bg-background/70 p-3 text-right">
            <div className="text-xs font-medium text-muted-foreground uppercase">
              Riesgo fiscal
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">
              {metrics.riskScore}
              <span className="text-base text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Uso de categoría {category.key}
            </span>
            <span className="font-medium tabular-nums">
              {formatPercent(metrics.annualUsage)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-background/80">
            <div
              className={cn("h-full rounded-full", meta.bar)}
              style={{ width: `${Math.min(metrics.riskScore, 100)}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <RadarMetric
            label="Margen disponible"
            value={formatARS(metrics.annualLimitRemaining)}
          />
          <RadarMetric
            label="Proyección"
            value={formatARS(metrics.projectedAnnual)}
          />
          <RadarMetric
            label="Fecha estimada de tope"
            value={
              metrics.projectedBreachDate
                ? formatLongDate(metrics.projectedBreachDate)
                : "Sin cruce"
            }
          />
          <RadarMetric
            label="Sin facturar"
            value={`${metrics.monthsWithoutInvoices} meses`}
          />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3 text-sm md:flex-row md:items-center md:justify-between">
          <span className="text-muted-foreground">
            Período evaluado:{" "}
            {formatFiscalPeriodRange(metrics.evaluationPeriod)}
          </span>
          <Button onClick={onOpenProjections} size="sm" type="button">
            Ver simulador
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RadarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
    </div>
  )
}

function getRiskState(metrics: FinancialMetrics): RiskState {
  if (
    metrics.annualUsage > 0.95 ||
    (metrics.daysUntilBreach !== null && metrics.daysUntilBreach < 30)
  ) {
    return "critical"
  }

  if (metrics.annualUsage >= 0.8) {
    return "high"
  }

  if (metrics.annualUsage >= 0.6) {
    return "medium"
  }

  return "low"
}
