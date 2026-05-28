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
