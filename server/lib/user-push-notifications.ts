import type { PushSubscription } from "web-push"

import { ArcaError } from "../arca/errors.js"
import { formatInvoiceNumber } from "./invoice-persistence.js"
import {
  getPushErrorSummary,
  isExpiredPushSubscription,
  sendPushNotification,
  type PushPayload,
} from "./push-notifications.js"
import { getSupabaseAdmin } from "./supabase-admin.js"

type PushSubscriptionRow = {
  auth: string
  endpoint: string
  id: string
  p256dh: string
}

type RiskAlertPushInput = {
  description: string
  id: string
  severity: "critical" | "info" | "warning"
  title: string
}

export type PushDeliveryResult = {
  failed: number
  sent: number
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushDeliveryResult> {
  const { data, error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("active", true)
    .returns<PushSubscriptionRow[]>()

  if (error) {
    throw pushStorageError(error)
  }

  const result = {
    failed: 0,
    sent: 0,
  }

  for (const subscription of data) {
    try {
      await sendPushNotification(toWebPushSubscription(subscription), payload)
      result.sent += 1
      await markSubscriptionUsed(subscription.id)
    } catch (error) {
      result.failed += 1
      await markSubscriptionFailed(subscription.id, error)
    }
  }

  return result
}

export function buildInvoiceAuthorizedPush({
  invoiceType,
  number,
  pointOfSale,
}: {
  invoiceType: "C" | "E"
  number: number
  pointOfSale: number
}): PushPayload {
  const formattedNumber = formatInvoiceNumber(pointOfSale, number)

  return {
    body: `Factura ${invoiceType} ${formattedNumber} autorizada y guardada.`,
    tag: `invoice-authorized-${invoiceType}-${pointOfSale}-${number}`,
    title: "Factura autorizada",
    url: "/app",
  }
}

export function buildRiskAlertsPush(alerts: RiskAlertPushInput[]): PushPayload {
  const [firstAlert] = alerts

  if (alerts.length === 1 && firstAlert) {
    return {
      body: firstAlert.description,
      tag: `risk-alert-${safeTagSegment(firstAlert.id)}`,
      title: firstAlert.title,
      url: "/app",
    }
  }

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical"
  ).length

  return {
    body:
      criticalCount > 0
        ? `${criticalCount} ${
            criticalCount === 1 ? "requiere" : "requieren"
          } atención inmediata. Revisalas en Contable.`
        : "Revisalas en Contable para mantenerte al día.",
    tag: "risk-alerts-new",
    title: `Tenés ${alerts.length} alertas fiscales nuevas`,
    url: "/app",
  }
}

export function pushStorageError(error: { code?: string; message?: string }) {
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("push_subscriptions") === true
  ) {
    return new ArcaError(
      "Falta aplicar la migración de notificaciones push antes de usar esta función.",
      500,
      {
        code: error.code,
        message: error.message,
      }
    )
  }

  return new ArcaError("No pudimos guardar las notificaciones push.", 500, {
    code: error.code,
    message: error.message,
  })
}

function toWebPushSubscription(
  subscription: PushSubscriptionRow
): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh,
    },
  }
}

async function markSubscriptionUsed(subscriptionId: string) {
  const now = new Date().toISOString()
  const { error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .update({
      failed_at: null,
      failure_reason: null,
      last_used_at: now,
      updated_at: now,
    })
    .eq("id", subscriptionId)

  if (error) {
    console.error("push.subscription_mark_used_failed", {
      code: error.code,
      message: error.message,
    })
  }
}

async function markSubscriptionFailed(subscriptionId: string, error: unknown) {
  const summary = getPushErrorSummary(error)
  const now = new Date().toISOString()
  const updatePayload: {
    active?: boolean
    failed_at: string
    failure_reason: string
    updated_at: string
  } = {
    failed_at: now,
    failure_reason: summary.message,
    updated_at: now,
  }

  if (isExpiredPushSubscription(error)) {
    updatePayload.active = false
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .update(updatePayload)
    .eq("id", subscriptionId)

  if (updateError) {
    console.error("push.subscription_mark_failed_failed", {
      code: updateError.code,
      message: updateError.message,
    })
  }

  console.error("push.send_failed", summary)
}

function safeTagSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40) || "new"
}
