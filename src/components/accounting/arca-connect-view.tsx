import {
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
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

const contaCuit = import.meta.env.VITE_CONTA_CUIT ?? "XX-XXXXXXXX-X"

const steps = [
    "Entrar a ARCA con clave fiscal",
    "Ir a Administrador de Relaciones",
    "Agregar el servicio Facturación Electrónica",
    "Autorizar a Conta como representante",
    "Volver a la app y verificar la conexión",
]

export function ArcaConnectView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Conectar ARCA</CardTitle>
              <CardDescription>
                El usuario no comparte su clave fiscal: solo autoriza a Conta.
              </CardDescription>
            </div>
            <Badge variant="outline">Seguro</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheckIcon className="size-4 text-emerald-500" />
              Permiso, no contraseña
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Conta usa una autorización formal de ARCA para emitir facturas
              por el CUIT del usuario. Nunca pedimos clave fiscal.
            </p>
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div
                className="flex items-center gap-3 rounded-lg border p-3"
                key={step}
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Datos para autorizar</CardTitle>
          <CardDescription>El usuario copia estos datos en ARCA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">CUIT de Conta</span>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {contaCuit}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => navigator.clipboard.writeText(contaCuit)}
            type="button"
            variant="outline"
          >
            <CopyIcon />
            Copiar CUIT
          </Button>

          <Button asChild className="w-full">
            <a href="https://www.arca.gob.ar/" rel="noreferrer" target="_blank">
              <ExternalLinkIcon />
              Abrir ARCA
            </a>
          </Button>

          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2Icon className="size-4 text-emerald-500" />
              Después de autorizar
            </div>
            Conta verifica la relación y habilita la emisión con confirmación
            manual antes de cada factura.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
