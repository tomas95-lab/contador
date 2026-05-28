export class ArcaError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
    readonly details?: unknown
  ) {
    super(message)
    this.name = "ArcaError"
  }
}

export type ArcaErrorSeverity = "warning" | "error" | "critical"

export type TranslatedArcaError = {
  title: string
  explanation: string
  action: string
  severity: ArcaErrorSeverity
  raw: string
}

type ArcaErrorRule = {
  pattern: string | RegExp
  title: string
  explanation: string
  action: string
  severity: ArcaErrorSeverity
}

const ARCA_ERROR_RULES: ArcaErrorRule[] = [
  {
    pattern:
      /token.*(venc|expir|caduc)|ticket.*(venc|expir|caduc)|ta.*(venc|expir|caduc)|expired.*token/,
    title: "La sesión con ARCA venció",
    explanation:
      "ARCA rechazó la operación porque el token temporal de autenticación ya no está vigente.",
    action:
      "Volvé a intentar en unos segundos. Conta va a pedir un token nuevo automáticamente.",
    severity: "warning",
  },
  {
    pattern:
      /certificado.*no.*autorizado.*servicio|certificate.*not.*authorized.*service|cert.*not.*authorized/,
    title: "El certificado no está autorizado",
    explanation:
      "El certificado cargado existe, pero ARCA no lo tiene habilitado para este web service.",
    action:
      "Entrá con clave fiscal al Administrador de Relaciones y autorizá el certificado para WSFE o WSFEX, según corresponda.",
    severity: "critical",
  },
  {
    pattern:
      /(cuit|solicitante).*(no.*autorizado|sin.*autorizacion|sin.*autorización)|cuit.*no.*habilitado/,
    title: "El CUIT no está autorizado",
    explanation:
      "ARCA no reconoce este CUIT como habilitado para operar con el certificado o servicio elegido.",
    action:
      "Revisá que el CUIT cargado sea correcto y que la relación fiscal esté dada de alta para ese CUIT.",
    severity: "critical",
  },
  {
    pattern: /firma.*(invalida|inválida)|invalid.*signature|cms|pkcs/,
    title: "La firma del pedido no es válida",
    explanation:
      "ARCA no pudo validar la firma digital generada con la clave privada del certificado.",
    action:
      "Generá un nuevo CSR desde Conta, descargá un certificado nuevo en ARCA y volvé a cargarlo.",
    severity: "critical",
  },
  {
    pattern:
      /punto.*venta.*no.*corresponde.*solicitante|numero.*punto.*venta.*no.*corresponde/,
    title: "El punto de venta no corresponde al CUIT",
    explanation:
      "El punto de venta configurado no pertenece al CUIT que está intentando emitir.",
    action:
      "Revisá el punto de venta cargado en Conta y usá uno activo para este CUIT.",
    severity: "critical",
  },
  {
    pattern:
      /no.*existe.*punto.*venta.*activo.*wsfe|punto.*venta.*wsfe.*no.*existe|wsfe.*punto.*venta.*no.*activo/,
    title: "No hay punto de venta activo para Factura C",
    explanation:
      "ARCA no encontró un punto de venta activo para el servicio WSFE, que se usa para Factura C.",
    action:
      "Activá un punto de venta para WSFE en ARCA o corregí el punto de venta de Factura C en Conta.",
    severity: "critical",
  },
  {
    pattern:
      /no.*existe.*punto.*venta.*activo.*wsfex|punto.*venta.*wsfex.*no.*existe|wsfex.*punto.*venta.*no.*activo/,
    title: "No hay punto de venta activo para Factura E",
    explanation:
      "ARCA no encontró un punto de venta activo para el servicio WSFEX, que se usa para Factura E.",
    action:
      "Activá un punto de venta para WSFEX en ARCA o corregí el punto de venta de Factura E en Conta.",
    severity: "critical",
  },
  {
    pattern:
      /punto.*venta.*(inactivo|no activo|baja)|punto.*venta.*no.*habilitado/,
    title: "El punto de venta está inactivo",
    explanation:
      "El punto de venta existe, pero no está activo o habilitado para emitir comprobantes.",
    action:
      "Revisá el estado del punto de venta en ARCA y cargá en Conta uno que esté activo.",
    severity: "critical",
  },
  {
    pattern:
      /comprobante.*(ya existe|existente|duplicado)|numero.*comprobante.*(existe|autorizado)|nro.*comprobante.*(existe|autorizado)/,
    title: "Ese número de comprobante ya existe",
    explanation:
      "ARCA indica que el número que se intentó emitir ya fue usado o autorizado.",
    action:
      "Actualizá el último comprobante desde ARCA y volvé a intentar emitir.",
    severity: "warning",
  },
  {
    pattern:
      /fecha.*fuera.*rango|fecha.*permitid|fchcbte.*rango|cbtefch.*rango|fecha.*comprobante.*rango/,
    title: "La fecha del comprobante está fuera de rango",
    explanation:
      "La fecha enviada no está dentro del período que ARCA permite para este tipo de comprobante.",
    action: "Revisá la fecha de emisión y usá una fecha permitida por ARCA.",
    severity: "error",
  },
  {
    pattern:
      /fchvtopago.*anterior|fecha.*vencimiento.*pago.*anterior|vencimiento.*pago.*anterior.*comprobante/,
    title: "La fecha de pago no puede ser anterior",
    explanation:
      "La fecha de vencimiento de pago quedó antes de la fecha del comprobante, y ARCA no lo permite.",
    action:
      "Corregí la fecha de vencimiento de pago para que sea igual o posterior a la fecha de emisión.",
    severity: "error",
  },
  {
    pattern:
      /importe.*(invalido|inválido|negativo|menor|mayor.*cero)|imp(total|neto|iva).*invalid|importe.*debe.*positivo|monto.*(invalido|inválido|negativo)/,
    title: "El importe del comprobante no es válido",
    explanation:
      "ARCA recibió un importe vacío, negativo o incompatible con el tipo de comprobante.",
    action:
      "Revisá el monto del cobro y volvé a emitir con un importe mayor a cero.",
    severity: "error",
  },
  {
    pattern:
      /(cuit|documento|docnro|nrodoc).*(receptor|cliente|comprador)?.*(invalido|inválido|inexistente)|receptor.*(invalido|inválido)/,
    title: "El CUIT del receptor no es válido",
    explanation:
      "El CUIT o documento del cliente no tiene un formato válido para ARCA.",
    action:
      "Revisá el CUIT del cliente. Para consumidor final, usá la condición y documento permitidos por ARCA.",
    severity: "error",
  },
  {
    pattern:
      /contribuyente.*no.*habilitado.*emitir|no.*habilitado.*emitir.*comprobantes|no puede emitir comprobantes/,
    title: "El contribuyente no está habilitado para emitir",
    explanation:
      "ARCA indica que este CUIT no tiene habilitada la emisión de comprobantes para el régimen actual.",
    action:
      "Revisá la inscripción y los puntos de venta en ARCA antes de volver a emitir.",
    severity: "critical",
  },
  {
    pattern:
      /no.*inscripto.*regimen|no.*inscripto.*régimen|no.*se.*encuentra.*inscripto|no.*registra.*inscripcion|no.*registra.*inscripción/,
    title: "El CUIT no figura inscripto en el régimen",
    explanation:
      "ARCA no encuentra una inscripción válida del contribuyente para el régimen requerido.",
    action:
      "Verificá la inscripción fiscal del CUIT en ARCA y regularizala antes de emitir.",
    severity: "critical",
  },
  {
    pattern:
      /timeout|timed out|econnreset|econnrefused|enotfound|network|fetch failed|socket|conexi[oó]n/,
    title: "No se pudo conectar con ARCA",
    explanation:
      "La consulta tardó demasiado o hubo un corte de conexión con los servidores de ARCA.",
    action:
      "Esperá unos segundos y volvé a intentar. Si se repite, probá más tarde.",
    severity: "warning",
  },
  {
    pattern:
      /servicio.*no.*disponible|service unavailable|temporarily unavailable|mantenimiento|503|server unavailable/,
    title: "ARCA no está disponible",
    explanation: "El servicio de ARCA está caído, saturado o en mantenimiento.",
    action:
      "Volvé a intentar más tarde. No cambies los datos de la factura hasta confirmar si ARCA respondió.",
    severity: "warning",
  },
]

