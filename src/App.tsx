import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { AuthScreen } from "@/components/auth-screen"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  currentTaxCategory,
  initialAssistantMessages,
  initialPayments,
  taxCategories as fallbackTaxCategories,
} from "@/data/accounting"
import {
  createDemoInvoiceFromPayment,
  demoUser,
  getDemoSessionState,
} from "@/data/demo"
import { getTodayInputValue } from "@/lib/accounting"
import { emitArcaInvoice } from "@/lib/arca-api"
import { fetchArcaCredentialsStatus } from "@/lib/arca-credentials-api"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import {
  createAssistantMessage,
  clearAssistantMessages,
  createPayment,
  deletePayment,
  emptyFiscalProfile,
  fetchAssistantMessages,
  fetchFiscalProfile,
  fetchInvoices,
  fetchPayments,
  fetchTaxCategories,
  fetchTaxCategory,
  fetchTaxPayments,
  markTaxPaymentAsPaid,
  unmarkTaxPaymentAsPaid,
  updatePayment,
  upsertFiscalProfile,
} from "@/lib/supabase-accounting"
import { signOut } from "@/lib/supabase-auth"
import type {
  AppSection,
  AssistantMessage,
  GeneratedInvoice,
  IncomePayment,
  InvoiceKind,
  TaxCategory,
  TaxDue,
  TaxPayment,
  UserFiscalProfile,
} from "@/types/accounting"

