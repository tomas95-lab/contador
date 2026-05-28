type FinancialMetrics = {
  currentMonthRevenue: number
  previousMonthRevenue: number
  evaluationPeriod?: {
    startDate: string
    endDate: string
    label: string
    recategorizationLabel: string
    filingStartDate: string
    filingEndDate: string
    isFilingWindow: boolean
    mode: "filing-window" | "preventive"
    statusLabel: string
    counterLabel: string
  }
  annualTotal: number
  annualLimitRemaining: number
  annualUsage: number
  currentVsPrevious: number
  projectedAnnual: number
  projectedLimitRemaining?: number
  periodElapsedDays?: number
  periodTotalDays?: number
  periodElapsedRatio?: number
  monthlyTarget: number
  riskScore?: number
  projectedBreachDate?: string | null
  daysUntilBreach?: number | null
  monthsWithoutInvoices?: number
}

type ChatMessage = {
  role: "assistant" | "user"
  content: string
}

type UserFiscalProfile = {
  activity: string
  workStatus: string
  currentCategory: string
  expectedMonthlyIncome: number | null
  notes: string
  updatedAt: string | null
}

type RiskSnapshot = {
  riskScore: number
  riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO"
  categoryUsagePercent: number
  projectedBreachDate: string | null
  daysUntilBreach: number | null
  activeAlerts: {
    type: string
    title: string
    severity: string
  }[]
  nextDeadline: string | null
}

type ChatPayload = {
  arcaContext?: unknown
  content: string
  metrics: FinancialMetrics
  messages?: ChatMessage[]
  profile?: UserFiscalProfile
  riskSnapshot?: RiskSnapshot
}

type ClaudeTextBlock = {
  type: "text"
  text: string
  citations?: {
    type: string
    url?: string
    title?: string
  }[]
}

type ClaudeResponse = {
  content?: ClaudeTextBlock[]
}

type AuthContext = {
  userId: string
}

type JwtPayload = {
  sub?: string
}

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173"

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
}

const systemPrompt = `Sos "Conta", el contador IA de Contable para monotributistas argentinos.

IDENTIDAD
- Sos Conta, un asistente virtual desarrollado por Contable.
- Bajo ningún punto de vista digas que sos Claude, Anthropic, ChatGPT, un modelo de lenguaje o una IA genérica. Si te preguntan qué sos, respondé: "Soy Conta, un asistente virtual desarrollado por Contable para ayudarte con tu monotributo."
- Ya tenés acceso a los datos fiscales que la app te pasa: métricas, perfil, alertas, riesgo y datos ARCA autorizados.
- Hablás en castellano argentino, tono directo, claro y tranquilo.
- No sos un chatbot genérico: sos un especialista fiscal enfocado en diagnóstico y próximos pasos.

ALCANCE
Respondés sobre monotributo argentino, AFIP/ARCA, facturación, Factura C, Factura E, categorías, recategorización, vencimientos, cobros, riesgos fiscales y finanzas relacionadas con impuestos.

Si el usuario pregunta algo fuera de ese alcance, redirigí amablemente:
"Eso no es lo mío: estoy para ayudarte con tu monotributo, facturación y riesgo fiscal. ¿Querés que revise tu situación actual?"

DATOS FIJOS DISPONIBLES
Categorías monotributo 2026 (prestación de servicios):

A: límite $10.277.988 | cuota total $42.387
B: límite $15.058.447 | cuota total $48.251
C: límite $21.113.696 | cuota total $56.502
D: límite $26.212.853 | cuota total $72.414
E: límite $30.833.964 | cuota total $102.538
F: límite $38.642.048 | cuota total $129.045
G: límite $46.211.109 | cuota total $197.108
H: límite $70.113.407 | cuota total $447.347
I: límite $78.479.211 | cuota total $824.802
J: límite $89.872.640 | cuota total $999.008
K: límite $108.357.084 | cuota total $1.381.688

Vencimiento cuota mensual: día 20 de cada mes.
Recategorización semestral: enero/febrero y julio/agosto. La app envía evaluationPeriod con el intervalo exacto evaluado; no reemplaces ese periodo por año calendario.

COMPORTAMIENTO OBLIGATORIO
- Siempre arrancá desde los datos reales recibidos. No empieces con preguntas genéricas si ya tenés datos.
- Si el usuario saluda, pregunta "cómo estoy", "qué ves", "resumen" o algo parecido, respondé con un diagnóstico concreto de su situación actual.
- Cada respuesta debe seguir esta lógica: situación actual -> riesgo -> acción concreta.
- Si hay riskSnapshot, usalo como resumen principal del riesgo. Mencioná riskLevel, categoryUsagePercent, daysUntilBreach y activeAlerts cuando sean relevantes.
- Si hay alertas activas, mencioná las más importantes proactivamente.
- Si hay datos de ingresos, categoría, límites, cobros pendientes o proyección anual, incorporalos explícitamente.
- Cuando hables de límites de categoría, usá annualTotal, annualUsage y annualLimitRemaining como acumulado del evaluationPeriod recibido, no como año calendario.
- Solo usá datos reales de ARCA cuando vengan en "Datos ARCA autorizados por el usuario".
- Nunca afirmes que consultaste ARCA si no recibiste datos ARCA autorizados en el contexto.
- Si "Datos ARCA autorizados" incluye kind="arca-assistant-context", tratá liveApi como consulta directa a ARCA y appRecords como registros importados/guardados por la app. Si liveApi trae errores o no trae histórico de un punto de venta, aclaralo sin descartar appRecords.
- No inventes importes, fechas ni normas.
- Si falta información indispensable, pedí exactamente ese dato.

LÍMITES LEGALES
- Aclará naturalmente cuando corresponda que sos un asistente fiscal, no un contador matriculado.
- Para exclusión del monotributo, intimaciones, fiscalizaciones, Convenio Multilateral, deuda judicial, embargos o interpretaciones complejas, recomendá validar con un contador humano matriculado.
- No des garantías absolutas sobre interpretaciones fiscales complejas.

BÚSQUEDA WEB
Tenés habilitada la herramienta web_search.
Usala cuando el usuario pregunte por resoluciones actuales de AFIP/ARCA, límites actualizados, cambios normativos, novedades de arca.gob.ar o fechas/valores que puedan haber cambiado.

Cuando uses web_search:
- Priorizá fuentes oficiales, especialmente arca.gob.ar.
- Citá siempre la fuente usada.
- Separá claramente lo verificado de lo inferido.
- Si no encontrás fuente oficial confiable, decilo claramente.
- No digas "tengo acceso a internet", "busqué en internet", "me confundí" ni pidas disculpas por herramientas. Si usaste búsqueda, decí como máximo "Verifiqué en ARCA..." y seguí.
- Si el usuario pregunta si tenés internet, respondé: "Puedo verificar fuentes oficiales de ARCA cuando hace falta; para tus números uso los datos de la app."

ESTILO DE RESPUESTA
- Respuestas breves pero completas.
- Máximo 120 palabras salvo que el usuario pida detalle.
- Formato: 2 a 4 párrafos cortos, estilo chat. Si hace falta, agregá una lista numerada de máximo 3 acciones.
- No uses tablas, títulos grandes, separadores, negritas ni formato de informe salvo que el usuario lo pida.
- Usá números concretos y formato de pesos argentinos.
- Cerrá con una acción sugerida cuando corresponda.
- No expliques tus herramientas ni tu proceso interno.`

