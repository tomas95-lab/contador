import fs from "node:fs"
import path from "node:path"

import forge from "node-forge"
import { XMLParser } from "fast-xml-parser"

import { config } from "../config.js"
import { isoDateTime } from "./date.js"
import { ArcaError } from "./errors.js"
import { record } from "./objects.js"
import { getSoapClient } from "./soap.js"

export type ArcaServiceId = "wsfe" | "wsfex"

export interface AccessTicket {
  token: string
  sign: string
  generationTime: string
  expirationTime: string
}

interface SigningMaterial {
  certificate: forge.pki.Certificate
  privateKey: forge.pki.rsa.PrivateKey
}

let signingMaterial: SigningMaterial | undefined
const inMemoryTickets = new Map<ArcaServiceId, AccessTicket>()
const pendingTickets = new Map<ArcaServiceId, Promise<AccessTicket>>()

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
})

function ticketCachePath(service: ArcaServiceId): string {
  return path.join(
    config.arca.cacheDir,
    `ta-${config.arca.environment}-${service}.json`
  )
}

function isUsableTicket(ticket: AccessTicket): boolean {
  const expiresAt = new Date(ticket.expirationTime).getTime()
  return Number.isFinite(expiresAt) && expiresAt - Date.now() > 5 * 60 * 1000
}

function readCachedTicket(service: ArcaServiceId): AccessTicket | undefined {
  const memoryTicket = inMemoryTickets.get(service)
  if (memoryTicket && isUsableTicket(memoryTicket)) {
    return memoryTicket
  }

  try {
    const raw = fs.readFileSync(ticketCachePath(service), "utf8")
    const ticket = JSON.parse(raw) as AccessTicket

    if (ticket.token && ticket.sign && isUsableTicket(ticket)) {
      inMemoryTickets.set(service, ticket)
      return ticket
    }
  } catch {
    return undefined
  }

  return undefined
}

function writeCachedTicket(service: ArcaServiceId, ticket: AccessTicket): void {
  inMemoryTickets.set(service, ticket)

  try {
    fs.mkdirSync(config.arca.cacheDir, { recursive: true })
    fs.writeFileSync(ticketCachePath(service), JSON.stringify(ticket, null, 2))
  } catch {
    // The TA is still valid in memory; disk cache is a restart convenience.
  }
}

function getSigningMaterial(): SigningMaterial {
  if (signingMaterial) {
    return signingMaterial
  }

  const certPem = fs.readFileSync(config.arca.certificatePath, "utf8")
  const keyPem = fs.readFileSync(config.arca.privateKeyPath, "utf8")

  const certificate = forge.pki.certificateFromPem(certPem)
  let privateKey: forge.pki.rsa.PrivateKey | null = null

  try {
    privateKey = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey
  } catch {
    if (!config.arca.privateKeyPassphrase) {
      throw new ArcaError(
        "Could not read ARCA private key. If it is encrypted, set ARCA_PRIVATE_KEY_PASSPHRASE.",
        500
      )
    }

    const encryptedInfo = forge.pki.encryptedPrivateKeyFromPem(keyPem)
    const decryptedInfo = forge.pki.decryptPrivateKeyInfo(
      encryptedInfo,
      config.arca.privateKeyPassphrase
    )
    privateKey = decryptedInfo
      ? (forge.pki.privateKeyFromAsn1(
          decryptedInfo
        ) as forge.pki.rsa.PrivateKey)
      : null
  }

  if (!privateKey) {
    throw new ArcaError("Could not decrypt ARCA private key.", 500)
  }

  signingMaterial = { certificate, privateKey }
  return signingMaterial
}

function digestOid(): string {
  if (config.arca.cmsDigest === "sha1") {
    return forge.pki.oids.sha1
  }

  return forge.pki.oids.sha256
}

function buildLoginTicketRequest(service: ArcaServiceId): string {
  const now = Date.now()
  const generationTime = isoDateTime(new Date(now - 10 * 60 * 1000))
  const expirationTime = isoDateTime(new Date(now + 11 * 60 * 60 * 1000))
  const uniqueId = Math.floor(now / 1000)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    "<header>",
    `<uniqueId>${uniqueId}</uniqueId>`,
    `<generationTime>${generationTime}</generationTime>`,
    `<expirationTime>${expirationTime}</expirationTime>`,
    "</header>",
    `<service>${service}</service>`,
    "</loginTicketRequest>",
  ].join("")
}

function signCms(loginTicketRequest: string): string {
  const { certificate, privateKey } = getSigningMaterial()
  const p7 = forge.pkcs7.createSignedData()

  p7.content = forge.util.createBuffer(loginTicketRequest, "utf8")
  p7.addCertificate(certificate)
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: digestOid(),
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date() as unknown as string,
      },
    ],
  })

  p7.sign({ detached: false })
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes())
}

function parseAccessTicket(xml: string): AccessTicket {
  const parsed = xmlParser.parse(xml)
  const response = parsed.loginTicketResponse
  const credentials = response?.credentials
  const header = response?.header

  if (!credentials?.token || !credentials?.sign || !header?.expirationTime) {
    throw new ArcaError(
      "WSAA returned an unexpected login ticket response.",
      502,
      {
        parsed,
      }
    )
  }

  return {
    token: credentials.token,
    sign: credentials.sign,
    generationTime: header.generationTime,
    expirationTime: header.expirationTime,
  }
}

async function requestNewTicket(service: ArcaServiceId): Promise<AccessTicket> {
  const loginTicketRequest = buildLoginTicketRequest(service)
  const cms = signCms(loginTicketRequest)
  const client = await getSoapClient(config.arca.endpoints.wsaaUrl)
  const [result] = await client
    .loginCmsAsync({ in0: cms })
    .catch((error: unknown) => {
      throw asWsaaError(error, service)
    })
  const responseXml = result?.loginCmsReturn

  if (!responseXml) {
    throw new ArcaError("WSAA did not return loginCmsReturn.", 502, result)
  }

  const ticket = parseAccessTicket(responseXml)
  writeCachedTicket(service, ticket)
  return ticket
}

function asWsaaError(error: unknown, service: ArcaServiceId): ArcaError {
  const fallbackMessage =
    error instanceof Error ? error.message : "WSAA rejected the login request."
  const fault = record(record(record(record(error).root).Envelope).Body).Fault
  const faultRecord = record(fault)
  const faultString =
    typeof faultRecord.faultstring === "string"
      ? faultRecord.faultstring
      : fallbackMessage
  const faultCode =
    typeof faultRecord.faultcode === "string" ? faultRecord.faultcode : null

  return new ArcaError(`WSAA rechazó el certificado: ${faultString}`, 502, {
    faultCode,
    arcaEnvironment: config.arca.environment,
    service,
  })
}

export async function getAccessTicket(
  service: ArcaServiceId
): Promise<AccessTicket> {
  const cachedTicket = readCachedTicket(service)
  if (cachedTicket) {
    return cachedTicket
  }

  const pending = pendingTickets.get(service)
  if (pending) {
    return pending
  }

  const nextTicket = requestNewTicket(service).finally(() => {
    pendingTickets.delete(service)
  })

  pendingTickets.set(service, nextTicket)
  return nextTicket
}
