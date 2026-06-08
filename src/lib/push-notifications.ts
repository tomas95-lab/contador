import { backendApiPath, getBackendAuthHeaders } from "@/lib/backend-api"

export type PushNotificationChannel =
  | "arca-status"
  | "category-risk"
  | "invoice-events"
  | "tax-deadlines"

export type PushSubscriptionRecord = {
  channels: PushNotificationChannel[]
  createdAt: string
  endpoint: string
  userId: string
}

export type PushSubscriptionReadiness =
  | "ready"
  | "service-worker-unavailable"
  | "notifications-unavailable"
  | "push-unavailable"

export type PushServerStatus = {
  configured: boolean
  subscriptionCount: number
}

export function getPushSubscriptionReadiness(): PushSubscriptionReadiness {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return "service-worker-unavailable"
  }

  if (!("Notification" in window)) {
    return "notifications-unavailable"
  }

  if (!("PushManager" in window)) {
    return "push-unavailable"
  }

  return "ready"
}

export async function fetchPushStatus() {
  const response = await fetch(backendApiPath("/api/push/status"), {
    headers: await getBackendAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as PushServerStatus
}

export async function getCurrentPushSubscription() {
  const registration = await getReadyServiceWorkerRegistration()
  return registration.pushManager.getSubscription()
}

export async function subscribeToPushNotifications() {
  const readiness = getPushSubscriptionReadiness()

  if (readiness !== "ready") {
    throw new Error(readinessMessage(readiness))
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    throw new Error("No se activaron las notificaciones.")
  }

  const registration = await getReadyServiceWorkerRegistration()
  const publicKey = await fetchPushPublicKey()
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    }))

  await savePushSubscription(subscription)
  return subscription
}

export async function unsubscribeFromPushNotifications() {
  const subscription = await getCurrentPushSubscription()

  if (!subscription) {
    return
  }

  await removePushSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}

export async function sendPushTestNotification() {
  const response = await fetch(backendApiPath("/api/push/test"), {
    headers: await getBackendAuthHeaders(),
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return response.json() as Promise<{
    ok: true
    result: {
      failed: number
      sent: number
    }
  }>
}

async function fetchPushPublicKey() {
  const response = await fetch(backendApiPath("/api/push/public-key"), {
    headers: await getBackendAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  const payload = (await response.json()) as {
    configured: boolean
    publicKey?: string
  }

  if (!payload.configured || !payload.publicKey) {
    throw new Error("Las notificaciones no están configuradas.")
  }

  return payload.publicKey
}

async function savePushSubscription(subscription: PushSubscription) {
  const response = await fetch(backendApiPath("/api/push/subscribe"), {
    body: JSON.stringify(subscription.toJSON()),
    headers: {
      ...(await getBackendAuthHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }
}

async function removePushSubscription(endpoint: string) {
  const response = await fetch(backendApiPath("/api/push/unsubscribe"), {
    body: JSON.stringify({ endpoint }),
    headers: {
      ...(await getBackendAuthHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }
}

async function getReadyServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration()

  if (existingRegistration?.active) {
    return existingRegistration
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new Error(
              "Todavía no está activo el servicio de notificaciones. Probá desde la versión instalada o preview."
            )
          ),
        5000
      )
    }),
  ])
}

async function readApiError(response: Response) {
  const details = (await response.json().catch(() => null)) as {
    error?: string
  } | null

  return details?.error ?? response.statusText
}

function readinessMessage(readiness: PushSubscriptionReadiness) {
  if (readiness === "notifications-unavailable") {
    return "Este navegador no permite notificaciones."
  }

  if (readiness === "push-unavailable") {
    return "Este navegador no soporta notificaciones push."
  }

  return "El service worker todavía no está disponible."
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
