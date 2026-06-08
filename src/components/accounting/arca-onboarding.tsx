import * as React from "react"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleHelpIcon,
  Clock3Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileKey2Icon,
  FileUpIcon,
  InfoIcon,
  Loader2Icon,
  MailIcon,
  MessageCircleIcon,
  MonitorIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { HelpView } from "@/components/help-view"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  generateArcaCsr,
  saveArcaCertificate,
} from "@/lib/arca-credentials-api"
import { useIsMobile } from "@/hooks/use-mobile"

type ArcaOnboardingProps = {
  arcaEnvironment: "homologacion" | "production" | "unknown"
  onComplete: (cuit: string) => void
  onDemoClick: () => void
  onSignOut: () => void
}

type OnboardingStep = 1 | 2 | 3

const stepperSteps: {
  number: OnboardingStep
  label: string
  where: string
}[] = [
  { number: 1, label: "Tu código", where: "Acá en la app" },
  { number: 2, label: "Trámite en ARCA", where: "En el sitio de ARCA" },
  { number: 3, label: "Guardar conexión", where: "Acá en la app" },
]

const arcaProductionLoginUrl =
  (import.meta.env.VITE_ARCA_ONBOARDING_URL_PROD as string | undefined) ??
  (import.meta.env.VITE_ARCA_ONBOARDING_URL as string | undefined) ??
  "https://auth.afip.gob.ar/contribuyente_/login.xhtml"
const arcaHomologacionLoginUrl =
  (import.meta.env.VITE_ARCA_ONBOARDING_URL_HOMO as string | undefined) ??
  "https://www.arca.gob.ar/"
const onboardingTutorialEmbedUrl =
  "https://www.youtube-nocookie.com/embed/uEnpdpVFYlQ?rel=0&modestbranding=1"
const onboardingTutorialWatchUrl = "https://youtu.be/uEnpdpVFYlQ"

