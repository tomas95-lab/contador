import type { ReactNode } from "react"
import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatARS, formatLongDate, formatShortMonth } from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type { TaxDue, TaxDueStatus } from "@/types/accounting"

type TaxDuesPanelProps = {
  actionMonthKey?: string | null
  dues: TaxDue[]
  onMarkPaid?: (due: TaxDue) => Promise<void>
  onUnmarkPaid?: (due: TaxDue) => Promise<void>
}

const dueStatusMeta: Record<
  TaxDueStatus,
  {
    className: string
    icon: ReactNode
    label: string
  }
> = {
  paid: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    icon: <CheckCircle2Icon />,
    label: "Pagada",
  },
  pending: {
    className: "border-border",
    icon: <ClockIcon />,
    label: "Pendiente",
  },
  "due-soon": {
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    icon: <ClockIcon />,
    label: "Vence pronto",
  },
  overdue: {
    className:
      "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
    icon: <XCircleIcon />,
    label: "Vencida",
  },
}

export function TaxDuesPanel({
  actionMonthKey,
  dues,
  onMarkPaid,
  onUnmarkPaid,
}: TaxDuesPanelProps) {
  const nextDue = dues.find((due) => due.status !== "paid")

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Cuotas monotributo</CardTitle>
            <CardDescription>
              Pagadas, pendientes y próximo vencimiento
            </CardDescription>
          </div>
          {nextDue ? (
            <Badge
              className={dueStatusMeta[nextDue.status].className}
              variant="outline"
            >
              {formatLongDate(nextDue.dueDate)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-lg border">
          {dues.map((due) => {
            const meta = dueStatusMeta[due.status]

            return (
              <div className="grid grid-cols-[1fr_auto] gap-3 p-3" key={due.id}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {capitalize(formatShortMonth(due.monthKey))}
                    </span>
                    <Badge
                      className={cn("gap-1", meta.className)}
                      variant="outline"
                    >
                      {meta.icon}
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {due.paidAt
                      ? `Marcada pagada el ${formatLongDate(due.paidAt)}`
                      : `Vence ${formatLongDate(due.dueDate)}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 self-center">
                  <div className="text-right font-medium tabular-nums">
                    {formatARS(due.amount)}
                  </div>
                  {due.paidAt && onUnmarkPaid ? (
                    <Button
                      disabled={actionMonthKey === due.monthKey}
                      onClick={() => void onUnmarkPaid(due)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Desmarcar
                    </Button>
                  ) : onMarkPaid && due.status !== "paid" ? (
                    <Button
                      disabled={actionMonthKey === due.monthKey}
                      onClick={() => void onMarkPaid(due)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Marcar pagada
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}
