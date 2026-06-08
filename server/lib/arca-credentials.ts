import { ArcaError } from "../arca/errors.js"
import { config, type ArcaEnvironment } from "../config.js"
import { getSupabaseAdmin, requiredEnv } from "./supabase-admin.js"

const CREDENTIALS_CACHE_TTL_MS = 5 * 60 * 1000
const ENCRYPTED_CREDENTIAL_PREFIX = "pgcrypto:v1:"

type UserArcaCredentialsRow = {
  arca_environment?: ArcaEnvironment
  user_id: string
  cuit: string
  certificate: string
  private_key: string
  wsfe_pto_vta: number
  wsfex_pto_vta: number
}

export type UserArcaCredentials = {
  arcaEnvironment: ArcaEnvironment
  userId: string
  cuit: string
  certificate: string
  privateKey: string
  wsfePointOfSale: number
  wsfexPointOfSale: number
}

type CachedCredentials = {
  credentials: UserArcaCredentials
  expiresAt: number
}

const credentialsCache = new Map<string, CachedCredentials>()

export function assertArcaEncryptionConfigured() {
  getArcaEncryptionKey()
}

export async function getUserArcaCredentials(
  userId: string,
  environment: ArcaEnvironment = config.arca.environment
): Promise<UserArcaCredentials> {
  const cacheKey = getCredentialsCacheKey(userId, environment)
  const cached = credentialsCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.credentials
  }

  let { data, error } = await getSupabaseAdmin()
    .from("user_arca_credentials")
    .select(
      "arca_environment, user_id, cuit, certificate, private_key, wsfe_pto_vta, wsfex_pto_vta"
    )
    .eq("user_id", userId)
    .eq("arca_environment", environment)
    .maybeSingle<UserArcaCredentialsRow>()

  if (error && isMissingArcaEnvironmentColumn(error)) {
    if (environment !== "production") {
      throw missingCredentialsError(environment)
    }

    const legacyResult = await getSupabaseAdmin()
      .from("user_arca_credentials")
      .select("user_id, cuit, certificate, private_key, wsfe_pto_vta, wsfex_pto_vta")
      .eq("user_id", userId)
      .maybeSingle<UserArcaCredentialsRow>()

    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    throw new ArcaError("No se pudieron leer las credenciales ARCA.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  if (!data) {
    throw missingCredentialsError(environment)
  }

  const credentials = await mapCredentials(data)
  if (
    !isEncryptedCredential(data.certificate) ||
    !isEncryptedCredential(data.private_key)
  ) {
    await persistEncryptedCredentials(credentials)
  }

  credentialsCache.set(cacheKey, {
    credentials,
    expiresAt: Date.now() + CREDENTIALS_CACHE_TTL_MS,
  })

  return credentials
}

