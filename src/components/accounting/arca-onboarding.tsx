import * as React from "react"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleHelpIcon,
  Clock3Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileKey2Icon,
  FileUpIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react"

import { HelpView } from "@/components/help-view"
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

type ArcaOnboardingProps = {
  onComplete: (cuit: string) => void
  onSignOut: () => void
}

type OnboardingStep = 1 | 2 | 3

const arcaUrl = "https://arca.gob.ar"

const stepperSteps: {
  number: OnboardingStep
  label: string
  where: string
}[] = [
  { number: 1, label: "Tu código", where: "Acá en la app" },
  { number: 2, label: "Trámite en ARCA", where: "En el sitio de ARCA" },
  { number: 3, label: "Guardar conexión", where: "Acá en la app" },
]

export function ArcaOnboarding({
  onComplete,
  onSignOut,
}: ArcaOnboardingProps) {
  const [isHelpOpen, setIsHelpOpen] = React.useState(false)
  const [cuit, setCuit] = React.useState("")
  const [csr, setCsr] = React.useState("")
  const [certificate, setCertificate] = React.useState("")
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>(1)
  const [error, setError] = React.useState<string | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [wsfePointOfSale, setWsfePointOfSale] = React.useState("")
  const [wsfexPointOfSale, setWsfexPointOfSale] = React.useState("")
  const [hasExportInvoices, setHasExportInvoices] = React.useState(false)

  const normalizedCuit = cuit.replace(/\D/g, "")
  const canSave =
    Boolean(certificate) &&
    Boolean(wsfePointOfSale) &&
    (!hasExportInvoices || Boolean(wsfexPointOfSale))

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

  async function handleCopyCsr() {
    await navigator.clipboard.writeText(csr)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
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
        {/* Header */}
        <header className="overflow-hidden rounded-2xl border border-[#B5D4F4] bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:bg-[#0C447C]/35">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-[99px] border border-[#B5D4F4] bg-[#E6F1FB] px-3 py-1 text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#B5D4F4]/40 dark:bg-[#185FA5]/25 dark:text-[#E6F1FB]">
                  ARCA / AFIP
                </Badge>
                <Badge className="rounded-[99px] border border-[#C0DD97] bg-[#EAF3DE] px-3 py-1 text-[#3B6D11] hover:bg-[#EAF3DE] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
                  Sin compartir clave fiscal
                </Badge>
                <Badge className="flex items-center gap-1 rounded-[99px] border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock3Icon className="size-3" />
                  ~30 minutos la primera vez
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
        </header>

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

        <Stepper currentStep={currentStep} />

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
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
              description="Abrí ARCA en otra pestaña y completá estas 3 cosas. Dejá esta pantalla abierta, vas a volver a ella."
              step={2}
              title="Hacé el trámite en ARCA"
            >
              <div className="space-y-5">
                {/* Mostrar código */}
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
                      className="bg-[#185FA5] text-white hover:bg-[#0C447C] disabled:opacity-50"
                      disabled={!csr}
                      onClick={handleCopyCsr}
                      type="button"
                    >
                      <CopyIcon />
                      {copied ? "Copiado ✓" : "Copiar código"}
                    </Button>
                    <Button
                      className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] disabled:opacity-50 dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
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
                      <a href={arcaUrl} rel="noreferrer" target="_blank">
                        <ExternalLinkIcon />
                        Abrir ARCA
                      </a>
                    </Button>
                  </div>
                </div>

                <WarningBox>
                  Dejá esta pantalla abierta mientras trabajás en ARCA. El
                  código es válido por 4 horas, así que no apures el trámite.
                </WarningBox>

                {/* Las 3 tareas en ARCA */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Dentro de ARCA hacé estas 3 cosas, en orden:
                  </p>

                  <ExpandableTask
                    defaultOpen
                    number={1}
                    subtitle="Sección: Administración de Certificados Digitales"
                    title="Subí el código y descargá el certificado"
                  >
                    <InstructionList
                      items={[
                        "Entrá a arca.gob.ar e iniciá sesión con tu CUIT y clave fiscal.",
                        "Buscá y abrí Administración de Certificados Digitales.",
                        "Hacé click en Agregar alias.",
                        "En Alias escribí cualquier nombre, por ejemplo: conta-app.",
                        "En Examinar elegí el archivo de código que descargaste (o pegá el texto si usaste Copiar).",
                        "Hacé click en Agregar Alias.",
                        "En la lista buscá tu alias y hacé click en Ver.",
                        "Hacé click en Descargar. Guardá ese archivo — lo vas a necesitar en el paso 3.",
                      ]}
                    />
                  </ExpandableTask>

                  <ExpandableTask
                    number={2}
                    subtitle="Sección: Administrador de Relaciones"
                    title="Autorizá los servicios de facturación"
                  >
                    <InstructionList
                      items={[
                        "Dentro de ARCA, buscá y abrí Administrador de Relaciones.",
                        "Hacé click en Incorporar nueva Relación.",
                        "En la lista expandí ARCA → WebServices.",
                        "Seleccioná Facturación Electrónica y confirmá.",
                        "Volvé a hacer click en Incorporar nueva Relación.",
                        "Esta vez seleccioná Facturación Electrónica de Exportación y confirmá.",
                      ]}
                    />
                  </ExpandableTask>

                  <ExpandableTask
                    number={3}
                    subtitle="Sección: RCEL - ABM Puntos de Venta"
                    title="Creá los puntos de venta"
                  >
                    <>
                      <InstructionList
                        items={[
                          "Dentro de ARCA, buscá y abrí RCEL - ABM Puntos de Venta.",
                          "Creá un punto de venta de tipo Factura Electrónica - Monotributo - Web Services. Anotá el número que te asigna.",
                          "Si también emitís facturas al exterior: creá otro de tipo Comprobantes de Exportación - Web Services. Anotá ese número también.",
                        ]}
                      />
                      <div className="mt-3 rounded-lg border border-[#B5D4F4] bg-[#E6F1FB] px-3 py-2 text-xs text-[#0C447C] dark:border-[#185FA5]/60 dark:bg-[#0C447C]/30 dark:text-[#E6F1FB]">
                        <strong>¿Qué es un punto de venta?</strong> Es el número
                        que aparece antes del guión en tus facturas (ej:{" "}
                        <span className="font-mono">0001</span>-00000001). ARCA
                        te asigna uno cuando lo creás.
                      </div>
                    </>
                  </ExpandableTask>
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
                {/* Certificado */}
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
                    Es el archivo que descargaste en la tarea 1 dentro de ARCA.
                    Suele llamarse algo como{" "}
                    <span className="font-mono text-xs">conta-app.crt</span>.
                  </p>
                  {certificate ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[#C0DD97] bg-[#EAF3DE] px-4 py-3 text-sm font-medium text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
                      <CheckCircle2Icon className="size-4 shrink-0" />
                      Archivo cargado correctamente.
                    </div>
                  ) : null}
                </div>

                {/* Punto de venta Factura C */}
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

                {/* Punto de venta Factura E — opcional */}
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
                        Marcá esto solo si cobrás de clientes de otros países.
                        Podés configurarlo después si no estás seguro.
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

            {/* Nota de seguridad */}
            <div className="rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground dark:bg-secondary/20">
              <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheckIcon className="size-4 text-[#639922]" />
                Tu clave fiscal no se guarda nunca
              </div>
              La app solo guarda la conexión técnica para facturar. Tu clave
              fiscal queda siempre dentro de ARCA y no la pedimos en ningún
              momento.
            </div>
          </section>

          {/* ── Sidebar ── */}
          <aside className="space-y-4 lg:sticky lg:top-5">
            {/* Avance */}
            <Card className="overflow-hidden rounded-xl border-[0.5px] shadow-none">
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

            {/* Tiempo estimado */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
              <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                <Clock3Icon className="size-4" />
                ¿Cuánto tarda?
              </div>
              <ul className="space-y-1.5 text-xs text-amber-700 dark:text-amber-400">
                <li className="flex justify-between">
                  <span>Paso 1 — Generar código</span>
                  <span className="font-medium">~2 min</span>
                </li>
                <li className="flex justify-between">
                  <span>Paso 2 — Trámite en ARCA</span>
                  <span className="font-medium">~20 min</span>
                </li>
                <li className="flex justify-between">
                  <span>Paso 3 — Guardar conexión</span>
                  <span className="font-medium">~2 min</span>
                </li>
              </ul>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                El código es válido por 4 horas, no hay apuro.
              </p>
            </div>

            {/* Ayuda */}
            <Card className="overflow-hidden rounded-xl border-[#B5D4F4] shadow-none dark:border-[#185FA5]/60">
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

            <WarningBox>
              Abrí ARCA en una pestaña nueva y dejá esta app abierta. Cuando
              termines en ARCA volvés acá para el paso 3.
            </WarningBox>

            <div className="rounded-xl border border-[#C0DD97] bg-[#EAF3DE] p-4 text-sm leading-6 text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldCheckIcon className="size-4" />
                Qué guardás al final
              </div>
              Solo el archivo de certificado y los números de punto de venta.
              Nada de tu clave fiscal.
            </div>
          </aside>
        </div>
      </div>
    </main>
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

function ExpandableTask({
  children,
  defaultOpen = false,
  number,
  subtitle,
  title,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
  number: number
  subtitle: string
  title: string
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-xl border border-[#B5D4F4] dark:border-[#185FA5]/60">
      <button
        className="flex w-full items-center gap-3 bg-[#E6F1FB] px-4 py-3 text-left transition-colors hover:bg-[#dcedf9] dark:bg-[#0C447C]/35 dark:hover:bg-[#0C447C]/50"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
          {number}
        </span>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-[#0C447C] dark:text-[#E6F1FB]">
            {title}
          </div>
          <div className="text-xs text-[#0C447C]/65 dark:text-[#E6F1FB]/65">
            {subtitle}
          </div>
        </div>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-[#0C447C] transition-transform dark:text-[#E6F1FB] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen ? <div className="bg-card p-4">{children}</div> : null}
    </div>
  )
}

function InstructionList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div className="flex gap-3 text-sm leading-6" key={index}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
            {index + 1}
          </span>
          <p className="text-foreground">{highlightArcaTerms(item)}</p>
        </div>
      ))}
    </div>
  )
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#FAC775] bg-[#FAEEDA] px-4 py-3 text-sm leading-6 font-medium text-[#633806] dark:border-[#FAC775]/50 dark:bg-[#633806]/30 dark:text-[#FAEEDA]">
      {children}
    </div>
  )
}

function highlightArcaTerms(text: string) {
  const terms = [
    "Administración de Certificados Digitales",
    "Administrador de Relaciones",
    "Incorporar nueva Relación",
    "Facturación Electrónica de Exportación",
    "Facturación Electrónica - Monotributo - Web Services",
    "Comprobantes de Exportación - Web Services",
    "Facturación Electrónica",
    "RCEL - ABM Puntos de Venta",
    "Agregar Alias",
    "Agregar alias",
    "Examinar",
    "Descargar",
    "Alias",
    "Ver",
  ]
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g")
  const parts = text.split(pattern)

  return parts.map((part, index) =>
    terms.includes(part) ? (
      <strong
        className="font-semibold text-[#0C447C] dark:text-[#B5D4F4]"
        key={`${part}-${index}`}
      >
        {part}
      </strong>
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