export function ArcaOnboarding({
  arcaEnvironment,
  onComplete,
  onDemoClick,
  onSignOut,
}: ArcaOnboardingProps) {
  const isMobile = useIsMobile()
  const [isHelpOpen, setIsHelpOpen] = React.useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false)
  const [cuit, setCuit] = React.useState("")
  const [csr, setCsr] = React.useState("")
  const [certificate, setCertificate] = React.useState("")
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>(1)
  const [error, setError] = React.useState<string | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [wsfePointOfSale, setWsfePointOfSale] = React.useState("")
  const [wsfexPointOfSale, setWsfexPointOfSale] = React.useState("")
  const [hasExportInvoices, setHasExportInvoices] = React.useState(false)
  const [allowMobileOnboarding, setAllowMobileOnboarding] =
    React.useState(false)

  const isMobileViewport =
    typeof window !== "undefined" && window.innerWidth < 768
  const normalizedCuit = cuit.replace(/\D/g, "")
  const progressValue = ((currentStep - 1) / (stepperSteps.length - 1)) * 100
  const isHomologacionEnvironment = arcaEnvironment === "homologacion"
  const arcaLoginUrl = isHomologacionEnvironment
    ? arcaHomologacionLoginUrl
    : arcaProductionLoginUrl
  const arcaEnvironmentBadge =
    arcaEnvironment === "homologacion"
      ? "Homologación: prueba"
      : arcaEnvironment === "production"
        ? "Producción: factura real"
        : "Ambiente no verificado"
  const arcaOpenButtonLabel = isHomologacionEnvironment
    ? "Abrir portal ARCA normal"
    : "Abrir ARCA"
  const certificateTaskSource = isHomologacionEnvironment
    ? "WSASS - certificados de testing"
    : "Administración de Certificados Digitales"
  const serviceTaskSource = isHomologacionEnvironment
    ? "WSASS - autorizaciones de testing"
    : "Administrador de Relaciones"
  const pointOfSaleTaskSource = isHomologacionEnvironment
    ? "Puntos de venta de homologación"
    : "Administración de puntos de venta y domicilios"
  const certificateInstructions = isHomologacionEnvironment
    ? [
        "Entrá a arca.gob.ar con clave fiscal de persona física, no de empresa/persona jurídica.",
        "Si todavía no ves WSASS en Mis Servicios: Administrador de Relaciones → Adherir servicio → ARCA → Servicios interactivos → WSASS - Autogestión Certificados Homologación.",
        "Cerrá sesión y volvé a entrar. En Mis Servicios abrí WSASS - Autogestión Certificados Homologación.",
        "En WSASS, entrá a Nuevo Certificado o Agregar Certificado a Alias.",
        "En Alias escribí cualquier nombre, por ejemplo: conta-test.",
        "En Seleccionar Archivo elegí el archivo `.csr` de código que descargaste desde Conta.",
        "Confirmá la carga y descargá el certificado emitido para testing/homologación.",
        "Guardá ese archivo, lo vas a necesitar en el paso 3.",
      ]
    : [
        "Entrá a arca.gob.ar e iniciá sesión con tu CUIT y clave fiscal.",
        "Buscá y abrí Administración de Certificados Digitales.",
        "Hacé click en Agregar alias.",
        "En Alias escribí cualquier nombre, por ejemplo: conta-app.",
        "En Seleccionar Archivo elegí el archivo `.csr` de código que descargaste.",
        "Hacé click en Agregar Alias.",
        "En la lista de alias buscá tu alias y hacé click en Ver.",
        "Hacé click en Descargar. Guardá ese archivo, lo vas a necesitar en el paso 3.",
      ]
  const serviceInstructions = isHomologacionEnvironment
    ? [
        "En WSASS, entrá a Crear autorización a servicio.",
        "Seleccioná el alias/certificado de testing que creaste en el paso anterior.",
        "Autorizá el servicio wsfe para Factura C.",
        "Si también vas a emitir Factura E, autorizá el servicio wsfex con el mismo alias/certificado.",
        "Revisá que las autorizaciones queden activas dentro de WSASS antes de volver a Conta.",
      ]
    : [
        "Dentro de ARCA, buscá y abrí Administrador de Relaciones. Este paso autoriza Web Services, no crea puntos de venta.",
        "Hacé click en Incorporar nueva Relación.",
        "En la pantalla de Incorporar nueva Relación, revisá que Autorizante (Dador) y Representado sean tu CUIT.",
        "Para Facturación Electrónica común (WSFE), en Servicio presioná Buscar.",
        "Seleccioná ARCA → WebServices → Facturación Electrónica.",
        "Luego, en Representante, presioná Buscar.",
        "Seleccioná el alias/certificado que creaste en el paso anterior, por ejemplo conta-app.",
        "Confirmá la relación.",
        "Si también vas a emitir Factura E: Administrador de Relaciones → Incorporar nueva Relación → Buscar Servicio → ARCA → WebServices → Factura electronica de exportacion.",
        "Para Factura E, después buscá el Representante, seleccioná el mismo alias/certificado y confirmá la relación.",
      ]
  const pointOfSaleInstructions = isHomologacionEnvironment
    ? [
        "Para pruebas, no crees certificados ni autorizaciones desde el ARCA real de producción.",
        "Usá el punto de venta de homologación que quieras probar para WSFE. Si no tenés uno definido, empezá con 1.",
        "Para Factura E de prueba, usá el punto de venta de homologación para WSFEX. Si no tenés uno definido, empezá con 1.",
        "Si ARCA rechaza el punto de venta, consultá los puntos disponibles desde la pantalla de facturación o probá otro número de homologación.",
      ]
    : [
        "Dentro de ARCA, buscá Administración de puntos de venta y domicilios. Este paso es aparte de Administrador de Relaciones.",
        "Creá un punto de venta de tipo Factura Electrónica - Monotributo - Web Services. Anotá el número que te asigna.",
        "Si también emitís facturas al exterior: creá otro de tipo Comprobantes de Exportación - Web Services. Anotá ese número también.",
      ]
  const canSave =
    Boolean(certificate) &&
    Boolean(wsfePointOfSale) &&
    (!hasExportInvoices || Boolean(wsfexPointOfSale))

  if ((isMobile || isMobileViewport) && !allowMobileOnboarding) {
    return (
      <MobileArcaTransfer
        onContinueMobile={() => setAllowMobileOnboarding(true)}
        onDemoClick={onDemoClick}
      />
    )
  }

  async function handleGenerateCsr(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsGenerating(true)
    try {
      const response = await generateArcaCsr(normalizedCuit)
      setCsr(response.csr)
      setCurrentStep(2)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownloadCsr() {
    if (!csr) return
    const blob = new Blob([csr], { type: "application/pkcs10;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `conta-${normalizedCuit || "arca"}.csr`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
  }

  async function handleCertificateFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const [file] = Array.from(event.target.files ?? [])
    if (!file) return
    setError(null)
    setCertificate(await file.text())
  }

  async function handleSaveCertificate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await saveArcaCertificate({
        certificate,
        wsfe_pto_vta: Number(wsfePointOfSale),
        wsfex_pto_vta: hasExportInvoices ? Number(wsfexPointOfSale) : 0,
      })
      onComplete(normalizedCuit)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-svh bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">

        {/* ── Header ── */}
        <header className="overflow-hidden rounded-2xl border border-[#B5D4F4] bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:bg-[#0C447C]/35">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-[99px] border border-[#B5D4F4] bg-[#E6F1FB] px-3 py-1 text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#B5D4F4]/40 dark:bg-[#185FA5]/25 dark:text-[#E6F1FB]">
                  ARCA / AFIP
                </Badge>
                <Badge className="rounded-[99px] border border-[#8CD7C2] bg-[#E3F8F2] px-3 py-1 text-[#0F6B55] hover:bg-[#E3F8F2] dark:border-[#8CD7C2]/40 dark:bg-[#0F4C3F]/35 dark:text-[#D8FFF4]">
                  {arcaEnvironmentBadge}
                </Badge>
                <Badge className="rounded-[99px] border border-[#C0DD97] bg-[#EAF3DE] px-3 py-1 text-[#3B6D11] hover:bg-[#EAF3DE] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
                  Sin compartir clave fiscal
                </Badge>
                <Badge className="flex items-center gap-1 rounded-[99px] border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock3Icon className="size-3" />
                  ~20 minutos la primera vez
                </Badge>
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#0C447C] md:text-3xl dark:text-[#E6F1FB]">
                Conectá ARCA para emitir facturas
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#0C447C]/85 md:text-base dark:text-[#E6F1FB]/80">
                Son 3 pasos: generás un código acá, hacés el trámite en ARCA y
                volvés a guardar la conexión. Tu clave fiscal nunca sale de
                ARCA.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ThemeToggle />
              <Button
                className="border-[#B5D4F4] bg-background/80 text-[#0C447C] hover:bg-background dark:border-[#B5D4F4]/40 dark:bg-background/10 dark:text-[#E6F1FB] dark:hover:bg-background/20"
                onClick={() => setIsTutorialOpen(true)}
                type="button"
                variant="outline"
              >
                <PlayCircleIcon />
                Ver tutorial
              </Button>
              <Button
                className="bg-[#185FA5] text-white hover:bg-[#0C447C]"
                onClick={() => setIsHelpOpen(true)}
                type="button"
              >
                <CircleHelpIcon />
                Ayuda
              </Button>
              <Button
                className="border-[#B5D4F4] bg-background/80 text-[#0C447C] hover:bg-background dark:border-[#B5D4F4]/40 dark:bg-background/10 dark:text-[#E6F1FB] dark:hover:bg-background/20"
                onClick={onSignOut}
                type="button"
                variant="outline"
              >
                Salir
              </Button>
            </div>
          </div>

          {/* Progress bar dentro del header */}
          <div className="border-t border-[#B5D4F4]/60 px-5 py-3 dark:border-[#185FA5]/40">
            <div className="flex items-center justify-between text-xs text-[#0C447C]/70 dark:text-[#E6F1FB]/60 mb-1.5">
              <span>Paso {currentStep} de {stepperSteps.length} — {stepperSteps[currentStep - 1].label}</span>
              <span>{Math.round(progressValue === 0 ? 5 : progressValue)}%</span>
            </div>
            <Progress
              className="h-1.5 bg-[#B5D4F4]/40 dark:bg-[#185FA5]/20 [&>div]:bg-[#185FA5]"
              value={progressValue === 0 ? 5 : progressValue}
            />
          </div>
        </header>

        {/* ── Help sheet ── */}
        <Sheet onOpenChange={setIsHelpOpen} open={isHelpOpen}>
          <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:!max-w-xl md:!max-w-2xl">
            <SheetHeader className="border-b px-6 py-5 pr-14">
              <SheetTitle>Ayuda con el onboarding ARCA</SheetTitle>
              <SheetDescription>
                Contanos en qué paso te trabaste y te respondemos a la brevedad.
              </SheetDescription>
            </SheetHeader>
            <div className="px-6 py-5">
              <HelpView context="onboarding" layout="stacked" />
            </div>
          </SheetContent>
        </Sheet>

        <TutorialVideoDialog
          onOpenChange={setIsTutorialOpen}
          open={isTutorialOpen}
        />

        {/* ── Stepper ── */}
        <Stepper currentStep={currentStep} />

        {/* ── Error ── */}
        {error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="space-y-5">

            {/* ── PASO 1: Generar código ── */}
            <StepCard
              currentStep={currentStep}
              description="Ingresá tu CUIT y la app genera un código de autorización único. No necesitás entrar a ARCA todavía."
              step={1}
              title="Generá el código de autorización"
            >
              <form className="grid gap-4" onSubmit={handleGenerateCsr}>
                <div className="grid gap-2">
                  <Label htmlFor="arca-cuit">Tu CUIT</Label>
                  <Input
                    className="h-11 text-base"
                    id="arca-cuit"
                    inputMode="numeric"
                    maxLength={13}
                    onChange={(event) => setCuit(event.target.value)}
                    placeholder="20-12345678-9"
                    value={cuit}
                  />
                  <p className="text-sm text-muted-foreground">
                    Con o sin guiones, da igual.
                  </p>
                </div>
                <Button
                  className="w-fit bg-[#185FA5] text-white hover:bg-[#0C447C] disabled:opacity-50"
                  disabled={normalizedCuit.length !== 11 || isGenerating}
                  type="submit"
                >
                  {isGenerating ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <FileKey2Icon />
                  )}
                  {isGenerating ? "Generando..." : "Generar código"}
                </Button>
              </form>
            </StepCard>

            {/* ── PASO 2: Todo en ARCA ── */}
            <StepCard
              currentStep={currentStep}
              description={
                isHomologacionEnvironment
                  ? "Abrí ARCA en otra pestaña, entrá a WSASS y completá estas 3 cosas. Dejá esta pantalla abierta, vas a volver a ella."
                  : "Abrí ARCA en otra pestaña y completá estas 3 cosas. Dejá esta pantalla abierta, vas a volver a ella."
              }
              step={2}
              title={
                isHomologacionEnvironment
                  ? "Hacé el trámite en homologación"
                  : "Hacé el trámite en ARCA"
              }
            >
              <div className="space-y-5">
                {/* Código */}
                <div className="grid gap-3 rounded-xl border-[0.5px] bg-secondary/40 p-4 dark:bg-secondary/20">
                  <Label htmlFor="arca-csr">
                    Tu código de autorización — copialo o descargalo antes de
                    ir a ARCA
                  </Label>
                  <Textarea
                    className="min-h-36 resize-none bg-background font-mono text-xs leading-5 dark:bg-background/70"
                    id="arca-csr"
                    placeholder="Se genera en el paso 1."
                    readOnly
                    value={csr}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-[#185FA5] text-white hover:bg-[#0C447C] hover:text-amber-50 disabled:opacity-50  dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                      disabled={!csr}
                      onClick={handleDownloadCsr}
                      type="button"
                      variant="outline"
                    >
                      <FileKey2Icon />
                      Descargar archivo
                    </Button>
                    <Button
                      asChild
                      className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                      variant="outline"
                    >
                      <a href={arcaLoginUrl} rel="noreferrer" target="_blank">
                        <ExternalLinkIcon />
                        {arcaOpenButtonLabel}
                      </a>
                    </Button>
                  </div>
                </div>

                {isHomologacionEnvironment ? (
                  <Alert className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100 [&>svg]:text-sky-700 dark:[&>svg]:text-sky-300">
                    <InfoIcon className="size-4" />
                  <AlertDescription>
                      Estás en homologación. Entrás por el portal normal de
                      ARCA, pero el certificado de prueba se genera en WSASS.
                      Es esperable que el botón abra la landing normal de ARCA.
                      No uses Administración de Certificados Digitales para
                      este certificado.
                  </AlertDescription>
                </Alert>
                ) : null}

                <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                  <AlertTriangleIcon className="size-4" />
                  <AlertDescription>
                    Dejá esta pantalla abierta mientras trabajás en ARCA. El
                    código es válido por 45 minutos. Si el portal bloquea el
                    acceso desde el botón, entrá manualmente al sitio
                    correspondiente al ambiente indicado arriba.
                  </AlertDescription>
                </Alert>

                {/* Las 3 tareas en ARCA con Accordion */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {isHomologacionEnvironment
                      ? "Dentro de homologación hacé estas 3 cosas, en orden:"
                      : "Dentro de ARCA hacé estas 3 cosas, en orden:"}
                  </p>

                  <Accordion
                    className="space-y-2"
                    defaultValue="task-1"
                    type="single"
                    collapsible
                  >
                    <AccordionItem
                      className="overflow-hidden rounded-xl border border-[#B5D4F4] dark:border-[#185FA5]/60"
                      value="task-1"
                    >
                      <AccordionTrigger className="bg-[#E6F1FB] px-4 hover:bg-[#dcedf9] hover:no-underline dark:bg-[#0C447C]/35 dark:hover:bg-[#0C447C]/50 [&>svg]:text-[#0C447C] dark:[&>svg]:text-[#E6F1FB]">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
                            1
                          </span>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-[#0C447C] dark:text-[#E6F1FB]">
                              Subí el código y descargá el certificado
                            </div>
                            <div className="text-xs text-[#0C447C]/65 dark:text-[#E6F1FB]/65">
                              {certificateTaskSource}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="h-auto bg-card px-4 pb-4 pt-3">
                        <InstructionList items={certificateInstructions} />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      className="overflow-hidden rounded-xl border border-[#B5D4F4] dark:border-[#185FA5]/60"
                      value="task-2"
                    >
                      <AccordionTrigger className="bg-[#E6F1FB] px-4 hover:bg-[#dcedf9] hover:no-underline dark:bg-[#0C447C]/35 dark:hover:bg-[#0C447C]/50 [&>svg]:text-[#0C447C] dark:[&>svg]:text-[#E6F1FB]">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
                            2
                          </span>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-[#0C447C] dark:text-[#E6F1FB]">
                              Autorizá los servicios de facturación
                            </div>
                            <div className="text-xs text-[#0C447C]/65 dark:text-[#E6F1FB]/65">
                              {serviceTaskSource}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="h-auto space-y-3 bg-card px-4 pb-4 pt-3">
                        <InstructionList items={serviceInstructions} />
                        <Alert className="border-[#B5D4F4] bg-[#E6F1FB] text-[#0C447C] dark:border-[#185FA5]/60 dark:bg-[#0C447C]/30 dark:text-[#E6F1FB] [&>svg]:text-[#185FA5] dark:[&>svg]:text-[#B5D4F4]">
                          <InfoIcon className="size-4" />
                          <AlertDescription className="space-y-2 text-xs">
                            <p>
                              {isHomologacionEnvironment
                                ? "En homologación, WSASS concentra la creación del certificado de prueba y la autorización a servicios."
                                : "El Representante no es otra persona: es el certificado/alias que creaste para que Contable pueda operar por Web Services."}
                            </p>
                            <p>
                             ARCA suele bloquear links externos o profundos.
                             Por eso estas instrucciones usan los nombres que
                              tenés que buscar dentro del sitio.
                            </p>
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      className="overflow-hidden rounded-xl border border-[#B5D4F4] dark:border-[#185FA5]/60"
                      value="task-3"
                    >
                      <AccordionTrigger className="bg-[#E6F1FB] px-4 hover:bg-[#dcedf9] hover:no-underline dark:bg-[#0C447C]/35 dark:hover:bg-[#0C447C]/50 [&>svg]:text-[#0C447C] dark:[&>svg]:text-[#E6F1FB]">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
                            3
                          </span>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-[#0C447C] dark:text-[#E6F1FB]">
                              Creá y anotá los puntos de venta
                            </div>
                            <div className="text-xs text-[#0C447C]/65 dark:text-[#E6F1FB]/65">
                              {pointOfSaleTaskSource}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="h-auto space-y-3 bg-card px-4 pb-4 pt-3">
                        <InstructionList items={pointOfSaleInstructions} />
                        <Alert className="border-[#B5D4F4] bg-[#E6F1FB] text-[#0C447C] dark:border-[#185FA5]/60 dark:bg-[#0C447C]/30 dark:text-[#E6F1FB] [&>svg]:text-[#185FA5] dark:[&>svg]:text-[#B5D4F4]">
                          <InfoIcon className="size-4" />
                          <AlertDescription className="text-xs">
                            <strong>¿Qué es un punto de venta?</strong> Es el
                            número antes del guión en tus facturas (ej:{" "}
                            <span className="font-mono">0001</span>-00000001).
                            ARCA te asigna uno cuando lo creás.
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <Button
                  className="w-fit bg-[#639922] text-white hover:bg-[#4F7D19] disabled:opacity-50"
                  disabled={!csr}
                  onClick={() => setCurrentStep(3)}
                  type="button"
                >
                  Ya hice todo en ARCA
                  <ArrowRightIcon />
                </Button>
              </div>
            </StepCard>

            {/* ── PASO 3: Guardar conexión ── */}
            <StepCard
              currentStep={currentStep}
              description="Subí el archivo que descargaste de ARCA e ingresá los números de punto de venta que anotaste."
              step={3}
              title="Guardá la conexión"
            >
              <form className="grid gap-5" onSubmit={handleSaveCertificate}>
                <div className="grid gap-2">
                  <Label htmlFor="arca-certificate">
                    Archivo de certificado (el que descargaste de ARCA)
                  </Label>
                  <Input
                    accept=".crt,.cer,.pem"
                    className="h-11"
                    id="arca-certificate"
                    onChange={handleCertificateFile}
                    type="file"
                  />
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileUpIcon className="size-4 shrink-0 text-[#185FA5] dark:text-[#B5D4F4]" />
                    Suele llamarse algo como{" "}
                    <span className="font-mono text-xs">conta-app.crt</span>.
                  </p>
                  {certificate ? (
                    <Alert className="border-[#C0DD97] bg-[#EAF3DE] text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE] [&>svg]:text-[#639922]">
                      <CheckCircle2Icon className="size-4" />
                      <AlertDescription className="font-medium">
                        Archivo cargado correctamente.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="arca-wsfe-pos">
                    Número de punto de venta para Factura C
                  </Label>
                  <Input
                    className="h-11 max-w-48 text-base"
                    id="arca-wsfe-pos"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) =>
                      setWsfePointOfSale(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Ej: 5"
                    type="number"
                    value={wsfePointOfSale}
                  />
                  <p className="text-xs text-muted-foreground">
                    El que anotaste al crear el punto de venta tipo "Factura
                    Electrónica - Monotributo".
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={hasExportInvoices}
                      className="mt-0.5"
                      onCheckedChange={(checked) =>
                        setHasExportInvoices(checked === true)
                      }
                    />
                    <div>
                      <div className="text-sm font-medium leading-snug">
                        También emito facturas al exterior (Factura E)
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Solo si cobrás de clientes de otros países. Podés
                        configurarlo después si no estás seguro.
                      </div>
                    </div>
                  </label>
                  {hasExportInvoices ? (
                    <div className="mt-4 grid gap-2">
                      <Label htmlFor="arca-wsfex-pos">
                        Número de punto de venta para Factura E
                      </Label>
                      <Input
                        className="h-11 max-w-48 text-base"
                        id="arca-wsfex-pos"
                        inputMode="numeric"
                        min={1}
                        onChange={(event) =>
                          setWsfexPointOfSale(
                            event.target.value.replace(/\D/g, "")
                          )
                        }
                        placeholder="Ej: 6"
                        type="number"
                        value={wsfexPointOfSale}
                      />
                    </div>
                  ) : null}
                </div>

                <Button
                  className="w-fit bg-[#639922] text-white hover:bg-[#4F7D19] disabled:opacity-50"
                  disabled={!canSave || isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <ShieldCheckIcon />
                  )}
                  {isSaving ? "Guardando..." : "Guardar y empezar a facturar"}
                </Button>
              </form>
            </StepCard>

            <Alert className="border-[#C0DD97] bg-[#EAF3DE] text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE] [&>svg]:text-[#639922]">
              <ShieldCheckIcon className="size-4" />
              <AlertDescription>
                <strong>Tu clave fiscal no se guarda nunca.</strong> La app solo
                guarda la conexión técnica para facturar. Tu clave fiscal queda
                siempre dentro de ARCA.
              </AlertDescription>
            </Alert>
          </section>

          {/* ── Sidebar ── */}
          <aside className="space-y-4 lg:sticky lg:top-5">
            <Card className="overflow-hidden rounded-xl border-[0.5px] shadow-none pt-0">
              <CardHeader className="bg-[#E6F1FB] text-[#0C447C] dark:bg-[#0C447C]/35 dark:text-[#E6F1FB]">
                <CardTitle className="text-base">Tu avance</CardTitle>
                <CardDescription className="text-[#0C447C]/75 dark:text-[#E6F1FB]/75">
                  3 pasos en total.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {stepperSteps.map((step) => {
                  const isComplete = step.number < currentStep
                  const isActive = step.number === currentStep
                  return (
                    <div
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                        isActive
                          ? "border-[#B5D4F4] bg-[#E6F1FB] text-[#0C447C] dark:border-[#185FA5]/60 dark:bg-[#185FA5]/20 dark:text-[#E6F1FB]"
                          : isComplete
                            ? "border-[#C0DD97] bg-[#EAF3DE] text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/30 dark:text-[#EAF3DE]"
                            : "border-border bg-card text-muted-foreground"
                      }`}
                      key={step.number}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isComplete
                            ? "bg-[#639922] text-white"
                            : isActive
                              ? "bg-[#185FA5] text-white"
                              : "border bg-background text-muted-foreground"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2Icon className="size-4" />
                        ) : (
                          step.number
                        )}
                      </span>
                      <div>
                        <div className="font-medium">{step.label}</div>
                        <div className="text-xs opacity-75">{step.where}</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-xl border-[#B5D4F4] shadow-none dark:border-[#185FA5]/60 pt-0">
              <CardHeader className="bg-[#E6F1FB] pb-3 dark:bg-[#0C447C]/35">
                <CardTitle className="text-base text-[#0C447C] dark:text-[#E6F1FB]">
                  Video tutorial
                </CardTitle>
                <CardDescription className="text-[#0C447C]/75 dark:text-[#E6F1FB]/75">
                  Mirá el recorrido completo antes de entrar a ARCA.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button
                  className="w-full border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                  onClick={() => setIsTutorialOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <PlayCircleIcon />
                  Ver tutorial
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
              <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                <Clock3Icon className="size-4" />
                ¿Cuánto tarda?
              </div>
              <ul className="space-y-1.5 text-xs text-amber-700 dark:text-amber-400">
                <li className="flex justify-between">
                  <span>Paso 1 — Generar código</span>
                  <span className="font-medium">~1 min</span>
                </li>
                <li className="flex justify-between">
                  <span>Paso 2 — Trámite en ARCA</span>
                  <span className="font-medium">~18 min</span>
                </li>
                <li className="flex justify-between">
                  <span>Paso 3 — Guardar conexión</span>
                  <span className="font-medium">~1 min</span>
                </li>
              </ul>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                El código es válido por 4 horas, no hay apuro.
              </p>
            </div>

            <Card className="overflow-hidden rounded-xl border-[#B5D4F4] shadow-none dark:border-[#185FA5]/60 pt-0">
              <CardHeader className="bg-[#E6F1FB] pb-3 dark:bg-[#0C447C]/35">
                <CardTitle className="text-base text-[#0C447C] dark:text-[#E6F1FB]">
                  ¿Te trabaste?
                </CardTitle>
                <CardDescription className="text-[#0C447C]/75 dark:text-[#E6F1FB]/75">
                  Escribinos y te guiamos paso a paso.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button
                  className="w-full bg-[#185FA5] text-white hover:bg-[#0C447C]"
                  onClick={() => setIsHelpOpen(true)}
                  type="button"
                >
                  <CircleHelpIcon />
                  Pedir ayuda
                </Button>
              </CardContent>
            </Card>

            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
              <AlertTriangleIcon className="size-4" />
              <AlertDescription className="text-xs">
                Abrí ARCA en una pestaña nueva y dejá esta app abierta. Cuando
                termines en ARCA volvés acá para el paso 3.
              </AlertDescription>
            </Alert>
          </aside>
        </div>
      </div>
    </main>
  )
}

function MobileArcaTransfer({
  onContinueMobile,
  onDemoClick,
}: {
  onContinueMobile: () => void
  onDemoClick: () => void
}) {
  const [copied, setCopied] = React.useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false)

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.origin + "/app")
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleEmailLink() {
    const url = window.location.origin + "/app"
    const subject = encodeURIComponent("Conectar ARCA — contable.")
    const body = encodeURIComponent(`Seguí desde acá: ${url}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  function handleWhatsAppLink() {
    const url = window.location.origin + "/app"
    const text = encodeURIComponent(`Seguí desde acá: ${url}`)
    window.location.href = `https://wa.me/?text=${text}`
  }

  return (
    <>
      <main className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md rounded-xl border-[#B5D4F4] shadow-none dark:border-[#185FA5]/60">
          <CardHeader className="items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#E6F1FB] text-[#185FA5] dark:bg-[#0C447C]/35 dark:text-[#B5D4F4]">
              <MonitorIcon className="size-7" />
            </div>
            <div>
              <CardTitle className="text-xl text-[#0C447C] dark:text-[#E6F1FB]">
                Conectá ARCA desde tu computadora
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                Este proceso requiere descargar certificados y navegar ARCA. Es
                muy difícil desde el celular — guardá el link y seguí desde tu
                compu.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              className="bg-[#185FA5] text-white hover:bg-[#0C447C]"
              onClick={() => setIsTutorialOpen(true)}
              type="button"
            >
              <PlayCircleIcon />
              Ver tutorial
            </Button>
            <Button
              className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
              onClick={() => void handleCopyLink()}
              type="button"
              variant="outline"
            >
              <CopyIcon />
              {copied ? "Copiado ✓" : "Copiar link"}
            </Button>
            <Button
              className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
              onClick={handleEmailLink}
              type="button"
              variant="outline"
            >
              <MailIcon />
              Enviar por email
            </Button>
            <Button
              className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
              onClick={handleWhatsAppLink}
              type="button"
              variant="outline"
            >
              <MessageCircleIcon />
              Enviar por WhatsApp
            </Button>
            <Button
              className="border-[#C0DD97] bg-[#EAF3DE] text-[#27500A] hover:bg-[#dcebc9] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE] dark:hover:bg-[#27500A]/50"
              onClick={onDemoClick}
              type="button"
              variant="outline"
            >
              <PlayCircleIcon />
              Probar demo sin conectar ARCA
            </Button>
            <Button
              className="border-[#B5D4F4] text-muted-foreground hover:bg-[#E6F1FB] hover:text-[#0C447C] dark:border-[#185FA5]/60 dark:hover:bg-[#185FA5]/20 dark:hover:text-[#E6F1FB]"
              onClick={onContinueMobile}
              type="button"
              variant="outline"
            >
              <ArrowRightIcon />
              Prefiero hacerlo desde mi celular
            </Button>
          </CardContent>
        </Card>
      </main>
      <TutorialVideoDialog
        onOpenChange={setIsTutorialOpen}
        open={isTutorialOpen}
      />
    </>
  )
}

function TutorialVideoDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pr-12">
          <DialogTitle>Tutorial de conexión ARCA</DialogTitle>
          <DialogDescription>
            Video guía para completar el onboarding paso a paso.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="size-full border-0"
              referrerPolicy="strict-origin-when-cross-origin"
              src={onboardingTutorialEmbedUrl}
              title="Tutorial de conexión ARCA"
            />
          </div>
          <Button
            asChild
            className="mt-3 border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
            variant="outline"
          >
            <a
              href={onboardingTutorialWatchUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon />
              Abrir en YouTube
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ currentStep }: { currentStep: OnboardingStep }) {
  return (
    <div className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
      {stepperSteps.map((step, index) => {
        const isActive = step.number === currentStep
        const isComplete = step.number < currentStep
        const isLast = index === stepperSteps.length - 1

        return (
          <div
            className={`flex min-h-16 items-center gap-2 border-b px-3 py-3 text-sm sm:border-b-0 ${
              isLast ? "" : "sm:border-r"
            } ${
              isActive
                ? "bg-[#185FA5] text-white"
                : isComplete
                  ? "bg-[#EAF3DE] text-[#27500A] dark:bg-[#27500A]/35 dark:text-[#EAF3DE]"
                  : "bg-card text-muted-foreground"
            }`}
            key={step.number}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isComplete
                  ? "bg-[#639922] text-white"
                  : isActive
                    ? "bg-white/15 text-white"
                    : "border bg-background text-muted-foreground"
              }`}
            >
              {isComplete ? (
                <CheckCircle2Icon className="size-4" />
              ) : (
                step.number
              )}
            </span>
            <div>
              <div className="font-medium leading-tight">{step.label}</div>
              <div
                className={`text-xs leading-tight ${isActive ? "text-white/75" : "opacity-60"}`}
              >
                {step.where}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepCard({
  children,
  currentStep,
  description,
  step,
  title,
}: {
  children: React.ReactNode
  currentStep: OnboardingStep
  description: string
  step: OnboardingStep
  title: string
}) {
  return (
    <Card className="rounded-xl border-[0.5px] shadow-none">
      <CardHeader className="gap-3 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-xl">
            {step}. {title}
          </CardTitle>
          <CardDescription className="mt-1 text-sm leading-6">
            {description}
          </CardDescription>
        </div>
        <StatusBadge currentStep={currentStep} step={step} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function StatusBadge({
  currentStep,
  step,
}: {
  currentStep: OnboardingStep
  step: OnboardingStep
}) {
  if (step < currentStep) {
    return (
      <Badge className="w-fit rounded-[99px] border border-[#C0DD97] bg-[#EAF3DE] text-[#27500A] hover:bg-[#EAF3DE] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
        Listo ✓
      </Badge>
    )
  }
  if (step === currentStep) {
    return (
      <Badge className="w-fit rounded-[99px] bg-[#185FA5] text-white hover:bg-[#185FA5]">
        Ahora
      </Badge>
    )
  }
  return (
    <Badge className="w-fit rounded-[99px] border bg-card text-muted-foreground hover:bg-card">
      Pendiente
    </Badge>
  )
}

function InstructionList({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div className="flex gap-3 text-sm leading-6" key={index}>
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#185FA5] px-2 text-xs font-semibold tabular-nums text-white">
            {index + 1}
          </span>
          <p className="text-foreground">
            {typeof item === "string" ? highlightArcaTerms(item) : item}
          </p>
        </div>
      ))}
    </div>
  )
}

const copyableServiceNames = new Set([
  "Administración de Certificados Digitales",
  "Administrador de Relaciones",
  "Incorporar nueva Relación",
  "Administración de puntos de venta y domicilios",
  "Facturación Electrónica - Monotributo - Web Services",
  "Comprobantes de Exportación - Web Services",
  "Factura electronica de exportacion",
])

function CopyableServiceName({ name }: { name: string }) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(name)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <strong className="font-semibold text-[#0C447C] dark:text-[#B5D4F4]">{name}</strong>
      <button
        className="hidden sm:inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs text-[#185FA5] hover:bg-[#E6F1FB] dark:text-[#B5D4F4] dark:hover:bg-[#185FA5]/20"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <CheckCircle2Icon className="size-3" /> : <CopyIcon className="size-3" />}
        {copied ? "Copiado" : "Copiar nombre"}
      </button>
    </span>
  )
}

function highlightArcaTerms(text: string) {
  const terms = [
    "Administración de Certificados Digitales",
    "Administrador de Relaciones",
    "Incorporar nueva Relación",
    "Autorizante (Dador)",
    "Representado",
    "Representante",
    "Servicio",
    "Buscar",
    "Factura electronica de exportacion",
    "Facturación Electrónica - Monotributo - Web Services",
    "Comprobantes de Exportación - Web Services",
    "Facturación Electrónica",
    "Web Services",
    "Administración de puntos de venta y domicilios",
    "Agregar Alias",
    "Agregar alias",
    "Seleccionar Archivo",
    "Descargar",
    "Alias",
    "Ver",
  ]
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g")
  const parts = text.split(pattern)

  return parts.map((part, index) =>
    terms.includes(part) ? (
      copyableServiceNames.has(part) ? (
        <CopyableServiceName key={`${part}-${index}`} name={part} />
      ) : (
        <strong
          className="font-semibold text-[#0C447C] dark:text-[#B5D4F4]"
          key={`${part}-${index}`}
        >
          {part}
        </strong>
      )
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado. Intentá de nuevo o pedí ayuda desde el botón de arriba."
}
