import * as React from "react"
import {
  ClockIcon,
  DownloadIcon,
  FileCheck2Icon,
  FilePlus2Icon,
  PlugZapIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  formatARS,
  formatInvoiceAmount,
  formatPaymentDate,
  formatPercent,
  getFinancialMetrics,
  sortInvoicesByDate,
  sumPayments,
} from "@/lib/accounting"
import { createDemoArcaAnnualSummary } from "@/data/demo"
import {
  fetchArcaAnnualSummary,
  fetchArcaDestinationCountries,
  type ArcaAnnualSummary,
} from "@/lib/arca-api"
import {
  fetchForeignClients,
  saveForeignClient,
  type ForeignClient,
} from "@/lib/foreign-clients-api"
import type {
  GeneratedInvoice,
  IncomePayment,
  TaxCategory,
} from "@/types/accounting"

type InvoicingPanelProps = {
  arcaEnvironment?: "homologacion" | "production" | "unknown"
  category: TaxCategory
  isDemo?: boolean
  invoices: GeneratedInvoice[]
  isIssuingInvoice?: boolean
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
      foreignClientCountryCode?: string
      foreignClientTaxId?: string
      foreignClientName?: string
      foreignClientAddress?: string
      foreignClientPlatform?: string
      receiverIvaConditionId?: number
    }
  ) => Promise<void>
  payments: IncomePayment[]
}

type InvoiceConfirmation = {
  description: string
  invoiceType: "C" | "E"
  payment: IncomePayment
}

type CountryOption = {
  label: string
  value: string
}

const ivaConditionOptions = [
  { label: "Resp. inscripto", value: "1" },
  { label: "Monotributo", value: "6" },
  { label: "Exento", value: "4" },
  { label: "Consumidor final", value: "5" },
]

const fallbackForeignCountryOptions: CountryOption[] = [
  { label: "Estados Unidos", value: "212" },
  { label: "España", value: "410" },
  { label: "Uruguay", value: "225" },
  { label: "Brasil", value: "203" },
  { label: "Reino Unido", value: "426" },
  { label: "Alemania", value: "438" },
  { label: "Canadá", value: "204" },
  { label: "Francia", value: "412" },
  { label: "Países Bajos", value: "423" },
  { label: "México", value: "218" },
  { label: "Chile", value: "208" },
  { label: "Colombia", value: "205" },
  { label: "Perú", value: "222" },
  { label: "Portugal", value: "425" },
  { label: "Italia", value: "417" },
  { label: "Australia", value: "501" },
  { label: "Singapur", value: "333" },
  { label: "China", value: "310" },
  { label: "India", value: "315" },
  { label: "Japón", value: "320" },
]

const platformOptions = [
  { label: "Deel", value: "deel" },
  { label: "Payoneer", value: "payoneer" },
  { label: "Wise", value: "wise" },
  { label: "Transferencia directa", value: "directo" },
  { label: "Otro", value: "otro" },
]

