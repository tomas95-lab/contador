"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { PaymentsTable } from "@/components/accounting/payments-table"
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
  formatARS,
  getFinancialMetrics,
  getMonthKey,
  getTodayInputValue,
  sumPayments,
} from "@/lib/accounting"
import type {
  IncomeMethod,
  IncomePayment,
  InvoiceStatus,
  TaxCategory,
} from "@/types/accounting"

type PaymentDraft = Omit<IncomePayment, "id">

type IncomeTrackerProps = {
  payments: IncomePayment[]
  category: TaxCategory
  onAddPayment: (payment: PaymentDraft) => Promise<void>
  onDeletePayment: (paymentId: string) => Promise<void>
  onUpdatePayment: (payment: IncomePayment) => Promise<void>
}

const emptyDraft: PaymentDraft = {
  date: getTodayInputValue(),
  amount: 0,
  client: "",
  description: "",
  method: "Transferencia",
  invoiceStatus: "pendiente",
}

export function IncomeTracker({
  payments,
  category,
  onAddPayment,
  onDeletePayment,
  onUpdatePayment,
}: IncomeTrackerProps) {
  const [draft, setDraft] = React.useState<PaymentDraft>(emptyDraft)
  const [isSaving, setIsSaving] = React.useState(false)
  const metrics = getFinancialMetrics(payments, category)
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )
  const currentMonthPayments = payments.filter(
    (payment) => getMonthKey(payment.date) === metrics.currentMonthKey
  )

  function updateDraft<Key extends keyof PaymentDraft>(
    key: Key,
    value: PaymentDraft[Key]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      isSaving ||
      !draft.client.trim() ||
      !draft.description.trim() ||
      draft.amount <= 0
    ) {
      return
    }

    setIsSaving(true)
    try {
      await onAddPayment({
        ...draft,
        client: draft.client.trim(),
        description: draft.description.trim(),
      })
    } finally {
      setIsSaving(false)
    }
    setDraft({
      ...emptyDraft,
      date: getTodayInputValue(),
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Nuevo cobro</CardTitle>
          <CardDescription>Cargar ingreso recibido</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Fecha</Label>
              <Input
                id="payment-date"
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Importe</Label>
              <Input
                id="payment-amount"
                inputMode="numeric"
                min={0}
                type="number"
                value={draft.amount || ""}
                onChange={(event) =>
                  updateDraft("amount", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-client">Cliente</Label>
              <Input
                id="payment-client"
                value={draft.client}
                onChange={(event) => updateDraft("client", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-description">Descripcion</Label>
              <Input
                id="payment-description"
                value={draft.description}
                onChange={(event) =>
                  updateDraft("description", event.target.value)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Medio</Label>
                <Select
                  value={draft.method}
                  onValueChange={(value) =>
                    updateDraft("method", value as IncomeMethod)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factura</Label>
                <Select
                  value={draft.invoiceStatus}
                  onValueChange={(value) =>
                    updateDraft("invoiceStatus", value as InvoiceStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="facturado">Facturado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" disabled={isSaving} type="submit">
              <PlusIcon />
              {isSaving ? "Guardando..." : "Registrar cobro"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Este mes</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(metrics.currentMonthRevenue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Pendiente de facturar</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(sumPayments(pendingPayments))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Cobros del mes</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl tabular-nums">
                {currentMonthPayments.length}
                <Badge variant="secondary">Mayo</Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Cobros registrados</CardTitle>
            <CardDescription>Ingresos ordenados por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsTable
              onDeletePayment={onDeletePayment}
              onUpdatePayment={onUpdatePayment}
              payments={payments}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
