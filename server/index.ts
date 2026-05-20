import "dotenv/config"

import cors from "cors"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import { ZodError } from "zod"

import { ArcaError } from "./arca/errors.js"
import { config } from "./config.js"
import {
  emitInvoice,
  getAnnualArcaSummary,
  getArcaPointOfSales,
  getHistoricalArcaInvoices,
} from "./routes/invoices.js"

const app = express()

app.use(
  cors({
    origin: config.corsOrigin ? config.corsOrigin.split(",") : true,
  })
)
app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    arcaEnvironment: config.arca.environment,
  })
})

app.post("/api/invoices/emit", emitInvoice)
app.get("/api/invoices/arca/annual-summary", getAnnualArcaSummary)
app.get("/api/invoices/arca/historical", getHistoricalArcaInvoices)
app.get("/api/invoices/arca/points-of-sale", getArcaPointOfSales)

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  })
})

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next

  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request payload.",
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
    error: "Unexpected server error.",
  })
})

app.listen(config.port, () => {
  console.log(
    `ARCA backend listening on http://localhost:${config.port} (${config.arca.environment})`
  )
})
