import fs from "node:fs"
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

function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)
}

function firstExistingPath(candidates: string[]): string {
  const existing = candidates.find((candidate) =>
    fs.existsSync(resolvePath(candidate))
  )
  return existing ?? candidates[0]
}

const environment = parseEnvironment(process.env.ARCA_ENV)

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
  arca: {
    environment,
    cuit: process.env.ARCA_CUIT?.replace(/\D/g, "") ?? "20464403524",
    certificatePath: resolvePath(
      process.env.ARCA_CERT_PATH ??
        firstExistingPath([
          "../contable-app_1f484272f348b071.crt",
          "../certificate.crt",
          "./certs/certificate.crt",
        ])
    ),
    privateKeyPath: resolvePath(
      process.env.ARCA_PRIVATE_KEY_PATH ??
        firstExistingPath(["../private.key", "./certs/private.key"])
    ),
    privateKeyPassphrase: process.env.ARCA_PRIVATE_KEY_PASSPHRASE,
    cmsDigest: (process.env.ARCA_CMS_DIGEST ?? "sha256").toLowerCase(),
    cacheDir: resolvePath(process.env.ARCA_CACHE_DIR ?? ".arca-cache"),
    endpoints: environment === "production" ? production : homologacion,
    wsfePointOfSale: intFromEnv("ARCA_WSFE_PTO_VTA", 1),
    wsfexPointOfSale: intFromEnv("ARCA_WSFEX_PTO_VTA", 1),
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