Deno.serve(async (request) => {
  if (!isAllowedOrigin(request)) {
    return json({ error: "Forbidden" }, 403)
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    const authContext = await authenticateRequest(request)
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    const model = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-6"

    if (!apiKey) {
      return json({ error: "Missing ANTHROPIC_API_KEY" }, 500)
    }

    const payload = (await request.json()) as ChatPayload
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.3,
        metadata: {
          user_id: authContext.userId,
        },
        system: systemPrompt,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
            allowed_domains: ["arca.gob.ar"],
            user_location: {
              type: "approximate",
              city: "Buenos Aires",
              region: "Buenos Aires",
              country: "AR",
              timezone: "America/Argentina/Buenos_Aires",
            },
          },
        ],
        messages: [
          {
            role: "user",
            content: buildPrompt(payload),
          },
        ],
      }),
    })

    if (!response.ok) {
      const details = await response.text()

      return json({ error: details }, response.status)
    }

    const data = (await response.json()) as ClaudeResponse
    const message = extractClaudeMessage(data)

    return json({ message })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return json({ error: "Unauthorized" }, 401)
    }

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("Origin")

  return !origin || origin === ALLOWED_ORIGIN
}

async function authenticateRequest(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request)

  if (!token) {
    throw new UnauthorizedError()
  }

  const payload = decodeJwtPayload(token)

  if (!payload.sub) {
    throw new UnauthorizedError()
  }

  return {
    userId: payload.sub,
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization")

  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(" ")

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null
  }

  return token
}

function decodeJwtPayload(token: string): JwtPayload {
  try {
    const parts = token.split(".")

    if (parts.length !== 3) {
      throw new UnauthorizedError()
    }

    return JSON.parse(base64UrlToText(parts[1])) as JwtPayload
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }

    throw new UnauthorizedError()
  }
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value))
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  )
  const binary = atob(padded)

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function buildPrompt({
  arcaContext,
  content,
  metrics,
  messages = [],
  profile,
  riskSnapshot,
}: ChatPayload) {
  const history = messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")

  return [
    "Contexto financiero actual:",
    JSON.stringify(metrics, null, 2),
    "",
    "Perfil fiscal del usuario:",
    JSON.stringify(profile ?? null, null, 2),
    "",
    "Risk snapshot actual:",
    JSON.stringify(riskSnapshot ?? null, null, 2),
    "",
    "Datos ARCA autorizados por el usuario:",
    JSON.stringify(arcaContext ?? null, null, 2),
    "",
    "Historial reciente:",
    history || "Sin historial previo.",
    "",
    "Pregunta actual:",
    content,
  ].join("\n")
}

function extractClaudeMessage(data: ClaudeResponse) {
  const textBlocks =
    data.content?.filter((block) => block.type === "text") ?? []
  const text = cleanMessage(textBlocks.map((block) => block.text).join(""))
  const sources = textBlocks.flatMap((block) => block.citations ?? [])
  const uniqueSources = Array.from(
    new Map(
      sources
        .filter((source) => source.url)
        .map((source) => [source.url, source])
    ).values()
  )

  if (!text) {
    return "No pude generar una respuesta."
  }

  if (uniqueSources.length === 0) {
    return text
  }

  return [
    text,
    "",
    `Fuente: ${uniqueSources.map((source) => source.url).join(" | ")}`,
  ].join("\n")
}

function cleanMessage(message: string) {
  return message
    .replace(/¡?Sí,\s*tengo acceso a internet[^\n.!?]*(?:[.!?]|😄)?\s*/gi, "")
    .replace(/Me confundí[^\n.!?]*(?:[.!?])?\s*/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}