type DataStatus = "loading" | "connected" | "local" | "demo" | "error"
type AuthStatus = "loading" | "authenticated" | "anonymous"
type ArcaCredentialsStatus = "loading" | "configured" | "missing" | "error"
type ArcaEnvironment = "homologacion" | "production" | "unknown"
type InvoiceEmissionOptions = {
  invoiceType?: InvoiceKind
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

const DEMO_AUTH_STORAGE_KEY = "contable-demo-session"
const ARCA_CUIT_STORAGE_KEY = "contable-arca-cuit"

const AccountantClientsPanel = React.lazy(() =>
  import("@/components/accounting/accountant-clients-panel").then((module) => ({
    default: module.AccountantClientsPanel,
  }))
)
const ArcaConnectView = React.lazy(() =>
  import("@/components/accounting/arca-connect-view").then((module) => ({
    default: module.ArcaConnectView,
  }))
)
const ArcaOnboarding = React.lazy(() =>
  import("@/components/accounting/arca-onboarding").then((module) => ({
    default: module.ArcaOnboarding,
  }))
)
const AssistantPanel = React.lazy(() =>
  import("@/components/accounting/assistant-panel").then((module) => ({
    default: module.AssistantPanel,
  }))
)
const DashboardView = React.lazy(() =>
  import("@/components/accounting/dashboard-view").then((module) => ({
    default: module.DashboardView,
  }))
)
const HelpView = React.lazy(() =>
  import("@/components/help-view").then((module) => ({
    default: module.HelpView,
  }))
)
const InvoicingPanel = React.lazy(() =>
  import("@/components/accounting/invoicing-panel").then((module) => ({
    default: module.InvoicingPanel,
  }))
)
const PaymentsView = React.lazy(() =>
  import("@/components/accounting/income-tracker").then((module) => ({
    default: module.IncomeTracker,
  }))
)
const ProjectionsPanel = React.lazy(() =>
  import("@/components/accounting/projections-panel").then((module) => ({
    default: module.ProjectionsPanel,
  }))
)
const SettingsView = React.lazy(() =>
  import("@/components/settings-view").then((module) => ({
    default: module.SettingsView,
  }))
)

const sectionMeta: Record<AppSection, { title: string; description: string }> =
  {
    resumen: {
      title: "Resumen",
      description: "Vista mensual y período fiscal",
    },
    cobros: {
      title: "Cobros",
      description: "Registro de ingresos y facturación pendiente",
    },
    asistente: {
      title: "Conta",
      description: "Consultas sobre ingresos, límites y proyecciones",
    },
    facturacion: {
      title: "Facturación",
      description: "Preparación para ARCA y facturas",
    },
    proyecciones: {
      title: "Proyecciones",
      description: "Escenarios de categoría y período fiscal",
    },
    clientes: {
      title: "Clientes",
      description: "Panel multi-usuario para estudios contables",
    },
    arca: {
      title: "Conectar ARCA",
      description: "Autorizar a Conta sin compartir clave fiscal",
    },
    configuracion: {
      title: "Configuración",
      description: "Cuenta, perfil fiscal, ARCA y sesión",
    },
    ayuda: {
      title: "Ayuda",
      description: "Soporte para consultas fiscales y técnicas",
    },
  }

export default function App() {
  const [activeSection, setActiveSection] =
    React.useState<AppSection>("resumen")
  const [payments, setPayments] =
    React.useState<IncomePayment[]>(initialPayments)
  const [invoices, setInvoices] = React.useState<GeneratedInvoice[]>([])
  const [assistantMessages, setAssistantMessages] = React.useState<
    AssistantMessage[]
  >(initialAssistantMessages)
  const [fiscalProfile, setFiscalProfile] =
    React.useState<UserFiscalProfile>(emptyFiscalProfile)
  const [category, setCategory] =
    React.useState<TaxCategory>(currentTaxCategory)
  const [allCategories, setAllCategories] = React.useState<TaxCategory[]>(
    fallbackTaxCategories
  )
  const [taxPayments, setTaxPayments] = React.useState<TaxPayment[]>([])
  const [taxDueActionMonthKey, setTaxDueActionMonthKey] = React.useState<
    string | null
  >(null)
  const [isDemoSession, setIsDemoSession] = React.useState(getStoredDemoSession)
  const [connectedArcaCuit, setConnectedArcaCuit] =
    React.useState(getStoredArcaCuit)
  const [session, setSession] = React.useState<Session | null>(null)
  const [authStatus, setAuthStatus] = React.useState<AuthStatus>(() =>
    getStoredDemoSession()
      ? "authenticated"
      : isSupabaseConfigured
        ? "loading"
        : "anonymous"
  )
  const [arcaCredentialsStatus, setArcaCredentialsStatus] =
    React.useState<ArcaCredentialsStatus>("loading")
  const [arcaEnvironment, setArcaEnvironment] =
    React.useState<ArcaEnvironment>("unknown")
  const arcaCredentialsStatusRef = React.useRef<ArcaCredentialsStatus | null>(
    null
  )
  const arcaCredentialsUserKeyRef = React.useRef<string | null>(null)
  const [dataStatus, setDataStatus] = React.useState<DataStatus>("loading")
  const [unreadAlertCount, setUnreadAlertCount] = React.useState(0)
  const [isIssuingInvoice, setIsIssuingInvoice] = React.useState(false)
  const isIssuingInvoiceRef = React.useRef(false)
  const loadedDataUserKeyRef = React.useRef<string | null>(null)
  const activeMeta = sectionMeta[activeSection]
  const isDemoActive = isDemoSession && authStatus === "authenticated"
  const sessionUserKey = getSessionUserKey(session)
  const shouldUseSupabase =
    isSupabaseConfigured && Boolean(sessionUserKey) && !isDemoActive

  React.useEffect(() => {
    if (isDemoSession) {
      setSession(null)
      setAuthStatus("authenticated")
      return
    }

    if (!supabase) {
      setSession(null)
      setAuthStatus("anonymous")
      return
    }

    let mounted = true

    setAuthStatus("loading")

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return
        }

        setSession(data.session)
        setAuthStatus(data.session ? "authenticated" : "anonymous")
      })
      .catch((error) => {
        console.error(error)

        if (!mounted) {
          return
        }

        setSession(null)
        setAuthStatus("anonymous")
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        loadedDataUserKeyRef.current = null
        setSession(null)
        setAuthStatus("anonymous")
        return
      }

      if (event !== "SIGNED_IN") {
        return
      }

      setAuthStatus(nextSession ? "authenticated" : "anonymous")
      setSession((currentSession) => {
        const currentUserKey = getSessionUserKey(currentSession)
        const nextUserKey = getSessionUserKey(nextSession)

        if (currentUserKey && nextUserKey && currentUserKey === nextUserKey) {
          return currentSession
        }

        return nextSession
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isDemoSession])

  React.useEffect(() => {
    let cancelled = false

    async function loadArcaCredentialsStatus() {
      if (!shouldUseSupabase) {
        arcaCredentialsStatusRef.current = "configured"
        arcaCredentialsUserKeyRef.current = null
        setArcaCredentialsStatus("configured")
        return
      }

      const userKey = sessionUserKey ?? "authenticated"

      if (
        arcaCredentialsUserKeyRef.current === userKey &&
        arcaCredentialsStatusRef.current
      ) {
        setArcaCredentialsStatus(arcaCredentialsStatusRef.current)
        return
      }

      setArcaCredentialsStatus("loading")

      try {
        const status = await fetchArcaCredentialsStatus()
        const nextStatus: ArcaCredentialsStatus = status.configured
          ? "configured"
          : "missing"

        if (!cancelled) {
          arcaCredentialsUserKeyRef.current = userKey
          arcaCredentialsStatusRef.current = nextStatus
          setArcaCredentialsStatus(nextStatus)
          setArcaEnvironment(status.arcaEnvironment)
        }
      } catch (error) {
        console.error(error)

        if (!cancelled) {
          arcaCredentialsUserKeyRef.current = userKey
          arcaCredentialsStatusRef.current = "error"
          setArcaCredentialsStatus("error")
          setArcaEnvironment("unknown")
        }
      }
    }

    void loadArcaCredentialsStatus()

    return () => {
      cancelled = true
    }
  }, [sessionUserKey, shouldUseSupabase])

  React.useEffect(() => {
    let cancelled = false

    async function loadSupabaseData() {
      if (isDemoActive) {
        const demoState = getDemoSessionState()
        setPayments(demoState.payments)
        setInvoices(demoState.invoices)
        setCategory(demoState.category)
        setAssistantMessages(demoState.assistantMessages)
        setFiscalProfile(demoState.fiscalProfile)
        setTaxPayments(demoState.taxPayments)
        setConnectedArcaCuit(demoState.arcaCuit)
        arcaCredentialsStatusRef.current = "configured"
        setArcaCredentialsStatus("configured")
        setDataStatus("connected")
        return
      }

      if (!isSupabaseConfigured) {
        loadedDataUserKeyRef.current = null
        setDataStatus("local")
        return
      }

      if (!sessionUserKey || !shouldUseSupabase) {
        loadedDataUserKeyRef.current = null
        setPayments([])
        setInvoices([])
        setAssistantMessages([])
        setFiscalProfile(emptyFiscalProfile)
        setTaxPayments([])
        setDataStatus("loading")
        return
      }

      if (loadedDataUserKeyRef.current === sessionUserKey) {
        return
      }

      setPayments([])
      setInvoices([])
      setAssistantMessages([])

      try {
        const [
          remotePayments,
          remoteInvoices,
          remoteCategory,
          remoteAllCategories,
          remoteMessages,
          remoteFiscalProfile,
          remoteTaxPayments,
        ] = await Promise.all([
          fetchPayments(),
          fetchInvoices(),
          fetchTaxCategory(),
          fetchTaxCategories(),
          fetchAssistantMessages(),
          fetchFiscalProfile(),
          fetchTaxPayments(),
        ])

        if (cancelled) {
          return
        }

        setPayments(remotePayments)
        setInvoices(remoteInvoices)
        setCategory(remoteCategory)
        setAllCategories(remoteAllCategories)
        setFiscalProfile(remoteFiscalProfile)
        setTaxPayments(remoteTaxPayments)
        setAssistantMessages(
          remoteMessages.length > 0 ? remoteMessages : initialAssistantMessages
        )
        loadedDataUserKeyRef.current = sessionUserKey
        setDataStatus("connected")
      } catch (error) {
        console.error(error)

        if (!cancelled) {
          setDataStatus("error")
        }
      }
    }

    void loadSupabaseData()

    return () => {
      cancelled = true
    }
  }, [isDemoActive, sessionUserKey, shouldUseSupabase])

  async function handleSignOut() {
    if (shouldUseSupabase) {
      await signOut()
    }

    setStoredDemoSession(false)
    setIsDemoSession(false)
    setSession(null)
    setAuthStatus("anonymous")
    arcaCredentialsStatusRef.current = null
    arcaCredentialsUserKeyRef.current = null
    loadedDataUserKeyRef.current = null
    setStoredArcaCuit(null)
    setConnectedArcaCuit(null)
    setArcaCredentialsStatus("loading")
    setPayments([])
    setInvoices([])
    setAssistantMessages([])
    setFiscalProfile(emptyFiscalProfile)
    setTaxPayments([])
    setUnreadAlertCount(0)
    setActiveSection("resumen")
  }

  function startDemoSession() {
    const demoState = getDemoSessionState()
    setStoredDemoSession(true)
    setIsDemoSession(true)
    setSession(null)
    setAuthStatus("authenticated")
    loadedDataUserKeyRef.current = null
    setDataStatus("connected")
    setPayments(demoState.payments)
    setInvoices(demoState.invoices)
    setCategory(demoState.category)
    setAssistantMessages(demoState.assistantMessages)
    setFiscalProfile(demoState.fiscalProfile)
    setTaxPayments(demoState.taxPayments)
    setUnreadAlertCount(0)
    setStoredArcaCuit(demoState.arcaCuit)
    setConnectedArcaCuit(demoState.arcaCuit)
    arcaCredentialsStatusRef.current = "configured"
    setArcaCredentialsStatus("configured")
    setActiveSection("resumen")
  }

  function handleReconnectArca() {
    if (!shouldUseSupabase) {
      setActiveSection("arca")
      return
    }

    setStoredArcaCuit(null)
    setConnectedArcaCuit(null)
    arcaCredentialsStatusRef.current = "missing"
    arcaCredentialsUserKeyRef.current =
      session?.user.id ?? session?.user.email ?? "authenticated"
    setArcaCredentialsStatus("missing")
  }

  async function addPayment(payment: Omit<IncomePayment, "id">) {
    if (shouldUseSupabase) {
      try {
        const savedPayment = await createPayment(payment)

        setPayments((current) => [savedPayment, ...current])
        setDataStatus("connected")
        return
      } catch (error) {
        console.error(error)
        setDataStatus("error")
      }
    }

    setPayments((current) => [createLocalPayment(payment), ...current])
  }

  async function editPayment(payment: IncomePayment) {
    if (shouldUseSupabase) {
      try {
        const savedPayment = await updatePayment(payment)

        setPayments((current) =>
          current.map((item) =>
            item.id === savedPayment.id ? savedPayment : item
          )
        )
        setDataStatus("connected")
        return
      } catch (error) {
        console.error(error)
        setDataStatus("error")
        throw error
      }
    }

    setPayments((current) =>
      current.map((item) => (item.id === payment.id ? payment : item))
    )
  }

  async function removePayment(paymentId: string) {
    if (shouldUseSupabase) {
      try {
        await deletePayment(paymentId)
        setPayments((current) =>
          current.filter((item) => item.id !== paymentId)
        )
        setDataStatus("connected")
        return
      } catch (error) {
        console.error(error)
        setDataStatus("error")
        throw error
      }
    }

    setPayments((current) => current.filter((item) => item.id !== paymentId))
  }

  async function addAssistantMessage(
    message: Pick<AssistantMessage, "content" | "role">
  ) {
    if (shouldUseSupabase) {
      try {
        const savedMessage = await createAssistantMessage(message)

        setAssistantMessages((current) => [...current, savedMessage])
        setDataStatus("connected")
        return savedMessage
      } catch (error) {
        console.error(error)
        setDataStatus("error")
      }
    }

    const localMessage = createLocalAssistantMessage(message)

    setAssistantMessages((current) => [...current, localMessage])
    return localMessage
  }

  async function clearChat() {
    if (shouldUseSupabase) {
      try {
        await clearAssistantMessages()
        setDataStatus("connected")
      } catch (error) {
        console.error(error)
        setDataStatus("error")
      }
    }

    setAssistantMessages([])
  }

  async function saveFiscalProfile(profile: UserFiscalProfile) {
    if (shouldUseSupabase) {
      try {
        const savedProfile = await upsertFiscalProfile(profile)

        setFiscalProfile(savedProfile)
        setDataStatus("connected")
        return
      } catch (error) {
        console.error(error)
        setDataStatus("error")
      }
    }

    setFiscalProfile({
      ...profile,
      updatedAt: new Date().toISOString(),
    })
  }

  async function markTaxDuePaid(due: TaxDue) {
    const paidAt = getTodayInputValue()

    setTaxDueActionMonthKey(due.monthKey)
    try {
      if (shouldUseSupabase) {
        const savedTaxPayment = await markTaxPaymentAsPaid({
          amount: due.amount,
          monthKey: due.monthKey,
          paidAt,
        })

        setTaxPayments((current) =>
          upsertLocalTaxPayment(current, savedTaxPayment)
        )
        setDataStatus("connected")
        return
      }

      setTaxPayments((current) =>
        upsertLocalTaxPayment(current, {
          amount: due.amount,
          id: crypto.randomUUID(),
          monthKey: due.monthKey,
          paidAt,
        })
      )
    } catch (error) {
      console.error(error)
      setDataStatus("error")
      throw error
    } finally {
      setTaxDueActionMonthKey(null)
    }
  }

  async function unmarkTaxDuePaid(due: TaxDue) {
    setTaxDueActionMonthKey(due.monthKey)
    try {
      if (shouldUseSupabase) {
        await unmarkTaxPaymentAsPaid(due.monthKey)
        setDataStatus("connected")
      }

      setTaxPayments((current) =>
        current.filter((payment) => payment.monthKey !== due.monthKey)
      )
    } catch (error) {
      console.error(error)
      setDataStatus("error")
      throw error
    } finally {
      setTaxDueActionMonthKey(null)
    }
  }

  async function generateInvoice(
    payment: IncomePayment,
    options: InvoiceEmissionOptions = {}
  ) {
    if (isIssuingInvoiceRef.current) {
      throw new Error("Ya hay una factura en emisión. Esperá a que termine.")
    }

    isIssuingInvoiceRef.current = true
    setIsIssuingInvoice(true)

    let issuedInvoice: Omit<GeneratedInvoice, "id">
    const invoiceKind = options.invoiceType ?? "C"

    try {
      if (isDemoActive) {
        const issuedInvoice = createDemoInvoiceFromPayment(
          {
            ...payment,
            client: options.clientName ?? payment.client,
            date: getTodayInputValue(),
          },
          invoices.length
        )

        if (invoiceKind === "E") {
          issuedInvoice.invoiceType = "Factura E"
          issuedInvoice.pointOfSale = 6
          issuedInvoice.number = `0006-${String(invoices.length + 1).padStart(8, "0")}`
        }

        setInvoices((current) => [issuedInvoice, ...current])
        setPayments((current) =>
          current.map((item) =>
            item.id === payment.id
              ? {
                  ...item,
                  invoiceStatus: "facturado",
                }
              : item
          )
        )
        return
      }

      try {
        const invoiceAmount = options.amount ?? payment.amount
        const arcaInvoice = await emitArcaInvoice({
          amount: invoiceAmount,
          paymentId: payment.id,
          currencyId: options.currencyId,
          exchangeRate: options.exchangeRate,
          clientCuit: options.clientCuit,
          clientName: options.clientName ?? payment.client,
          clientAddress: options.clientAddress,
          clientTaxId: options.clientTaxId,
          destinationCountryCode: options.destinationCountryCode,
          foreignClientCountryCode: options.foreignClientCountryCode,
          foreignClientTaxId: options.foreignClientTaxId,
          foreignClientName: options.foreignClientName,
          foreignClientAddress: options.foreignClientAddress,
          foreignClientPlatform: options.foreignClientPlatform,
          description: payment.description,
          invoiceType: invoiceKind,
          receiverIvaConditionId: options.receiverIvaConditionId,
        })

        issuedInvoice = {
          paymentId: payment.id,
          number: formatInvoiceNumber(
            arcaInvoice.invoice.pointOfSale,
            arcaInvoice.invoice.number
          ),
          invoiceType:
            arcaInvoice.invoice.invoiceType === "E" ? "Factura E" : "Factura C",
          pointOfSale: arcaInvoice.invoice.pointOfSale,
          issueDate: arcaInvoice.invoice.date ?? getTodayInputValue(),
          client:
            invoiceKind === "E"
              ? options.foreignClientName ?? options.clientName ?? payment.client
              : options.clientName ?? payment.client,
          description: arcaInvoice.invoice.description,
          amount: arcaInvoice.invoice.amount,
          currencyId: arcaInvoice.invoice.currencyId,
          exchangeRate: arcaInvoice.invoice.currencyRate,
          amountArs: arcaInvoice.invoice.amountArs,
          cae: arcaInvoice.cae,
          caeExpiresAt: arcaInvoice.caeExpiresAt,
          status: "issued",
        }
      } catch (error) {
        console.error(error)
        setDataStatus("error")
        throw error
      }

      if (shouldUseSupabase) {
        try {
          const [remotePayments, remoteInvoices] = await Promise.all([
            fetchPayments(),
            fetchInvoices(),
          ])

          setInvoices(remoteInvoices)
          setPayments(remotePayments)
          setDataStatus("connected")
          return
        } catch (error) {
          console.error(error)
          setDataStatus("error")
          throw new Error(
            error instanceof Error
              ? `ARCA emitió y guardó la factura ${issuedInvoice.number} con número de validación ARCA ${issuedInvoice.cae}, pero no pude refrescar la pantalla: ${error.message}`
              : `ARCA emitió y guardó la factura ${issuedInvoice.number} con número de validación ARCA ${issuedInvoice.cae}, pero no pude refrescar la pantalla.`
          )
        }
      }

      setInvoices((current) => [
        {
          ...issuedInvoice,
          id: crypto.randomUUID(),
        },
        ...current,
      ])
      setPayments((current) =>
        current.map((item) =>
          item.id === payment.id
            ? {
                ...item,
                invoiceStatus: "facturado",
              }
            : item
        )
      )
    } finally {
      isIssuingInvoiceRef.current = false
      setIsIssuingInvoice(false)
    }
  }

  function renderSection() {
    if (dataStatus === "loading") {
      return activeSection === "resumen" ? (
        <DashboardLoadingSkeleton />
      ) : (
        <SectionLoadingSpinner />
      )
    }

    switch (activeSection) {
      case "cobros":
        return (
          <PaymentsView
            category={category}
            onAddPayment={addPayment}
            onDeletePayment={removePayment}
            onUpdatePayment={editPayment}
            payments={payments}
          />
        )
      case "asistente":
        return (
          <AssistantPanel
            category={category}
            arcaEnvironment={arcaEnvironment}
            isDemo={isDemoActive}
            isIssuingInvoice={isIssuingInvoice}
            messages={assistantMessages}
            onAddMessage={addAssistantMessage}
            onClearMessages={clearChat}
            onGenerateInvoice={generateInvoice}
            onSaveProfile={saveFiscalProfile}
            payments={payments}
            profile={fiscalProfile}
          />
        )
      case "facturacion":
        return (
          <InvoicingPanel
            category={category}
            arcaEnvironment={arcaEnvironment}
            isDemo={isDemoActive}
            invoices={invoices}
            isIssuingInvoice={isIssuingInvoice}
            onGenerateInvoice={generateInvoice}
            payments={payments}
          />
        )
      case "proyecciones":
        return (
          <ProjectionsPanel
            allCategories={allCategories}
            category={category}
            onBack={() => setActiveSection("resumen")}
            payments={payments}
          />
        )
      case "clientes":
        return <AccountantClientsPanel />
      case "arca":
        return <ArcaConnectView />
      case "configuracion":
        return (
          <SettingsView
            arcaEnvironment={arcaEnvironment}
            arcaCuit={connectedArcaCuit}
            arcaStatus={isDemoActive ? "configured" : arcaCredentialsStatus}
            onOpenFiscalProfile={() => setActiveSection("asistente")}
            onReconnectArca={handleReconnectArca}
            onSignOut={() => void handleSignOut()}
            userEmail={userEmail}
          />
        )
      case "ayuda":
        return <HelpView userEmail={userEmail} userName={sidebarUser.name} />
      case "resumen":
        return (
          <DashboardView
            allCategories={allCategories}
            category={category}
            invoices={invoices}
            onMarkTaxDuePaid={markTaxDuePaid}
            onOpenSection={setActiveSection}
            onUnmarkTaxDuePaid={unmarkTaxDuePaid}
            onUnreadAlertsChange={setUnreadAlertCount}
            payments={payments}
            profile={fiscalProfile}
            taxDueActionMonthKey={taxDueActionMonthKey}
            taxPayments={taxPayments}
          />
        )
    }
  }

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando sesión...
      </div>
    )
  }

  if (authStatus === "anonymous") {
    return (
      <AuthScreen
        canUseEmailAuth={isSupabaseConfigured}
        onUseDemo={startDemoSession}
      />
    )
  }

  const userEmail = isDemoActive
    ? demoUser.email
    : (session?.user.email ?? "local@contable.app")
  const sidebarUser = isDemoActive
    ? demoUser
    : {
        name: userEmail.split("@")[0] || "Usuario",
        email: userEmail,
        avatar: "",
      }

  if (shouldUseSupabase && arcaCredentialsStatus === "missing") {
    return (
      <React.Suspense fallback={<LazySectionFallback />}>
        <ArcaOnboarding
          arcaEnvironment={arcaEnvironment}
          onComplete={(cuit) => {
            setStoredArcaCuit(cuit)
            setConnectedArcaCuit(cuit)
            arcaCredentialsStatusRef.current = "configured"
            arcaCredentialsUserKeyRef.current =
              session?.user.id ?? session?.user.email ?? "authenticated"
            setArcaCredentialsStatus("configured")
            setActiveSection("resumen")
          }}
          onDemoClick={startDemoSession}
          onSignOut={() => void handleSignOut()}
        />
      </React.Suspense>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeSection={activeSection}
        isDemo={isDemoActive}
        onSectionChange={setActiveSection}
        onSignOut={() => void handleSignOut()}
        unreadAlertCount={unreadAlertCount}
        user={sidebarUser}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader
          dataStatus={dataStatus}
          description={activeMeta.description}
          title={activeMeta.title}
        />
        <div className="flex flex-1 flex-col">
          <main className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <React.Suspense fallback={<LazySectionFallback />}>
              {renderSection()}
            </React.Suspense>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function LazySectionFallback() {
  return (
    <div
      aria-busy="true"
      className="min-h-[320px] animate-pulse rounded-lg bg-muted"
    />
  )
}

function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-busy="true">
      <div className="rounded-lg border bg-card p-6 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-6 w-28 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="min-w-36 rounded-lg border bg-background/70 p-3">
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="mt-3 ml-auto h-9 w-24" />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="rounded-lg border bg-card p-5 shadow-none"
            key={index}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border bg-card p-6 shadow-none">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function SectionLoadingSpinner() {
  return (
    <div
      className="flex min-h-[320px] items-center justify-center"
      aria-busy="true"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

function getSessionUserKey(session: Session | null) {
  return session?.user.id ?? session?.user.email ?? null
}

function formatInvoiceNumber(pointOfSale: number, number: number) {
  return `${String(pointOfSale).padStart(4, "0")}-${String(number).padStart(
    8,
    "0"
  )}`
}

function createLocalPayment(payment: Omit<IncomePayment, "id">): IncomePayment {
  return {
    ...payment,
    id: crypto.randomUUID(),
  }
}

function createLocalAssistantMessage(
  message: Pick<AssistantMessage, "content" | "role">
): AssistantMessage {
  return {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

function upsertLocalTaxPayment(
  taxPayments: TaxPayment[],
  nextTaxPayment: TaxPayment
) {
  const exists = taxPayments.some(
    (payment) => payment.monthKey === nextTaxPayment.monthKey
  )

  if (!exists) {
    return [nextTaxPayment, ...taxPayments]
  }

  return taxPayments.map((payment) =>
    payment.monthKey === nextTaxPayment.monthKey ? nextTaxPayment : payment
  )
}

function getStoredDemoSession() {
  if (typeof window === "undefined") {
    return false
  }

  return window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === "true"
}

function setStoredDemoSession(enabled: boolean) {
  if (typeof window === "undefined") {
    return
  }

  if (enabled) {
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, "true")
    return
  }

  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY)
}

function getStoredArcaCuit() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(ARCA_CUIT_STORAGE_KEY)
}

function setStoredArcaCuit(cuit: string | null) {
  if (typeof window === "undefined") {
    return
  }

  if (cuit) {
    window.localStorage.setItem(ARCA_CUIT_STORAGE_KEY, cuit)
    return
  }

  window.localStorage.removeItem(ARCA_CUIT_STORAGE_KEY)
}
