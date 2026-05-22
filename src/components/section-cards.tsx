import { Badge } from "@/components/ui/badge"
import CardModified from "@/components/components_modified/Card.tsx"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatMonthName,
  formatPercent,
  type FinancialMetrics,
} from "@/lib/accounting"
import type { TaxCategory } from "@/types/accounting"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

type SectionCardsProps = {
  metrics: FinancialMetrics
  category: TaxCategory
}

export function SectionCards({ metrics, category }: SectionCardsProps) {
  const isPositive = metrics.currentVsPrevious >= 0

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <CardModified
        title={formatARS(metrics.currentMonthRevenue)}
        description="Facturado este mes"
        action={
          <Badge
            variant="outline"
            className={
              isPositive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            }
          >
            {isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
            {formatPercent(metrics.currentVsPrevious)}
          </Badge>
        }
        footerMain={`vs ${formatARS(metrics.previousMonthRevenue)} el mes anterior`}
        footerSub={formatMonthName(metrics.currentMonthKey)}
        variant={isPositive ? "success" : "warning"}
      />

      <CardModified
        title={formatARS(metrics.previousMonthRevenue)}
        description="Mes anterior"
        action={<Badge variant="secondary">Cerrado</Badge>}
        footerMain={formatMonthName(metrics.previousMonthKey)}
        footerSub="Período cerrado"
      />

      <CardModified
        title={formatARS(metrics.annualTotal)}
        description="Acumulado fiscal"
        action={
          <Badge variant="outline">
            {formatPercent(metrics.annualUsage)} del limite
          </Badge>
        }
        footerMain={`Limite cat. ${category.key}: ${formatARS(category.annualLimit)}`}
        footerSub={formatFiscalPeriodRange(metrics.evaluationPeriod)}
        variant={
          metrics.annualUsage >= category.warningAt ? "warning" : "default"
        }
      />

      <CardModified
        title={category.key}
        description="Categoría actual"
        action={
          <Badge variant="outline">
            {metrics.evaluationPeriod.mode === "filing-window"
              ? "Tramite"
              : "Preventivo"}
          </Badge>
        }
        footerMain={`Recategorizacion: ${metrics.evaluationPeriod.recategorizationLabel}`}
        footerSub={`Limite anual ${formatARS(category.annualLimit)}`}
      />
    </div>
  )
}
