import { backendApiPath, getBackendAuthHeaders } from "@/lib/backend-api"

type CredentialsStatusResponse = {
  configured: boolean
}

type GenerateCsrResponse = {
  csr: string
}

type SaveArcaCertificatePayload = {
  certificate: string
  wsfe_pto_vta: number
  wsfex_pto_vta: number
}

export async function fetchArcaCredentialsStatus() {
  const response = await fetch(backendApiPath("/api/credentials/status"), {
    headers: await getBackendAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as CredentialsStatusResponse
}

export async function generateArcaCsr(cuit: string) {
  if (import.meta.env.VITE_ARCA_MOCK_CSR === "true") {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return { csr: buildMockCsr(cuit) } as GenerateCsrResponse
  }

  const response = await fetch(
    backendApiPath("/api/credentials/generate-csr"),
    {
      body: JSON.stringify({ cuit }),
      headers: {
        ...(await getBackendAuthHeaders()),
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  )

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as GenerateCsrResponse
}

export async function saveArcaCertificate(payload: SaveArcaCertificatePayload) {
  if (import.meta.env.VITE_ARCA_MOCK_SAVE === "true") {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return { ok: true } as { ok: true }
  }

  const response = await fetch(backendApiPath("/api/credentials/save"), {
    body: JSON.stringify(payload),
    headers: {
      ...(await getBackendAuthHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as { ok: true }
}

async function readApiError(response: Response) {
  const details = (await response.json().catch(() => null)) as {
    error?: string
  } | null

  return details?.error ?? response.statusText
}

function buildMockCsr(cuit: string) {
  void cuit

  return [
    "-----BEGIN CERTIFICATE REQUEST-----",
    "MIICgzCCAWsCAQAwPjEhMB8GA1UEAxMYY29udGFibGUtYXBwLTIwMTIzNDU2Nzg5",
    "MRkwFwYDVQQFExBDVUlUIDIwMTIzNDU2Nzg5MIIBIjANBgkqhkiG9w0BAQEFAAOC",
    "AQ8AMIIBCgKCAQEAvTpPDmwoOGNfTOI4Yutd6a3QxnebvlXXKxaUh5j/xXqQtHWc",
    "zJB0vC1KUSh8BaJTjDfzc0SszU4P0yaQVu4+EqXDLHMt8x6LE8u2BI3ZDvxZUxPF",
    "CAlgd4gkPB2645KWOcPOVXERj8glK4gcqEjMaO+PyBbnzgj43qCXwCEli1wCfS1G",
    "MxkQMd5wr+yoIAmFkEB1cTpY8ZXJWr7zzP7gUH29NEDS5xIHBvODBrtp4qaj0yl9",
    "k+12e+9qVFtva8ihLyl7WuxbSN/X0RecZPb/T63bdaRqxSzBNWQEvUBRs1jShfOB",
    "4BbQuPj1I8UjCkVtL2d2EegkCuuUcb3P4Q7e3wIDAQABoAAwDQYJKoZIhvcNAQEL",
    "BQADggEBAHu42yXgq8H79bG0xXOKYN/Z4aTw5UTNnr7u2sd65mcb3bAtvr9o85oi",
    "tyYt3w1DRpqEr0uOLrAuc9B3uQTFMRr1j2NXmunTS2lnnGPgF6AjUVIH6mlyZs6s",
    "fFthdopzS5+KU4b+GOZ9fz6VQmLst20Vi4740Kygx/bX/yfgXAe+BzTyg/X9GWTQ",
    "OrF0cTvyurPhm5CrQo5YvFIKdeZk648mwJmpuVZ7IyBUfWlDM4e1FD1fqHWyltJg",
    "siSRtPuQIanroaFITf/Pz/wCzSOwMmkXSevCDn6rrnscwRz9/TgboAd03L82xH8G",
    "/USJqy2vOPHR83UgUn0Mh5ED2/6mPdw=",
    "-----END CERTIFICATE REQUEST-----",
  ].join("\n")
}
