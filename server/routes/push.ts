import type { Request, Response } from "express"
import type { PushSubscription } from "web-push"
import { z } from "zod"

import { ArcaError } from "../arca/errors.js"
import {
  getPushErrorSummary,
  getPushPublicKey,
  isExpiredPushSubscription,
  sendPushNotification,
} from "../lib/push-notifications.js"
import { getSupabaseAdmin } from "../lib/supabase-admin.js"

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function getPushStatus(req: Request, res: Response) {
  const userId = getRequestUserId(req)
  const publicKey = getPushPublicKey()

  const { count, error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("active", true)

  if (error) {
    throw pushStorageError(error)
  }

  res.json({
    configured: Boolean(publicKey),
    subscriptionCount: count ?? 0,
  })
}

export function getPushVapidPublicKey(_req: Request, res: Response) {
  const publicKey = getPushPublicKey()

  if (!publicKey) {
    res.status(503).json({
      configured: false,
      error:
        "Las notificaciones no están configuradas en el servidor. Configurá PUSH_VAPID_PUBLIC_KEY y PUSH_VAPID_PRIVATE_KEY.",
    })
    return
  }

  res.json({
    configured: true,
    publicKey,
  })
}

export async function subscribeToPush(req: Request, res: Response) {
  const userId = getRequestUserId(req)
  const payload = pushSubscriptionSchema.parse(req.body)
  const now = new Date().toISOString()

  const { error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        active: true,
        auth: payload.keys.auth,
        endpoint: payload.endpoint,
        failed_at: null,
        failure_reason: null,
        p256dh: payload.keys.p256dh,
        updated_at: now,
        user_agent: req.header("user-agent") ?? null,
        user_id: userId,
      },
      { onConflict: "user_id,endpoint" }
    )

  if (error) {
    throw pushStorageError(error)
  }

  res.status(201).json({ ok: true })
}

export async function unsubscribeFromPush(req: Request, res: Response) {
  const userId = getRequestUserId(req)
  const { endpoint } = unsubscribeSchema.parse(req.body)

  const { error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)

  if (error) {
    throw pushStorageError(error)
  }

  res.json({ ok: true })
}

export async function sendTestPush(req: Request, res: Response) {
  const userId = getRequestUserId(req)
  const { data, error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("active", true)
    .returns<PushSubscriptionRow[]>()

  if (error) {
    throw pushStorageError(error)
  }

  if (!data.length) {
    res.status(404).json({
      error: "No hay una suscripción activa para enviar una prueba.",
    })
    return
  }

  const result = {
    failed: 0,
    sent: 0,
  }

  for (const subscription of data) {
    try {
      await sendPushNotification(toWebPushSubscription(subscription), {
        body: "Las notificaciones están activas.",
        tag: "contable-test",
        title: "Contable",
        url: "/app",
      })

      result.sent += 1
      await markSubscriptionUsed(subscription.id)
    } catch (error) {
      result.failed += 1
      await markSubscriptionFailed(subscription.id, error)
    }
  }

  if (result.sent === 0) {
    res.status(502).json({
      error: "No pudimos enviar la notificación de prueba.",
      result,
    })
    return
  }

  res.json({ ok: true, result })
}

function getRequestUserId(req: Request) {
  if (!req.userId) {
    throw new ArcaError("Unauthorized", 401)
  }

  return req.userId
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
  const { error } = await getSupabaseAdmin()
    .from("push_subscriptions")
    .update({
      failed_at: null,
      failure_reason: null,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)

  if (error) {
    console.error("push.subscription_mark_used_failed", {
      code: error.code,
      message: error.message,
    })
  }
}

async function markSubscriptionFailed(
  subscriptionId: string,
  error: unknown
) {
  const summary = getPushErrorSummary(error)
  const updatePayload: {
    active?: boolean
    failed_at: string
    failure_reason: string
    updated_at: string
  } = {
    failed_at: new Date().toISOString(),
    failure_reason: summary.message,
    updated_at: new Date().toISOString(),
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

function pushStorageError(error: { code?: string; message?: string }) {
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
