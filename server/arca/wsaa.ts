import fs from "node:fs"
import path from "node:path"

import forge from "node-forge"
import { XMLParser } from "fast-xml-parser"

import { config } from "../config.js"
import type { UserArcaCredentials } from "../lib/arca-credentials.js"
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

const inMemoryTickets = new Map<string, AccessTicket>()
const pendingTickets = new Map<string, Promise<AccessTicket>>()

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
})

function ticketCacheKey(
  credentials: UserArcaCredentials,
  service: ArcaServiceId
) {
  return `${credentials.userId}:${credentials.cuit}:${service}`
}

function ticketCachePath(
  credentials: UserArcaCredentials,
  service: ArcaServiceId
): string {
  return path.join(
    config.arca.cacheDir,
    `ta-${config.arca.environment}-${credentials.userId}-${credentials.cuit}-${service}.json`
  )
}

function ticketCacheFilePrefix(userId: string) {
  return `ta-${config.arca.environment}-${userId}-`
}

function ticketCacheFileSuffix(service: ArcaServiceId) {
  return `-${service}.json`
}

function isUsableTicket(ticket: AccessTicket): boolean {
  const expiresAt = new Date(ticket.expirationTime).getTime()
  return Number.isFinite(expiresAt) && expiresAt - Date.now() > 5 * 60 * 1000
}

function readCachedTicket(
  credentials: UserArcaCredentials,
  service: ArcaServiceId
): AccessTicket | undefined {
  const cacheKey = ticketCacheKey(credentials, service)
  const memoryTicket = inMemoryTickets.get(cacheKey)
  if (memoryTicket && isUsableTicket(memoryTicket)) {
    return memoryTicket
  }

  try {
    const raw = fs.readFileSync(ticketCachePath(credentials, service), "utf8")
    const ticket = JSON.parse(raw) as AccessTicket

    if (ticket.token && ticket.sign && isUsableTicket(ticket)) {
      inMemoryTickets.set(cacheKey, ticket)
      return ticket
    }
  } catch {
    return undefined
  }

  return undefined
}

function writeCachedTicket(
  credentials: UserArcaCredentials,
  service: ArcaServiceId,
  ticket: AccessTicket
): void {
  inMemoryTickets.set(ticketCacheKey(credentials, service), ticket)

  try {
    fs.mkdirSync(config.arca.cacheDir, { recursive: true })
    fs.writeFileSync(
      ticketCachePath(credentials, service),
      JSON.stringify(ticket, null, 2)
    )
  } catch {
    // The TA is still valid in memory; disk cache is a restart convenience.
  }
}

function getSigningMaterial(credentials: UserArcaCredentials): SigningMaterial {
  const certificate = forge.pki.certificateFromPem(credentials.certificate)
  let privateKey: forge.pki.rsa.PrivateKey | null = null

  try {
    privateKey = forge.pki.privateKeyFromPem(
      credentials.privateKey
    ) as forge.pki.rsa.PrivateKey
  } catch {
    throw new ArcaError(
      "No pudimos leer tus credenciales ARCA. Volvé a cargar el certificado desde Configuración.",
      500
    )
  }

  if (!privateKey) {
    throw new ArcaError(
      "No pudimos leer tus credenciales ARCA. Volvé a cargar el certificado desde Configuración.",
      500
    )
  }

  return { certificate, privateKey }
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

function signCms(
  credentials: UserArcaCredentials,
  loginTicketRequest: string
): string {
  const { certificate, privateKey } = getSigningMaterial(credentials)
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
      "ARCA no devolvió una respuesta válida. Volvé a intentar más tarde.",
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

async function requestNewTicket(
  credentials: UserArcaCredentials,
  service: ArcaServiceId
): Promise<AccessTicket> {
  const loginTicketRequest = buildLoginTicketRequest(service)
  const cms = signCms(credentials, loginTicketRequest)
  const client = await getSoapClient(config.arca.endpoints.wsaaUrl)
  const [result] = await client
    .loginCmsAsync({ in0: cms })
    .catch((error: unknown) => {
      throw asWsaaError(error, service)
    })
  const responseXml = result?.loginCmsReturn

  if (!responseXml) {
    throw new ArcaError(
      "ARCA no devolvió una respuesta válida. Volvé a intentar más tarde.",
      502,
      result
    )
  }

  const ticket = parseAccessTicket(responseXml)
  writeCachedTicket(credentials, service, ticket)
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

export function invalidateTicket(userId: string, service: ArcaServiceId) {
  const memoryPrefix = `${userId}:`
  const memorySuffix = `:${service}`

  for (const key of inMemoryTickets.keys()) {
    if (key.startsWith(memoryPrefix) && key.endsWith(memorySuffix)) {
      inMemoryTickets.delete(key)
    }
  }

  for (const key of pendingTickets.keys()) {
    if (key.startsWith(memoryPrefix) && key.endsWith(memorySuffix)) {
      pendingTickets.delete(key)
    }
  }

  try {
    const filePrefix = ticketCacheFilePrefix(userId)
    const fileSuffix = ticketCacheFileSuffix(service)

    for (const fileName of fs.readdirSync(config.arca.cacheDir)) {
      if (fileName.startsWith(filePrefix) && fileName.endsWith(fileSuffix)) {
        fs.rmSync(path.join(config.arca.cacheDir, fileName), { force: true })
      }
    }
  } catch {
    // Cache invalidation is best-effort; the next request will still refresh memory.
  }
}

export async function getAccessTicket(
  credentials: UserArcaCredentials,
  service: ArcaServiceId
): Promise<AccessTicket> {
  const cachedTicket = readCachedTicket(credentials, service)
  if (cachedTicket) {
    return cachedTicket
  }

  const cacheKey = ticketCacheKey(credentials, service)
  const pending = pendingTickets.get(cacheKey)
  if (pending) {
    return pending
  }

  const nextTicket = requestNewTicket(credentials, service).finally(() => {
    pendingTickets.delete(cacheKey)
  })

  pendingTickets.set(cacheKey, nextTicket)
  return nextTicket
}