export function InvoicingPanel({
  arcaEnvironment = "unknown",
  category,
  isDemo = false,
  invoices,
  isIssuingInvoice = false,
  onGenerateInvoice,
  payments,
}: InvoicingPanelProps) {
  const [arcaSummary, setArcaSummary] =
    React.useState<ArcaAnnualSummary | null>(null)
  const [arcaError, setArcaError] = React.useState("")
  const [invoiceError, setInvoiceError] = React.useState("")
  const [isSyncingArca, setIsSyncingArca] = React.useState(false)
  const [issuingPaymentId, setIssuingPaymentId] = React.useState<string | null>(
    null
  )
  const [receiverCuits, setReceiverCuits] = React.useState<
    Record<string, string>
  >({})
  const [receiverIvaConditions, setReceiverIvaConditions] = React.useState<
    Record<string, string>
  >({})
  const [invoiceTypes, setInvoiceTypes] = React.useState<
    Record<string, "C" | "E">
  >({})
  const [foreignClients, setForeignClients] = React.useState<ForeignClient[]>(
    []
  )
  const [foreignCountryOptions, setForeignCountryOptions] = React.useState<
    CountryOption[]
  >(fallbackForeignCountryOptions)
  const [selectedForeignClientIds, setSelectedForeignClientIds] =
    React.useState<Record<string, string>>({})
  const [foreignClientNames, setForeignClientNames] = React.useState<
    Record<string, string>
  >({})
  const [foreignClientCountryCodes, setForeignClientCountryCodes] =
    React.useState<Record<string, string>>({})
  const [foreignClientTaxIds, setForeignClientTaxIds] = React.useState<
    Record<string, string>
  >({})
  const [foreignClientAddresses, setForeignClientAddresses] = React.useState<
    Record<string, string>
  >({})
  const [foreignClientPlatforms, setForeignClientPlatforms] = React.useState<
    Record<string, string>
  >({})
  const [exportCurrencyIds, setExportCurrencyIds] = React.useState<
    Record<string, "DOL" | "PES">
  >({})
  const [exchangeRates, setExchangeRates] = React.useState<
    Record<string, string>
  >({})
  const [exportInvoiceAmounts, setExportInvoiceAmounts] = React.useState<
    Record<string, string>
  >({})
  const [saveClientByPayment, setSaveClientByPayment] = React.useState<
    Record<string, boolean>
  >({})
  const [invoiceConfirmation, setInvoiceConfirmation] =
    React.useState<InvoiceConfirmation | null>(null)
  const pendingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "pendiente"
  )
  const emittingPayments = payments.filter(
    (payment) => payment.invoiceStatus === "emitiendo"
  )
  const invoicedPayments = payments.filter(
    (payment) => payment.invoiceStatus === "facturado"
  )
  const sortedInvoices = sortInvoicesByDate(invoices)
  const currentYear = new Date().getFullYear()
  const metrics = getFinancialMetrics(payments, category)
  const isInvoiceEmissionLocked = isIssuingInvoice || Boolean(issuingPaymentId)

  React.useEffect(() => {
    if (isDemo) {
      setArcaSummary(createDemoArcaAnnualSummary(invoices, currentYear))
      setArcaError("")
      setIsSyncingArca(false)
    }
  }, [currentYear, invoices, isDemo])

  React.useEffect(() => {
    if (isDemo) {
      return
    }

    let cancelled = false

    async function loadForeignClients() {
      try {
        const clients = await fetchForeignClients()

        if (!cancelled) {
          setForeignClients(clients)
        }
      } catch (error) {
        console.error(error)
      }
    }

    async function loadDestinationCountries() {
      try {
        const countries = await fetchArcaDestinationCountries()

        if (!cancelled) {
          setForeignCountryOptions(
            mergeCountryOptions(
              countries
                .map((country) => ({
                  label: country.name,
                  value: country.code,
                })),
              fallbackForeignCountryOptions
            )
              .filter((country) => country.value)
              .sort((a, b) => a.label.localeCompare(b.label, "es"))
          )
        }
      } catch {
        if (!cancelled) {
          setForeignCountryOptions(fallbackForeignCountryOptions)
        }
      }
    }

    void loadForeignClients()
    void loadDestinationCountries()

    return () => {
      cancelled = true
    }
  }, [isDemo])

  async function handleFetchArcaSummary() {
    if (isSyncingArca) {
      return
    }

    if (isDemo) {
      setArcaSummary(createDemoArcaAnnualSummary(invoices, currentYear))
      setArcaError("")
      return
    }

    setIsSyncingArca(true)
    setArcaError("")

    try {
      const summary = await fetchArcaAnnualSummary(currentYear)

      setArcaSummary(summary)
    } catch (error) {
      setArcaError(
        error instanceof Error
          ? error.message
          : "No pudimos conectar con ARCA. Verificá tu conexión y volvé a intentarlo. Si el problema persiste, ARCA puede estar caído."
      )
    } finally {
      setIsSyncingArca(false)
    }
  }

  async function handleGenerateInvoice(payment: IncomePayment) {
    if (isInvoiceEmissionLocked) {
      return
    }

    const invoiceType = invoiceTypes[payment.id] ?? "C"
    const clientCuit = receiverCuits[payment.id]?.trim()
    const ivaConditionId = clientCuit
      ? Number(receiverIvaConditions[payment.id] ?? "1")
      : undefined
    const ivaCondition = ivaConditionOptions.find(
      (option) => Number(option.value) === ivaConditionId
    )
    let description = ""

    if (invoiceType === "C") {
      const receiver = clientCuit
        ? `CUIT receptor ${clientCuit}, ${
            ivaCondition?.label ?? "IVA receptor"
          }`
        : "consumidor final"

      description = `¿Estás seguro que querés emitir la Factura C en ${formatArcaEnvironmentForText(
        arcaEnvironment,
        isDemo
      )} por ${formatARS(
        payment.amount
      )} para ${payment.client} (${receiver})?`
    } else {
      const validationError = validateExportInvoice(payment)

      if (validationError) {
        setInvoiceError(validationError)
        return
      }

      const currencyId = getExportCurrencyId(payment.id)
      const invoiceAmount = getExportInvoiceAmount(payment)
      const exchangeRate = getExchangeRate(payment.id)
      const amountArs = getExportAmountArs(payment)

      description = `¿Estás seguro que querés emitir la Factura E en ${formatArcaEnvironmentForText(
        arcaEnvironment,
        isDemo
      )} por ${
        currencyId === "DOL"
          ? `USD ${formatNumber(invoiceAmount)} (${formatARS(amountArs)})`
          : formatARS(payment.amount)
      } para ${foreignClientNames[payment.id]?.trim()}? Tipo de cambio: ${
        currencyId === "DOL" ? exchangeRate : 1
      }.`
    }

    setInvoiceConfirmation({
      description,
      invoiceType,
      payment,
    })
  }

  async function confirmGenerateInvoice() {
    if (!invoiceConfirmation || isInvoiceEmissionLocked) {
      return
    }

    const { invoiceType, payment } = invoiceConfirmation
    const clientCuit = receiverCuits[payment.id]?.trim()
    const ivaConditionId = clientCuit
      ? Number(receiverIvaConditions[payment.id] ?? "1")
      : undefined

    if (invoiceType === "E") {
      const validationError = validateExportInvoice(payment)

      if (validationError) {
        setInvoiceConfirmation(null)
        setInvoiceError(validationError)
        return
      }
    }

    setInvoiceConfirmation(null)
    setIssuingPaymentId(payment.id)
    setInvoiceError("")

    try {
      if (invoiceType === "C") {
        await onGenerateInvoice(payment, {
          clientCuit: clientCuit || undefined,
          invoiceType,
          receiverIvaConditionId: ivaConditionId,
        })
        clearDomesticInvoiceState(payment.id)
      } else {
        const currencyId = getExportCurrencyId(payment.id)
        const invoiceAmount = getExportInvoiceAmount(payment)
        const exchangeRate = getExchangeRate(payment.id)
        const countryCode = foreignClientCountryCodes[payment.id]?.trim()
        const foreignClientName = foreignClientNames[payment.id]?.trim()
        const foreignClientAddress =
          foreignClientAddresses[payment.id]?.trim() || undefined
        const foreignClientTaxId =
          foreignClientTaxIds[payment.id]?.trim() || undefined
        const foreignClientPlatform =
          foreignClientPlatforms[payment.id]?.trim() || undefined

        await onGenerateInvoice(payment, {
          amount: invoiceAmount,
          currencyId,
          exchangeRate,
          foreignClientAddress,
          foreignClientCountryCode: countryCode,
          foreignClientName,
          foreignClientPlatform,
          foreignClientTaxId,
          invoiceType,
        })

        if (saveClientByPayment[payment.id]) {
          try {
            await saveForeignClient({
              address: foreignClientAddress,
              countryCode,
              name: foreignClientName,
              platform: foreignClientPlatform,
              taxId: foreignClientTaxId,
            })
            setForeignClients(await fetchForeignClients())
          } catch (error) {
            console.error(error)
            setInvoiceError(
              "La factura se emitió, pero no pude guardar el cliente exterior."
            )
          }
        }

        clearExportInvoiceState(payment.id)
      }
    } catch (error) {
      setInvoiceError(
        error instanceof Error
          ? error.message
          : "No pudimos emitir la factura. Revisá que tus credenciales ARCA estén activas y volvé a intentarlo."
      )
    } finally {
      setIssuingPaymentId(null)
    }
  }

  function updateReceiverCuit(paymentId: string, value: string) {
    setReceiverCuits((current) => ({
      ...current,
      [paymentId]: value.replace(/\D/g, "").slice(0, 11),
    }))
  }

  function applySavedForeignClient(paymentId: string, clientId: string) {
    setSelectedForeignClientIds((current) => ({
      ...current,
      [paymentId]: clientId,
    }))

    const client = foreignClients.find((item) => item.id === clientId)

    if (!client) {
      return
    }

    setForeignClientNames((current) => ({
      ...current,
      [paymentId]: client.name,
    }))
    setForeignClientCountryCodes((current) => ({
      ...current,
      [paymentId]: client.countryCode,
    }))
    setForeignClientTaxIds((current) => ({
      ...current,
      [paymentId]: client.taxId ?? "",
    }))
    setForeignClientAddresses((current) => ({
      ...current,
      [paymentId]: client.address ?? "",
    }))
    setForeignClientPlatforms((current) => ({
      ...current,
      [paymentId]: client.platform ?? "",
    }))
  }

  function validateExportInvoice(payment: IncomePayment) {
    const name = foreignClientNames[payment.id]?.trim()
    const countryCode = foreignClientCountryCodes[payment.id]?.trim()
    const currencyId = getExportCurrencyId(payment.id)
    const exchangeRate = getExchangeRate(payment.id)
    const invoiceAmount = getExportInvoiceAmount(payment)

    if (!name) {
      return "Para Factura E necesito el nombre del cliente exterior."
    }

    if (!countryCode) {
      return "Para Factura E necesito el país del cliente exterior."
    }

    if (
      currencyId === "DOL" &&
      (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0)
    ) {
      return "Para Factura E en USD necesito el importe en dólares."
    }

    if (
      currencyId === "DOL" &&
      (!Number.isFinite(exchangeRate) || exchangeRate <= 0)
    ) {
      return "Para Factura E en USD necesito un tipo de cambio positivo."
    }

    return ""
  }

  function getExportCurrencyId(paymentId: string): "DOL" | "PES" {
    return exportCurrencyIds[paymentId] ?? "PES"
  }

  function getExchangeRate(paymentId: string) {
    return Number((exchangeRates[paymentId] ?? "0").replace(",", "."))
  }

  function getExportInvoiceAmount(payment: IncomePayment) {
    const currencyId = getExportCurrencyId(payment.id)

    if (currencyId === "PES") {
      return payment.amount
    }

    return Number((exportInvoiceAmounts[payment.id] ?? "0").replace(",", "."))
  }

  function getExportAmountArs(payment: IncomePayment) {
    const currencyId = getExportCurrencyId(payment.id)
    const exchangeRate = getExchangeRate(payment.id)
    const invoiceAmount = getExportInvoiceAmount(payment)

    return currencyId === "DOL" ? invoiceAmount * exchangeRate : payment.amount
  }

  function getCategoryImpact(payment: IncomePayment) {
    const remaining = metrics.annualLimitRemaining

    if (remaining <= 0) {
      return "Sin margen disponible en la categoría actual."
    }

    return `Esta factura representa ${formatPercent(
      getExportAmountArs(payment) / remaining
    )} de tu límite anual restante.`
  }

  function clearDomesticInvoiceState(paymentId: string) {
    setReceiverCuits((current) => omitKey(current, paymentId))
    setReceiverIvaConditions((current) => omitKey(current, paymentId))
  }

  function clearExportInvoiceState(paymentId: string) {
    setInvoiceTypes((current) => omitKey(current, paymentId))
    setSelectedForeignClientIds((current) => omitKey(current, paymentId))
    setForeignClientNames((current) => omitKey(current, paymentId))
    setForeignClientCountryCodes((current) => omitKey(current, paymentId))
    setForeignClientTaxIds((current) => omitKey(current, paymentId))
    setForeignClientAddresses((current) => omitKey(current, paymentId))
    setForeignClientPlatforms((current) => omitKey(current, paymentId))
    setExportCurrencyIds((current) => omitKey(current, paymentId))
    setExportInvoiceAmounts((current) => omitKey(current, paymentId))
    setExchangeRates((current) => omitKey(current, paymentId))
    setSaveClientByPayment((current) => omitKey(current, paymentId))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Pendiente</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(sumPayments(pendingPayments))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Facturado</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatARS(sumPayments(invoicedPayments))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardDescription>Facturas</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {invoicedPayments.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Cobros listos para facturar</CardTitle>
            <CardDescription>
              Cobros pendientes de número de validación ARCA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceError ? (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {invoiceError}
              </p>
            ) : null}
            {emittingPayments.length > 0 ? (
              <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                {emittingPayments.length === 1
                  ? "Hay un cobro en emisión. Revisá las facturas emitidas antes de volver a intentarlo."
                  : `Hay ${emittingPayments.length} cobros en emisión. Revisá las facturas emitidas antes de volver a intentarlo.`}
              </div>
            ) : null}
            {pendingPayments.length > 0 ? (
              <div className="space-y-2">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{payment.client}</span>
                          <Badge variant="outline">
                            {formatPaymentDate(payment.date)}
                          </Badge>
                          <Badge variant="secondary">
                            {invoiceTypes[payment.id] === "E"
                              ? "Factura E"
                              : "Factura C"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {payment.description}
                        </p>
                        <span className="mt-2 block font-medium tabular-nums">
                          {formatARS(payment.amount)}
                        </span>
                      </div>
                      <Select
                        onValueChange={(value) =>
                          setInvoiceTypes((current) => ({
                            ...current,
                            [payment.id]: value as "C" | "E",
                          }))
                        }
                        value={invoiceTypes[payment.id] ?? "C"}
                      >
                        <SelectTrigger
                          aria-label={`Tipo de factura de ${payment.client}`}
                          className="h-9 w-40"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="C">Factura C</SelectItem>
                          <SelectItem value="E">Factura E</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(invoiceTypes[payment.id] ?? "C") === "E" ? (
                      <ExportInvoiceFields
                        amountArs={getExportAmountArs(payment)}
                        categoryImpact={getCategoryImpact(payment)}
                        clientAddress={foreignClientAddresses[payment.id] ?? ""}
                        clientName={foreignClientNames[payment.id] ?? ""}
                        clientTaxId={foreignClientTaxIds[payment.id] ?? ""}
                        countryCode={
                          foreignClientCountryCodes[payment.id] ?? ""
                        }
                        countryOptions={foreignCountryOptions}
                        currencyId={getExportCurrencyId(payment.id)}
                        exchangeRate={exchangeRates[payment.id] ?? ""}
                        invoiceAmount={exportInvoiceAmounts[payment.id] ?? ""}
                        foreignClients={foreignClients}
                        isIssuing={isInvoiceEmissionLocked}
                        onClientAddressChange={(value) =>
                          setForeignClientAddresses((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onClientNameChange={(value) =>
                          setForeignClientNames((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onClientTaxIdChange={(value) =>
                          setForeignClientTaxIds((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onCountryCodeChange={(value) =>
                          setForeignClientCountryCodes((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onCurrencyChange={(value) =>
                          setExportCurrencyIds((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onEmit={() => void handleGenerateInvoice(payment)}
                        onExchangeRateChange={(value) =>
                          setExchangeRates((current) => ({
                            ...current,
                            [payment.id]: value.replace(/[^\d.,]/g, ""),
                          }))
                        }
                        onInvoiceAmountChange={(value) =>
                          setExportInvoiceAmounts((current) => ({
                            ...current,
                            [payment.id]: value.replace(/[^\d.,]/g, ""),
                          }))
                        }
                        onPlatformChange={(value) =>
                          setForeignClientPlatforms((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        onSaveClientChange={(checked) =>
                          setSaveClientByPayment((current) => ({
                            ...current,
                            [payment.id]: checked,
                          }))
                        }
                        onSavedClientChange={(clientId) =>
                          applySavedForeignClient(payment.id, clientId)
                        }
                        payment={payment}
                        platform={foreignClientPlatforms[payment.id] ?? ""}
                        saveClient={Boolean(saveClientByPayment[payment.id])}
                        selectedClientId={
                          selectedForeignClientIds[payment.id] ?? ""
                        }
                      />
                    ) : (
                      <DomesticInvoiceFields
                        clientCuit={receiverCuits[payment.id] ?? ""}
                        ivaCondition={receiverIvaConditions[payment.id] ?? "1"}
                        isIssuing={isInvoiceEmissionLocked}
                        onClientCuitChange={(value) =>
                          updateReceiverCuit(payment.id, value)
                        }
                        onEmit={() => void handleGenerateInvoice(payment)}
                        onIvaConditionChange={(value) =>
                          setReceiverIvaConditions((current) => ({
                            ...current,
                            [payment.id]: value,
                          }))
                        }
                        payment={payment}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay cobros pendientes de facturar.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Facturas emitidas</CardTitle>
            <CardDescription>
              Facturas con número de validación ARCA registrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedInvoices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="divide-y">
                  {sortedInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid gap-3 p-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {invoice.invoiceType} {invoice.number}
                          </span>
                          <Badge variant="outline">
                            {invoice.status === "draft"
                              ? "Sin emitir"
                              : "Emitida"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {invoice.client} · {invoice.description}
                        </p>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatInvoiceAmount(invoice)}
                      </span>
                      <Button
                        onClick={() => downloadInvoiceHtml(invoice)}
                        size="sm"
                        variant="outline"
                      >
                        <DownloadIcon />
                        HTML
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Todavía no emitiste facturas desde la app.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>ARCA</CardTitle>
              <CardDescription>
                Conexión fiscal para consultar cuando lo necesites
              </CardDescription>
            </div>
            <Badge variant="outline">
              {isSyncingArca
                ? "Consultando"
                : arcaSummary
                  ? "Validado"
                  : "Preparado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheckIcon className="size-4 text-emerald-500" />
              Certificado digital
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              CUIT y puntos de venta listos para consultar y emitir.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ReceiptTextIcon className="size-4 text-emerald-500" />
              Factura C
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Emisión real activa. Se obtiene el número de validación ARCA al
              emitir.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <ClockIcon className="size-4 text-amber-500" />
              Permisos de ARCA
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isDemo
                ? "Modo demo. Punto de venta 5 simulado."
                : "Produccion activa. Punto de venta 4."}
            </p>
          </div>
          {arcaSummary ? (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">
                Total ARCA {arcaSummary.year}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatARS(arcaSummary.total)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {arcaSummary.count} facturas{" "}
                {arcaSummary.invoiceTypes.join(" + ")}
              </p>
            </div>
          ) : null}
          {arcaError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {arcaError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isSyncingArca}
              onClick={handleFetchArcaSummary}
              variant="outline"
            >
              <FileCheck2Icon />
              Validar
            </Button>
            <Button disabled={isSyncingArca} onClick={handleFetchArcaSummary}>
              <PlugZapIcon />
              {isSyncingArca ? "Consultando" : "Consultar"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmationDialog
        actionLabel="Confirmar"
        description={
          invoiceConfirmation?.description ??
          "¿Estás seguro que querés emitir esta factura?"
        }
        disabled={isInvoiceEmissionLocked}
        onConfirm={() => void confirmGenerateInvoice()}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceConfirmation(null)
          }
        }}
        open={Boolean(invoiceConfirmation)}
        severity="default"
        title={
          invoiceConfirmation?.invoiceType === "E"
            ? "Emitir Factura E"
            : "Emitir Factura C"
        }
      />
    </div>
  )
}

function DomesticInvoiceFields({
  clientCuit,
  ivaCondition,
  isIssuing,
  onClientCuitChange,
  onEmit,
  onIvaConditionChange,
  payment,
}: {
  clientCuit: string
  ivaCondition: string
  isIssuing: boolean
  onClientCuitChange: (value: string) => void
  onEmit: () => void
  onIvaConditionChange: (value: string) => void
  payment: IncomePayment
}) {
  return (
    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-end">
      <div className="space-y-1">
        <Label htmlFor={`receiver-cuit-${payment.id}`}>CUIT receptor</Label>
        <Input
          id={`receiver-cuit-${payment.id}`}
          aria-label={`CUIT receptor de ${payment.client}`}
          className="h-9 w-full md:w-36"
          inputMode="numeric"
          onChange={(event) => onClientCuitChange(event.target.value)}
          placeholder="Opcional"
          value={clientCuit}
        />
      </div>
      <div className="space-y-1">
        <Label>Condición IVA</Label>
        <Select
          disabled={!clientCuit}
          onValueChange={onIvaConditionChange}
          value={ivaCondition}
        >
          <SelectTrigger
            aria-label={`Condición IVA de ${payment.client}`}
            className="h-9 w-full md:w-40"
          >
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
      <Button disabled={isIssuing} onClick={onEmit} size="sm">
        <FilePlus2Icon />
        {isIssuing ? "Emitiendo" : "Emitir C"}
      </Button>
    </div>
  )
}

function ExportInvoiceFields({
  amountArs,
  categoryImpact,
  clientAddress,
  clientName,
  clientTaxId,
  countryCode,
  countryOptions,
  currencyId,
  exchangeRate,
  invoiceAmount,
  foreignClients,
  isIssuing,
  onClientAddressChange,
  onClientNameChange,
  onClientTaxIdChange,
  onCountryCodeChange,
  onCurrencyChange,
  onEmit,
  onExchangeRateChange,
  onInvoiceAmountChange,
  onPlatformChange,
  onSaveClientChange,
  onSavedClientChange,
  payment,
  platform,
  saveClient,
  selectedClientId,
}: {
  amountArs: number
  categoryImpact: string
  clientAddress: string
  clientName: string
  clientTaxId: string
  countryCode: string
  countryOptions: CountryOption[]
  currencyId: "DOL" | "PES"
  exchangeRate: string
  invoiceAmount: string
  foreignClients: ForeignClient[]
  isIssuing: boolean
  onClientAddressChange: (value: string) => void
  onClientNameChange: (value: string) => void
  onClientTaxIdChange: (value: string) => void
  onCountryCodeChange: (value: string) => void
  onCurrencyChange: (value: "DOL" | "PES") => void
  onEmit: () => void
  onExchangeRateChange: (value: string) => void
  onInvoiceAmountChange: (value: string) => void
  onPlatformChange: (value: string) => void
  onSaveClientChange: (checked: boolean) => void
  onSavedClientChange: (clientId: string) => void
  payment: IncomePayment
  platform: string
  saveClient: boolean
  selectedClientId: string
}) {
  const parsedRate = Number(exchangeRate.replace(",", "."))
  const canShowArsAmount =
    currencyId === "PES" || (Number.isFinite(parsedRate) && parsedRate > 0)
  const selectedCountryValue = countryOptions.some(
    (country) => country.value === countryCode
  )
    ? countryCode
    : ""

  return (
    <div className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1">
          <Label>Usar cliente guardado</Label>
          <Select
            onValueChange={(value) => {
              if (value !== "manual") {
                onSavedClientChange(value)
              }
            }}
            value={selectedClientId || "manual"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Cargar manualmente</SelectItem>
              {foreignClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`foreign-name-${payment.id}`}>
            Nombre del cliente o empresa
          </Label>
          <Input
            id={`foreign-name-${payment.id}`}
            onChange={(event) => onClientNameChange(event.target.value)}
            value={clientName}
          />
        </div>
        <div className="space-y-1">
          <Label>País destino</Label>
          <Select
            onValueChange={onCountryCodeChange}
            value={selectedCountryValue}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar país" />
            </SelectTrigger>
            <SelectContent>
              {countryOptions.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label} ({country.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={`foreign-country-${payment.id}`}
            className="mt-2"
            inputMode="numeric"
            onChange={(event) =>
              onCountryCodeChange(event.target.value.replace(/\D/g, ""))
            }
            placeholder="Código ARCA"
            value={countryCode}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`foreign-tax-${payment.id}`}>
            Identificación fiscal
          </Label>
          <Input
            id={`foreign-tax-${payment.id}`}
            onChange={(event) => onClientTaxIdChange(event.target.value)}
            placeholder="EIN, VAT, etc"
            value={clientTaxId}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`foreign-address-${payment.id}`}>Domicilio</Label>
          <Input
            id={`foreign-address-${payment.id}`}
            onChange={(event) => onClientAddressChange(event.target.value)}
            placeholder="Ciudad, país"
            value={clientAddress}
          />
        </div>
        <div className="space-y-1">
          <Label>Plataforma de cobro</Label>
          <Select onValueChange={onPlatformChange} value={platform}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {platformOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_1fr]">
        <div className="space-y-1">
          <Label>Moneda</Label>
          <Select onValueChange={onCurrencyChange} value={currencyId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DOL">USD</SelectItem>
              <SelectItem value="PES">ARS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {currencyId === "DOL" ? (
          <div className="space-y-1">
            <Label htmlFor={`export-amount-${payment.id}`}>Importe USD</Label>
            <Input
              id={`export-amount-${payment.id}`}
              inputMode="decimal"
              onChange={(event) => onInvoiceAmountChange(event.target.value)}
              value={invoiceAmount}
            />
          </div>
        ) : null}
        {currencyId === "DOL" ? (
          <div className="space-y-1">
            <Label htmlFor={`exchange-rate-${payment.id}`}>
              Tipo de cambio
            </Label>
            <Input
              id={`exchange-rate-${payment.id}`}
              inputMode="decimal"
              onChange={(event) => onExchangeRateChange(event.target.value)}
              placeholder="Usá el tipo de cambio oficial del día"
              value={exchangeRate}
            />
          </div>
        ) : null}
        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="text-muted-foreground">Equivalente en ARS</div>
          <div className="mt-1 font-medium tabular-nums">
            {canShowArsAmount ? formatARS(amountArs) : "-"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{categoryImpact}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={saveClient}
            onCheckedChange={(checked) => onSaveClientChange(checked === true)}
          />
          Guardar este cliente para próximas facturas
        </label>
        <Button disabled={isIssuing} onClick={onEmit} size="sm">
          <FilePlus2Icon />
          {isIssuing ? "Emitiendo" : "Emitir E"}
        </Button>
      </div>
    </div>
  )
}

function downloadInvoiceHtml(invoice: GeneratedInvoice) {
  const html = buildInvoiceHtml(invoice)
  const blob = new Blob([html], {
    type: "text/html;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = `factura-${invoice.number}.html`
  link.click()
  URL.revokeObjectURL(url)
}

function buildInvoiceHtml(invoice: GeneratedInvoice) {
  const isIssued = invoice.status === "issued"
  const invoiceLetter = invoice.invoiceType.replace("Factura ", "")
  const caeMarkup =
    isIssued && invoice.cae
      ? `<p><strong>Número de validación ARCA:</strong> ${escapeHtml(invoice.cae)}</p>
        <p><strong>Vencimiento de validación:</strong> ${escapeHtml(
          invoice.caeExpiresAt ?? "-"
        )}</p>`
      : ""
  const noticeMarkup = isIssued
    ? `<div class="official">Factura fiscal emitida con número de validación ARCA registrado.</div>`
    : `<div class="warning">Esta factura está sin emitir. Para emitir una factura fiscal válida falta solicitar el número de validación ARCA.</div>`

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.invoiceType)} ${escapeHtml(invoice.number)}</title>
  <style>
    body { color: #18181b; font-family: Arial, sans-serif; margin: 40px; }
    .box { border: 1px solid #d4d4d8; border-radius: 8px; padding: 24px; }
    .top { display: flex; justify-content: space-between; gap: 24px; }
    .type { border: 2px solid #18181b; font-size: 32px; font-weight: 700; padding: 8px 18px; }
    .muted { color: #71717a; }
    table { border-collapse: collapse; margin-top: 28px; width: 100%; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 12px; text-align: left; }
    .right { text-align: right; }
    .total { font-size: 22px; font-weight: 700; }
    .official { background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; margin-top: 24px; padding: 12px; }
    .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; margin-top: 24px; padding: 12px; }
  </style>
</head>
<body>
  <section class="box">
    <div class="top">
      <div>
        <h1>${escapeHtml(invoice.invoiceType)}</h1>
        <p class="muted">${
          isIssued
            ? "Comprobante fiscal emitido"
            : "Comprobante interno no fiscal"
        }</p>
      </div>
      <div class="type">${escapeHtml(invoiceLetter)}</div>
      <div>
        <p><strong>Nro:</strong> ${escapeHtml(invoice.number)}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(invoice.issueDate)}</p>
        <p><strong>Punto de venta:</strong> ${invoice.pointOfSale}</p>
        ${caeMarkup}
      </div>
    </div>
    <hr />
    <p><strong>Cliente:</strong> ${escapeHtml(invoice.client)}</p>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="right">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(invoice.description)}</td>
          <td class="right">${formatInvoiceAmount(invoice)}</td>
        </tr>
      </tbody>
    </table>
    <p class="right total">Total: ${formatInvoiceAmount(invoice)}</p>
    ${noticeMarkup}
  </section>
</body>
</html>`
}

function omitKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record }

  delete next[key]

  return next
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
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

function mergeCountryOptions(
  primaryOptions: CountryOption[],
  fallbackOptions: CountryOption[]
) {
  const optionsByValue = new Map<string, CountryOption>()

  for (const option of [...fallbackOptions, ...primaryOptions]) {
    const value = option.value.trim()
    const label = option.label.trim()

    if (value && label) {
      optionsByValue.set(value, { label, value })
    }
  }

  return Array.from(optionsByValue.values())
}
