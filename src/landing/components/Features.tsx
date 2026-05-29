import {
  BarChart2,
  Bell,
  Bot,
  Globe,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: BarChart2,
    title: "Radar de categoría",
    description: "Sabés exactamente cuánto te falta antes de recategorizar",
  },
  {
    icon: Bell,
    title: "Alertas proactivas",
    description: "Te avisamos antes de que ARCA te sorprenda",
  },
  {
    icon: Bot,
    title: "Conta IA",
    description: "Tu contador disponible a las 3AM sin cobrar extra",
  },
  {
    icon: Globe,
    title: "Factura E",
    description: "Para los que cobran del exterior sin miedo",
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
            Funcionalidades principales
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            Todo lo que necesitás para{" "}
            <span className="landing-text-gradient">estar tranquilo</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
            Una plataforma fiscal pensada para monotributistas argentinos:
            facturación, categoría, alertas y diagnóstico en el mismo lugar.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="relative mt-20">
          <div className="landing-glass rounded-[2rem] p-8 md:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center rounded-full border border-[#3CC68A]/25 bg-[#3CC68A]/10 px-4 py-2 text-sm font-semibold text-[#2C8A62]">
                <Shield className="mr-2 size-4" />
                Diferencial Contable
              </div>
              <h3 className="landing-text-balance text-3xl font-black text-[#1F1F1F] md:text-4xl">
                Automatización fiscal sin entregar tus claves
              </h3>
              <p className="mt-4 text-lg leading-8 text-[#6B6B6B]">
                El onboarding ARCA usa certificados y credenciales cifradas por
                usuario. Vos controlás el acceso y Contable controla el riesgo.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Credenciales cifradas",
                  description: "Cada usuario conserva su configuración ARCA.",
                },
                {
                  icon: Zap,
                  title: "Alertas antes del límite",
                  description:
                    "El radar proyecta tu categoría antes del cierre.",
                },
                {
                  icon: Sparkles,
                  title: "Errores ARCA traducidos",
                  description: "Mensajes humanos para decidir qué corregir.",
                },
              ].map((benefit) => (
                <div
                  className="rounded-3xl bg-white/70 p-6 shadow-sm transition-colors hover:bg-white"
                  key={benefit.title}
                >
                  <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#DDE8FF] text-[#185FA5]">
                    <benefit.icon className="size-6" />
                  </div>
                  <h4 className="font-bold text-[#1F1F1F]">{benefit.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
