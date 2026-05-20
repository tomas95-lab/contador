import * as React from "react"
import type { ReactNode } from "react"
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  MinusIcon,
  TrendingUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { taxCategories } from "@/data/accounting"
import {
  formatARS,
  formatPercent,
  getBillingScenario,
  getFinancialMetrics,
} from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type { IncomePayment, TaxCategory } from "@/types/accounting"

type ProjectionsPanelProps = {
  payments: IncomePayment[]
  category: TaxCategory
  onBack?: () => void
}

export function ProjectionsPanel({
  category,
  onBack,
  payments,
}: ProjectionsPanelProps) {
  const metrics = getFinancialMetrics(payments, category)
  const projectedDelta = metrics.projectedAnnual - category.annualLimit
  const nextCategory = taxCategories.find(
    (item) => item.annualLimit > category.annualLimit
  )

  return (
    <div className="flex flex-col gap-4">
      {onBack ? (
        <div>
          <Button onClick={onBack} type="button" variant="outline">
            <ArrowLeftIcon />
            Volver al resumen
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <ProjectionCard
            description="Proyeccion anual"
            icon={<TrendingUpIcon className="size-4 text-amber-500" />}
            title={formatARS(metrics.projectedAnnual)}
          />
          <ProjectionCard
            description="Margen disponible"
            icon={<MinusIcon className="size-4 text-emerald-500" />}
            title={formatARS(metrics.annualLimitRemaining)}
          />
          <ProjectionCard
            description="Desvio proyectado"
            icon={<ArrowUpRightIcon className="size-4 text-amber-500" />}
            title={formatARS(projectedDelta)}
          />
        </div>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Escenarios por categoria</CardTitle>
            <CardDescription>Comparacion con el acumulado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Limite anual</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxCategories.map((item) => {
                    const usage = metrics.annualTotal / item.annualLimit
                    const isCurrent = item.key === category.key

                    return (
                      <TableRow
                        key={item.key}
                        data-state={isCurrent ? "selected" : undefined}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.key}
                            {isCurrent && (
                              <Badge variant="secondary">Actual</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatARS(item.annualLimit)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full bg-emerald-500",
                                  usage >= item.warningAt && "bg-amber-500",
                                  usage >= 1 && "bg-destructive"
                                )}
                                style={{
                                  width: `${Math.min(usage * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground tabular-nums">
                              {formatPercent(usage)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatARS(item.annualLimit - metrics.annualTotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Lectura rapida</CardTitle>
            <CardDescription>Categoria {category.key}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uso actual</span>
                <span className="font-medium tabular-nums">
                  {formatPercent(metrics.annualUsage)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-emerald-500",
                    metrics.annualUsage >= category.warningAt && "bg-amber-500",
                    metrics.annualUsage >= 1 && "bg-destructive"
                  )}
                  style={{
                    width: `${Math.min(metrics.annualUsage * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">
                Objetivo mensual
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatARS(metrics.monthlyTarget)}
              </div>
            </div>
            {nextCategory && (
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">
                  Siguiente categoria
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-semibold">
                    {nextCategory.key}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatARS(nextCategory.annualLimit)}
                  </span>
                </div>
              </div>
            )}
            <Badge
              variant="outline"
              className={
                projectedDelta > 0
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              }
            >
              {projectedDelta > 0
                ? "Proyeccion sobre limite"
                : "Dentro del limite"}
            </Badge>
          </CardContent>
        </Card>
        <ScenarioSimulator category={category} payments={payments} />
      </div>
      </div>
    </div>
  )
}

function ProjectionCard({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{description}</CardDescription>
          {icon}
        </div>
        <CardTitle className="text-2xl tabular-nums">{title}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ScenarioSimulator({
  category,
  payments,
}: {
  category: TaxCategory
  payments: IncomePayment[]
}) {
  const [amountInput, setAmountInput] = React.useState("500000")
  const [repeatCount, setRepeatCount] = React.useState("1")
  const scenario = getBillingScenario({
    addedAmount: Number(amountInput) || 0,
    category,
    payments,
    repeatCount: Number(repeatCount),
  })
  const crossesCurrentCategory = scenario.remainingAfter < 0

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <CardTitle>Simulador</CardTitle>
        <CardDescription>Que pasa si facturo X mas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="scenario-amount">Importe</Label>
            <Input
              id="scenario-amount"
              inputMode="numeric"
              min={0}
              type="number"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Veces</Label>
            <Select value={repeatCount} onValueChange={setRepeatCount}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Una vez</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Nuevo acumulado</span>
            <div className="mt-1 font-medium tabular-nums">
              {formatARS(scenario.annualTotalAfter)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Uso categoria</span>
            <div className="mt-1 font-medium tabular-nums">
              {formatPercent(scenario.usageAfter)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Margen restante</span>
            <div className="mt-1 font-medium tabular-nums">
              {formatARS(scenario.remainingAfter)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Categoria sugerida</span>
            <div className="mt-1 font-medium">
              {scenario.recommendedCategory.key}
            </div>
          </div>
        </div>
        <Badge
          className={
            crossesCurrentCategory
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          }
          variant="outline"
        >
          {crossesCurrentCategory
            ? `Subiria la cuota ${formatARS(scenario.monthlyTaxDelta)}`
            : "No cambia tu categoria actual"}
        </Badge>
      </CardContent>
    </Card>
  )
}
