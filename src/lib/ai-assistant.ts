import type { FinancialMetrics } from "@/lib/accounting"
import { getNextMonotributoDueDate } from "@/lib/accounting"
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
  if (!supabase) {
    return "No pudimos conectar con Conta. Verificá la configuración de Supabase y volvé a intentarlo."
  }

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

    if (error) {
      throw error
    }

    if (data?.message) {
      return data.message
    }
  } catch (error) {
    console.error(error)
  }

  return "No pudimos consultar a Conta en este momento. Verificá tu conexión y volvé a intentarlo."
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
