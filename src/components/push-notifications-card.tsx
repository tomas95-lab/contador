import * as React from "react"
import { BellIcon, BellOffIcon, Loader2Icon, SendIcon } from "lucide-react"

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
  fetchPushStatus,
  getCurrentPushSubscription,
  getPushSubscriptionReadiness,
  sendPushTestNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushSubscriptionReadiness,
} from "@/lib/push-notifications"

type PushNotificationsCardProps = {
  enabled: boolean
}

type PushUiStatus =
  | "active"
  | "blocked"
  | "inactive"
  | "loading"
  | "server-disabled"
  | "unavailable"

export function PushNotificationsCard({ enabled }: PushNotificationsCardProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [lastTestResult, setLastTestResult] = React.useState<string | null>(null)
  const [readiness, setReadiness] =
    React.useState<PushSubscriptionReadiness>("service-worker-unavailable")
  const [status, setStatus] = React.useState<PushUiStatus>("loading")

  React.useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      setError(null)

      if (!enabled) {
        setStatus("unavailable")
        return
      }

      const nextReadiness = getPushSubscriptionReadiness()
      setReadiness(nextReadiness)

      if (nextReadiness !== "ready") {
        setStatus("unavailable")
        return
      }

      if (Notification.permission === "denied") {
        setStatus("blocked")
        return
      }

      try {
        const [serverStatus, subscription] = await Promise.all([
          fetchPushStatus(),
          getCurrentPushSubscription().catch(() => null),
        ])

        if (cancelled) {
          return
        }

        if (!serverStatus.configured) {
          setStatus("server-disabled")
          return
        }

        setStatus(subscription ? "active" : "inactive")
      } catch (error) {
        if (!cancelled) {
          setError(errorMessage(error))
          setStatus("inactive")
        }
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
    }
  }, [enabled])

  async function handleSubscribe() {
    setError(null)
    setLastTestResult(null)
    setIsBusy(true)

    try {
      await subscribeToPushNotifications()
      setStatus("active")
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleUnsubscribe() {
    setError(null)
    setLastTestResult(null)
    setIsBusy(true)

    try {
      await unsubscribeFromPushNotifications()
      setStatus("inactive")
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSendTest() {
    setError(null)
    setLastTestResult(null)
    setIsTesting(true)

    try {
      const response = await sendPushTestNotification()
      setLastTestResult(
        response.result.sent > 0
          ? "Prueba enviada."
          : "No se pudo enviar la prueba."
      )
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setIsTesting(false)
    }
  }

  const statusBadge = getStatusBadge(status, readiness)

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Notificaciones</CardTitle>
            <CardDescription>
              Avisos breves de Contable en este dispositivo.
            </CardDescription>
          </div>
          <BellIcon className="size-4 text-emerald-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {getNotificationPermission() === "default" &&
          status === "inactive" ? (
            <span className="text-xs text-muted-foreground">
              Te vamos a pedir permiso al activar.
            </span>
          ) : null}
        </div>

        {status === "server-disabled" ? (
          <p className="text-sm text-muted-foreground">
            Falta configurar las claves del servidor para producción.
          </p>
        ) : null}

        {status === "unavailable" ? (
          <p className="text-sm text-muted-foreground">
            {enabled
              ? unavailableMessage(readiness)
              : "Disponible cuando iniciás sesión con tu cuenta."}
          </p>
        ) : null}

        {status === "blocked" ? (
          <p className="text-sm text-muted-foreground">
            Las notificaciones están bloqueadas en el navegador.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : lastTestResult ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {lastTestResult}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {status === "active" ? (
            <>
              <Button
                disabled={isTesting}
                onClick={() => void handleSendTest()}
                type="button"
                variant="outline"
              >
                {isTesting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SendIcon />
                )}
                Enviar prueba
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleUnsubscribe()}
                type="button"
                variant="outline"
              >
                {isBusy ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <BellOffIcon />
                )}
                Desactivar
              </Button>
            </>
          ) : (
            <Button
              disabled={
                isBusy ||
                status === "blocked" ||
                status === "loading" ||
                status === "server-disabled" ||
                status === "unavailable"
              }
              onClick={() => void handleSubscribe()}
              type="button"
            >
              {isBusy ? <Loader2Icon className="animate-spin" /> : <BellIcon />}
              Activar notificaciones
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusBadge(
  status: PushUiStatus,
  readiness: PushSubscriptionReadiness
): {
  label: string
  variant: "default" | "outline" | "secondary"
} {
  if (status === "active") {
    return { label: "Activas", variant: "secondary" }
  }

  if (status === "blocked") {
    return { label: "Bloqueadas", variant: "outline" }
  }

  if (status === "loading") {
    return { label: "Verificando", variant: "outline" }
  }

  if (status === "server-disabled") {
    return { label: "Servidor pendiente", variant: "outline" }
  }

  if (status === "unavailable") {
    return {
      label: readiness === "ready" ? "No disponible" : "No soportadas",
      variant: "outline",
    }
  }

  return { label: "Inactivas", variant: "outline" }
}

function unavailableMessage(readiness: PushSubscriptionReadiness) {
  if (readiness === "notifications-unavailable") {
    return "Este navegador no permite notificaciones."
  }

  if (readiness === "push-unavailable") {
    return "Este navegador no soporta notificaciones push."
  }

  return "Abrí la versión instalada o preview para activar notificaciones."
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos actualizar las notificaciones."
}

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default"
  }

  return Notification.permission
}
