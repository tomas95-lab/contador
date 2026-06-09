import type { Request, Response } from "express"
import { z } from "zod"

import { ArcaError } from "../arca/errors.js"
import { getPushPublicKey } from "../lib/push-notifications.js"
import { getSupabaseAdmin } from "../lib/supabase-admin.js"
import {
  buildRiskAlertsPush,
  pushStorageError,
  sendPushToUser,
} from "../lib/user-push-notifications.js"

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

const pushAlertsSchema = z.object({
  alerts: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        id: z.string().trim().min(1).max(100),
        severity: z.enum(["critical", "info", "warning"]),
        title: z.string().trim().min(1).max(120),
      })
    )
    .min(1)
    .max(10),
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
  const result = await sendPushToUser(userId, {
    body: "Las notificaciones están activas.",
    tag: "contable-test",
    title: "Contable",
    url: "/app",
  })

  if (result.sent === 0 && result.failed === 0) {
    res.status(404).json({
      error: "No hay una suscripción activa para enviar una prueba.",
    })
    return
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

export async function sendAlertPush(req: Request, res: Response) {
  const userId = getRequestUserId(req)
  const { alerts } = pushAlertsSchema.parse(req.body)
  const result = await sendPushToUser(userId, buildRiskAlertsPush(alerts))

  res.json({ ok: true, result })
}

function getRequestUserId(req: Request) {
  if (!req.userId) {
    throw new ArcaError("Unauthorized", 401)
  }

  return req.userId
}
