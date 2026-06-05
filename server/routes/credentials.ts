import forge from "node-forge"
import type { Request, Response } from "express"
import { z } from "zod"

import { ArcaError } from "../arca/errors.js"
import {
  assertArcaEncryptionConfigured,
  hasUserArcaCredentials,
  saveUserArcaCredentials,
  type UserArcaCredentials,
} from "../lib/arca-credentials.js"
import { normalizeCuit } from "../lib/cuit.js"

const TEMPORARY_PRIVATE_KEY_TTL_MINUTES = 45
const TEMPORARY_PRIVATE_KEY_TTL_MS =
  TEMPORARY_PRIVATE_KEY_TTL_MINUTES * 60 * 1000

type PendingPrivateKey = {
  cuit: string
  expiresAt: number
  privateKey: string
}

const pendingPrivateKeys = new Map<string, PendingPrivateKey>()

const generateCsrSchema = z.object({
  cuit: z.string().trim().min(1),
})

const saveCredentialsSchema = z.object({
  certificate: z.string().trim().min(1),
  wsfe_pto_vta: z.coerce.number().int().positive(),
  wsfex_pto_vta: z.coerce.number().int().min(0).default(0),
})

export async function getArcaCredentialsStatus(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getRequestUserId(req)
  const configured = await hasUserArcaCredentials(userId)

  res.json({ configured })
}

export async function generateArcaCsr(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getRequestUserId(req)
  const { cuit } = generateCsrSchema.parse(req.body)
  const normalizedCuit = normalizeCuit(cuit)
  const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const csr = forge.pki.createCertificationRequest()

  csr.publicKey = keyPair.publicKey
  csr.setSubject([
    {
      name: "commonName",
      value: `contable-app-${normalizedCuit}`,
    },
    {
      name: "serialNumber",
      value: `CUIT ${normalizedCuit}`,
    },
  ])
  csr.sign(keyPair.privateKey, forge.md.sha256.create())

  if (!csr.verify()) {
    throw new ArcaError(
      "No se pudo generar un código de autorización válido.",
      500
    )
  }

  const privateKey = forge.pki.privateKeyToPem(keyPair.privateKey)
  pendingPrivateKeys.set(userId, {
    cuit: normalizedCuit,
    expiresAt: Date.now() + TEMPORARY_PRIVATE_KEY_TTL_MS,
    privateKey,
  })

  res.json({
    csr: forge.pki.certificationRequestToPem(csr),
  })
}

export async function saveArcaCredentials(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getRequestUserId(req)
  const payload = saveCredentialsSchema.parse(req.body)
  const pending = getPendingPrivateKey(userId)
  const certificate = normalizePem(payload.certificate)

  assertCertificateMatchesPrivateKey(certificate, pending)
  assertArcaEncryptionConfigured()

  const credentials: UserArcaCredentials = {
    certificate,
    cuit: pending.cuit,
    privateKey: pending.privateKey,
    userId,
    wsfePointOfSale: payload.wsfe_pto_vta,
    wsfexPointOfSale: payload.wsfex_pto_vta,
  }

  await saveUserArcaCredentials(credentials)
  pendingPrivateKeys.delete(userId)

  res.json({ ok: true })
}

function getRequestUserId(req: Request) {
  if (!req.userId) {
    throw new ArcaError("Unauthorized", 401)
  }

  return req.userId
}

function getPendingPrivateKey(userId: string) {
  const pending = pendingPrivateKeys.get(userId)

  if (!pending || pending.expiresAt <= Date.now()) {
    pendingPrivateKeys.delete(userId)
    throw new ArcaError(
      `El código de autorización venció (son válidos por ${TEMPORARY_PRIVATE_KEY_TTL_MINUTES} minutos). Volvé al paso 1, generá uno nuevo y repetí el trámite en ARCA.`,
      400
    )
  }

  return pending
}

function assertCertificateMatchesPrivateKey(
  certificatePem: string,
  pending: PendingPrivateKey
) {
  try {
    const certificate = forge.pki.certificateFromPem(certificatePem)
    const privateKey = forge.pki.privateKeyFromPem(
      pending.privateKey
    ) as forge.pki.rsa.PrivateKey
    const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)
    const certificatePublicKey = forge.pki.publicKeyToPem(certificate.publicKey)
    const generatedPublicKey = forge.pki.publicKeyToPem(publicKey)
    const certificateCuit = certificate.subject
      .getField("serialNumber")
      ?.value?.replace(/\D/g, "")

    if (certificatePublicKey.trim() !== generatedPublicKey.trim()) {
      throw new ArcaError(
        "El certificado no corresponde al código de autorización generado en esta sesión.",
        400
      )
    }

    if (certificateCuit && certificateCuit !== pending.cuit) {
      throw new ArcaError(
        "El certificado no corresponde al CUIT ingresado.",
        400
      )
    }
  } catch (error) {
    if (error instanceof ArcaError) {
      throw error
    }

    throw new ArcaError("El archivo de certificado no parece ser válido.", 400)
  }
}

function normalizePem(value: string) {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value
}
