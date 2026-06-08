"use client"

import * as React from "react"
import {
  CheckCircle2Icon,
  DownloadIcon,
  FilePlus2Icon,
  PlugZapIcon,
  ReceiptTextIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { FiscalProfileCard } from "@/components/accounting/fiscal-profile-card"
import { downloadInvoiceHtml } from "@/components/accounting/invoicing-panel"
import {
  InvoiceSummaryDetails,
  SummaryRow,
  type InvoiceSummary,
} from "@/components/accounting/invoice-confirmation-summary"
import { MessageMarkdown } from "@/components/accounting/message-markdown"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fetchArcaAssistantContext } from "@/lib/arca-api"
import {
  buildRiskSnapshot,
  requestAssistantReply,
  type RiskSnapshot,
} from "@/lib/ai-assistant"
import {
  formatARS,
  formatPaymentDate,
  getFinancialMetrics,
  getProactiveAlerts,
} from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type {
  AssistantMessage,
  GeneratedInvoice,
  IncomePayment,
  TaxCategory,
  UserFiscalProfile,
} from "@/types/accounting"

type AssistantPanelProps = {
  arcaEnvironment?: "homologacion" | "production" | "unknown"
  payments: IncomePayment[]
  category: TaxCategory
  isDemo?: boolean
  isIssuingInvoice?: boolean
  messages: AssistantMessage[]
  profile: UserFiscalProfile
  onAddMessage: (
    message: Pick<AssistantMessage, "content" | "role">
  ) => Promise<AssistantMessage>
  onClearMessages: () => Promise<void>
  onGenerateInvoice: (
    payment: IncomePayment,
    options?: {
      invoiceType?: "C" | "E"
      amount?: number
      currencyId?: "DOL" | "PES"
      exchangeRate?: number
      clientCuit?: string
      clientName?: string
      clientAddress?: string
      clientTaxId?: string
      destinationCountryCode?: number
      receiverIvaConditionId?: number
    }
  ) => Promise<GeneratedInvoice | undefined>
  onSaveProfile: (profile: UserFiscalProfile) => Promise<void>
  userName?: string
}

type PendingInvoiceDraft = {
  id: string
  invoiceType: "C" | "E"
  payment: IncomePayment
}

type InvoiceConfirmation = {
  invoiceType: "C" | "E"
  payment: IncomePayment
  receiver: string
  summary: InvoiceSummary
}

const ivaConditionOptions = [
  { label: "Resp. inscripto", value: "1" },
  { label: "Monotributo", value: "6" },
  { label: "Exento", value: "4" },
  { label: "Consumidor final", value: "5" },
]

const assistantIntroStorageKey = "contable-assistant-intro-shown"
const invoiceNumberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
})

