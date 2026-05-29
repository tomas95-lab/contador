"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  buildRevenueSeries,
  formatARS,
  formatCompactARS,
  formatShortMonth,
} from "@/lib/accounting"
import type { IncomePayment, TaxCategory } from "@/types/accounting"

const chartConfig = {
  revenue: {
    label: "Facturado",
    color: "#10b981",
  },
  target: {
    label: "Objetivo",
    color: "#a1a1aa",
  },
} satisfies ChartConfig

type RevenueChartProps = {
  payments: IncomePayment[]
  category: TaxCategory
}

export function RevenueChart({ payments, category }: RevenueChartProps) {
  const referenceDate = React.useMemo(() => new Date(), [])
  const data = React.useMemo(
    () => buildRevenueSeries(payments, category, referenceDate),
    [category, payments, referenceDate]
  )

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <CardTitle>Facturacion mensual</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatShortMonth}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCompactARS(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex min-w-36 items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatARS(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="target"
              fill="var(--color-target)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
