import webPush, { type PushSubscription, WebPushError } from "web-push"

type PushConfig = {
  publicKey: string
  privateKey: string
  subject: string
  source: "env" | "ephemeral-dev"
}

export type PushPayload = {
  body: string
  tag: string
  title: string
  url: string
}

let cachedConfig: PushConfig | null = null
let webPushConfigured = false

export function getPushConfig() {
  if (cachedConfig) {
    return cachedConfig
  }

  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY
  const subject =
    process.env.PUSH_VAPID_SUBJECT ?? "mailto:soporte@contable.app"

  if (publicKey && privateKey) {
    cachedConfig = {
      privateKey,
      publicKey,
      source: "env",
      subject,
    }
    return cachedConfig
  }

  if (process.env.NODE_ENV === "production") {
    return null
  }

  const generatedKeys = webPush.generateVAPIDKeys()

  cachedConfig = {
    privateKey: generatedKeys.privateKey,
    publicKey: generatedKeys.publicKey,
    source: "ephemeral-dev",
    subject,
  }

  console.warn(
    "PUSH_VAPID_PUBLIC_KEY/PUSH_VAPID_PRIVATE_KEY missing; using ephemeral development VAPID keys."
  )

  return cachedConfig
}

export function getPushPublicKey() {
  return getPushConfig()?.publicKey ?? null
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
) {
  const config = getPushConfig()

  if (!config) {
    throw new Error("Push notifications are not configured.")
  }

  configureWebPush(config)

  return webPush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: "normal",
  })
}

export function isExpiredPushSubscription(error: unknown) {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 || error.statusCode === 410)
  )
}

export function getPushErrorSummary(error: unknown) {
  if (error instanceof WebPushError) {
    return {
      message: `Push service returned ${error.statusCode}.`,
      statusCode: error.statusCode,
    }
  }

  return {
    message: error instanceof Error ? error.message : "Unknown push error",
  }
}

function configureWebPush(config: PushConfig) {
  if (webPushConfigured) {
    return
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  webPushConfigured = true
}
