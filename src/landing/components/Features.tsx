import {
  BarChart2,
  Bell,
  Bot,
  FileCheck2,
  FolderCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: BarChart2,
    title: "Radar de categoría",
    description: "Entendé cuánto margen te queda sin hacer cuentas manuales.",
  },
  {
    icon: TrendingUp,
    title: "Proyección de riesgo",
    description:
      "Detectá cuándo podrías pasarte si mantenés tu ritmo de facturación.",
  },
  {
    icon: Bell,
    title: "Alertas proactivas",
    description:
      "Recibí avisos y recomendaciones antes de que algo requiera urgencia.",
  },
  {
    icon: FileCheck2,
    title: "Facturas C y E",
    description:
      "Emití facturas para Argentina o el exterior con un resumen previo.",
  },
  {
    icon: Bot,
    title: "Conta IA contextual",
    description:
      "Entendé tu situación fiscal con respuestas basadas en tu contexto.",
  },
  {
    icon: FolderCheck,
    title: "Monotributo organizado",
    description: "Centralizá facturas, categoría, alertas y próximas acciones.",
  },
]

export function Features() {
  return (
    <section
      className="landing-bg-pattern relative overflow-hidden py-20 md:py-32"
      id="features"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[#185FA5]/20 bg-[#185FA5]/10 px-4 py-2 text-sm font-semibold text-[#185FA5]">
            <Sparkles className="mr-2 size-4" />
            Tu radar fiscal
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            Menos control manual.{" "}
            <span className="landing-text-gradient">
              Más tranquilidad fiscal.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
            Automatizá tareas fiscales simples, entendé tu situación y recibí
            alertas útiles sin convertirte en especialista.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              className="landing-glass landing-hover-lift rounded-3xl border-white/70 p-4"
              key={feature.title}
            >
              <CardHeader>
                <div className="landing-primary-gradient grid size-14 place-items-center rounded-2xl text-white shadow-lg">
                  <feature.icon className="size-7" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-xl text-[#1F1F1F]">
                  {feature.title}
                </CardTitle>
                <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
