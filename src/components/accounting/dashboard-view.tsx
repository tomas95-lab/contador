import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PaymentsTable } from "@/components/accounting/payments-table"
import { MonthlyReportCard } from "@/components/accounting/monthly-report-card"
import { ProactiveAlerts } from "@/components/accounting/proactive-alerts"
import { RevenueChart } from "@/components/accounting/revenue-chart"
import { TaxDuesPanel } from "@/components/accounting/tax-dues-panel"
import { SectionCards } from "@/components/section-cards"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatPercent,
  getFinancialMetrics,
  getProactiveAlerts,
  getTaxDueHistory,
} from "@/lib/accounting"
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
  payments: IncomePayment[]
  invoices: GeneratedInvoice[]
  category: TaxCategory
  profile: UserFiscalProfile
  taxDueActionMonthKey: string | null
  taxPayments: TaxPayment[]
  onMarkTaxDuePaid: (due: TaxDue) => Promise<void>
  onOpenSection: (section: AppSection) => void
  onUnmarkTaxDuePaid: (due: TaxDue) => Promise<void>
}

export function DashboardView({
  category,
  invoices,
  onMarkTaxDuePaid,
  onOpenSection,
  onUnmarkTaxDuePaid,
  payments,
  profile,
  taxDueActionMonthKey,
  taxPayments,
}: DashboardViewProps) {
  const metrics = getFinancialMetrics(payments, category)
  const alerts = getProactiveAlerts({ category, payments, profile })
  const dues = getTaxDueHistory(category, new Date(), taxPayments)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ProactiveAlerts alerts={alerts} onOpenSection={onOpenSection} />
      <SectionCards metrics={metrics} category={category} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <RevenueChart payments={payments} category={category} />
        <div className="flex flex-col gap-4">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardTitle>Categoria fiscal</CardTitle>
              <CardDescription>
                {metrics.evaluationPeriod.statusLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uso del periodo</span>
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
          <CardTitle>Ultimos cobros</CardTitle>
          <CardDescription>Movimientos cargados recientemente</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsTable payments={payments} limit={6} />
        </CardContent>
      </Card>
    </div>
  )
}
