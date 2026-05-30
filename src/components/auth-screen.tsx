import {
  AlertTriangleIcon,
  ReceiptTextIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react"

import { LoginForm } from "@/components/login-form"

type AuthScreenProps = {
  canUseEmailAuth: boolean
  onUseDemo: () => void
}

const features = [
  {
    icon: TrendingUpIcon,
    title: "Radar de categoría",
    text: "Sabés en todo momento cuánto te queda antes de pasarte del límite.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Facturas en un click",
    text: "Emitís Facturas C y E directamente en ARCA desde la app.",
  },
  {
    icon: SparklesIcon,
    title: "Asistente fiscal con IA",
    text: "Consultas fiscales respondidas al instante, 24/7.",
  },
  {
    icon: AlertTriangleIcon,
    title: "Alertas proactivas",
    text: "Cuotas por vencer, cobros sin facturar y más, antes de que sea tarde.",
  },
]

export function AuthScreen({ canUseEmailAuth, onUseDemo }: AuthScreenProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* ── Columna izquierda: formulario ── */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a className="flex items-center gap-2 font-semibold" href="#">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ReceiptTextIcon className="size-3.5" />
            </div>
            contable.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              canUseEmailAuth={canUseEmailAuth}
              onUseDemo={onUseDemo}
            />
          </div>
        </div>
      </div>

      {/* ── Columna derecha: propuesta de valor ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0C447C] p-10 lg:flex dark:bg-[#0a3560]">
        {/* Círculos decorativos de fondo */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#185FA5]/40" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-[480px] rounded-full bg-[#185FA5]/25" />

        {/* Logo */}
        <div className="relative flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-white/15 text-white">
            <ReceiptTextIcon className="size-3.5" />
          </div>
          <span className="text-sm font-semibold text-white/90">contable.</span>
        </div>

        {/* Contenido central */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
              El fiscal del monotributo,
              <br />
              sin complicaciones.
            </h2>
            <p className="mt-3 text-base text-white/65">
              Pensado para freelancers, profesionales y pequeños comercios que
              quieren estar al día sin depender de un contador para cada duda.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-sm"
                key={title}
              >
                <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-4 text-white" />
                </div>
                <p className="mb-0.5 text-sm font-semibold text-white">
                  {title}
                </p>
                <p className="text-xs leading-snug text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pie */}
        <p className="relative text-xs text-white/40">
          Tu clave fiscal nunca sale de ARCA. Solo guardamos la conexión técnica
          para facturar.
        </p>
      </div>
    </div>
  )
}
