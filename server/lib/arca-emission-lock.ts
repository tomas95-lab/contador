import { randomUUID } from "node:crypto"

import { ArcaError } from "../arca/errors.js"
import { isAmbiguousArcaAuthorizationTimeout } from "../arca/timeout.js"
import type { ArcaEnvironment } from "../config.js"
import { getSupabaseAdmin } from "./supabase-admin.js"

const LOCK_LEASE_SECONDS = 180
const LOCK_WAIT_TIMEOUT_MS = 60_000
const LOCK_RETRY_DELAY_MS = 250

export type ArcaEmissionLockScope = {
  environment: ArcaEnvironment
  invoiceType: "C" | "E"
  pointOfSale: number
  userId: string
}

export function buildArcaEmissionLockKey({
  environment,
  invoiceType,
  pointOfSale,
  userId,
}: ArcaEmissionLockScope) {
  return `${environment}:${userId}:${invoiceType}:${pointOfSale}`
}

export async function withArcaEmissionLock<T>(
  scope: ArcaEmissionLockScope,
  operation: () => Promise<T>
) {
  const lockKey = buildArcaEmissionLockKey(scope)
  const ownerToken = randomUUID()
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS

  while (!(await tryAcquireArcaEmissionLock(lockKey, ownerToken))) {
    if (Date.now() >= deadline) {
      throw new ArcaError(
        "Hay otra factura emitiéndose para este punto de venta. Esperá un momento y volvé a intentar.",
        409
      )
    }

    await sleep(LOCK_RETRY_DELAY_MS)
  }

  let releaseLock = true

  try {
    return await operation()
  } catch (error) {
    if (isAmbiguousArcaAuthorizationTimeout(error)) {
      releaseLock = false
    }

    throw error
  } finally {
    if (releaseLock) {
      await releaseArcaEmissionLock(lockKey, ownerToken)
    }
  }
}

async function tryAcquireArcaEmissionLock(lockKey: string, ownerToken: string) {
  const { data, error } = await getSupabaseAdmin().rpc(
    "try_acquire_arca_emission_lock",
    {
      p_lease_seconds: LOCK_LEASE_SECONDS,
      p_lock_key: lockKey,
      p_owner_token: ownerToken,
    }
  )

  if (error) {
    throw new ArcaError(
      "No pudimos bloquear el punto de venta para emitir.",
      500,
      {
        code: error.code,
        message: error.message,
      }
    )
  }

  return data === true
}

async function releaseArcaEmissionLock(lockKey: string, ownerToken: string) {
  const { error } = await getSupabaseAdmin().rpc("release_arca_emission_lock", {
    p_lock_key: lockKey,
    p_owner_token: ownerToken,
  })

  if (error) {
    console.error(
      JSON.stringify({
        event: "arca.invoice_emission_lock_release_failed",
        timestamp: new Date().toISOString(),
        lockKey,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    )
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
