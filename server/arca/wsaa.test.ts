import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import forge from "node-forge"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { UserArcaCredentials } from "../lib/arca-credentials.js"

vi.mock("./soap.js", () => ({
  getSoapClient: vi.fn(),
}))

describe("WSAA access ticket cache", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("keeps token/sign in memory and does not write plaintext JSON to disk", async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "arca-cache-"))
    process.env.ARCA_CACHE_DIR = cacheDir

    const { getSoapClient } = await import("./soap.js")
    vi.mocked(getSoapClient).mockResolvedValue({
      loginCmsAsync: vi.fn().mockResolvedValue([
        {
          loginCmsReturn: accessTicketXml({
            sign: "SECRET_SIGN",
            token: "SECRET_TOKEN",
          }),
        },
      ]),
    } as never)

    const { getAccessTicket } = await import("./wsaa.js")
    const credentials = createCredentials()

    const ticket = await getAccessTicket(credentials, "wsfe")

    expect(ticket.token).toBe("SECRET_TOKEN")
    expect(ticket.sign).toBe("SECRET_SIGN")
    expect(fs.readdirSync(cacheDir)).toEqual([])
  })
})

function accessTicketXml({ sign, token }: { sign: string; token: string }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketResponse version="1.0">',
    "<header>",
    "<source>CN=wsaahomo</source>",
    "<destination>CN=test</destination>",
    "<uniqueId>1</uniqueId>",
    "<generationTime>2026-06-05T12:00:00Z</generationTime>",
    "<expirationTime>2099-06-05T12:00:00Z</expirationTime>",
    "</header>",
    "<credentials>",
    `<token>${token}</token>`,
    `<sign>${sign}</sign>`,
    "</credentials>",
    "</loginTicketResponse>",
  ].join("")
}

function createCredentials(): UserArcaCredentials {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const certificate = forge.pki.createCertificate()

  certificate.publicKey = keys.publicKey
  certificate.serialNumber = "01"
  certificate.validity.notBefore = new Date("2026-01-01T00:00:00Z")
  certificate.validity.notAfter = new Date("2099-01-01T00:00:00Z")
  certificate.setSubject([{ name: "commonName", value: "test" }])
  certificate.setIssuer([{ name: "commonName", value: "test" }])
  certificate.sign(keys.privateKey, forge.md.sha256.create())

  return {
    certificate: forge.pki.certificateToPem(certificate),
    cuit: "20123456786",
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    userId: "a8ece75b-f46a-46f3-9e7d-a26e04ef8c46",
    wsfePointOfSale: 4,
    wsfexPointOfSale: 6,
  }
}