export async function hasUserArcaCredentials(
  userId: string,
  environment: ArcaEnvironment = config.arca.environment
) {
  const cacheKey = getCredentialsCacheKey(userId, environment)
  const cached = credentialsCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return true
  }

  let { data, error } = await getSupabaseAdmin()
    .from("user_arca_credentials")
    .select("user_id")
    .eq("user_id", userId)
    .eq("arca_environment", environment)
    .maybeSingle<{ user_id: string }>()

  if (error && isMissingArcaEnvironmentColumn(error)) {
    if (environment !== "production") {
      return false
    }

    const legacyResult = await getSupabaseAdmin()
      .from("user_arca_credentials")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle<{ user_id: string }>()

    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    throw new ArcaError("No se pudieron leer las credenciales ARCA.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  return Boolean(data)
}

export async function saveUserArcaCredentials(
  credentials: UserArcaCredentials
) {
  await persistEncryptedCredentials(credentials)

  credentialsCache.set(
    getCredentialsCacheKey(credentials.userId, credentials.arcaEnvironment),
    {
      credentials,
      expiresAt: Date.now() + CREDENTIALS_CACHE_TTL_MS,
    }
  )
}

async function persistEncryptedCredentials(credentials: UserArcaCredentials) {
  const [certificate, privateKey] = await Promise.all([
    encryptCredential(credentials.certificate),
    encryptCredential(credentials.privateKey),
  ])
  const { error } = await getSupabaseAdmin()
    .from("user_arca_credentials")
    .upsert(
      {
        certificate,
        arca_environment: credentials.arcaEnvironment,
        cuit: credentials.cuit,
        private_key: privateKey,
        updated_at: new Date().toISOString(),
        user_id: credentials.userId,
        wsfe_pto_vta: credentials.wsfePointOfSale,
        wsfex_pto_vta: credentials.wsfexPointOfSale,
      },
      { onConflict: "user_id,arca_environment" }
    )

  if (error) {
    if (isMissingArcaEnvironmentColumn(error)) {
      throw new ArcaError(
        "Falta aplicar la migración de credenciales ARCA por ambiente antes de guardar este certificado.",
        500,
        {
          code: error.code,
          message: error.message,
        }
      )
    }

    throw new ArcaError("No se pudieron guardar las credenciales ARCA.", 500, {
      code: error.code,
      message: error.message,
    })
  }
}

async function mapCredentials(
  row: UserArcaCredentialsRow
): Promise<UserArcaCredentials> {
  const [certificate, privateKey] = await Promise.all([
    decryptCredential(row.certificate),
    decryptCredential(row.private_key),
  ])

  return {
    arcaEnvironment: row.arca_environment ?? "production",
    userId: row.user_id,
    cuit: row.cuit.replace(/\D/g, ""),
    certificate: normalizePem(certificate),
    privateKey: normalizePem(privateKey),
    wsfePointOfSale: row.wsfe_pto_vta,
    wsfexPointOfSale: row.wsfex_pto_vta,
  }
}

async function encryptCredential(value: string) {
  const { data, error } = await getSupabaseAdmin().rpc(
    "encrypt_arca_credential",
    {
      encryption_key: getArcaEncryptionKey(),
      plaintext: normalizePem(value),
    }
  )

  if (error) {
    throw new ArcaError("No se pudo cifrar la credencial ARCA.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  if (typeof data !== "string" || !data) {
    throw new ArcaError("No se pudo cifrar la credencial ARCA.", 500)
  }

  return `${ENCRYPTED_CREDENTIAL_PREFIX}${data}`
}

async function decryptCredential(value: string) {
  if (!isEncryptedCredential(value)) {
    return value
  }

  const { data, error } = await getSupabaseAdmin().rpc(
    "decrypt_arca_credential",
    {
      ciphertext: value.slice(ENCRYPTED_CREDENTIAL_PREFIX.length),
      encryption_key: getArcaEncryptionKey(),
    }
  )

  if (error) {
    throw new ArcaError("No se pudo descifrar la credencial ARCA.", 500, {
      code: error.code,
      message: error.message,
    })
  }

  if (typeof data !== "string" || !data) {
    throw new ArcaError("No se pudo descifrar la credencial ARCA.", 500)
  }

  return data
}

function isEncryptedCredential(value: string) {
  return value.startsWith(ENCRYPTED_CREDENTIAL_PREFIX)
}

function normalizePem(value: string) {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value
}

function getArcaEncryptionKey() {
  return requiredEnv("ARCA_ENCRYPTION_KEY", process.env.ARCA_ENCRYPTION_KEY)
}

function getCredentialsCacheKey(userId: string, environment: ArcaEnvironment) {
  return `${userId}:${environment}`
}

function formatArcaEnvironment(environment: ArcaEnvironment) {
  return environment === "production" ? "producción" : "homologación"
}

function missingCredentialsError(environment: ArcaEnvironment) {
  return new ArcaError(
    `No tenés credenciales ARCA configuradas para ${formatArcaEnvironment(environment)}.`,
    403
  )
}

function isMissingArcaEnvironmentColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("arca_environment") === true
  )
}
