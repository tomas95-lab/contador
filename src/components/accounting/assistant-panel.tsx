"use client"

import * as React from "react"
import {
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
import { professionalDisclaimer } from "@/lib/legal-copy"
import {
  formatARS,
  formatPaymentDate,
  getFinancialMetrics,
  getProactiveAlerts,
} from "@/lib/accounting"
import { cn } from "@/lib/utils"
import type {
  AssistantMessage,
  IncomePayment,
  TaxCategory,
  UserFiscalProfile,
} from "@/types/accounting"

type AssistantPanelProps = {
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
      clientCuit?: string
      clientName?: string
      clientAddress?: string
      clientTaxId?: string
      destinationCountryCode?: number
      receiverIvaConditionId?: number
    }
  ) => Promise<void>
  onSaveProfile: (profile: UserFiscalProfile) => Promise<void>
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
}

const ivaConditionOptions = [
  { label: "Resp. inscripto", value: "1" },
  { label: "Monotributo", value: "6" },
  { label: "Exento", value: "4" },
  { label: "Consumidor final", value: "5" },
]

const assistantIntroStorageKey = "contable-assistant-intro-shown"

export function AssistantPanel({
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
  const [pendingInvoiceDraft, setPendingInvoiceDraft] =
    React.useState<PendingInvoiceDraft | null>(null)
  const [invoiceConfirmation, setInvoiceConfirmation] =
    React.useState<InvoiceConfirmation | null>(null)
  const [isClearing, setIsClearing] = React.useState(false)
  const [isQueryingArca, setIsQueryingArca] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const messagesScrollRef = React.useRef<HTMLDivElement | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
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
      content: buildInitialAssistantMessage(riskSnapshot),
      role: "assistant",
    })
  }, [onAddMessage, riskSnapshot])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = content.trim()

    if (!prompt || isPending) {
      return
    }

    setContent("")
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

    const receiver = clientCuit
      ? `CUIT receptor ${clientCuit}`
      : invoiceType === "E"
        ? `cliente exterior ${exportClientName}`
        : "consumidor final"

    setInvoiceConfirmation({
      invoiceType,
      payment: latestPayment,
      receiver,
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

    setInvoiceConfirmation(null)
    setInvoiceError("")

    try {
      await onGenerateInvoice(latestPayment, {
        invoiceType,
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
      await onAddMessage({
        role: "assistant",
        content: `Listo: emití la Factura ${invoiceType} de **${latestPayment.client}** por **${formatARS(
          latestPayment.amount
        )}** y la guardé en la app.`,
      })
      setPendingInvoiceDraft(null)
      setInvoiceClientAddress("")
      setInvoiceClientCuit("")
      setInvoiceClientName("")
      setInvoiceClientTaxId("")
      setInvoiceDestinationCountryCode("")
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
              {professionalDisclaimer}
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
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
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
              <div className="flex justify-start">
                <div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    {isQueryingArca ? <PlugZapIcon className="size-4" /> : null}
                    {isQueryingArca ? "Consultando ARCA..." : "Pensando..."}
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
                invoiceType={pendingInvoiceDraft.invoiceType}
                isIssuing={isIssuingInvoice}
                ivaCondition={invoiceIvaCondition}
                onCancel={() => {
                  setPendingInvoiceDraft(null)
                  setInvoiceError("")
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
                className="min-h-10 flex-1"
                placeholder="Preguntar o pedir: facturá el cobro de Cuatro Cafe"
                value={content}
                onChange={(event) => setContent(event.target.value)}
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
        actionLabel="Confirmar"
        description={
          invoiceConfirmation
            ? `¿Estás seguro que querés emitir la Factura ${
                invoiceConfirmation.invoiceType
              } real en ARCA por ${formatARS(
                invoiceConfirmation.payment.amount
              )} para ${invoiceConfirmation.payment.client} (${
                invoiceConfirmation.receiver
              })?`
            : "¿Estás seguro que querés emitir esta factura?"
        }
        disabled={isIssuingInvoice}
        onConfirm={() => void confirmEmitPreparedInvoice()}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceConfirmation(null)
          }
        }}
        open={Boolean(invoiceConfirmation)}
        severity="default"
        title="Emitir factura en ARCA"
      />
    </div>
  )
}

function buildInitialAssistantMessage(riskSnapshot: RiskSnapshot) {
  if (
    riskSnapshot.riskLevel === "ALTO" ||
    riskSnapshot.riskLevel === "CRÍTICO"
  ) {
    const riskSummary =
      riskSnapshot.daysUntilBreach !== null
        ? `estás en riesgo ${riskSnapshot.riskLevel} y, si seguís igual, podrías cruzar el límite en ${riskSnapshot.daysUntilBreach} días`
        : `estás en riesgo ${riskSnapshot.riskLevel} y ya usaste ${riskSnapshot.categoryUsagePercent}% del límite de tu categoría`

    return `⚠️ Antes de que me preguntes algo, tengo que avisarte: ${riskSummary}. ¿Querés que te explique qué hacer?`
  }

  if (riskSnapshot.riskLevel === "MEDIO") {
    return "Hola. Tu monotributo está en orden por ahora, aunque hay algunas cosas para seguir de cerca. ¿Querés un resumen de tu situación?"
  }

  return "Hola. Todo en orden con tu monotributo. ¿En qué te puedo ayudar?"
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
  invoiceType,
  isIssuing,
  ivaCondition,
  onCancel,
  onClientAddressChange,
  onClientCuitChange,
  onClientNameChange,
  onClientTaxIdChange,
  onDestinationCountryCodeChange,
  onEmit,
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
  invoiceType: "C" | "E"
  isIssuing: boolean
  ivaCondition: string
  onCancel: () => void
  onClientAddressChange: (value: string) => void
  onClientCuitChange: (value: string) => void
  onClientNameChange: (value: string) => void
  onClientTaxIdChange: (value: string) => void
  onDestinationCountryCodeChange: (value: string) => void
  onEmit: () => void
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
              <Badge variant="outline">ARCA real</Badge>
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
                  {formatARS(payment.amount)}
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
