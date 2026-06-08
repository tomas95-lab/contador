/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core"
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { NetworkOnly } from "workbox-strategies"

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: unknown[]
}

type SafePushPayload = {
  body?: string
  tag?: string
  title?: string
  url?: string
}

const sensitiveRequestMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
const sensitiveRequestPatterns = [
  /\/api(?:\/|$)/,
  /\/(?:auth|functions|rest)\/v1(?:\/|$)/,
  /^https:\/\/[^/]*\.supabase\.co\/.*$/i,
  /^https:\/\/[^/]*\.onrender\.com\/.*$/i,
  /^https:\/\/(?:[^/]+\.)?(?:afip|arca)\.gob\.ar\/.*$/i,
  /^http:\/\/(?:localhost|127\.0\.0\.1):3001\/.*$/i,
]

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

for (const urlPattern of sensitiveRequestPatterns) {
  for (const method of sensitiveRequestMethods) {
    registerRoute(urlPattern, new NetworkOnly(), method)
  }
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event)
  const title = truncateText(payload.title, 80) || "Contable"
  const body =
    truncateText(payload.body, 160) || "Tenés una novedad para revisar."

  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/pwa/icon-192.png",
      body,
      data: {
        url: sanitizeNotificationUrl(payload.url),
      },
      icon: "/pwa/icon-192.png",
      tag: truncateText(payload.tag, 64) || "contable-update",
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = sanitizeNotificationUrl(
    readNotificationUrl(event.notification.data)
  )

  event.waitUntil(openOrFocusClient(targetUrl))
})

function readPushPayload(event: PushEvent): SafePushPayload {
  if (!event.data) {
    return {}
  }

  try {
    const value = event.data.json() as SafePushPayload

    if (!value || typeof value !== "object") {
      return {}
    }

    return value
  } catch {
    return {
      body: event.data.text(),
    }
  }
}

function readNotificationUrl(data: unknown) {
  if (!data || typeof data !== "object" || !("url" in data)) {
    return undefined
  }

  const value = (data as { url?: unknown }).url
  return typeof value === "string" ? value : undefined
}

function sanitizeNotificationUrl(value: string | undefined) {
  if (!value) {
    return "/app"
  }

  try {
    const url = new URL(value, self.location.origin)

    if (url.origin !== self.location.origin) {
      return "/app"
    }

    return `${url.pathname}${url.search}${url.hash}` || "/app"
  } catch {
    return "/app"
  }
}

async function openOrFocusClient(path: string) {
  const target = new URL(path, self.location.origin)
  const clientsList = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  })

  for (const client of clientsList) {
    const clientUrl = new URL(client.url)

    if (clientUrl.origin === target.origin && "focus" in client) {
      await client.focus()
      return
    }
  }

  await self.clients.openWindow(target.href)
}

function truncateText(value: string | undefined, maxLength: number) {
  if (!value) {
    return ""
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}
