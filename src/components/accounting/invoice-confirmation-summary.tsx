import { ShieldAlertIcon } from "lucide-react"

export type InvoiceSummary = {
  amount: string
  client: string
  currency: string
  description: string
  environment: string
  receiver: string
}

export function InvoiceSummaryDetails({ summary }: { summary: InvoiceSummary }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <SummaryRow label="Cliente" value={summary.client} />
        <SummaryRow label="Receptor" value={summary.receiver} />
        <SummaryRow label="Monto" value={summary.amount} />
        <SummaryRow label="Moneda" value={summary.currency} />
        <SummaryRow label="Concepto" value={summary.description} />
        <SummaryRow label="Se emite en" value={summary.environment} />
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Revisá los datos antes de confirmar. ARCA va a generar un
          comprobante real con CAE y no vamos a poder modificarlo ni
          eliminarlo después.
        </span>
      </div>
    </div>
  )
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
