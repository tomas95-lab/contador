import * as React from "react"
import {
  ClockIcon,
  DownloadIcon,
  FileCheck2Icon,
  FilePlus2Icon,
  PlugZapIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatARS,
  formatPaymentDate,
  sortInvoicesByDate,
  sumPayments,
} from "@/lib/accounting"
import { fetchArcaAnnualSummary, type ArcaAnnualSummary } from "@/lib/arca-api"
import type { GeneratedInvoice, IncomePayment } from "@/types/accounting"

type InvoicingPanelProps = {
  invoices: GeneratedInvoice[]
  onGenerateInvoice: (
    payment: IncomePayment,
    options?: {
      invoiceType?: "C" | "E"
      clientCuit?: string
      receiverIvaConditionId?: number
    }
  ) => Promise<void>
  payments: IncomePayment[]
}

const ivaConditionOptions = [
  { label: "Resp. inscripto", value: "1" },
  { label: "Monotributo", value: "6" },
  { label: "Exento", value: "4" },
  { label: "Consumidor final", value: "5" },
]

export function InvoicingPanel({
  invoices,
  onGenerateInvoice,
  payments,
}: InvoicingPanelProps) {
  const [arcaSummary, setArcaSummary] =
    React.useState<ArcaAnnualSummary | null>(null)
  const [arcaError, setArcaError] = React.useState("")
  const [invoiceError, setInvoiceError] = React.useState("")
  const [isSyncingArca, setIsSyncingArca] = React.useState(false)
  const [issuingPaymentId, setIssuingPaymentId] = React.useState<string | null>(
    null
  )
  const [receiverCuits, setReceiverCuits] = React.useState<
    Record<string, string>
  >({})
  const [receiverIvaConditions, setReceiverIvaConditions] = React.useState<
    Record<string, string>
  >({})
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )
  const invoicedPayments = payments.filter(
    (payment) => payment.invoiceStatus === "facturado"
  )
  const sortedInvoices = sortInvoicesByDate(invoices)
  const currentYear = new Date().getFullYear()

  React.useEffect(() => {
    let cancelled = false

    async function syncArcaSummary() {
      setIsSyncingArca(true)
      setArcaError("")

      try {
        const summary = await fetchArcaAnnualSummary(currentYear)

        if (!cancelled) {
          setArcaSummary(summary)
        }
      } catch (error) {
        if (!cancelled) {
          setArcaError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar ARCA."
          )
        }
      } finally {
        if (!cancelled) {
          setIsSyncingArca(false)
        }
      }
    }

    void syncArcaSummary()

    return () => {
      cancelled = true
    }
  }, [currentYear])

  async function handleFetchArcaSummary() {
    if (isSyncingArca) {
      return
    }

    setIsSyncingArca(true)
    setArcaError("")

    try {
      const summary = await fetchArcaAnnualSummary(currentYear)

      setArcaSummary(summary)
    } catch (error) {
      setArcaError(
        error instanceof Error ? error.message : "No se pudo consultar ARCA."
      )
    } finally {
      setIsSyncingArca(false)
    }
  }

  async function handleGenerateInvoice(payment: IncomePayment) {
    if (issuingPaymentId) {
      return
    }

    const clientCuit = receiverCuits[payment.id]?.trim()
    const ivaConditionId = clientCuit
      ? Number(receiverIvaConditions[payment.id] ?? "1")
      : undefined
    const ivaCondition = ivaConditionOptions.find(
      (option) => Number(option.value) === ivaConditionId
    )
    const receiver = clientCuit
      ? `CUIT receptor ${clientCuit}, ${ivaCondition?.label ?? "IVA receptor"}`
      : "consumidor final"
    const confirmed = window.confirm(
      `Emitir Factura C real en ARCA por ${formatARS(
        payment.amount
      )} para ${payment.client} (${receiver})?`
    )

    if (!confirmed) {
      return
    }

    setIssuingPaymentId(payment.id)
    setInvoiceError("")

    try {
      await onGenerateInvoice(payment, {
        clientCuit: clientCuit || undefined,
        receiverIvaConditionId: ivaConditionId,
      })
      setReceiverCuits((current) => {
        const next = { ...current }
        delete next[payment.id]
        return next
      })
      setReceiverIvaConditions((current) => {
        const next = { ...current }
        delete next[payment.id]
        return next
      })
    } catch (error) {
      setInvoiceError(
        error instanceof Error
          ? error.message
          : "No se pudo emitir la factura en ARCA."
      )
    } finally {
      setIssuingPaymentId(null)
    }
  }

  function updateReceiverCuit(paymentId: string, value: string) {
    setReceiverCuits((current) => ({
      ...current,
      [paymentId]: value.replace(/\D/g, "").slice(0, 11),
    }))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Pendiente</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(sumPayments(pendingPayments))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Facturado</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(sumPayments(invoicedPayments))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Comprobantes</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {invoicedPayments.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Cola de facturacion</CardTitle>
            <CardDescription>Cobros pendientes de CAE</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceError ? (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {invoiceError}
              </p>
            ) : null}
            {pendingPayments.length > 0 ? (
              <div className="space-y-2">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{payment.client}</span>
                        <Badge variant="outline">
                          {formatPaymentDate(payment.date)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {payment.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-medium tabular-nums">
                        {formatARS(payment.amount)}
                      </span>
                      <Input
                        aria-label={`CUIT receptor de ${payment.client}`}
                        className="h-9 w-36"
                        inputMode="numeric"
                        onChange={(event) =>
                          updateReceiverCuit(payment.id, event.target.value)
                        }
                        placeholder="CUIT receptor"
                        value={receiverCuits[payment.id] ?? ""}
                      />
                      <Select
                        disabled={!receiverCuits[payment.id]}
                        onValueChange={(value) =>
                          setReceiverIvaConditions((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        value={receiverIvaConditions[payment.id] ?? "1"}
                      >
                        <SelectTrigger
                          aria-label={`Condicion IVA de ${payment.client}`}
                          className="h-9 w-40"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ivaConditionOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        disabled={issuingPaymentId !== null}
                        onClick={() => void handleGenerateInvoice(payment)}
                        size="sm"
                      >
                        <FilePlus2Icon />
                        {issuingPaymentId === payment.id
                          ? "Emitiendo"
                          : "Emitir C"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay cobros pendientes de facturar.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Comprobantes emitidos</CardTitle>
            <CardDescription>Facturas con CAE registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedInvoices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="divide-y">
                  {sortedInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid gap-3 p-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {invoice.invoiceType} {invoice.number}
                          </span>
                          <Badge variant="outline">
                            {invoice.status === "draft"
                              ? "Borrador interno"
                              : "Emitida"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {invoice.client} · {invoice.description}
                        </p>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatARS(invoice.amount)}
                      </span>
                      <Button
                        onClick={() => downloadInvoiceHtml(invoice)}
                        size="sm"
                        variant="outline"
                      >
                        <DownloadIcon />
                        HTML
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Todavia no emitiste facturas desde la app.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>ARCA</CardTitle>
              <CardDescription>Conexion fiscal con auto-sync</CardDescription>
            </div>
            <Badge variant="outline">
              {isSyncingArca
                ? "Sincronizando"
                : arcaSummary
                  ? "Auto-sync"
                  : "Preparado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheckIcon className="size-4 text-emerald-500" />
              Certificado digital
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              CUIT y puntos de venta listos para consultar y emitir.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ReceiptTextIcon className="size-4 text-emerald-500" />
              Factura C
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Emision real por WSFE activa. CAE oficial al emitir.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ClockIcon className="size-4 text-amber-500" />
              WSFE
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Produccion activa. Punto de venta 4.
            </p>
          </div>
          {arcaSummary ? (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">
                Total ARCA {arcaSummary.year}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatARS(arcaSummary.total)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {arcaSummary.count} facturas{" "}
                {arcaSummary.invoiceTypes.join(" + ")}
              </p>
            </div>
          ) : null}
          {arcaError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {arcaError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isSyncingArca}
              onClick={handleFetchArcaSummary}
              variant="outline"
            >
              <FileCheck2Icon />
              Validar
            </Button>
            <Button disabled={isSyncingArca} onClick={handleFetchArcaSummary}>
              <PlugZapIcon />
              {isSyncingArca ? "Consultando" : "Consultar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function downloadInvoiceHtml(invoice: GeneratedInvoice) {
  const html = buildInvoiceHtml(invoice)
  const blob = new Blob([html], {
    type: "text/html;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = `factura-${invoice.number}.html`
  link.click()
  URL.revokeObjectURL(url)
}

function buildInvoiceHtml(invoice: GeneratedInvoice) {
  const isIssued = invoice.status === "issued"
  const invoiceLetter = invoice.invoiceType.replace("Factura ", "")
  const caeMarkup =
    isIssued && invoice.cae
      ? `<p><strong>CAE:</strong> ${escapeHtml(invoice.cae)}</p>
        <p><strong>Vto. CAE:</strong> ${escapeHtml(
          invoice.caeExpiresAt ?? "-"
        )}</p>`
      : ""
  const noticeMarkup = isIssued
    ? `<div class="official">Comprobante fiscal emitido con CAE registrado en ARCA.</div>`
    : `<div class="warning">Este archivo es un borrador interno. Para emitir una factura fiscal valida falta solicitar CAE en ARCA.</div>`

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.invoiceType)} ${escapeHtml(invoice.number)}</title>
  <style>
    body { color: #18181b; font-family: Arial, sans-serif; margin: 40px; }
    .box { border: 1px solid #d4d4d8; border-radius: 8px; padding: 24px; }
    .top { display: flex; justify-content: space-between; gap: 24px; }
    .type { border: 2px solid #18181b; font-size: 32px; font-weight: 700; padding: 8px 18px; }
    .muted { color: #71717a; }
    table { border-collapse: collapse; margin-top: 28px; width: 100%; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 12px; text-align: left; }
    .right { text-align: right; }
    .total { font-size: 22px; font-weight: 700; }
    .official { background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; margin-top: 24px; padding: 12px; }
    .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; margin-top: 24px; padding: 12px; }
  </style>
</head>
<body>
  <section class="box">
    <div class="top">
      <div>
        <h1>${escapeHtml(invoice.invoiceType)}</h1>
        <p class="muted">${
          isIssued ? "Comprobante fiscal emitido" : "Comprobante interno no fiscal"
        }</p>
      </div>
      <div class="type">${escapeHtml(invoiceLetter)}</div>
      <div>
        <p><strong>Nro:</strong> ${escapeHtml(invoice.number)}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(invoice.issueDate)}</p>
        <p><strong>Punto de venta:</strong> ${invoice.pointOfSale}</p>
        ${caeMarkup}
      </div>
    </div>
    <hr />
    <p><strong>Cliente:</strong> ${escapeHtml(invoice.client)}</p>
    <table>
      <thead>
        <tr>
          <th>Descripcion</th>
          <th class="right">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(invoice.description)}</td>
          <td class="right">${formatARS(invoice.amount)}</td>
        </tr>
      </tbody>
    </table>
    <p class="right total">Total: ${formatARS(invoice.amount)}</p>
    ${noticeMarkup}
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
