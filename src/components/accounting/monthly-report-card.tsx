import * as React from "react"

import { FileDownIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatMonthName,
  getFinancialMetrics,
  getMonthKey,
  sumPayments,
} from "@/lib/accounting"
import type {
  GeneratedInvoice,
  IncomePayment,
  ProactiveAlert,
  TaxCategory,
} from "@/types/accounting"

type MonthlyReportCardProps = {
  alerts: ProactiveAlert[]
  category: TaxCategory
  invoices: GeneratedInvoice[]
  payments: IncomePayment[]
}

export function MonthlyReportCard({
  alerts,
  category,
  invoices,
  payments,
}: MonthlyReportCardProps) {
  const referenceDate = React.useMemo(() => new Date(), [])
  const metrics = React.useMemo(
    () => getFinancialMetrics(payments, category, referenceDate),
    [category, payments, referenceDate]
  )
  const currentMonthPayments = payments.filter(
    (payment) => getMonthKey(payment.date) === metrics.currentMonthKey
  )
  const currentMonthInvoices = invoices.filter(
    (invoice) => getMonthKey(invoice.issueDate) === metrics.currentMonthKey
  )
  const pendingTotal = sumPayments(
    payments.filter((payment) => payment.invoiceStatus === "pendiente")
  )

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Resumen fiscal mensual</CardTitle>
            <CardDescription>
              Exportable para archivo propio o para compartir
            </CardDescription>
          </div>
          <Badge variant="outline">
            {formatMonthName(metrics.currentMonthKey)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Cobrado</span>
            <div className="mt-1 font-medium tabular-nums">
              {formatARS(metrics.currentMonthRevenue)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Pendiente</span>
            <div className="mt-1 font-medium tabular-nums">
              {formatARS(pendingTotal)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Cobros</span>
            <div className="mt-1 font-medium tabular-nums">
              {currentMonthPayments.length}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Facturas</span>
            <div className="mt-1 font-medium tabular-nums">
              {currentMonthInvoices.length}
            </div>
          </div>
        </div>
        <Button
          className="w-full"
          onClick={() =>
            exportMonthlyReportPdf({
              alerts,
              category,
              currentMonthInvoices,
              currentMonthPayments,
              metrics,
              pendingTotal,
            })
          }
          type="button"
          variant="outline"
        >
          <FileDownIcon />
          Exportar PDF
        </Button>
      </CardContent>
    </Card>
  )
}

function exportMonthlyReportPdf({
  alerts,
  category,
  currentMonthInvoices,
  currentMonthPayments,
  metrics,
  pendingTotal,
}: {
  alerts: ProactiveAlert[]
  category: TaxCategory
  currentMonthInvoices: GeneratedInvoice[]
  currentMonthPayments: IncomePayment[]
  metrics: ReturnType<typeof getFinancialMetrics>
  pendingTotal: number
}) {
  const reportWindow = window.open("", "_blank", "width=920,height=720")

  if (!reportWindow) {
    return
  }

  reportWindow.document.write(
    buildMonthlyReportHtml({
      alerts,
      category,
      currentMonthInvoices,
      currentMonthPayments,
      metrics,
      pendingTotal,
    })
  )
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.print()
}

function buildMonthlyReportHtml({
  alerts,
  category,
  currentMonthInvoices,
  currentMonthPayments,
  metrics,
  pendingTotal,
}: {
  alerts: ProactiveAlert[]
  category: TaxCategory
  currentMonthInvoices: GeneratedInvoice[]
  currentMonthPayments: IncomePayment[]
  metrics: ReturnType<typeof getFinancialMetrics>
  pendingTotal: number
}) {
  const paymentRows = currentMonthPayments
    .map(
      (payment) => `<tr>
        <td>${escapeHtml(payment.date)}</td>
        <td>${escapeHtml(payment.client)}</td>
        <td>${escapeHtml(payment.description)}</td>
        <td class="right">${formatARS(payment.amount)}</td>
      </tr>`
    )
    .join("")
  const invoiceRows = currentMonthInvoices
    .map(
      (invoice) => `<tr>
        <td>${escapeHtml(invoice.issueDate)}</td>
        <td>${escapeHtml(invoice.number)}</td>
        <td>${escapeHtml(invoice.client)}</td>
        <td class="right">${formatARS(invoice.amount)}</td>
      </tr>`
    )
    .join("")
  const alertItems = alerts
    .map(
      (alert) =>
        `<li><strong>${escapeHtml(alert.title)}:</strong> ${escapeHtml(alert.description)}</li>`
    )
    .join("")

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Resumen fiscal ${escapeHtml(formatMonthName(metrics.currentMonthKey))}</title>
  <style>
    body { color: #18181b; font-family: Arial, sans-serif; margin: 40px; }
    h1, h2 { margin-bottom: 8px; }
    .muted { color: #71717a; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); margin: 24px 0; }
    .metric { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px; }
    .metric strong { display: block; font-size: 18px; margin-top: 4px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 10px; text-align: left; }
    .right { text-align: right; }
    section { margin-top: 28px; }
  </style>
</head>
<body>
  <h1>Resumen fiscal mensual</h1>
  <p class="muted">${escapeHtml(formatMonthName(metrics.currentMonthKey))} · Monotributo categoria ${escapeHtml(category.key)}</p>
  <p class="muted">Periodo fiscal: ${escapeHtml(formatFiscalPeriodRange(metrics.evaluationPeriod))}</p>
  <div class="grid">
    <div class="metric"><span>Cobrado</span><strong>${formatARS(metrics.currentMonthRevenue)}</strong></div>
    <div class="metric"><span>Pendiente</span><strong>${formatARS(pendingTotal)}</strong></div>
    <div class="metric"><span>Uso periodo</span><strong>${Math.round(metrics.annualUsage * 100)}%</strong></div>
    <div class="metric"><span>Cuota</span><strong>${formatARS(category.monthlyTax)}</strong></div>
  </div>
  <section>
    <h2>Avisos de Conta</h2>
    <ul>${alertItems || "<li>Sin alertas activas.</li>"}</ul>
  </section>
  <section>
    <h2>Cobros del mes</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Detalle</th><th class="right">Importe</th></tr></thead>
      <tbody>${paymentRows || '<tr><td colspan="4">Sin cobros registrados.</td></tr>'}</tbody>
    </table>
  </section>
  <section>
    <h2>Facturas emitidas</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Numero</th><th>Cliente</th><th class="right">Importe</th></tr></thead>
      <tbody>${invoiceRows || '<tr><td colspan="4">Sin facturas emitidas.</td></tr>'}</tbody>
    </table>
  </section>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
