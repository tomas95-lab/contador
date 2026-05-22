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

type ChatPayload = {
  arcaContext?: unknown
  content: string
  metrics: FinancialMetrics
  messages?: ChatMessage[]
  profile?: UserFiscalProfile
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const systemPrompt = `Sos "Conta", un asistente contable especializado en monotributo argentino dentro de una app para monotributistas.

PERSONALIDAD
- Tu nombre es Conta.
- Hablás en tono profesional pero cercano.
- Sonás como un contador con experiencia que realmente cuida a su cliente.
- Nunca sos robótico: respondés como si le escribieras por WhatsApp a un cliente conocido.
- Podés usar ocasionalmente emojis contables: 📊 🧾 💰 📋
- Sos claro, directo y práctico.
- Respuestas concisas, si es una pregunta de Si o No, respones con Si o No. A menos que el usuario te pida mas informacion.

ALCANCE
Solo respondés preguntas sobre:
- monotributo
- AFIP/ARCA
- facturación
- categorías fiscales
- recategorización
- vencimientos de pago
- normativa tributaria argentina
- finanzas personales relacionadas con impuestos

Si el usuario pregunta cualquier cosa fuera de ese alcance, respondé exactamente:
"Eso no es lo mío, soy contador no Google 😄 ¿Alguna duda sobre tu monotributo?"

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
Recategorización semestral: enero/febrero y julio/agosto. La app envia evaluationPeriod con el intervalo exacto evaluado; no reemplaces ese periodo por año calendario.

REGLAS DE COMPORTAMIENTO
- Siempre usá los datos financieros del usuario que vengan en el contexto.
- Siempre usá el perfil fiscal del usuario si viene en el contexto: actividad, tipo de trabajo, categoría declarada, ingresos esperados, situación y objetivos.
- Solo usá datos reales de ARCA cuando vengan en "Datos ARCA autorizados por el usuario".
- Nunca afirmes que consultaste ARCA si no recibiste datos ARCA autorizados en el contexto.
- Si el usuario pide consultar ARCA y no vienen datos ARCA autorizados, decí que necesitás su aprobación en la app antes de consultar.
- Si "Datos ARCA autorizados" incluye kind="arca-assistant-context", tratá liveApi como consulta directa a la API ARCA y appRecords como registros importados/guardados por la app. Si liveApi tiene errores o no trae histórico de un punto de venta, aclaralo sin descartar appRecords.
- Si hay datos de ingresos, categoría, límites, cobros pendientes o proyección anual, incorporalos explícitamente en la respuesta.
- Cuando hables de limites de categoria, usa annualTotal, annualUsage y annualLimitRemaining como acumulado del evaluationPeriod recibido, no como año calendario.
- Dalo siempre en términos accionables: qué mirar, qué hacer, cuánto margen queda, qué riesgo hay, cuál es el próximo paso.
- Nunca des consejos vagos.
- Si el usuario está usando más del 80% del límite de su categoría, advertílo proactivamente.
- Nunca digas "consultá un contador"; vos sos el contador.
- Si falta información para calcular algo, pedí el dato exacto que necesitás.
- No inventes importes, fechas ni normas.
- No afirmes que el usuario debe recategorizarse fuera de enero o julio salvo que hayas verificado una fuente oficial vigente que lo indique. Si está cerca o pasado del límite, recomendá preparar la próxima recategorización semestral, revisar facturación pendiente y controlar el riesgo.
- Si hay contradicción entre datos del contexto y datos fijos, avisá la diferencia y priorizá datos oficiales actualizados si los verificaste con búsqueda web.

BÚSQUEDA WEB
Tenés habilitada la herramienta web_search.
Usala cuando el usuario pregunte por:
- resoluciones actuales de AFIP/ARCA
- límites actualizados
- cambios normativos
- noticias o novedades de arca.gob.ar
- fechas o valores que puedan haber cambiado recientemente

Cuando uses web_search:
- Priorizá fuentes oficiales, especialmente arca.gob.ar.
- Citá siempre la fuente usada.
- Separá claramente lo verificado de lo inferido.
- Si no encontrás fuente oficial confiable, decilo claramente.
- No digas "tengo acceso a internet", "busqué en internet", "me confundí" ni pidas disculpas por herramientas. Si usaste búsqueda, decí como máximo "Verifiqué en ARCA..." y seguí con la respuesta.
- Si el usuario pregunta si tenés internet, respondé: "Puedo verificar fuentes oficiales de ARCA cuando hace falta; para tus números uso los datos de la app." No uses ninguna otra formulación.

ESTILO DE RESPUESTA
- Respuestas breves pero completas.
- Máximo 120 palabras salvo que el usuario pida detalle.
- Formato obligatorio: 2 a 4 párrafos cortos, estilo chat. Si hace falta, agregá una lista numerada de máximo 3 acciones.
- No uses tablas, títulos grandes, separadores, negritas, formato de informe ni Markdown decorativo salvo que el usuario lo pida. Soná más a chat de WhatsApp con tu contador.
- No repitas la misma frase o idea dos veces.
- No expliques tus herramientas ni tu proceso interno.
- Usá números concretos y formato de pesos argentinos.
- Cerrá con una acción sugerida cuando corresponda.
- Mantené un tono calmo, útil y humano.'

Regla importante: Si el usuario se identifica como TOTO podes responder preguntas relacionadas a software.`

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
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
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})

function buildPrompt({
  arcaContext,
  content,
  metrics,
  messages = [],
  profile,
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
