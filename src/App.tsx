import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { AssistantPanel } from "@/components/accounting/assistant-panel"
import { AccountantClientsPanel } from "@/components/accounting/accountant-clients-panel"
import { AuthScreen } from "@/components/auth-screen"
import { ArcaConnectView } from "@/components/accounting/arca-connect-view"
import { DashboardView } from "@/components/accounting/dashboard-view"
import { IncomeTracker } from "@/components/accounting/income-tracker"
import { InvoicingPanel } from "@/components/accounting/invoicing-panel"
import { ProjectionsPanel } from "@/components/accounting/projections-panel"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  currentTaxCategory,
  initialAssistantMessages,
  initialPayments,
} from "@/data/accounting"
import { getTodayInputValue } from "@/lib/accounting"
import { emitArcaInvoice } from "@/lib/arca-api"
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
  markPaymentAsInvoiced,
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
  UserFiscalProfile,
} from "@/types/accounting"

type DataStatus = "loading" | "connected" | "local" | "error"
type AuthStatus = "loading" | "authenticated" | "anonymous"
type InvoiceEmissionOptions = {
  invoiceType?: InvoiceKind
  clientCuit?: string
  clientName?: string
  clientAddress?: string
  clientTaxId?: string
  destinationCountryCode?: number
  receiverIvaConditionId?: number
}

const sectionMeta: Record<AppSection, { title: string; description: string }> =
  {
    resumen: {
      title: "Resumen",
      description: "Vista mensual y categoria fiscal",
    },
    cobros: {
      title: "Cobros",
      description: "Registro de ingresos y facturacion pendiente",
    },
    asistente: {
      title: "Asistente IA",
      description: "Consultas sobre ingresos, limites y proyecciones",
    },
    facturacion: {
      title: "Facturacion",
      description: "Preparacion para ARCA y comprobantes",
    },
    proyecciones: {
      title: "Proyecciones",
      description: "Escenarios de categoria y limite anual",
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
  const [session, setSession] = React.useState<Session | null>(null)
  const [authStatus, setAuthStatus] = React.useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "authenticated"
  )
  const [dataStatus, setDataStatus] = React.useState<DataStatus>(
    isSupabaseConfigured ? "loading" : "local"
  )
  const activeMeta = sectionMeta[activeSection]

  React.useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

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
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function loadSupabaseData() {
      if (!isSupabaseConfigured) {
        setDataStatus("local")
        return
      }

      if (!session) {
        setPayments([])
        setInvoices([])
        setAssistantMessages([])
        setFiscalProfile(emptyFiscalProfile)
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
        ] = await Promise.all([
          fetchPayments(),
          fetchInvoices(),
          fetchTaxCategory(),
          fetchAssistantMessages(),
          fetchFiscalProfile(),
        ])

        if (cancelled) {
          return
        }

        setPayments(remotePayments)
        setInvoices(remoteInvoices)
        setCategory(remoteCategory)
        setFiscalProfile(remoteFiscalProfile)
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
  }, [session])

  async function handleSignOut() {
    await signOut()
    setPayments([])
    setInvoices([])
    setAssistantMessages([])
    setFiscalProfile(emptyFiscalProfile)
    setActiveSection("resumen")
  }

  async function addPayment(payment: Omit<IncomePayment, "id">) {
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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

  async function generateInvoice(
    payment: IncomePayment,
    options: InvoiceEmissionOptions = {}
  ) {
    let issuedInvoice: Omit<GeneratedInvoice, "id">
    const invoiceKind = options.invoiceType ?? "C"

    try {
      const arcaInvoice = await emitArcaInvoice({
        amount: payment.amount,
        clientCuit: options.clientCuit,
        clientName: options.clientName,
        clientAddress: options.clientAddress,
        clientTaxId: options.clientTaxId,
        destinationCountryCode: options.destinationCountryCode,
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

    if (isSupabaseConfigured) {
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
            onOpenSection={setActiveSection}
            payments={payments}
            profile={fiscalProfile}
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

  if (isSupabaseConfigured && authStatus === "anonymous") {
    return <AuthScreen />
  }

  const userEmail = session?.user.email ?? "local@contable.app"
  const sidebarUser = {
    name: userEmail.split("@")[0] || "Usuario",
    email: userEmail,
    avatar: "",
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
