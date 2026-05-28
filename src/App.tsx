import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { AssistantPanel } from "@/components/accounting/assistant-panel"
import { AccountantClientsPanel } from "@/components/accounting/accountant-clients-panel"
import { AuthScreen } from "@/components/auth-screen"
import { ArcaConnectView } from "@/components/accounting/arca-connect-view"
import { ArcaOnboarding } from "@/components/accounting/arca-onboarding"
import { DashboardView } from "@/components/accounting/dashboard-view"
import { IncomeTracker } from "@/components/accounting/income-tracker"
import { InvoicingPanel } from "@/components/accounting/invoicing-panel"
import { ProjectionsPanel } from "@/components/accounting/projections-panel"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  currentTaxCategory,
  initialAssistantMessages,
  initialPayments,
} from "@/data/accounting"
import { getTodayInputValue } from "@/lib/accounting"
import { emitArcaInvoice } from "@/lib/arca-api"
import { fetchArcaCredentialsStatus } from "@/lib/arca-credentials-api"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import {
  createAssistantMessage,
  clearAssistantMessages,
  createInvoice,
  createPayment,
  deletePayment,
  emptyFiscalProfile,
  fetchAssistantMessages,
  fetchFiscalProfile,
  fetchInvoices,
  fetchPayments,
  fetchTaxCategory,
  fetchTaxPayments,
  markPaymentAsInvoiced,
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
type InvoiceEmissionOptions = {
  invoiceType?: InvoiceKind
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

const sectionMeta: Record<AppSection, { title: string; description: string }> =
  {
    resumen: {
      title: "Resumen",
      description: "Vista mensual y periodo fiscal",
    },
    cobros: {
      title: "Cobros",
      description: "Registro de ingresos y facturacion pendiente",
    },
    asistente: {
      title: "Conta",
      description: "Consultas sobre ingresos, limites y proyecciones",
    },
    facturacion: {
      title: "Facturacion",
      description: "Preparacion para ARCA y comprobantes",
    },
    proyecciones: {
      title: "Proyecciones",
      description: "Escenarios de categoria y periodo fiscal",
    },
    clientes: {
      title: "Clientes",
      description: "Panel multi-usuario para estudios contables",
    },
    arca: {
      title: "Conectar ARCA",
      description: "Autorizar a Conta sin compartir clave fiscal",
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
  const [taxPayments, setTaxPayments] = React.useState<TaxPayment[]>([])
  const [taxDueActionMonthKey, setTaxDueActionMonthKey] = React.useState<
    string | null
  >(null)
  const [isDemoSession, setIsDemoSession] = React.useState(getStoredDemoSession)
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
  const arcaCredentialsStatusRef = React.useRef<ArcaCredentialsStatus | null>(
    null
  )
  const arcaCredentialsUserKeyRef = React.useRef<string | null>(null)
  const [dataStatus, setDataStatus] = React.useState<DataStatus>("loading")
  const [unreadAlertCount, setUnreadAlertCount] = React.useState(0)
  const activeMeta = sectionMeta[activeSection]
  const isDemoActive = isDemoSession && authStatus === "authenticated"
  const shouldUseSupabase =
    isSupabaseConfigured && Boolean(session) && !isDemoActive

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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return
      }

      setSession(data.session)
      setAuthStatus(data.session ? "authenticated" : "anonymous")
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthStatus(session ? "authenticated" : "anonymous")
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

      const userKey = session?.user.id ?? session?.user.email ?? "authenticated"

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
        }
      } catch (error) {
        console.error(error)

        if (!cancelled) {
          arcaCredentialsUserKeyRef.current = userKey
          arcaCredentialsStatusRef.current = "error"
          setArcaCredentialsStatus("error")
        }
      }
    }

    void loadArcaCredentialsStatus()

    return () => {
      cancelled = true
    }
  }, [shouldUseSupabase, session?.user.email, session?.user.id])

  React.useEffect(() => {
    let cancelled = false

    async function loadSupabaseData() {
      if (isDemoActive) {
        setPayments(initialPayments)
        setInvoices([])
        setAssistantMessages(initialAssistantMessages)
        setFiscalProfile(emptyFiscalProfile)
        setTaxPayments([])
        setDataStatus("demo")
        return
      }

      if (!isSupabaseConfigured) {
        setDataStatus("local")
        return
      }

      if (!session || !shouldUseSupabase) {
        setPayments([])
        setInvoices([])
        setAssistantMessages([])
        setFiscalProfile(emptyFiscalProfile)
        setTaxPayments([])
        setDataStatus("loading")
        return
      }

      try {
        const [
          remotePayments,
          remoteInvoices,
          remoteCategory,
          remoteMessages,
          remoteFiscalProfile,
          remoteTaxPayments,
        ] = await Promise.all([
          fetchPayments(),
          fetchInvoices(),
          fetchTaxCategory(),
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
        setFiscalProfile(remoteFiscalProfile)
        setTaxPayments(remoteTaxPayments)
        setAssistantMessages(
          remoteMessages.length > 0 ? remoteMessages : initialAssistantMessages
        )
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
  }, [isDemoActive, session, shouldUseSupabase])

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
    setStoredDemoSession(true)
    setIsDemoSession(true)
    setSession(null)
    setAuthStatus("authenticated")
    setDataStatus("demo")
    setPayments(initialPayments)
    setInvoices([])
    setAssistantMessages(initialAssistantMessages)
    setFiscalProfile(emptyFiscalProfile)
    setTaxPayments([])
    setUnreadAlertCount(0)
    setActiveSection("resumen")
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
    let issuedInvoice: Omit<GeneratedInvoice, "id">
    const invoiceKind = options.invoiceType ?? "C"

    if (isDemoActive) {
      const issuedInvoice: GeneratedInvoice = {
        amount: payment.amount,
        cae: "DEMO",
        caeExpiresAt: getTodayInputValue(),
        client: options.clientName ?? payment.client,
        description: payment.description,
        id: crypto.randomUUID(),
        invoiceType: invoiceKind === "E" ? "Factura E" : "Factura C",
        issueDate: getTodayInputValue(),
        number: `DEMO-${String(invoices.length + 1).padStart(4, "0")}`,
        paymentId: payment.id,
        pointOfSale: 0,
        status: "issued",
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
      const arcaInvoice = await emitArcaInvoice({
        amount: payment.amount,
        currencyId: options.currencyId,
        exchangeRate: options.exchangeRate,
        clientCuit: options.clientCuit,
        clientName: options.clientName,
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
        client: payment.client,
        description: arcaInvoice.invoice.description,
        amount: arcaInvoice.invoice.amount,
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
        const savedInvoice = await createInvoice(issuedInvoice)
        const updatedPayment = await markPaymentAsInvoiced(payment.id)

        setInvoices((current) => [savedInvoice, ...current])
        setPayments((current) =>
          current.map((item) =>
            item.id === updatedPayment.id ? updatedPayment : item
          )
        )
        setDataStatus("connected")
        return
      } catch (error) {
        console.error(error)
        setDataStatus("error")
        throw new Error(
          error instanceof Error
            ? `ARCA emitio la factura ${issuedInvoice.number} con CAE ${issuedInvoice.cae}, pero no se pudo guardar en la app: ${error.message}`
            : `ARCA emitio la factura ${issuedInvoice.number} con CAE ${issuedInvoice.cae}, pero no se pudo guardar en la app.`
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
  }

  function renderSection() {
    switch (activeSection) {
      case "cobros":
        return (
          <IncomeTracker
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
            invoices={invoices}
            onGenerateInvoice={generateInvoice}
            payments={payments}
          />
        )
      case "proyecciones":
        return (
          <ProjectionsPanel
            category={category}
            onBack={() => setActiveSection("resumen")}
            payments={payments}
          />
        )
      case "clientes":
        return <AccountantClientsPanel />
      case "arca":
        return <ArcaConnectView />
      case "resumen":
        return (
          <DashboardView
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
        Cargando sesion...
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
    ? "demo@contable.app"
    : (session?.user.email ?? "local@contable.app")
  const sidebarUser = {
    name: userEmail.split("@")[0] || "Usuario",
    email: userEmail,
    avatar: "",
  }

  if (shouldUseSupabase && arcaCredentialsStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Verificando conexion con ARCA...
      </div>
    )
  }

  if (shouldUseSupabase && arcaCredentialsStatus === "missing") {
    return (
      <ArcaOnboarding
        onComplete={() => {
          arcaCredentialsStatusRef.current = "configured"
          arcaCredentialsUserKeyRef.current =
            session?.user.id ?? session?.user.email ?? "authenticated"
          setArcaCredentialsStatus("configured")
          setActiveSection("resumen")
        }}
        onSignOut={() => void handleSignOut()}
      />
    )
  }

  if (shouldUseSupabase && arcaCredentialsStatus === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border bg-card p-4 text-sm shadow-sm">
          <div className="font-medium">No se pudo verificar ARCA</div>
          <p className="mt-2 text-muted-foreground">
            Revisá que el backend esté encendido y tenga configurada la service
            role key de Supabase.
          </p>
          <Button className="mt-4" onClick={() => void handleSignOut()}>
            Salir
          </Button>
        </div>
      </div>
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
            {renderSection()}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
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
