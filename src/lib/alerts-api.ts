import { supabase } from "@/lib/supabase"
import { getFiscalEvaluationPeriod } from "@/lib/accounting"
import { sendPushAlertNotification } from "@/lib/push-notifications"
import type { ProactiveAlert } from "@/types/accounting"
import type { Database } from "@/types/database"

type RiskAlertRow = Database["public"]["Tables"]["risk_alerts"]["Row"]
type RiskAlertInsert = Database["public"]["Tables"]["risk_alerts"]["Insert"]

export type RiskAlertSeverity = "info" | "warning" | "error" | "critical"

export type RiskAlert = {
  id: string
  type: string
  severity: RiskAlertSeverity
  title: string
  message: string
  actionLabel: string | null
  actionUrl: string | null
  isRead: boolean
  isResolved: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

const ALERT_SOURCE = "proactive-alert"

export async function fetchActiveAlerts() {
  assertSupabase()

  const { data, error } = await supabase!
    .from("risk_alerts")
    .select("*")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data.map(mapRiskAlertRow)
}

export async function markAlertAsRead(id: string) {
  assertSupabase()

  const { error } = await supabase!
    .from("risk_alerts")
    .update({
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function resolveAlert(id: string) {
  assertSupabase()

  const { error } = await supabase!
    .from("risk_alerts")
    .update({
      is_resolved: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function dismissAlert(id: string, type: string) {
  assertSupabase()

  const now = new Date().toISOString()
  const { error } = await supabase!
    .from("risk_alerts")
    .update({
      is_read: true,
      is_resolved: true,
      updated_at: now,
    })
    .eq("id", id)

  if (error) {
    throw error
  }

  const { error: typeError } = await supabase!
    .from("risk_alerts")
    .update({
      is_read: true,
      is_resolved: true,
      updated_at: now,
    })
    .eq("type", type)
    .contains("metadata", {
      period_key: getCurrentAlertPeriodKey(),
      source: ALERT_SOURCE,
    })

  if (typeError) {
    throw typeError
  }
}

export async function syncAlerts(alerts: ProactiveAlert[]) {
  assertSupabase()

  const userId = await getCurrentUserId()
  const periodKey = getCurrentAlertPeriodKey()
  const { data, error } = await supabase!
    .from("risk_alerts")
    .select("*")
    .contains("metadata", {
      source: ALERT_SOURCE,
    })

  if (error) {
    throw error
  }

  const allProactiveAlerts = data.map(mapRiskAlertRow)
  const existingAlerts = allProactiveAlerts.filter(
    (alert) => alert.metadata?.period_key === periodKey
  )
  const existingByType = new Map(
    existingAlerts.map((alert) => [alert.type, alert])
  )
  const calculatedTypes = new Set(alerts.map((alert) => alert.id))
  const now = new Date().toISOString()
  const newAlerts = alerts.filter((alert) => !existingByType.has(alert.id))
  const rowsToInsert: RiskAlertInsert[] = newAlerts.map((alert) => ({
    action_label: alert.action,
    action_url: null,
    is_read: false,
    is_resolved: false,
    message: alert.description,
    metadata: {
      period_key: periodKey,
      source: ALERT_SOURCE,
    },
    severity: mapSeverity(alert.severity),
    title: alert.title,
    type: alert.id,
    updated_at: now,
    user_id: userId,
  }))
  const rowsToUpdate = alerts
    .map((alert) => {
      const existing = existingByType.get(alert.id)

      return existing && !existing.isResolved
        ? {
            alert,
            existing,
          }
        : null
    })
    .filter((item): item is { alert: ProactiveAlert; existing: RiskAlert } =>
      Boolean(item)
    )
  const staleAlertIds = allProactiveAlerts
    .filter(
      (alert) =>
        !alert.isResolved &&
        (alert.metadata?.period_key !== periodKey ||
          !calculatedTypes.has(alert.type))
    )
    .map((alert) => alert.id)

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase!
      .from("risk_alerts")
      .insert(rowsToInsert)

    if (insertError) {
      throw insertError
    }

    void sendPushAlertNotification(newAlerts).catch((error) => {
      console.error("push.alert_delivery_failed", error)
    })
  }

  await Promise.all(
    rowsToUpdate.map(({ alert, existing }) =>
      supabase!
        .from("risk_alerts")
        .update({
          action_label: alert.action,
          message: alert.description,
          severity: mapSeverity(alert.severity),
          title: alert.title,
          updated_at: now,
        })
        .eq("id", existing.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            throw updateError
          }
        })
    )
  )

  if (staleAlertIds.length > 0) {
    const { error: resolveError } = await supabase!
      .from("risk_alerts")
      .update({
        is_resolved: true,
        updated_at: now,
      })
      .in("id", staleAlertIds)

    if (resolveError) {
      throw resolveError
    }
  }

  return fetchActiveAlerts()
}

function mapRiskAlertRow(row: RiskAlertRow): RiskAlert {
  return {
    actionLabel: row.action_label,
    actionUrl: row.action_url,
    createdAt: row.created_at,
    id: row.id,
    isRead: row.is_read,
    isResolved: row.is_resolved,
    message: row.message,
    metadata: row.metadata,
    severity: mapSeverity(row.severity),
    title: row.title,
    type: row.type,
    updatedAt: row.updated_at,
  }
}

function mapSeverity(severity: string): RiskAlertSeverity {
  if (
    severity === "info" ||
    severity === "warning" ||
    severity === "error" ||
    severity === "critical"
  ) {
    return severity
  }

  return "info"
}

async function getCurrentUserId() {
  const { data, error } = await supabase!.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error("User is not authenticated")
  }

  return data.user.id
}

function getCurrentAlertPeriodKey(referenceDate = new Date()) {
  const period = getFiscalEvaluationPeriod(referenceDate)

  return `${period.startDate}:${period.endDate}`
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured")
  }
}
