import {
  getPaymentsInFiscalPeriod,
  sumPayments,
  type FinancialMetrics,
} from "@/lib/accounting"
import { backendApiPath, getBackendAuthHeaders } from "@/lib/backend-api"
import type { IncomePayment } from "@/types/accounting"

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
    truncated?: boolean
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
  pagination: {
    limit?: number
    offset?: number
  }
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

export type ArcaDestinationCountry = {
  code: string
  name: string
}

export type ArcaInvoiceEmissionPayload = {
  amount: number
  description: string
  invoiceType: "C" | "E"
  paymentId?: string
  currencyId?: "DOL" | "PES"
  exchangeRate?: number
  clientCuit?: string
  clientName?: string
  clientAddress?: string
  clientTaxId?: string
  destinationCountryCode?: number
  foreignClientCountryCode?: string
  foreignClientTaxId?: string
  foreignClientName?: string
  foreignClientAddress?: string
  foreignClientPlatform?: string
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
    currencyId: string
    currencyRate: number
    amountArs: number
    description: string
  }
  invoiceRecord?: {
    id: string
    payment_id: string | null
    number: string
    invoice_type: string
    point_of_sale: number
    issue_date: string
    client: string
    description: string
    amount: number
    currency_id: string
    exchange_rate: number
    amount_ars: number
    cae: string | null
    cae_expires_at: string | null
    status: string
    user_id: string
    created_at: string
  }
}

export type ArcaInvoiceReconciliation = {
  status: "reconciled" | "already-persisted" | "manual-review-required"
  invoiceNumber?: number | null
  invoiceType?: "C" | "E"
  pointOfSale?: number
  invoiceRecord?: EmittedArcaInvoice["invoiceRecord"]
}

export type ArcaAssistantContext = {
  kind: "arca-assistant-context"
  generatedAt: string
  accessMode: "read-only"
  evaluationPeriod: FinancialMetrics["evaluationPeriod"]
  appRecords: {
    paymentsInEvaluationPeriod: {
      count: number
      total: number
      records: {
        date: string
        amount: number
        client: string
        description: string
        invoiceStatus: string
        source: string | null
        invoiceType: string | null
        pointOfSale: number | null
        cae: string | null
        receiverCuit: string | null
      }[]
    }
    arcaHistoricalPayments: {
      count: number
      total: number
      records: {
        date: string
        amount: number
        client: string
        invoiceType: string | null
        pointOfSale: number | null
        cae: string | null
        receiverCuit: string | null
      }[]
    }
  }
  liveApi: {
    attempted: true
    historical: ArcaHistoricalInvoices | null
    annualSummaries: {
      year: number
      summary: ArcaAnnualSummary | null
      error: string | null
    }[]
    errors: string[]
  }
  notes: string[]
}

export async function fetchArcaAnnualSummary(year = new Date().getFullYear()) {
  const url = backendApiPath("/api/invoices/arca/annual-summary")
  url.searchParams.set("year", String(year))
  const headers = await getArcaAuthHeaders()

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    const details = await parseArcaError(response)

    throw new Error(
      details ??
        "No pudimos conectar con ARCA. Verificá tu conexión y volvé a intentarlo. Si el problema persiste, ARCA puede estar caído."
    )
  }

  return (await response.json()) as ArcaAnnualSummary
}

export async function emitArcaInvoice(payload: ArcaInvoiceEmissionPayload) {
  const url = backendApiPath("/api/invoices/emit")
  const authHeaders = await getArcaAuthHeaders()
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    const details = await parseArcaError(response)

    throw new Error(
      details ??
        "No pudimos emitir la factura. Revisá que tus credenciales ARCA estén activas y volvé a intentarlo."
    )
  }

  return (await response.json()) as EmittedArcaInvoice
}

