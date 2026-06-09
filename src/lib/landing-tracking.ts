import { postToGoogleSheet } from "@/lib/google-sheets"

const VISITOR_ID_KEY = "contable-landing-visitor-id"
const SESSION_ID_KEY = "contable-landing-session-id"
const TRACKED_EVENTS_KEY = "contable-landing-tracked-events"

type LandingTrackingEvent = {
  eventName: string
  source: string
  detail?: string
  oncePerSession?: boolean
}

export type LandingTrackingIds = {
  visitorId: string
  sessionId: string
}

export function getLandingTrackingIds(): LandingTrackingIds {
  return {
    visitorId: getOrCreateStorageId("localStorage", VISITOR_ID_KEY),
    sessionId: getOrCreateStorageId("sessionStorage", SESSION_ID_KEY),
  }
}

export function trackLandingEvent({
  eventName,
  source,
  detail = "",
  oncePerSession = false,
}: LandingTrackingEvent) {
  if (typeof window === "undefined") {
    return
  }

  const dedupeKey = [eventName, source, detail].filter(Boolean).join(":")

  if (oncePerSession && wasTrackedInSession(dedupeKey)) {
    return
  }

  if (oncePerSession) {
    markTrackedInSession(dedupeKey)
  }

  const { visitorId, sessionId } = getLandingTrackingIds()
  const searchParams = new URLSearchParams(window.location.search)

  void postToGoogleSheet({
    tabName: "trackeo",
    tipo: "trackeo",
    event_id: createId(),
    visitor_id: visitorId,
    session_id: sessionId,
    evento: eventName,
    origen: source,
    detalle: detail,
    fecha: new Date().toISOString(),
    ruta: window.location.pathname,
    referrer: getReferrerOrigin(),
    utm_source: searchParams.get("utm_source") ?? "",
    utm_medium: searchParams.get("utm_medium") ?? "",
    utm_campaign: searchParams.get("utm_campaign") ?? "",
    utm_content: searchParams.get("utm_content") ?? "",
    dispositivo: getDeviceType(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    idioma: navigator.language,
  }).catch(() => undefined)
}

function getOrCreateStorageId(
  storageName: "localStorage" | "sessionStorage",
  key: string
) {
  try {
    const storage = window[storageName]
    const existingId = storage.getItem(key)

    if (existingId) {
      return existingId
    }

    const id = createId()
    storage.setItem(key, id)
    return id
  } catch {
    return createId()
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function wasTrackedInSession(dedupeKey: string) {
  try {
    return getTrackedEvents().includes(dedupeKey)
  } catch {
    return false
  }
}

function markTrackedInSession(dedupeKey: string) {
  try {
    const trackedEvents = getTrackedEvents()
    window.sessionStorage.setItem(
      TRACKED_EVENTS_KEY,
      JSON.stringify([...trackedEvents, dedupeKey])
    )
  } catch {
    return
  }
}

function getTrackedEvents(): string[] {
  const storedEvents = window.sessionStorage.getItem(TRACKED_EVENTS_KEY)

  if (!storedEvents) {
    return []
  }

  const parsedEvents: unknown = JSON.parse(storedEvents)
  return Array.isArray(parsedEvents)
    ? parsedEvents.filter((event): event is string => typeof event === "string")
    : []
}

function getReferrerOrigin() {
  if (!document.referrer) {
    return ""
  }

  try {
    return new URL(document.referrer).origin
  } catch {
    return ""
  }
}

function getDeviceType() {
  if (window.innerWidth < 768) {
    return "mobile"
  }

  if (window.innerWidth < 1024) {
    return "tablet"
  }

  return "desktop"
}
