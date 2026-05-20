export type ArcaAnnualSummary = {
  year: number
  total: number
  count: number
  pointOfSale: number | null
  invoiceTypes: string[]
  summaries: {
    source: "wsfe" | "wsfex"
    invoiceType: "C" | "E"
    invoiceTypeCode: number
    pointOfSale: number
    year: number
    total: number
    count: number
    lastAuthorizedNumber: number
    queried: number
    invoices: {
      number: number
      date: string | null
      amount: number
      amountArs?: number
      currencyId?: string
      currencyRate?: number
      authorizationCode: string | null
      result: string | null
    }[]
  }[]
}

export type ArcaHistoricalInvoices = {
  queriedPoints: {
    wsfe: number[]
    wsfex: number[]
  }
  total: number
  count: number
  summaries: {
    source: "wsfe" | "wsfex"
    invoiceType: "C" | "E"
    invoiceTypeCode: number
    pointOfSale: number
    total: number
    count: number
    lastAuthorizedNumber: number
    queried: number
  }[]
  invoices: {
    source: "wsfe" | "wsfex"
    invoiceType: "C" | "E"
    invoiceTypeCode: number
    pointOfSale: number
    number: number
    formattedNumber: string
    date: string | null
    amount: number
    amountArs: number
    currencyId: string
    currencyRate: number
    cae: string | null
    result: string | null
  }[]
  errors: {
    message: string
    details: unknown
  }[]
}

export type ArcaInvoiceEmissionPayload = {
  amount: number
  description: string
  invoiceType: "C" | "E"
  clientCuit?: string
  clientName?: string
  clientAddress?: string
  clientTaxId?: string
  destinationCountryCode?: number
  receiverIvaConditionId?: number
  serviceFrom?: string
  serviceTo?: string
  dueDate?: string
}

export type EmittedArcaInvoice = {
  cae: string
  caeExpiresAt: string | null
  result: string
  invoice: {
    invoiceType: "C" | "E"
    invoiceTypeCode: number
    pointOfSale: number
    number: number
    date: string | null
    amount: number
    description: string
  }
}

const arcaApiUrl =
  (import.meta.env.VITE_ARCA_API_URL as string | undefined) ??
  "http://localhost:3001"

export async function fetchArcaAnnualSummary(year = new Date().getFullYear()) {
  const url = new URL("/api/invoices/arca/annual-summary", arcaApiUrl)
  url.searchParams.set("year", String(year))

  const response = await fetch(url)

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as {
      error?: string
    } | null

    throw new Error(details?.error ?? "No se pudo consultar ARCA.")
  }

  return (await response.json()) as ArcaAnnualSummary
}

export async function emitArcaInvoice(payload: ArcaInvoiceEmissionPayload) {
  const url = new URL("/api/invoices/emit", arcaApiUrl)
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    const details = await parseArcaError(response)

    throw new Error(details ?? "No se pudo emitir la factura en ARCA.")
  }

  return (await response.json()) as EmittedArcaInvoice
}

export async function fetchArcaHistoricalInvoices({
  wsfe = [2, 4],
  wsfex = [1, 3],
}: {
  wsfe?: number[]
  wsfex?: number[]
} = {}) {
  const url = new URL("/api/invoices/arca/historical", arcaApiUrl)
  url.searchParams.set("wsfe", wsfe.join(","))
  url.searchParams.set("wsfex", wsfex.join(","))

  const response = await fetch(url)

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as {
      error?: string
    } | null

    throw new Error(details?.error ?? "No se pudo consultar ARCA.")
  }

  return (await response.json()) as ArcaHistoricalInvoices
}

async function parseArcaError(response: Response) {
  const details = (await response.json().catch(() => null)) as {
    error?: string
    errors?: { message?: string }[]
  } | null

  return (
    details?.error ??
    details?.errors?.find((error) => Boolean(error.message))?.message ??
    response.statusText
  )
}