const FALLBACK_ARCA_ERROR: Omit<TranslatedArcaError, "raw"> = {
  title: "ARCA rechazó la operación",
  explanation:
    "ARCA devolvió un error que Conta todavía no pudo clasificar automáticamente.",
  action:
    "Revisá los datos cargados y volvé a intentar. Si el problema sigue, contactá soporte con el detalle técnico.",
  severity: "error",
}

export function translateArcaError(rawError: string): TranslatedArcaError {
  const raw = rawError.trim() || "Error desconocido de ARCA"
  const normalizedRaw = normalizeForMatch(raw)
  const matchedRule = ARCA_ERROR_RULES.find((rule) =>
    matchesPattern(rule.pattern, raw, normalizedRaw)
  )

  return {
    ...(matchedRule ?? FALLBACK_ARCA_ERROR),
    raw,
  }
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

export function nonZeroCode(value: unknown): boolean {
  if (value == null || value === "") {
    return false
  }

  return Number(value) !== 0
}

function matchesPattern(
  pattern: string | RegExp,
  raw: string,
  normalizedRaw: string
) {
  if (typeof pattern === "string") {
    return normalizedRaw.includes(normalizeForMatch(pattern))
  }

  pattern.lastIndex = 0

  return pattern.test(raw) || pattern.test(normalizedRaw)
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}