export async function reconcileArcaInvoice(paymentId: string) {
  const response = await fetch(backendApiPath("/api/invoices/reconcile"), {
    body: JSON.stringify({ paymentId }),
    headers: {
      ...(await getArcaAuthHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    const details = await parseArcaError(response)

    throw new Error(
      details ??
        "No pudimos reconciliar la factura. Revisá el historial ARCA antes de volver a emitir."
    )
  }

  return (await response.json()) as ArcaInvoiceReconciliation
}

export async function fetchArcaHistoricalInvoices({
  limit,
  offset,
  wsfe = parsePointList(import.meta.env.VITE_ARCA_WSFE_POINTS, [4]),
  wsfex = parsePointList(import.meta.env.VITE_ARCA_WSFEX_POINTS, [3]),
}: {
  limit?: number
  offset?: number
  wsfe?: number[]
  wsfex?: number[]
} = {}) {
  const url = backendApiPath("/api/invoices/arca/historical")
  url.searchParams.set("wsfe", wsfe.join(","))
  url.searchParams.set("wsfex", wsfex.join(","))
  if (limit) {
    url.searchParams.set("limit", String(limit))
  }
  if (offset) {
    url.searchParams.set("offset", String(offset))
  }
  const headers = await getArcaAuthHeaders()

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    const details = await parseArcaError(response)

    throw new Error(
      details ??
        "No pudimos conectar con ARCA. Verificá tu conexión y volvé a intentarlo. Si el problema persiste, ARCA puede estar caído."
    )
  }

  return (await response.json()) as ArcaHistoricalInvoices
}

export async function fetchArcaDestinationCountries() {
  const response = await fetch(
    backendApiPath("/api/invoices/arca/destination-countries"),
    {
      headers: await getArcaAuthHeaders(),
    }
  )

  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as {
    countries: ArcaDestinationCountry[]
  }

  return data.countries
}

export async function fetchArcaAssistantContext({
  metrics,
  payments,
}: {
  metrics: FinancialMetrics
  payments: IncomePayment[]
}): Promise<ArcaAssistantContext> {
  const years = getYearsInRange(
    metrics.evaluationPeriod.startDate,
    metrics.evaluationPeriod.endDate
  )
  const periodPayments = getPaymentsInFiscalPeriod(
    payments,
    metrics.evaluationPeriod
  )
  const arcaHistoricalPayments = periodPayments.filter(
    (payment) => payment.source === "arca_historical" || Boolean(payment.cae)
  )
  const [historicalResult, annualResults] = await Promise.all([
    settle(fetchArcaHistoricalInvoices()),
    Promise.all(
      years.map(async (year) => ({
        year,
        result: await settle(fetchArcaAnnualSummary(year)),
      }))
    ),
  ])
  const annualSummaries = annualResults.map(({ result, year }) => ({
    year,
    summary: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? errorMessage(result.reason) : null,
  }))
  const liveErrors = [
    historicalResult.status === "rejected"
      ? errorMessage(historicalResult.reason)
      : null,
    ...annualSummaries.map((summary) => summary.error),
  ].filter((error): error is string => Boolean(error))

  return {
    kind: "arca-assistant-context",
    generatedAt: new Date().toISOString(),
    accessMode: "read-only",
    evaluationPeriod: metrics.evaluationPeriod,
    appRecords: {
      paymentsInEvaluationPeriod: {
        count: periodPayments.length,
        total: sumPayments(periodPayments),
        records: periodPayments.map(serializePaymentForArcaContext),
      },
      arcaHistoricalPayments: {
        count: arcaHistoricalPayments.length,
        total: sumPayments(arcaHistoricalPayments),
        records: arcaHistoricalPayments.map((payment) => ({
          date: payment.date,
          amount: payment.amount,
          client: payment.client,
          invoiceType: payment.invoiceType ?? null,
          pointOfSale: payment.pointOfSale ?? null,
          cae: payment.cae ?? null,
          receiverCuit: payment.receiverCuit ?? null,
        })),
      },
    },
    liveApi: {
      attempted: true,
      historical:
        historicalResult.status === "fulfilled" ? historicalResult.value : null,
      annualSummaries,
      errors: liveErrors,
    },
    notes: [
      "El acceso ARCA es de solo lectura para el asistente.",
      "Los permisos de ARCA solo devuelven facturas de los puntos de venta activos para esos permisos; el histórico importado desde Mis Facturas se incluye desde Supabase cuando está cargado.",
    ],
  }
}

async function parseArcaError(response: Response) {
  const details = (await response.json().catch(() => null)) as {
    error?: string
    explanation?: string
    action?: string
    severity?: "warning" | "error" | "critical"
    details?: {
      message?: string
      name?: string
    }
    errors?: { message?: string }[]
  } | null

  if (details?.explanation && details.action) {
    return [
      details.error ?? "ARCA rechazó la operación",
      details.explanation,
      `Qué hacer: ${details.action}`,
    ].join("\n\n")
  }

  return (
    details?.details?.message ??
    details?.error ??
    details?.errors?.find((error) => Boolean(error.message))?.message ??
    response.statusText
  )
}

async function getArcaAuthHeaders() {
  return getBackendAuthHeaders()
}

function parsePointList(value: string | undefined, fallback: number[]) {
  if (!value) {
    return fallback
  }

  const points = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)

  return points.length > 0 ? points : fallback
}

function getYearsInRange(startDate: string, endDate: string) {
  const startYear = Number(startDate.slice(0, 4))
  const endYear = Number(endDate.slice(0, 4))

  return Array.from(
    { length: Math.max(0, endYear - startYear + 1) },
    (_, index) => startYear + index
  )
}

function serializePaymentForArcaContext(payment: IncomePayment) {
  return {
    date: payment.date,
    amount: payment.amount,
    client: payment.client,
    description: payment.description,
    invoiceStatus: payment.invoiceStatus,
    source: payment.source ?? null,
    invoiceType: payment.invoiceType ?? null,
    pointOfSale: payment.pointOfSale ?? null,
    cae: payment.cae ?? null,
    receiverCuit: payment.receiverCuit ?? null,
  }
}

async function settle<T>(
  promise: Promise<T>
): Promise<PromiseSettledResult<T>> {
  try {
    return {
      status: "fulfilled",
      value: await promise,
    }
  } catch (reason) {
    return {
      status: "rejected",
      reason,
    }
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado. Intentá de nuevo o contactá soporte desde Ayuda."
}
