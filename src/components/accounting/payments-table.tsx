import * as React from "react"
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  formatARS,
  formatPaymentDate,
  sortPaymentsByDate,
} from "@/lib/accounting"
import type {
  IncomeMethod,
  IncomePayment,
  InvoiceStatus,
} from "@/types/accounting"

type PaymentsTableProps = {
  payments: IncomePayment[]
  limit?: number
  onDeletePayment?: (paymentId: string) => Promise<void>
  onUpdatePayment?: (payment: IncomePayment) => Promise<void>
}

export function PaymentsTable({
  limit,
  onDeletePayment,
  onUpdatePayment,
  payments,
}: PaymentsTableProps) {
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(
    null
  )
  const [draft, setDraft] = React.useState<IncomePayment | null>(null)
  const [pendingPaymentId, setPendingPaymentId] = React.useState<string | null>(
    null
  )
  const [paymentToDelete, setPaymentToDelete] =
    React.useState<IncomePayment | null>(null)
  const visiblePayments = sortPaymentsByDate(payments).slice(0, limit)
  const canEdit = Boolean(onDeletePayment || onUpdatePayment)

  function startEditing(payment: IncomePayment) {
    setEditingPaymentId(payment.id)
    setDraft({ ...payment })
  }

  function updateDraft<Key extends keyof IncomePayment>(
    key: Key,
    value: IncomePayment[Key]
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    )
  }

  function stopEditing() {
    setEditingPaymentId(null)
    setDraft(null)
  }

  async function saveDraft() {
    if (!draft || !onUpdatePayment || pendingPaymentId) {
      return
    }

    if (
      !draft.client.trim() ||
      !draft.description.trim() ||
      draft.amount <= 0
    ) {
      return
    }

    setPendingPaymentId(draft.id)

    try {
      await onUpdatePayment({
        ...draft,
        client: draft.client.trim(),
        description: draft.description.trim(),
      })
      stopEditing()
    } finally {
      setPendingPaymentId(null)
    }
  }

  function requestDeletePayment(payment: IncomePayment) {
    if (!onDeletePayment || pendingPaymentId) {
      return
    }

    setPaymentToDelete(payment)
  }

  async function confirmDeletePayment() {
    if (!onDeletePayment || !paymentToDelete || pendingPaymentId) {
      return
    }

    const payment = paymentToDelete

    setPendingPaymentId(payment.id)
    setPaymentToDelete(null)

    try {
      await onDeletePayment(payment.id)
      if (editingPaymentId === payment.id) {
        stopEditing()
      }
    } finally {
      setPendingPaymentId(null)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              {canEdit && (
                <TableHead className="w-28 text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePayments.map((payment) => {
              const isEditing = editingPaymentId === payment.id
              const currentDraft = isEditing ? draft : null
              const isPending = pendingPaymentId === payment.id

              return (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {currentDraft ? (
                      <Input
                        className="h-8 min-w-32"
                        type="date"
                        value={currentDraft.date}
                        onChange={(event) =>
                          updateDraft("date", event.target.value)
                        }
                      />
                    ) : (
                      formatPaymentDate(payment.date)
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {currentDraft ? (
                      <Input
                        className="h-8 min-w-36"
                        value={currentDraft.client}
                        onChange={(event) =>
                          updateDraft("client", event.target.value)
                        }
                      />
                    ) : (
                      payment.client
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-muted-foreground">
                    {currentDraft ? (
                      <Input
                        className="h-8 min-w-44"
                        value={currentDraft.description}
                        onChange={(event) =>
                          updateDraft("description", event.target.value)
                        }
                      />
                    ) : (
                      <span className="block truncate">
                        {payment.description}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentDraft ? (
                      <Select
                        value={currentDraft.method}
                        onValueChange={(value) =>
                          updateDraft("method", value as IncomeMethod)
                        }
                      >
                        <SelectTrigger className="h-8 min-w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transferencia">
                            Transferencia
                          </SelectItem>
                          <SelectItem value="Mercado Pago">
                            Mercado Pago
                          </SelectItem>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="whitespace-nowrap text-muted-foreground">
                        {payment.method}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentDraft ? (
                      <Select
                        value={currentDraft.invoiceStatus}
                        onValueChange={(value) =>
                          updateDraft("invoiceStatus", value as InvoiceStatus)
                        }
                      >
                        <SelectTrigger className="h-8 min-w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem disabled value="emitiendo">
                            Emitiendo
                          </SelectItem>
                          <SelectItem value="facturado">Facturado</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <PaymentStatusBadge status={payment.invoiceStatus} />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {currentDraft ? (
                      <Input
                        className="ml-auto h-8 w-32 text-right"
                        min={0}
                        type="number"
                        value={currentDraft.amount || ""}
                        onChange={(event) =>
                          updateDraft("amount", Number(event.target.value))
                        }
                      />
                    ) : (
                      formatARS(payment.amount)
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {currentDraft ? (
                          <>
                            <Button
                              disabled={isPending}
                              onClick={() => void saveDraft()}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <CheckIcon />
                              <span className="sr-only">Guardar</span>
                            </Button>
                            <Button
                              disabled={isPending}
                              onClick={stopEditing}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <XIcon />
                              <span className="sr-only">Cancelar</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            {onUpdatePayment && (
                              <Button
                                disabled={Boolean(pendingPaymentId)}
                                onClick={() => startEditing(payment)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <PencilIcon />
                                <span className="sr-only">Editar</span>
                              </Button>
                            )}
                            {onDeletePayment && (
                              <Button
                                disabled={Boolean(pendingPaymentId)}
                                onClick={() => requestDeletePayment(payment)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2Icon />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmationDialog
        actionLabel="Eliminar"
        description={
          paymentToDelete
            ? `¿Estás seguro que querés eliminar el cobro de ${
                paymentToDelete.client
              } por ${formatARS(paymentToDelete.amount)}?`
            : "¿Estás seguro que querés eliminar este cobro?"
        }
        disabled={Boolean(pendingPaymentId)}
        onConfirm={() => void confirmDeletePayment()}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentToDelete(null)
          }
        }}
        open={Boolean(paymentToDelete)}
        severity="destructive"
        title="Eliminar cobro"
      />
    </>
  )
}

function PaymentStatusBadge({ status }: { status: InvoiceStatus }) {
  const className =
    status === "facturado"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "emitiendo"
        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
  const label =
    status === "facturado"
      ? "facturado"
      : status === "emitiendo"
        ? "emitiendo"
        : "pendiente"

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
