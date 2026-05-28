import * as React from "react"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileKey2Icon,
  FileUpIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  generateArcaCsr,
  saveArcaCertificate,
} from "@/lib/arca-credentials-api"

type ArcaOnboardingProps = {
  onComplete: (cuit: string) => void
  onSignOut: () => void
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5

const arcaUrl = "https://arca.gob.ar"
const arcaCertificatesUrl = arcaUrl
const arcaRelationsUrl = arcaUrl
const arcaPointOfSaleUrl = arcaUrl

const stepperSteps: { number: OnboardingStep; label: string }[] = [
  { number: 1, label: "Código" },
  { number: 2, label: "Certificado" },
  { number: 3, label: "Web Services" },
  { number: 4, label: "Puntos de venta" },
  { number: 5, label: "Finalizar" },
]

export function ArcaOnboarding({ onComplete, onSignOut }: ArcaOnboardingProps) {
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
  const normalizedCuit = cuit.replace(/\D/g, "")
  const hasPointOfSaleNumbers = Boolean(wsfePointOfSale && wsfexPointOfSale)

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
    if (!csr) {
      return
    }

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

    if (!file) {
      return
    }

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
        wsfex_pto_vta: Number(wsfexPointOfSale),
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
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#0C447C] md:text-3xl dark:text-[#E6F1FB]">
                Conectá ARCA para emitir facturas
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#0C447C]/85 md:text-base dark:text-[#E6F1FB]/80">
                Te guiamos paso a paso: generás el código, lo subís en ARCA,
                autorizás la facturación, creás los puntos de venta y volvés a
                la app para guardar la conexión.
              </p>
            </div>
            <Button
              className="border-[#B5D4F4] bg-background/80 text-[#0C447C] hover:bg-background dark:border-[#B5D4F4]/40 dark:bg-background/10 dark:text-[#E6F1FB] dark:hover:bg-background/20"
              onClick={onSignOut}
              type="button"
              variant="outline"
            >
              Salir
            </Button>
          </div>
        </header>

        <Stepper currentStep={currentStep} />

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="space-y-5">
            <StepCard
              currentStep={currentStep}
              description="Ingresá el CUIT que va a emitir las facturas. La app crea el código de autorización internamente."
              step={1}
              title="Generá el código de autorización"
            >
              <form className="grid gap-4" onSubmit={handleGenerateCsr}>
                <div className="grid gap-2">
                  <Label htmlFor="arca-cuit">CUIT</Label>
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-[#185FA5] text-white hover:bg-[#0C447C] disabled:opacity-50"
                    disabled={normalizedCuit.length !== 11 || isGenerating}
                    type="submit"
                  >
                    {isGenerating ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <FileKey2Icon />
                    )}
                    Generar código de autorización
                  </Button>
                  <Button
                    className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] disabled:opacity-50 dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                    disabled={!csr}
                    onClick={handleDownloadCsr}
                    type="button"
                    variant="outline"
                  >
                    <FileKey2Icon />
                    Descargar CSR
                  </Button>
                </div>
              </form>
            </StepCard>

            <StepCard
              currentStep={currentStep}
              description="Subí el archivo CSR en Administración de Certificados Digitales y descargá el certificado que te devuelve ARCA."
              step={2}
              title="Subí el CSR a ARCA y descargá el certificado"
            >
              <div className="space-y-4">
                <div className="grid gap-2 rounded-xl border-[0.5px] bg-secondary/40 p-4 dark:bg-secondary/20">
                  <Label htmlFor="arca-csr">
                    Tu código de autorización, copialo o descargalo antes de ir
                    a ARCA
                  </Label>
                  <Textarea
                    className="min-h-52 resize-y bg-background font-mono text-xs leading-5 dark:bg-background/70"
                    id="arca-csr"
                    placeholder="Primero generá el código desde el paso 1."
                    readOnly
                    value={csr}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-[#185FA5] text-white hover:bg-[#0C447C] disabled:opacity-50"
                    disabled={!csr}
                    onClick={handleCopyCsr}
                    type="button"
                  >
                    <CopyIcon />
                    {copied ? "Copiado" : "Copiar código"}
                  </Button>
                  <Button
                    className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] disabled:opacity-50 dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                    disabled={!csr}
                    onClick={handleDownloadCsr}
                    type="button"
                    variant="outline"
                  >
                    <FileKey2Icon />
                    Descargar CSR
                  </Button>
                  <Button
                    asChild
                    className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                    type="button"
                    variant="outline"
                  >
                    <a
                      href={arcaCertificatesUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLinkIcon />
                      Ir a ARCA y buscar Certificados Digitales
                    </a>
                  </Button>
                </div>

                <InstructionBlock
                  badge="Certificados"
                  title="Qué hacer dentro de ARCA"
                  items={[
                    "Entrá a arca.gob.ar e iniciá sesión con tu CUIT y clave fiscal.",
                    "Una vez dentro, buscá y abrí Administración de Certificados Digitales.",
                    "Hacé click en Agregar alias.",
                    "En Alias escribí cualquier nombre. Por ejemplo: conta-app.",
                    "En Examinar seleccioná el archivo CSR que descargaste.",
                    "Hacé click en Agregar Alias.",
                    "En la lista de alias aparece el tuyo. Hacé click en Ver.",
                    "Hacé click en Descargar. Se descarga el archivo .crt. Guardalo, lo vas a necesitar en el paso 5.",
                  ]}
                />

                <WarningBox>
                  No cierres esta pantalla. Vas a necesitar volver para
                  autorizar los servicios, cargar los puntos de venta y subir el
                  archivo de certificado.
                </WarningBox>

                <Button
                  className="w-fit bg-[#639922] text-white hover:bg-[#4F7D19] disabled:opacity-50"
                  disabled={!csr}
                  onClick={() => setCurrentStep(3)}
                  type="button"
                >
                  Ya descargué el .crt
                  <ArrowRightIcon />
                </Button>
              </div>
            </StepCard>

            <StepCard
              currentStep={currentStep}
              description="Autorizá los servicios que permiten emitir facturas comunes y facturas de exportación."
              step={3}
              title="Autorizá los Web Services en ARCA"
            >
              <div className="space-y-4">
                <InstructionBlock
                  badge="Web Services"
                  title="Qué hacer en Administrador de Relaciones"
                  items={[
                    "Entrá a arca.gob.ar e iniciá sesión con tu CUIT y clave fiscal.",
                    "Una vez dentro, buscá y abrí Administrador de Relaciones.",
                    "Hacé click en 'Incorporar nueva Relación'.",
                    "En la lista de organismos buscá ARCA → expandí → seleccioná 'WebServices'.",
                    "Buscá 'Facturación Electrónica' y seleccionala.",
                    "Confirmá la relación.",
                    "Volvé a 'Incorporar nueva Relación'.",
                    "Repetí seleccionando 'Facturación Electrónica de Exportación'.",
                    "Confirmá.",
                  ]}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                    type="button"
                    variant="outline"
                  >
                    <a href={arcaRelationsUrl} rel="noreferrer" target="_blank">
                      <ExternalLinkIcon />
                      Ir a ARCA y buscar Relaciones
                    </a>
                  </Button>
                  <Button
                    className="bg-[#639922] text-white hover:bg-[#4F7D19]"
                    onClick={() => setCurrentStep(4)}
                    type="button"
                  >
                    Ya autoricé los Web Services
                    <ArrowRightIcon />
                  </Button>
                </div>
              </div>
            </StepCard>

            <StepCard
              currentStep={currentStep}
              description="Creá los puntos de venta para facturas C y facturas E, y guardá esos números."
              step={4}
              title="Creá los puntos de venta"
            >
              <div className="space-y-4">
                <InstructionBlock
                  badge="Puntos de venta"
                  title="Qué hacer en RCEL - ABM Puntos de Venta"
                  items={[
                    "Entrá a arca.gob.ar e iniciá sesión con tu CUIT y clave fiscal.",
                    "Una vez dentro, buscá RCEL - ABM Puntos de Venta y creá un punto de venta de tipo Factura Electrónica - Monotributo - Web Services para Factura C.",
                    "Anotá el número de punto de venta que te asigna.",
                    "Creá otro punto de venta de tipo Comprobantes de Exportación - Web Services para Factura E.",
                    "Anotá ese número también.",
                    "Volvé a la app e ingresá los dos números.",
                  ]}
                />

                <Button
                  asChild
                  className="border-[#B5D4F4] text-[#0C447C] hover:bg-[#E6F1FB] dark:border-[#185FA5]/60 dark:text-[#E6F1FB] dark:hover:bg-[#185FA5]/20"
                  type="button"
                  variant="outline"
                >
                  <a href={arcaPointOfSaleUrl} rel="noreferrer" target="_blank">
                    <ExternalLinkIcon />
                    Ir a ARCA y buscar Puntos de Venta
                  </a>
                </Button>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="arca-wsfe-point-of-sale">
                      Número de punto de venta para Factura C
                    </Label>
                    <Input
                      className="h-11 text-base"
                      id="arca-wsfe-point-of-sale"
                      inputMode="numeric"
                      min={1}
                      onChange={(event) =>
                        setWsfePointOfSale(
                          event.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="Ej: 5"
                      type="number"
                      value={wsfePointOfSale}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="arca-wsfex-point-of-sale">
                      Número de punto de venta para Factura E
                    </Label>
                    <Input
                      className="h-11 text-base"
                      id="arca-wsfex-point-of-sale"
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
                </div>

                <Button
                  className="w-fit bg-[#185FA5] text-white hover:bg-[#0C447C] disabled:opacity-50"
                  disabled={!hasPointOfSaleNumbers}
                  onClick={() => setCurrentStep(5)}
                  type="button"
                >
                  Continuar
                  <ArrowRightIcon />
                </Button>
              </div>
            </StepCard>

            <StepCard
              currentStep={currentStep}
              description="Para terminar, subí el certificado que descargaste desde ARCA y guardá la conexión."
              step={5}
              title="Subí el .crt a la app"
            >
              <form className="grid gap-4" onSubmit={handleSaveCertificate}>
                <div className="grid gap-2">
                  <Label htmlFor="arca-certificate">
                    Archivo de certificado
                  </Label>
                  <Input
                    accept=".crt,.cer,.pem"
                    className="h-11"
                    id="arca-certificate"
                    onChange={handleCertificateFile}
                    type="file"
                  />
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileUpIcon className="size-4 text-[#185FA5] dark:text-[#B5D4F4]" />
                    Es el archivo que descargaste en el paso 2.
                  </p>
                </div>

                {certificate ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[#C0DD97] bg-[#EAF3DE] px-4 py-3 text-sm font-medium text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
                    <CheckCircle2Icon className="size-4" />
                    Archivo cargado. Listo para guardar.
                  </div>
                ) : null}

                <Button
                  className="w-fit bg-[#639922] text-white hover:bg-[#4F7D19] disabled:opacity-50"
                  disabled={!certificate || !hasPointOfSaleNumbers || isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <ShieldCheckIcon />
                  )}
                  Guardar conexión y empezar a facturar
                </Button>
              </form>
            </StepCard>

            <div className="rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground dark:bg-secondary/20">
              <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheckIcon className="size-4 text-[#639922]" />
                Tu clave fiscal no se guarda nunca
              </div>
              La app solo guarda la conexión técnica para facturar. Tu clave
              fiscal queda siempre dentro de ARCA.
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <Card className="overflow-hidden rounded-xl border-[0.5px] shadow-none">
              <CardHeader className="bg-[#E6F1FB] text-[#0C447C] dark:bg-[#0C447C]/35 dark:text-[#E6F1FB]">
                <CardTitle className="text-base">Tu avance</CardTitle>
                <CardDescription className="text-[#0C447C]/75 dark:text-[#E6F1FB]/75">
                  Usalo como checklist mientras hacés el trámite.
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
                        <div className="text-xs opacity-80">
                          {isActive
                            ? "Ahora"
                            : isComplete
                              ? "Listo"
                              : "Pendiente"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <WarningBox>
              Si ARCA se abre en otra pestaña, dejá esta app abierta. Vas a ir y
              volver varias veces.
            </WarningBox>

            <div className="rounded-xl border border-[#C0DD97] bg-[#EAF3DE] p-4 text-sm leading-6 text-[#27500A] dark:border-[#C0DD97]/40 dark:bg-[#27500A]/35 dark:text-[#EAF3DE]">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldCheckIcon className="size-4" />
                Qué vas a guardar al final
              </div>
              El archivo de certificado y los dos puntos de venta. Nada de tu
              clave fiscal.
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Stepper({ currentStep }: { currentStep: OnboardingStep }) {
  return (
    <div className="grid overflow-hidden rounded-xl border sm:grid-cols-5">
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
            <span className="leading-tight font-medium">{step.label}</span>
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
        Listo
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

function InstructionBlock({
  badge,
  items,
  title,
}: {
  badge: string
  items: string[]
  title: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#B5D4F4] dark:border-[#185FA5]/60">
      <div className="flex flex-col gap-2 bg-[#E6F1FB] px-4 py-3 text-[#0C447C] sm:flex-row sm:items-center sm:justify-between dark:bg-[#0C447C]/35 dark:text-[#E6F1FB]">
        <div className="font-semibold">{title}</div>
        <Badge className="w-fit rounded-[99px] bg-[#185FA5] text-white hover:bg-[#185FA5]">
          {badge}
        </Badge>
      </div>
      <div className="space-y-3 bg-card p-4">
        {items.map((item, index) => (
          <div className="flex gap-3 text-sm leading-6" key={item}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#185FA5] text-xs font-semibold text-white">
              {index + 1}
            </span>
            <p className="text-foreground">{highlightArcaTerms(item)}</p>
          </div>
        ))}
      </div>
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
    "Agregar Alias",
    "Agregar alias",
    "Confirmá",
    "Examinar",
    "Descargar",
    "Alias",
    "Ver",
    "CSR",
    ".crt",
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
  return error instanceof Error ? error.message : "Error desconocido"
}
