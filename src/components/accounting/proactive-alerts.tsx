import type { ReactNode } from "react"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BellRingIcon,
  InfoIcon,
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
import { cn } from "@/lib/utils"
import type {
  AppSection,
  ProactiveAlert,
  ProactiveAlertSeverity,
} from "@/types/accounting"

type ProactiveAlertsProps = {
  alerts: ProactiveAlert[]
  onOpenSection?: (section: AppSection) => void
}

const severityMeta: Record<
  ProactiveAlertSeverity,
  {
    badge: string
    icon: ReactNode
    label: string
    row: string
  }
> = {
  critical: {
    badge:
      "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
    icon: <AlertTriangleIcon className="size-4 text-destructive" />,
    label: "Urgente",
    row: "border-destructive/30 bg-destructive/5",
  },
  warning: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    icon: <BellRingIcon className="size-4 text-amber-500" />,
    label: "Atencion",
    row: "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/30",
  },
  info: {
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
    icon: <InfoIcon className="size-4 text-sky-500" />,
    label: "Dato",
    row: "border-sky-200/70 bg-sky-50/60 dark:border-sky-900/70 dark:bg-sky-950/30",
  },
}

export function ProactiveAlerts({
  alerts,
  onOpenSection,
}: ProactiveAlertsProps) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Conta te avisa</CardTitle>
            <CardDescription>
              Avisos automaticos antes de que tengas que preguntar
            </CardDescription>
          </div>
          <Badge variant="outline">{alerts.length} activos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => {
              const meta = severityMeta[alert.severity]
              const targetSection = getAlertTargetSection(alert.id)

              return (
                <div
                  key={alert.id}
                  className={cn("rounded-lg border p-3", meta.row)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{meta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{alert.title}</p>
                        <Badge
                          className={meta.badge}
                          variant="outline"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      {onOpenSection ? (
                        <Button
                          className="mt-3"
                          onClick={() => onOpenSection(targetSection)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {alert.action}
                          <ArrowRightIcon />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay alertas fiscales para atender ahora.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getAlertTargetSection(alertId: string): AppSection {
  if (alertId === "pending-invoices" || alertId === "monotributo-due") {
    return "facturacion"
  }

  if (
    alertId === "category-exceeded" ||
    alertId === "category-warning" ||
    alertId === "projected-limit"
  ) {
    return "proyecciones"
  }

  return "asistente"
}
