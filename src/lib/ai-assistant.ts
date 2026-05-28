import type { FinancialMetrics } from "@/lib/accounting"
import {
  formatARS,
  formatFiscalPeriodRange,
  formatPercent,
  getNextMonotributoDueDate,
} from "@/lib/accounting"
import { supabase } from "@/lib/supabase"
import type {
  AssistantMessage,
  ProactiveAlert,
  UserFiscalProfile,
} from "@/types/accounting"

export type RiskLevel = "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO"

export type RiskSnapshot = {
  riskScore: number
  riskLevel: RiskLevel
  categoryUsagePercent: number
  projectedBreachDate: string | null
  daysUntilBreach: number | null
  activeAlerts: {
    type: string
    title: string
    severity: string
  }[]
  nextDeadline: string | null
}

type AssistantPayload = {
  content: string
  metrics: FinancialMetrics
  arcaContext?: unknown
  messages?: AssistantMessage[]
  profile?: UserFiscalProfile
  riskSnapshot?: RiskSnapshot
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
  riskSnapshot,
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
            riskSnapshot,
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
        body: JSON.stringify({
          arcaContext,
          content,
          metrics,
          profile,
          riskSnapshot,
        }),
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

  return buildLocalReply({ content, metrics, profile, riskSnapshot })
}

export function buildRiskSnapshot(
  metrics: FinancialMetrics,
  activeAlerts: ProactiveAlert[]
): RiskSnapshot {
  return {
    activeAlerts: activeAlerts.map((alert) => ({
      severity: alert.severity,
      title: alert.title,
      type: alert.id,
    })),
    categoryUsagePercent: Math.round(metrics.annualUsage * 100),
    daysUntilBreach: metrics.daysUntilBreach,
    nextDeadline: getNextMonotributoDueDate(),
    projectedBreachDate: metrics.projectedBreachDate,
    riskLevel: getRiskLevel(metrics),
    riskScore: metrics.riskScore,
  }
}

export function getRiskLevel(metrics: FinancialMetrics): RiskLevel {
  if (
    metrics.annualUsage > 0.95 ||
    (metrics.daysUntilBreach !== null && metrics.daysUntilBreach < 30)
  ) {
    return "CRÍTICO"
  }

  if (metrics.annualUsage >= 0.8) {
    return "ALTO"
  }

  if (metrics.annualUsage >= 0.6) {
    return "MEDIO"
  }

  return "BAJO"
}

function buildLocalReply({
  content,
  metrics,
  profile,
  riskSnapshot,
}: {
  content: string
  metrics: FinancialMetrics
  profile?: UserFiscalProfile
  riskSnapshot?: RiskSnapshot
}) {
  const normalized = normalizeText(content)
  const userContext = profile?.activity
    ? `Para tu actividad de ${profile.activity},`
    : "Con los datos cargados,"

  if (isStatusQuestion(normalized)) {
    return buildLocalDiagnosis(metrics, riskSnapshot)
  }

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

function buildLocalDiagnosis(
  metrics: FinancialMetrics,
  riskSnapshot?: RiskSnapshot
) {
  const riskLevel = riskSnapshot?.riskLevel ?? getRiskLevel(metrics)
  const usage = riskSnapshot
    ? `${riskSnapshot.categoryUsagePercent}%`
    : formatPercent(metrics.annualUsage)
  const alert = riskSnapshot?.activeAlerts[0]
  const breachText =
    riskSnapshot?.daysUntilBreach !== null &&
    riskSnapshot?.daysUntilBreach !== undefined
      ? ` Si seguís igual, el cruce estimado aparece en ${riskSnapshot.daysUntilBreach} días.`
      : ""

  return [
    `Situación actual: venís usando ${usage} del límite del período ${formatFiscalPeriodRange(
      metrics.evaluationPeriod
    )}. Te quedan ${formatARS(metrics.annualLimitRemaining)} de margen.`,
    `Riesgo: ${riskLevel}.${breachText}${
      alert ? ` Alerta activa principal: ${alert.title}.` : ""
    }`,
    "Acción concreta: revisá cobros pendientes antes de facturar y simulá cualquier ingreso grande antes de aceptarlo.",
  ].join("\n\n")
}

function isStatusQuestion(normalized: string) {
  return /^(hola|buenas|como estoy|cómo estoy|que ves|qué ves|resumen|diagnostico|diagnóstico|estado)/.test(
    normalized
  )
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}