export function AssistantPanel({
  arcaEnvironment = "unknown",
  payments,
  category,
  isDemo = false,
  isIssuingInvoice = false,
  messages,
  onAddMessage,
  onClearMessages,
  onGenerateInvoice,
  onSaveProfile,
  profile,
  userName,
}: AssistantPanelProps) {
  const [content, setContent] = React.useState("")
  const [invoiceClientAddress, setInvoiceClientAddress] = React.useState("")
  const [invoiceClientCuit, setInvoiceClientCuit] = React.useState("")
  const [invoiceClientName, setInvoiceClientName] = React.useState("")
  const [invoiceClientTaxId, setInvoiceClientTaxId] = React.useState("")
  const [invoiceDestinationCountryCode, setInvoiceDestinationCountryCode] =
    React.useState("")
  const [invoiceError, setInvoiceError] = React.useState("")
  const [invoiceIvaCondition, setInvoiceIvaCondition] = React.useState("1")
  const [invoiceCurrencyId, setInvoiceCurrencyId] = React.useState<
    "DOL" | "PES"
  >("PES")
  const [invoiceExchangeRate, setInvoiceExchangeRate] = React.useState("")
  const [invoiceAmount, setInvoiceAmount] = React.useState("")
  const [pendingInvoiceDraft, setPendingInvoiceDraft] =
    React.useState<PendingInvoiceDraft | null>(null)
  const [invoiceConfirmation, setInvoiceConfirmation] =
    React.useState<InvoiceConfirmation | null>(null)
  const [issuedInvoiceResult, setIssuedInvoiceResult] =
    React.useState<GeneratedInvoice | null>(null)
  const [isClearing, setIsClearing] = React.useState(false)
  const [isQueryingArca, setIsQueryingArca] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const messagesScrollRef = React.useRef<HTMLDivElement | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null)
  const metrics = React.useMemo(
    () => getFinancialMetrics(payments, category),
    [category, payments]
  )
  const alerts = React.useMemo(
    () => getProactiveAlerts({ category, payments, profile }),
    [category, payments, profile]
  )
  const riskSnapshot = React.useMemo(
    () => buildRiskSnapshot(metrics, alerts),
    [alerts, metrics]
  )
  const suggestedQuestions = getSuggestedQuestions(riskSnapshot.riskLevel)
  const scrollMessagesToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.requestAnimationFrame(() => {
        const scrollContainer = messagesScrollRef.current

        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior,
            block: "end",
          })
          return
        }

        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      })
    },
    []
  )

  React.useEffect(() => {
    scrollMessagesToBottom("auto")
  }, [scrollMessagesToBottom])

  React.useEffect(() => {
    scrollMessagesToBottom()
  }, [
    isPending,
    messages.length,
    pendingInvoiceDraft?.id,
    scrollMessagesToBottom,
  ])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (window.sessionStorage.getItem(assistantIntroStorageKey)) {
      return
    }

    window.sessionStorage.setItem(assistantIntroStorageKey, "true")

    void onAddMessage({
      content: buildInitialAssistantMessage(riskSnapshot, userName),
      role: "assistant",
    })
  }, [onAddMessage, riskSnapshot, userName])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = content.trim()

    if (!prompt || isPending) {
      return
    }

    setContent("")
    if (composerRef.current) {
      composerRef.current.style.height = "auto"
    }
    setIsPending(true)

    try {
      const userMessage = await onAddMessage({
        role: "user",
        content: prompt,
      })
      let arcaContext: unknown
      let assistantPrompt = prompt

      if (shouldPrepareInvoice(prompt)) {
        const candidate = findInvoiceCandidate(prompt, payments)

        if (candidate.status === "found") {
          const suggestedInvoiceType = inferInvoiceType(
            prompt,
            candidate.payment
          )

          setPendingInvoiceDraft({
            id: crypto.randomUUID(),
            invoiceType: suggestedInvoiceType,
            payment: candidate.payment,
          })
          setInvoiceClientAddress("")
          setInvoiceClientCuit("")
          setInvoiceClientName(candidate.payment.client)
          setInvoiceClientTaxId("")
          setInvoiceDestinationCountryCode("")
          setInvoiceError("")
          setInvoiceIvaCondition("1")
          setInvoiceCurrencyId("PES")
          setInvoiceExchangeRate("")
          setInvoiceAmount("")
          await onAddMessage({
            role: "assistant",
            content: [
              `Preparé la Factura ${suggestedInvoiceType} para **${candidate.payment.client}** por **${formatARS(
                candidate.payment.amount
              )}**.`,
              suggestedInvoiceType === "E"
                ? "La marqué como exportación porque detecté exterior/exportación. Revisá los datos del cliente del exterior y confirmá la emisión en ARCA."
                : "Revisá los datos abajo. Si corresponde, cargá CUIT del receptor y confirmá la emisión en ARCA.",
            ].join("\n\n"),
          })
          return
        }

        await onAddMessage({
          role: "assistant",
          content: buildInvoiceCandidateMessage(candidate),
        })
        return
      }

      if (shouldUseArcaContext(prompt) && !isDemo) {
        setIsQueryingArca(true)
        try {
          arcaContext = await fetchArcaAssistantContext({ metrics, payments })
          assistantPrompt = [
            "La app consultó ARCA automáticamente en modo solo lectura y adjuntó tu situación autorizada.",
            `Pregunta original: ${prompt}`,
            "Responde usando los datos fiscales reales disponibles. Si ARCA no devuelve historico para algun punto de venta, usa tambien los registros importados en la app y aclara la brecha.",
          ].join("\n")
        } catch (error) {
          await onAddMessage({
            role: "assistant",
            content:
              error instanceof Error
                ? `Intenté consultar ARCA automáticamente, pero falló: ${error.message}`
                : "Intenté consultar ARCA automáticamente, pero falló. Verificá tu conexión y volvé a intentarlo.",
          })
          return
        } finally {
          setIsQueryingArca(false)
        }
      }

      const reply = await requestAssistantReply({
        arcaContext,
        content: assistantPrompt,
        metrics,
        messages: [...messages, userMessage],
        profile,
        riskSnapshot,
        userName,
      })

      await onAddMessage({
        role: "assistant",
        content: reply,
      })
    } finally {
      setIsPending(false)
    }
  }

  async function handleClearMessages() {
    if (messages.length === 0 || isClearing) {
      return
    }

    setIsClearing(true)
    try {
      await onClearMessages()
      setPendingInvoiceDraft(null)
    } finally {
      setIsClearing(false)
    }
  }

  async function handleEmitPreparedInvoice() {
    if (!pendingInvoiceDraft || isIssuingInvoice) {
      return
    }

    const latestPayment =
      payments.find(
        (payment) => payment.id === pendingInvoiceDraft.payment.id
      ) ?? pendingInvoiceDraft.payment
    const invoiceType = pendingInvoiceDraft.invoiceType

    if (latestPayment.invoiceStatus !== "pendiente") {
      await onAddMessage({
        role: "assistant",
        content:
          "Ese cobro ya no figura como pendiente. No emito nada para evitar duplicar facturas.",
      })
      setPendingInvoiceDraft(null)
      return
    }

    const clientCuit = invoiceClientCuit.trim()
    const exportClientAddress = invoiceClientAddress.trim()
    const exportClientName = invoiceClientName.trim()
    const destinationCountryCode = Number(invoiceDestinationCountryCode)
    const exportInvoiceAmount = parseDecimal(invoiceAmount)
    const exportExchangeRate = parseDecimal(invoiceExchangeRate)

    if (
      invoiceType === "E" &&
      (!exportClientName ||
        !exportClientAddress ||
        !Number.isInteger(destinationCountryCode) ||
        destinationCountryCode <= 0)
    ) {
      setInvoiceError(
        "Para Factura E necesito nombre, domicilio y código de país destino del cliente del exterior."
      )
      return
    }

    if (
      invoiceType === "E" &&
      invoiceCurrencyId === "DOL" &&
      (!Number.isFinite(exportInvoiceAmount) || exportInvoiceAmount <= 0)
    ) {
      setInvoiceError("Para Factura E en USD necesito el importe en dólares.")
      return
    }

    if (
      invoiceType === "E" &&
      invoiceCurrencyId === "DOL" &&
      (!Number.isFinite(exportExchangeRate) || exportExchangeRate <= 0)
    ) {
      setInvoiceError(
        "Para Factura E en USD necesito un tipo de cambio positivo."
      )
      return
    }

    const receiver = clientCuit
      ? `CUIT receptor ${clientCuit}`
      : invoiceType === "E"
        ? `cliente exterior ${exportClientName}`
        : "consumidor final"

    const summary: InvoiceSummary = {
      amount: formatPreparedInvoiceAmount(
        invoiceType,
        latestPayment.amount,
        invoiceCurrencyId,
        invoiceAmount,
        invoiceExchangeRate
      ),
      client: latestPayment.client,
      currency:
        invoiceType === "E" && invoiceCurrencyId === "DOL"
          ? "Dólares estadounidenses (USD)"
          : "Pesos argentinos (ARS)",
      description: latestPayment.description,
      environment: formatArcaEnvironmentForText(arcaEnvironment, isDemo),
      receiver,
    }

    setInvoiceConfirmation({
      invoiceType,
      payment: latestPayment,
      receiver,
      summary,
    })
  }

  async function confirmEmitPreparedInvoice() {
    if (!invoiceConfirmation || isIssuingInvoice) {
      return
    }

    const latestPayment =
      payments.find(
        (payment) => payment.id === invoiceConfirmation.payment.id
      ) ?? invoiceConfirmation.payment
    const invoiceType = invoiceConfirmation.invoiceType

    if (latestPayment.invoiceStatus !== "pendiente") {
      await onAddMessage({
        role: "assistant",
        content:
          "Ese cobro ya no figura como pendiente. No emito nada para evitar duplicar facturas.",
      })
      setPendingInvoiceDraft(null)
      setInvoiceConfirmation(null)
      return
    }

    const clientCuit = invoiceClientCuit.trim()
    const exportClientAddress = invoiceClientAddress.trim()
    const exportClientName = invoiceClientName.trim()
    const exportClientTaxId = invoiceClientTaxId.trim()
    const destinationCountryCode = Number(invoiceDestinationCountryCode)
    const exportInvoiceAmount = parseDecimal(invoiceAmount)
    const exportExchangeRate = parseDecimal(invoiceExchangeRate)

    setInvoiceConfirmation(null)
    setInvoiceError("")

    try {
      const issued = await onGenerateInvoice(latestPayment, {
        invoiceType,
        amount:
          invoiceType === "E" && invoiceCurrencyId === "DOL"
            ? exportInvoiceAmount
            : undefined,
        currencyId: invoiceType === "E" ? invoiceCurrencyId : undefined,
        exchangeRate:
          invoiceType === "E" && invoiceCurrencyId === "DOL"
            ? exportExchangeRate
            : undefined,
        clientCuit: clientCuit || undefined,
        clientName: invoiceType === "E" ? exportClientName : undefined,
        clientAddress: invoiceType === "E" ? exportClientAddress : undefined,
        clientTaxId: invoiceType === "E" ? exportClientTaxId : undefined,
        destinationCountryCode:
          invoiceType === "E" ? destinationCountryCode : undefined,
        receiverIvaConditionId: clientCuit
          ? Number(invoiceIvaCondition)
          : undefined,
      })
      setIssuedInvoiceResult(issued ?? null)
      await onAddMessage({
        role: "assistant",
        content: `Listo: emití la Factura ${invoiceType} de **${latestPayment.client}** por **${formatPreparedInvoiceAmount(
          invoiceType,
          latestPayment.amount,
          invoiceCurrencyId,
          invoiceAmount,
          invoiceExchangeRate
        )}**${issued?.cae ? ` (CAE ${issued.cae})` : ""} y la guardé en la app.`,
      })
      setPendingInvoiceDraft(null)
      setInvoiceClientAddress("")
      setInvoiceClientCuit("")
      setInvoiceClientName("")
      setInvoiceClientTaxId("")
      setInvoiceDestinationCountryCode("")
      setInvoiceCurrencyId("PES")
      setInvoiceExchangeRate("")
      setInvoiceAmount("")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos emitir la factura. Revisá que tus credenciales ARCA estén activas y volvé a intentarlo."

      setInvoiceError(message)
      await onAddMessage({
        role: "assistant",
        content: `No pude emitir la factura: ${message}`,
      })
    }
  }

  return (
    <div className="grid min-h-0 items-start gap-4 xl:grid-cols-[360px_1fr]">
      <FiscalProfileCard onSave={onSaveProfile} profile={profile} />
      <Card className="h-[calc(100svh-9rem)] min-h-[520px] w-full rounded-lg shadow-none">
        <CardHeader className="shrink-0 border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-emerald-500" />
              Conta
            </CardTitle>
            <Button
              disabled={messages.length === 0 || isClearing}
              onClick={handleClearMessages}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2Icon />
              Borrar conversación
            </Button>
          </div>
          <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
            Conta no reemplaza asesoramiento profesional en situaciones complejas. Te ayuda a facturar, monitorear tu categoría y entender tu situación fiscal diaria.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent
          ref={messagesScrollRef}
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" ? (
                  <span className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <SparklesIcon className="size-3.5" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg border px-3 py-2 text-sm shadow-xs",
                    message.role === "user"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card"
                  )}
                >
                  <MessageMarkdown
                    content={message.content}
                    inverted={message.role === "user"}
                  />
                  <div
                    className={cn(
                      "mt-2 text-[11px]",
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex items-end justify-start gap-2">
                <span className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <SparklesIcon className="size-3.5" />
                </span>
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {isQueryingArca ? <PlugZapIcon className="size-4" /> : null}
                  <span>{isQueryingArca ? "Consultando ARCA..." : "Pensando"}</span>
                  <span className="flex items-center gap-0.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                </div>
              </div>
            )}
            {pendingInvoiceDraft ? (
              <PreparedInvoiceCard
                clientAddress={invoiceClientAddress}
                clientCuit={invoiceClientCuit}
                clientName={invoiceClientName}
                clientTaxId={invoiceClientTaxId}
                destinationCountryCode={invoiceDestinationCountryCode}
                error={invoiceError}
                exchangeRate={invoiceExchangeRate}
                invoiceAmount={invoiceAmount}
                invoiceCurrencyId={invoiceCurrencyId}
                invoiceType={pendingInvoiceDraft.invoiceType}
                isIssuing={isIssuingInvoice}
                ivaCondition={invoiceIvaCondition}
                arcaEnvironment={arcaEnvironment}
                isDemo={isDemo}
                onCancel={() => {
                  setPendingInvoiceDraft(null)
                  setInvoiceError("")
                  setInvoiceCurrencyId("PES")
                  setInvoiceExchangeRate("")
                  setInvoiceAmount("")
                }}
                onClientCuitChange={(value) =>
                  setInvoiceClientCuit(value.replace(/\D/g, "").slice(0, 11))
                }
                onClientAddressChange={setInvoiceClientAddress}
                onClientNameChange={setInvoiceClientName}
                onClientTaxIdChange={setInvoiceClientTaxId}
                onDestinationCountryCodeChange={(value) =>
                  setInvoiceDestinationCountryCode(
                    value.replace(/\D/g, "").slice(0, 3)
                  )
                }
                onEmit={() => void handleEmitPreparedInvoice()}
                onExchangeRateChange={(value) =>
                  setInvoiceExchangeRate(value.replace(/[^\d.,]/g, ""))
                }
                onInvoiceAmountChange={(value) =>
                  setInvoiceAmount(value.replace(/[^\d.,]/g, ""))
                }
                onInvoiceCurrencyChange={setInvoiceCurrencyId}
                onInvoiceTypeChange={(invoiceType) =>
                  setPendingInvoiceDraft((current) =>
                    current
                      ? {
                          ...current,
                          invoiceType,
                        }
                      : current
                  )
                }
                onIvaConditionChange={setInvoiceIvaCondition}
                payment={pendingInvoiceDraft.payment}
              />
            ) : null}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </CardContent>
        <CardFooter className="shrink-0 border-t bg-background p-4">
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  disabled={isPending}
                  onClick={() => setContent(question)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {question}
                </Button>
              ))}
            </div>
            <form className="flex w-full gap-2" onSubmit={handleSubmit}>
              <Textarea
                ref={composerRef}
                className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto"
                placeholder="Preguntar o pedir: facturá el cobro de Cuatro Cafe"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value)
                  const textarea = event.currentTarget
                  textarea.style.height = "auto"
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <Button
                className="self-end"
                disabled={!content.trim() || isPending}
                size="icon"
                type="submit"
              >
                <SendIcon />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          </div>
        </CardFooter>
      </Card>
      <ConfirmationDialog
        actionLabel="Sí, emitir factura"
        content={
          invoiceConfirmation ? (
            <InvoiceSummaryDetails summary={invoiceConfirmation.summary} />
          ) : null
        }
        description="Esta acción emite una factura real ante ARCA y genera un CAE (código de autorización electrónico). Una vez emitida, no se puede deshacer ni editar."
        disabled={isIssuingInvoice}
        onConfirm={() => void confirmEmitPreparedInvoice()}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceConfirmation(null)
          }
        }}
        open={Boolean(invoiceConfirmation)}
        severity="default"
        title={
          invoiceConfirmation?.invoiceType === "E"
            ? "Confirmar emisión de Factura E"
            : "Confirmar emisión de Factura C"
        }
      />
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setIssuedInvoiceResult(null)
          }
        }}
        open={Boolean(issuedInvoiceResult)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-emerald-600" />
              <DialogTitle>Factura emitida con éxito</DialogTitle>
            </div>
            <DialogDescription>
              ARCA autorizó tu factura y le asignó un CAE. Guardá este
              comprobante para tus registros.
            </DialogDescription>
          </DialogHeader>
          {issuedInvoiceResult ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <SummaryRow
                label="Tipo"
                value={issuedInvoiceResult.invoiceType}
              />
              <SummaryRow
                label="Número"
                value={`Punto de venta ${String(
                  issuedInvoiceResult.pointOfSale
                ).padStart(4, "0")} · Comprobante ${String(
                  issuedInvoiceResult.number
                ).padStart(8, "0")}`}
              />
              <SummaryRow
                label="Fecha de emisión"
                value={formatPaymentDate(issuedInvoiceResult.issueDate)}
              />
              <SummaryRow
                label="CAE"
                value={issuedInvoiceResult.cae ?? "Pendiente de autorización"}
              />
              {issuedInvoiceResult.caeExpiresAt ? (
                <SummaryRow
                  label="Vencimiento del CAE"
                  value={formatPaymentDate(issuedInvoiceResult.caeExpiresAt)}
                />
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button
              onClick={() => setIssuedInvoiceResult(null)}
              type="button"
              variant="outline"
            >
              Cerrar
            </Button>
            <Button
              disabled={!issuedInvoiceResult}
              onClick={() => {
                if (issuedInvoiceResult) {
                  downloadInvoiceHtml(issuedInvoiceResult)
                }
              }}
              type="button"
            >
              <DownloadIcon />
              Descargar comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function buildInitialAssistantMessage(
  riskSnapshot: RiskSnapshot,
  userName?: string,
) {
  const firstName = userName?.trim().split(/\s+/)[0]
  const greeting = firstName ? `Hola, ${firstName}` : "Hola"

  if (
    riskSnapshot.riskLevel === "ALTO" ||
    riskSnapshot.riskLevel === "CRÍTICO"
  ) {
    const riskSummary =
      riskSnapshot.daysUntilBreach !== null
        ? `estás en riesgo ${riskSnapshot.riskLevel} y, si seguís igual, podrías cruzar el límite en ${riskSnapshot.daysUntilBreach} días`
        : `estás en riesgo ${riskSnapshot.riskLevel} y ya usaste ${riskSnapshot.categoryUsagePercent}% del límite de tu categoría`

    return `⚠️ ${firstName ? `${firstName}, antes` : "Antes"} de que me preguntes algo, tengo que avisarte: ${riskSummary}. ¿Querés que te explique qué hacer?`
  }

  if (riskSnapshot.riskLevel === "MEDIO") {
    return `${greeting}. Tu monotributo está en orden por ahora, aunque hay algunas cosas para seguir de cerca. ¿Querés un resumen de tu situación?`
  }

  return `${greeting}. Todo en orden con tu monotributo. ¿En qué te puedo ayudar?`
}

function getSuggestedQuestions(riskLevel: RiskSnapshot["riskLevel"]) {
  if (riskLevel === "ALTO" || riskLevel === "CRÍTICO") {
    return [
      "¿Qué hago si me paso del límite?",
      "¿Cómo evito la exclusión del monotributo?",
      "¿Qué es la recategorización de oficio?",
    ]
  }

  if (riskLevel === "MEDIO") {
    return [
      "¿Estoy cerca de pasarme de categoría?",
      "¿Qué pasa si me paso del límite?",
      "¿Cuánto me falta para recategorizar?",
    ]
  }

  return [
    "¿Cuánto puedo facturar este mes sin riesgo?",
    "¿Cuándo es mi próxima recategorización?",
    "¿Cómo funciona la Factura E?",
  ]
}

function PreparedInvoiceCard({
  clientAddress,
  clientCuit,
  clientName,
  clientTaxId,
  destinationCountryCode,
  error,
  exchangeRate,
  invoiceAmount,
  invoiceCurrencyId,
  invoiceType,
  isIssuing,
  arcaEnvironment,
  isDemo,
  ivaCondition,
  onCancel,
  onClientAddressChange,
  onClientCuitChange,
  onClientNameChange,
  onClientTaxIdChange,
  onDestinationCountryCodeChange,
  onEmit,
  onExchangeRateChange,
  onInvoiceAmountChange,
  onInvoiceCurrencyChange,
  onInvoiceTypeChange,
  onIvaConditionChange,
  payment,
}: {
  clientAddress: string
  clientCuit: string
  clientName: string
  clientTaxId: string
  destinationCountryCode: string
  error: string
  exchangeRate: string
  invoiceAmount: string
  invoiceCurrencyId: "DOL" | "PES"
  invoiceType: "C" | "E"
  isIssuing: boolean
  arcaEnvironment: "homologacion" | "production" | "unknown"
  isDemo: boolean
  ivaCondition: string
  onCancel: () => void
  onClientAddressChange: (value: string) => void
  onClientCuitChange: (value: string) => void
  onClientNameChange: (value: string) => void
  onClientTaxIdChange: (value: string) => void
  onDestinationCountryCodeChange: (value: string) => void
  onEmit: () => void
  onExchangeRateChange: (value: string) => void
  onInvoiceAmountChange: (value: string) => void
  onInvoiceCurrencyChange: (value: "DOL" | "PES") => void
  onInvoiceTypeChange: (value: "C" | "E") => void
  onIvaConditionChange: (value: string) => void
  payment: IncomePayment
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[680px] rounded-lg border bg-card p-4 text-sm shadow-xs">
        <div className="flex items-start gap-3">
          <ReceiptTextIcon className="mt-0.5 size-4 text-emerald-500" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">Factura lista para emitir</p>
              <Badge variant="secondary">Factura {invoiceType}</Badge>
              <Badge variant="outline">
                {formatArcaEnvironmentBadge(arcaEnvironment, isDemo)}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Select
                onValueChange={(value) =>
                  onInvoiceTypeChange(value as "C" | "E")
                }
                value={invoiceType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Factura C - mercado interno</SelectItem>
                  <SelectItem value="E">Factura E - exportacion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <span className="text-muted-foreground">Cliente</span>
                <div className="mt-1 font-medium">{payment.client}</div>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-muted-foreground">Importe</span>
                <div className="mt-1 font-medium tabular-nums">
                  {formatPreparedInvoiceAmount(
                    invoiceType,
                    payment.amount,
                    invoiceCurrencyId,
                    invoiceAmount,
                    exchangeRate
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-muted-foreground">Fecha cobro</span>
                <div className="mt-1 font-medium">
                  {formatPaymentDate(payment.date)}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-muted-foreground">Concepto</span>
                <div className="mt-1 truncate font-medium">
                  {payment.description}
                </div>
              </div>
            </div>
            {invoiceType === "C" ? (
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="assistant-invoice-cuit">CUIT receptor</Label>
                  <Input
                    id="assistant-invoice-cuit"
                    inputMode="numeric"
                    onChange={(event) => onClientCuitChange(event.target.value)}
                    placeholder="Opcional para consumidor final"
                    value={clientCuit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condicion IVA</Label>
                  <Select
                    disabled={!clientCuit}
                    onValueChange={onIvaConditionChange}
                    value={ivaCondition}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ivaConditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assistant-export-name">
                    Cliente exterior
                  </Label>
                  <Input
                    id="assistant-export-name"
                    onChange={(event) => onClientNameChange(event.target.value)}
                    value={clientName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assistant-export-country">
                    Código país destino
                  </Label>
                  <Input
                    id="assistant-export-country"
                    inputMode="numeric"
                    onChange={(event) =>
                      onDestinationCountryCodeChange(event.target.value)
                    }
                    placeholder="Ej: 200"
                    value={destinationCountryCode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assistant-export-address">
                    Domicilio exterior
                  </Label>
                  <Input
                    id="assistant-export-address"
                    onChange={(event) =>
                      onClientAddressChange(event.target.value)
                    }
                    placeholder="Ciudad, país"
                    value={clientAddress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assistant-export-tax-id">
                    ID fiscal exterior
                  </Label>
                  <Input
                    id="assistant-export-tax-id"
                    onChange={(event) =>
                      onClientTaxIdChange(event.target.value)
                    }
                    placeholder="Opcional si usás CUIT país"
                    value={clientTaxId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    onValueChange={(value) =>
                      onInvoiceCurrencyChange(value as "DOL" | "PES")
                    }
                    value={invoiceCurrencyId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PES">ARS</SelectItem>
                      <SelectItem value="DOL">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {invoiceCurrencyId === "DOL" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="assistant-export-amount">
                        Importe USD
                      </Label>
                      <Input
                        id="assistant-export-amount"
                        inputMode="decimal"
                        onChange={(event) =>
                          onInvoiceAmountChange(event.target.value)
                        }
                        value={invoiceAmount}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assistant-export-exchange-rate">
                        Tipo de cambio
                      </Label>
                      <Input
                        id="assistant-export-exchange-rate"
                        inputMode="decimal"
                        onChange={(event) =>
                          onExchangeRateChange(event.target.value)
                        }
                        value={exchangeRate}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={isIssuing} onClick={onEmit} type="button">
                <FilePlus2Icon />
                {isIssuing ? "Emitiendo..." : "Emitir en ARCA"}
              </Button>
              <Button
                disabled={isIssuing}
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                <XIcon />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type InvoiceCandidateResult =
  | { status: "found"; payment: IncomePayment }
  | { status: "empty" }
  | { status: "ambiguous"; payments: IncomePayment[] }

function shouldPrepareInvoice(prompt: string) {
  const normalized = normalizeText(prompt)
  const asksForGuidance =
    /\b(a quien|quien|que tipo|tipo de factura|debo|deberia|tengo que|corresponde|conviene|como|a nombre de)\b/.test(
      normalized
    )

  if (asksForGuidance) {
    return false
  }

  return /\b(factura|facturar|facturame|emiti|emitir|emitime|prepara|preparar|preparame|genera|generar|generame|hace|hacer|haceme)\b/.test(
    normalized
  )
}

function inferInvoiceType(prompt: string, payment: IncomePayment): "C" | "E" {
  const normalized = normalizeText(
    `${prompt} ${payment.client} ${payment.description}`
  )

  return /exterior|export|factura e|cliente afuera|usa|usd|dolar|dolares|internacional/.test(
    normalized
  )
    ? "E"
    : "C"
}

function findInvoiceCandidate(
  prompt: string,
  payments: IncomePayment[]
): InvoiceCandidateResult {
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )

  if (pendingPayments.length === 0) {
    return { status: "empty" }
  }

  if (pendingPayments.length === 1) {
    return { status: "found", payment: pendingPayments[0] }
  }

  const normalizedPrompt = normalizeText(prompt)
  const promptDigits = normalizedPrompt.replace(/\D/g, "")
  const scoredPayments = pendingPayments
    .map((payment) => ({
      payment,
      score: getPaymentMatchScore(payment, normalizedPrompt, promptDigits),
    }))
    .sort((a, b) => b.score - a.score)
  const best = scoredPayments[0]
  const second = scoredPayments[1]

  if (best.score >= 3 && best.score > second.score) {
    return { status: "found", payment: best.payment }
  }

  return {
    status: "ambiguous",
    payments: pendingPayments.slice(0, 5),
  }
}

function getPaymentMatchScore(
  payment: IncomePayment,
  normalizedPrompt: string,
  promptDigits: string
) {
  const normalizedClient = normalizeText(payment.client)
  const normalizedDescription = normalizeText(payment.description)
  const amountDigits = String(Math.round(payment.amount))
  let score = 0

  if (normalizedPrompt.includes(normalizedClient)) {
    score += 6
  }

  if (normalizedPrompt.includes(normalizedDescription)) {
    score += 4
  }

  if (promptDigits.includes(amountDigits)) {
    score += 5
  }

  for (const token of `${normalizedClient} ${normalizedDescription}`.split(
    /\s+/
  )) {
    if (token.length > 2 && normalizedPrompt.includes(token)) {
      score += 1
    }
  }

  return score
}

function buildInvoiceCandidateMessage(candidate: InvoiceCandidateResult) {
  if (candidate.status === "found") {
    return `Preparé la factura para ${candidate.payment.client}.`
  }

  if (candidate.status === "empty") {
    return "No encontre cobros pendientes para facturar. Cargá un cobro pendiente o revisá si ya fue facturado."
  }

  return [
    "Puedo hacerlo, pero necesito saber cuál cobro querés facturar.",
    "Pendientes detectados:",
    ...candidate.payments.map(
      (payment) =>
        `- ${payment.client}: ${formatARS(payment.amount)} (${payment.description})`
    ),
    "Decime, por ejemplo: **facturá el cobro de Cuatro Cafe**.",
  ].join("\n")
}

function shouldUseArcaContext(prompt: string) {
  const normalized = normalizeText(prompt)

  const mentionsFiscalData =
    /arca|afip|factur|comprobante|cae|punto de venta|histor|monotributo|recategoriz|categoria|limite|ingreso|cobro|cliente|banco|transferencia|airtm|paypal|payoneer|wise|stripe|mercado pago|exterior|exportacion|scale ai/.test(
      normalized
    )
  const asksForRealData =
    /cuanto|total|monto|importe|emitid|trae|consulta|histor|hasta ahora|este ano|este año|periodo|desde|limite|pasando|riesgo|a quien|que tipo|debo|deberia|corresponde|registr|declar|facturo|facturar/.test(
      normalized
    )

  return mentionsFiscalData && asksForRealData
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function parseDecimal(value: string) {
  return Number(value.replace(",", "."))
}

function formatPreparedInvoiceAmount(
  invoiceType: "C" | "E",
  paymentAmount: number,
  currencyId: "DOL" | "PES",
  invoiceAmount: string,
  exchangeRate: string
) {
  if (invoiceType !== "E" || currencyId !== "DOL") {
    return formatARS(paymentAmount)
  }

  const amount = parseDecimal(invoiceAmount)
  const rate = parseDecimal(exchangeRate)

  if (!Number.isFinite(amount) || amount <= 0) {
    return "importe USD pendiente"
  }

  const amountArs =
    Number.isFinite(rate) && rate > 0 ? ` (${formatARS(amount * rate)})` : ""

  return `USD ${invoiceNumberFormatter.format(amount)}${amountArs}`
}

function formatArcaEnvironmentForText(
  environment: "homologacion" | "production" | "unknown",
  isDemo: boolean
) {
  if (isDemo) {
    return "modo demo"
  }

  if (environment === "homologacion") {
    return "ARCA homologación"
  }

  if (environment === "production") {
    return "ARCA producción real"
  }

  return "ARCA"
}

function formatArcaEnvironmentBadge(
  environment: "homologacion" | "production" | "unknown",
  isDemo: boolean
) {
  if (isDemo) {
    return "Demo"
  }

  if (environment === "homologacion") {
    return "ARCA homologación"
  }

  if (environment === "production") {
    return "ARCA producción"
  }

  return "ARCA"
}
