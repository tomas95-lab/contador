import path from "node:path"

import dotenv from "dotenv"

dotenv.config()
dotenv.config({ path: ".env.local", override: true })

export type ArcaEnvironment = "homologacion" | "production"

function parseEnvironment(value: string | undefined): ArcaEnvironment {
  const normalized = (value ?? "homologacion").trim().toLowerCase()

  if (["production", "prod", "produccion"].includes(normalized)) {
    return "production"
  }

  return "homologacion"
}

function intFromEnv(name: string, fallback: number): number {
  const value = process.env[name]
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`)
  }

  return parsed
}

function optionalIntFromEnv(name: string): number | undefined {
  const value = process.env[name]
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`)
  }

  return parsed
}

function boolFromEnv(name: string, fallback = false): boolean {
  const value = process.env[name]
  if (!value) {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)
}

const environment = parseEnvironment(process.env.ARCA_ENV)
const onboardingVideoFilePath = process.env.ONBOARDING_VIDEO_FILE_PATH
const onboardingVideoDirectory = onboardingVideoFilePath
  ? path.dirname(resolvePath(onboardingVideoFilePath))
  : undefined

const homologacion = {
  wsaaUrl:
    process.env.ARCA_WSAA_URL_HOMO ??
    "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  wsfeUrl:
    process.env.ARCA_WSFE_URL_HOMO ??
    "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  wsfexUrl:
    process.env.ARCA_WSFEX_URL_HOMO ??
    "https://wswhomo.afip.gov.ar/wsfexv1/service.asmx",
}

const production = {
  wsaaUrl:
    process.env.ARCA_WSAA_URL_PROD ??
    "https://wsaa.afip.gov.ar/ws/services/LoginCms",
  wsfeUrl:
    process.env.ARCA_WSFE_URL_PROD ??
    "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  wsfexUrl:
    process.env.ARCA_WSFEX_URL_PROD ??
    "https://servicios1.afip.gov.ar/wsfexv1/service.asmx",
}

export const config = {
  port: intFromEnv("PORT", 3001),
  corsOrigin: process.env.CORS_ORIGIN,
  demo: {
    disableCsrRateLimit: boolFromEnv("ARCA_DISABLE_CSR_RATE_LIMIT"),
    onboardingVideoDirectory,
  },
  arca: {
    environment,
    cmsDigest: (process.env.ARCA_CMS_DIGEST ?? "sha256").toLowerCase(),
    cacheDir: resolvePath(process.env.ARCA_CACHE_DIR ?? ".arca-cache"),
    endpoints: environment === "production" ? production : homologacion,
    requestTimeoutMs: intFromEnv("ARCA_REQUEST_TIMEOUT_MS", 15000),
    historical: {
      pageSize: intFromEnv("ARCA_HISTORICAL_PAGE_SIZE", 100),
      maxInvoicesPerQuery: intFromEnv(
        "ARCA_HISTORICAL_MAX_INVOICES_PER_QUERY",
        500
      ),
    },
    defaultReceiverIvaConditionId: intFromEnv(
      "ARCA_DEFAULT_CONDICION_IVA_RECEPTOR_ID",
      5
    ),
    exportDefaults: {
      destinationCountryCode: optionalIntFromEnv("ARCA_EXPORT_DST_CMP"),
      clientCountryCuit: process.env.ARCA_EXPORT_CLIENT_COUNTRY_CUIT?.replace(
        /\D/g,
        ""
      ),
      clientName: process.env.ARCA_EXPORT_CLIENT_NAME ?? "Cliente del exterior",
      clientAddress: process.env.ARCA_EXPORT_CLIENT_ADDRESS ?? "Exterior",
      clientTaxId: process.env.ARCA_EXPORT_CLIENT_TAX_ID ?? "NO_DECLARADO",
      language: intFromEnv("ARCA_EXPORT_LANGUAGE", 1),
      unitOfMeasure: intFromEnv("ARCA_EXPORT_UNIT_OF_MEASURE", 7),
    },
  },
}
