import * as React from "react"
import {
  LogOutIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SettingsViewProps = {
  arcaEnvironment: "homologacion" | "production" | "unknown"
  arcaCuit?: string | null
  arcaStatus: "configured" | "error" | "loading" | "missing"
  onOpenFiscalProfile: () => void
  onReconnectArca: () => void
  onSignOut: () => void
  userEmail: string
}

export function SettingsView({
  arcaEnvironment,
  arcaCuit,
  arcaStatus,
  onOpenFiscalProfile,
  onReconnectArca,
  onSignOut,
  userEmail,
}: SettingsViewProps) {
  const [showReconnectDialog, setShowReconnectDialog] = React.useState(false)
  const showEnvironmentCheck =
    userEmail.trim().toLowerCase() === "truiz050904@gmail.com"
  const isHomologacion = arcaEnvironment === "homologacion"
  const arcaEnvironmentLabel =
    arcaEnvironment === "production"
      ? "Producción"
      : arcaEnvironment === "homologacion"
        ? "Homologación"
        : "Ambiente no verificado"
  const isArcaConfigured = arcaStatus === "configured"
  const arcaStatusLabel =
    arcaStatus === "loading"
      ? "Verificando conexión"
      : arcaStatus === "error"
        ? "No verificado"
        : "Sin credenciales activas"
  const arcaBadgeLabel =
    arcaStatus === "loading"
      ? "Verificando"
      : arcaStatus === "error"
        ? "Revisar"
        : isArcaConfigured
          ? "Activo"
          : "Pendiente"

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Cuenta</CardTitle>
                <CardDescription>
                  Datos básicos de la sesión actual.
                </CardDescription>
              </div>
              <UserRoundIcon className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" readOnly value={userEmail} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Perfil fiscal</CardTitle>
            <CardDescription>
              Completá actividad, categoría y estimación de ingresos para que
              Conta pueda diagnosticar mejor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onOpenFiscalProfile} type="button">
              Ir al perfil fiscal
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Credenciales ARCA</CardTitle>
                <CardDescription>
                  Estado de la conexión fiscal usada para consultar y emitir.
                </CardDescription>
              </div>
              <ShieldCheckIcon className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEnvironmentCheck ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isHomologacion}
                    disabled
                    id="arca-environment-split"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label
                        className="text-sm font-medium"
                        htmlFor="arca-environment-split"
                      >
                        Credenciales separadas por ambiente
                      </Label>
                      <Badge variant="secondary">{arcaEnvironmentLabel}</Badge>
                    </div>
                    <p className="text-xs leading-5 text-sky-900/75 dark:text-sky-100/75">
                      {isHomologacion
                        ? "Activo para pruebas: al reconectar se guardan credenciales de homologación y se conserva producción."
                        : "En producción, al reconectar se actualizan solo las credenciales reales de producción."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">
                CUIT conectado
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">
                  {isArcaConfigured ? arcaCuit || "Conectado" : arcaStatusLabel}
                </span>
                <Badge variant={isArcaConfigured ? "secondary" : "outline"}>
                  {arcaBadgeLabel}
                </Badge>
              </div>
              {isArcaConfigured && !arcaCuit ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  El CUIT no está disponible en el cliente para conexiones ya
                  existentes; al reconectar se mostrará el nuevo CUIT cargado.
                </p>
              ) : null}
            </div>

            <Button
              onClick={() => setShowReconnectDialog(true)}
              type="button"
              variant="outline"
            >
              <PlugZapIcon />
              Reconectar ARCA
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
          <CardDescription>
            Salir de Contable en este navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onSignOut} type="button" variant="destructive">
            <LogOutIcon />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <ConfirmationDialog
        actionLabel="Reconectar"
        description={
          showEnvironmentCheck && isHomologacion
            ? "¿Querés reconectar ARCA en homologación? Vas a volver al onboarding y las nuevas credenciales se guardarán como credenciales de prueba, sin reemplazar las de producción."
            : "¿Estás seguro que querés reconectar ARCA? Vas a volver al onboarding y las nuevas credenciales reemplazarán la conexión actual cuando completes el proceso."
        }
        onConfirm={() => {
          setShowReconnectDialog(false)
          onReconnectArca()
        }}
        onOpenChange={setShowReconnectDialog}
        open={showReconnectDialog}
        severity="default"
        title="Reconectar ARCA"
      />
    </div>
  )
}
