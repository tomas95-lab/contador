import type { ReactNode } from "react"
import * as React from "react"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BellRingIcon,
  CheckIcon,
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
import {
  dismissAlert,
  syncAlerts,
  type RiskAlert,
  type RiskAlertSeverity,
} from "@/lib/alerts-api"
import { cn } from "@/lib/utils"
import type { AppSection, ProactiveAlert } from "@/types/accounting"

type ProactiveAlertsProps = {
  alerts: ProactiveAlert[]
  onUnreadCountChange?: (count: number) => void
  onOpenSection?: (section: AppSection) => void
}

type DisplayAlert = {
  id: string
  type: string
  title: string
  description: string
  severity: RiskAlertSeverity
  action: string
  isRead: boolean
  isPersisted: boolean
}

const severityMeta: Record<
  RiskAlertSeverity,
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
  error: {
    badge:
      "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
    icon: <AlertTriangleIcon className="size-4 text-destructive" />,
    label: "Error",
    row: "border-destructive/30 bg-destructive/5",
  },
  warning: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    icon: <BellRingIcon className="size-4 text-amber-500" />,
    label: "Atención",
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
  onUnreadCountChange,
  onOpenSection,
}: ProactiveAlertsProps) {
  const alertSignature = React.useMemo(
    () =>
      JSON.stringify(
        alerts.map((alert) => ({
          action: alert.action,
          description: alert.description,
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
        }))
      ),
    [alerts]
  )
  const [displayAlerts, setDisplayAlerts] = React.useState<DisplayAlert[]>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function loadPersistedAlerts() {
      setIsLoadingAlerts(true)

      try {
        const syncedAlerts = await syncAlerts(alerts)

        if (cancelled) {
          return
        }

        const nextAlerts = syncedAlerts.map(mapRiskAlert)

        setDisplayAlerts(nextAlerts)
        onUnreadCountChange?.(countUnreadAlerts(nextAlerts))
        setIsLoadingAlerts(false)
      } catch (error) {
        console.error(error)

        if (cancelled) {
          return
        }

        const fallbackAlerts = mapCalculatedAlerts(alerts)

        setDisplayAlerts(fallbackAlerts)
        onUnreadCountChange?.(countUnreadAlerts(fallbackAlerts))
        setIsLoadingAlerts(false)
      }
    }

    void loadPersistedAlerts()

    return () => {
      cancelled = true
    }
  }, [alertSignature, alerts, onUnreadCountChange])

  async function handleMarkAsRead(alert: DisplayAlert) {
    if (alert.isRead) {
      return
    }

    if (alert.isPersisted) {
      try {
        await dismissAlert(alert.id, alert.type)
      } catch (error) {
        console.error(error)
        return
      }
    }

    setDisplayAlerts((current) => {
      const nextAlerts = current.filter((item) => item.id !== alert.id)

      onUnreadCountChange?.(countUnreadAlerts(nextAlerts))
      return nextAlerts
    })
  }

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
          <Badge variant="outline">{displayAlerts.length} activos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingAlerts ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Cargando alertas fiscales...
          </div>
        ) : displayAlerts.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {displayAlerts.map((alert) => {
              const meta = severityMeta[alert.severity]
              const targetSection = getAlertTargetSection(alert.type)

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
                        <Badge className={meta.badge} variant="outline">
                          {meta.label}
                        </Badge>
                        {alert.isRead ? (
                          <Badge variant="secondary">Leída</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!alert.isRead ? (
                          <Button
                            onClick={() => void handleMarkAsRead(alert)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <CheckIcon />
                            Marcar como leída
                          </Button>
                        ) : null}
                        {onOpenSection ? (
                          <Button
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

function mapCalculatedAlerts(alerts: ProactiveAlert[]): DisplayAlert[] {
  return alerts.map((alert) => ({
    action: alert.action,
    description: alert.description,
    id: alert.id,
    isPersisted: false,
    isRead: false,
    severity: alert.severity,
    title: alert.title,
    type: alert.id,
  }))
}

function mapRiskAlert(alert: RiskAlert): DisplayAlert {
  return {
    action: alert.actionLabel ?? "Ver detalle",
    description: alert.message,
    id: alert.id,
    isPersisted: true,
    isRead: alert.isRead,
    severity: alert.severity,
    title: alert.title,
    type: alert.type,
  }
}

function countUnreadAlerts(alerts: DisplayAlert[]) {
  return alerts.filter((alert) => !alert.isRead).length
}

function getAlertTargetSection(alertId: string): AppSection {
  if (
    alertId === "pending-invoices" ||
    alertId === "monotributo-due" ||
    alertId === "months-without-invoices" ||
    alertId === "arca-app-delta"
  ) {
    return "facturacion"
  }

  if (
    alertId === "category-exceeded" ||
    alertId === "category-warning" ||
    alertId === "projected-limit" ||
    alertId === "projected-breach-soon" ||
    alertId === "recategorization-window-risk"
  ) {
    return "proyecciones"
  }

  return "asistente"
}
