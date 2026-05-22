import type { FinancialMetrics } from "@/lib/accounting"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatPercent,
} from "@/lib/accounting"
import { supabase } from "@/lib/supabase"
import type { AssistantMessage, UserFiscalProfile } from "@/types/accounting"

type AssistantPayload = {
  content: string
  metrics: FinancialMetrics
  arcaContext?: unknown
  messages?: AssistantMessage[]
  profile?: UserFiscalProfile
}

type AssistantResponse = {
  message?: string
}

export async function requestAssistantReply({
  arcaContext,
  content,
  metrics,
  messages = [],
  profile,
}: AssistantPayload) {
  if (supabase) {
    try {
      const { data, error } =
        await supabase.functions.invoke<AssistantResponse>("claude-chat", {
          body: {
            arcaContext,
            content,
            metrics,
            profile,
            messages: messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          },
        })

      if (!error && data?.message) {
        return data.message
      }
    } catch (error) {
      console.error(error)
    }
  }

  const endpoint = import.meta.env.VITE_CLAUDE_ASSISTANT_ENDPOINT

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ arcaContext, content, metrics, profile }),
      })

      if (response.ok) {
        const data = (await response.json()) as AssistantResponse

        if (data.message) {
          return data.message
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  return buildLocalReply({ content, metrics, profile })
}

function buildLocalReply({
  content,
  metrics,
  profile,
}: {
  content: string
  metrics: FinancialMetrics
  profile?: UserFiscalProfile
}) {
  const normalized = normalizeText(content)
  const userContext = profile?.activity
    ? `Para tu actividad de ${profile.activity},`
    : "Con los datos cargados,"

  if (/cripto|crypto|usdt|btc|ethereum/.test(normalized)) {
    return `${userContext} trataria cripto como caso especial: separar fecha de cobro, valor en pesos de referencia, exchange o wallet usada y comprobantes. Antes de facturar, conviene revisar si corresponde declararlo como ingreso por servicio, diferencia de cambio o tenencia, porque cambia el encuadre.`
  }

  if (
    /exterior|export|invoice|factura e|cliente afuera|usd|dolar/.test(
      normalized
    )
  ) {
    return `${userContext} una factura a exterior necesita mirar moneda, tipo de comprobante, pais del cliente, concepto exportado y liquidacion de divisas. Si ya cobraste, cruza el importe con ARCA y deja trazado el tipo de cambio usado.`
  }

  if (/relacion de dependencia|dependencia|sueldo|empleado/.test(normalized)) {
    return `${userContext} al combinar relacion de dependencia y monotributo hay que separar ingresos: sueldo por un lado, facturacion independiente por otro. El limite de categoria se mira sobre la actividad monotributista, pero ganancias, obra social y aportes pueden requerir revision aparte.`
  }

  if (metrics.annualLimitRemaining <= 0) {
    return `El acumulado del periodo ${formatFiscalPeriodRange(
      metrics.evaluationPeriod
    )} ya supera el limite por ${formatARS(
      Math.abs(metrics.annualLimitRemaining)
    )}. Conviene revisar recategorizacion y facturacion pendiente.`
  }

  if (metrics.annualUsage >= 0.85) {
    return `Estas usando ${formatPercent(
      metrics.annualUsage
    )} del limite para ${metrics.evaluationPeriod.recategorizationLabel}. Te quedan ${formatARS(
      metrics.annualLimitRemaining
    )}; mira cualquier cobro nuevo antes de facturarlo.`
  }

  return `${userContext} el mes viene en ${formatARS(
    metrics.currentMonthRevenue
  )}. El margen del periodo ${formatFiscalPeriodRange(
    metrics.evaluationPeriod
  )} es ${formatARS(metrics.annualLimitRemaining)}.`
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}
