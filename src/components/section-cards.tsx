import { Badge } from "@/components/ui/badge"
import CardModified from "@/components/components_modified/Card.tsx"
import {
  formatARS,
  formatLongDate,
  formatPercent,
  getNextMonotributoDueDate,
  type FinancialMetrics,
} from "@/lib/accounting"
import type { TaxCategory } from "@/types/accounting"
import {
  CalendarClockIcon,
  GaugeIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
} from "lucide-react"

type SectionCardsProps = {
  allCategories: TaxCategory[]
  metrics: FinancialMetrics
  category: TaxCategory
}

export function SectionCards({
  allCategories,
  metrics,
  category,
}: SectionCardsProps) {
  const projectedCategory =
    allCategories.find((item) => metrics.projectedAnnual <= item.annualLimit) ??
    allCategories[allCategories.length - 1]
  const projectedGoesUp = projectedCategory.annualLimit > category.annualLimit
  const nextMilestone = getNextFiscalMilestone(metrics)
  const hasBreachProjection = metrics.daysUntilBreach !== null

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <CardModified
        title={formatARS(metrics.annualLimitRemaining)}
        description="Margen hasta recategorización"
        action={
          <Badge
            variant="outline"
            className={
              metrics.annualUsage >= 0.8
                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            }
          >
            <ShieldAlertIcon />
            {formatPercent(metrics.annualUsage)}
          </Badge>
        }
        footerMain={`Usaste ${formatARS(metrics.annualTotal)} de categoría ${category.key}`}
        footerSub={`Límite: ${formatARS(category.annualLimit)}`}
        variant={metrics.annualUsage >= 0.8 ? "warning" : "success"}
      />

      <CardModified
        title={`Cat. ${projectedCategory.key}`}
        description="Ritmo proyectado"
        action={
          <Badge
            className={
              projectedGoesUp
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            }
            variant="outline"
          >
            <TrendingUpIcon />
            {projectedGoesUp ? "Sube" : "OK"}
          </Badge>
        }
        footerMain={`Proyección: ${formatARS(metrics.projectedAnnual)}`}
        footerSub={`Actual: categoría ${category.key}`}
        variant={projectedGoesUp ? "warning" : "success"}
      />

      <CardModified
        title={
          hasBreachProjection ? `${metrics.daysUntilBreach} días` : "Sin cruce"
        }
        description="Días hasta riesgo"
        action={
          <Badge
            className={
              hasBreachProjection
                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            }
            variant="outline"
          >
            <GaugeIcon />
            {metrics.riskScore}/100
          </Badge>
        }
        footerMain={
          metrics.projectedBreachDate
            ? `Fecha estimada de tope: ${formatLongDate(metrics.projectedBreachDate)}`
            : "Al ritmo actual no cruzás el límite"
        }
        footerSub="Dentro del período fiscal evaluado"
        variant={hasBreachProjection ? "warning" : "success"}
      />

      <CardModified
        title={formatLongDate(nextMilestone.date)}
        description="Proximo vencimiento"
        action={
          <Badge variant="outline">
            <CalendarClockIcon />
            {nextMilestone.kind === "tax" ? "Cuota" : "Recateg."}
          </Badge>
        }
        footerMain={nextMilestone.label}
        footerSub={metrics.evaluationPeriod.recategorizationLabel}
      />
    </div>
  )
}

function getNextFiscalMilestone(metrics: FinancialMetrics) {
  const nextTaxDueDate = getNextMonotributoDueDate()
  const recategorizationDate = metrics.evaluationPeriod.isFilingWindow
    ? metrics.evaluationPeriod.filingEndDate
    : metrics.evaluationPeriod.filingStartDate

  if (nextTaxDueDate <= recategorizationDate) {
    return {
      date: nextTaxDueDate,
      kind: "tax" as const,
      label: "Cuota mensual de monotributo",
    }
  }

  return {
    date: recategorizationDate,
    kind: "recategorization" as const,
    label: metrics.evaluationPeriod.isFilingWindow
      ? "Cierre de ventana de recategorización"
      : "Inicio de ventana de recategorización",
  }
}
