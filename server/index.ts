import "dotenv/config"

import cors from "cors"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import rateLimit from "express-rate-limit"
import jwt, { type GetPublicKeyOrSecret, type JwtPayload } from "jsonwebtoken"
import jwksClient from "jwks-rsa"

import { ZodError } from "zod"

import { ArcaError } from "./arca/errors.js"
import { config } from "./config.js"
import {
  generateArcaCsr,
  getArcaCredentialsStatus,
  saveArcaCredentials,
} from "./routes/credentials.js"
import {
  emitInvoice,
  getAnnualArcaSummary,
  getArcaDestinationCountries,
  getArcaPointOfSales,
  getHistoricalArcaInvoices,
  reconcileInvoice,
} from "./routes/invoices.js"
import {
  getPushStatus,
  getPushVapidPublicKey,
  sendAlertPush,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "./routes/push.js"

declare module "express-serve-static-core" {
  interface Request {
    userId?: string
  }
}

const supabaseUrl = normalizeSupabaseUrl(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
)
const supabaseIssuer = `${supabaseUrl}/auth/v1`
const supabaseJwksClient = jwksClient({
  cache: true,
  jwksUri: `${supabaseIssuer}/.well-known/jwks.json`,
  rateLimit: true,
})

if (!config.corsOrigin) {
  throw new Error("CORS_ORIGIN is required.")
}

const app = express()
const allowedOrigins = config.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
const globalRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 100,
  message: {
    error: "Recibimos demasiados pedidos. Esperá un minuto y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 1000,
})
const credentialsCsrRateLimit = rateLimit({
  keyGenerator: getAuthenticatedRateLimitKey,
  legacyHeaders: false,
  limit: 3,
  message: {
    error:
      "Generaste demasiados códigos de autorización. Esperá un rato y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 60 * 1000,
})
const invoiceEmitRateLimit = rateLimit({
  keyGenerator: getAuthenticatedRateLimitKey,
  legacyHeaders: false,
  limit: 10,
  message: {
    error:
      "Recibimos demasiados pedidos de emisión. Esperá un minuto y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 1000,
})
const arcaQueryRateLimit = rateLimit({
  keyGenerator: getAuthenticatedRateLimitKey,
  legacyHeaders: false,
  limit: 5,
  message: {
    error:
      "Recibimos demasiadas consultas a ARCA. Esperá un minuto y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 1000,
})
const pushTestRateLimit = rateLimit({
  keyGenerator: getAuthenticatedRateLimitKey,
  legacyHeaders: false,
  limit: 3,
  message: {
    error:
      "Enviamos demasiadas pruebas de notificación. Esperá un minuto y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 1000,
})
const pushAlertRateLimit = rateLimit({
  keyGenerator: getAuthenticatedRateLimitKey,
  legacyHeaders: false,
  limit: 10,
  message: {
    error:
      "Enviamos demasiadas alertas de notificación. Esperá un minuto y volvé a intentar.",
  },
  standardHeaders: "draft-8",
  windowMs: 60 * 1000,
})

app.use(globalRateLimit)
app.use(
  cors({
    origin: allowedOrigins,
  })
)
app.use(express.json({ limit: "1mb" }))

app.use("/api", authenticateJwt)

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    arcaEnvironment: config.arca.environment,
  })
})

app.get("/api/credentials/status", getArcaCredentialsStatus)
app.post(
  "/api/credentials/generate-csr",
  credentialsCsrRateLimit,
  generateArcaCsr
)
app.post("/api/credentials/save", saveArcaCredentials)
app.post("/api/invoices/emit", invoiceEmitRateLimit, emitInvoice)
app.post("/api/invoices/reconcile", invoiceEmitRateLimit, reconcileInvoice)
app.get(
  "/api/invoices/arca/annual-summary",
  arcaQueryRateLimit,
  getAnnualArcaSummary
)
app.get(
  "/api/invoices/arca/historical",
  arcaQueryRateLimit,
  getHistoricalArcaInvoices
)
app.get(
  "/api/invoices/arca/points-of-sale",
  arcaQueryRateLimit,
  getArcaPointOfSales
)
app.get(
  "/api/invoices/arca/destination-countries",
  arcaQueryRateLimit,
  getArcaDestinationCountries
)
app.get("/api/push/status", getPushStatus)
app.get("/api/push/public-key", getPushVapidPublicKey)
app.post("/api/push/subscribe", subscribeToPush)
app.post("/api/push/unsubscribe", unsubscribeFromPush)
app.post("/api/push/test", pushTestRateLimit, sendTestPush)
app.post("/api/push/alerts", pushAlertRateLimit, sendAlertPush)

async function authenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = getBearerToken(req)

  if (!token) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const payload = await verifySupabaseToken(token)

    if (typeof payload === "string" || !isJwtPayloadWithSubject(payload)) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: "Unauthorized" })
  }
}

function verifySupabaseToken(token: string) {
  return new Promise<string | JwtPayload>((resolve, reject) => {
    jwt.verify(
      token,
      getSupabaseSigningKey,
      {
        algorithms: ["ES256"],
        audience: "authenticated",
        issuer: supabaseIssuer,
      },
      (error, decoded) => {
        if (error || !decoded) {
          reject(error ?? new Error("Invalid token"))
          return
        }

        resolve(decoded)
      }
    )
  })
}

const getSupabaseSigningKey: GetPublicKeyOrSecret = (header, callback) => {
  if (!header.kid) {
    callback(new Error("Missing JWT kid."))
    return
  }

  supabaseJwksClient.getSigningKey(header.kid, (error, key) => {
    if (error || !key) {
      callback(error ?? new Error("Missing Supabase signing key."))
      return
    }

    callback(null, key.getPublicKey())
  })
}

function getBearerToken(req: Request) {
  const authorization = req.header("authorization")

  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(" ")

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null
  }

  return token
}

function getAuthenticatedRateLimitKey(req: Request) {
  return req.userId ?? "authenticated"
}

function isJwtPayloadWithSubject(
  payload: JwtPayload
): payload is JwtPayload & { sub: string } {
  return typeof payload.sub === "string" && payload.sub.length > 0
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.")
  }

  return value.replace(/\/+$/, "")
}

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  })
})

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next

  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Los datos enviados no son válidos.",
      details: error.issues,
    })
    return
  }

  if (error instanceof ArcaError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    })
    return
  }

  console.error(error)
  res.status(500).json({
    error:
      "Ocurrió un error inesperado. Intentá de nuevo o contactá soporte desde Ayuda.",
    ...(process.env.NODE_ENV !== "production"
      ? {
          details:
            error instanceof Error
              ? {
                  message: error.message,
                  name: error.name,
                  stack: error.stack,
                }
              : error,
        }
      : {}),
  })
})

app.listen(config.port, () => {
  console.log(
    `ARCA backend listening on http://localhost:${config.port} (${config.arca.environment})`
  )
})
