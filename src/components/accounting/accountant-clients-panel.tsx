import type { ReactNode } from "react"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  UsersRoundIcon,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { managedClients } from "@/data/accounting"
import { formatARS, formatPercent } from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type { ManagedClient, ManagedClientStatus } from "@/types/accounting"

const statusMeta: Record<
  ManagedClientStatus,
  {
    className: string
    icon: ReactNode
    label: string
  }
> = {
  ok: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    icon: <CheckCircle2Icon />,
    label: "Al dia",
  },
  watch: {
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
    icon: <CircleAlertIcon />,
    label: "Mirar",
  },
  action: {
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    icon: <CircleAlertIcon />,
    label: "Accion",
  },
}

export function AccountantClientsPanel() {
  const actionClients = managedClients.filter(
    (client) => client.status === "action"
  )
  const totalPendingInvoices = managedClients.reduce(
    (total, client) => total + client.pendingInvoices,
    0
  )
  const totalMonthlyRevenue = managedClients.reduce(
    (total, client) => total + client.monthlyRevenue,
    0
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ClientMetricCard
          description="Clientes activos"
          title={String(managedClients.length)}
        />
        <ClientMetricCard
          description="Facturas pendientes"
          title={String(totalPendingInvoices)}
        />
        <ClientMetricCard
          description="Volumen mensual"
          title={formatARS(totalMonthlyRevenue)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Panel multi-cliente</CardTitle>
            <CardDescription>
              Modo para contadores que administran varios perfiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Uso anual</TableHead>
                    <TableHead>Pendientes</TableHead>
                    <TableHead>Proxima accion</TableHead>
                    <TableHead className="text-right">Abrir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedClients.map((client) => {
                    const meta = statusMeta[client.status]

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.cuit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{client.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full bg-emerald-500",
                                  client.annualUsage >= 0.8 && "bg-amber-500"
                                )}
                                style={{
                                  width: `${Math.min(
                                    client.annualUsage * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatPercent(client.annualUsage)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {client.pendingInvoices}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={cn("gap-1", meta.className)}
                              variant="outline"
                            >
                              {meta.icon}
                              {meta.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {client.nextAction}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            disabled
                            size="icon"
                            title="Abrir cliente estará disponible cuando el modo multi-cliente esté listo"
                            type="button"
                            variant="ghost"
                          >
                            <ArrowRightIcon />
                            <span className="sr-only">Abrir cliente</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Agenda del contador</CardTitle>
                <CardDescription>Priorizacion automatica</CardDescription>
              </div>
              <UsersRoundIcon className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionClients.length > 0 ? (
              actionClients.map((client) => (
                <ClientActionCard client={client} key={client.id} />
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay clientes con accion urgente.
              </div>
            )}
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              Este modo queda listo para conectar permisos por estudio, roles y
              vistas por cliente cuando se persista el equipo en Supabase.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientMetricCard({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{title}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ClientActionCard({ client }: { client: ManagedClient }) {
  const meta = statusMeta[client.status]

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{client.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.nextAction}
          </p>
        </div>
        <Badge className={cn("gap-1", meta.className)} variant="outline">
          {meta.icon}
          {meta.label}
        </Badge>
      </div>
    </div>
  )
}
