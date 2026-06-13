import { Check, Crown, Rocket, Sparkles, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PricingProps = {
  onOpenWaitlist: () => void
}

const plans = [
  {
    name: "Plan Simple",
    price: "$10.000 ARS/mes",
    badge: "Más popular",
    features: [
      "Radar de categoría y margen disponible",
      "Proyección y alertas de riesgo",
      "Facturación C conectada a ARCA",
      "Conta IA con tu contexto fiscal",
    ],
  },
  {
    name: "Plan Exportador",
    price: "$12.000 ARS/mes",
    badge: null,
    features: [
      "Todo lo del plan Simple",
      "Factura E para exportar servicios",
      "Clientes extranjeros guardados",
      "Menos dependencia del portal ARCA",
    ],
  },
]

export function Pricing({ onOpenWaitlist }: PricingProps) {
  return (
    <section className="bg-white py-20 md:py-32" id="pricing">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[#3CC68A]/25 bg-[#3CC68A]/10 px-4 py-2 text-sm font-semibold text-[#2C8A62]">
            <Star className="mr-2 size-4" />
            Precios de lanzamiento
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            Elegí la tranquilidad de{" "}
            <span className="landing-text-gradient">anticiparte.</span>
          </h2>
          <p className="mt-5 text-lg text-[#6B6B6B] md:text-xl">
            Radar, alertas y facturación para depender menos de planillas y del
            portal de ARCA.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 pt-5 md:grid-cols-2">
          {plans.map((plan, index) => (
            <Card
              className={`landing-hover-lift relative rounded-[2rem] p-4 md:py-6 ${
                plan.badge
                  ? "landing-glass scale-[1.01] border-2 border-[#185FA5]/25 shadow-2xl"
                  : "border border-[#DDE8FF] bg-white shadow-lg"
              }`}
              key={plan.name}
            >
              <CardHeader className="pt-1 text-center">
                <div className="landing-text-gradient text-4xl leading-none font-black tracking-tight md:text-5xl">
                  30 días gratis
                </div>

                {plan.badge ? (
                  <div className="mt-4 flex justify-center">
                    <div className="landing-primary-gradient flex items-center rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg">
                      <Crown className="mr-2 size-4" />
                      {plan.badge}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-center gap-3">
                  <div
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-lg ${
                      plan.badge
                        ? "landing-primary-gradient text-white"
                        : "bg-[#DDE8FF] text-[#185FA5]"
                    }`}
                  >
                    {index === 0 ? (
                      <Rocket className="size-6" />
                    ) : (
                      <Crown className="size-6" />
                    )}
                  </div>
                  <CardTitle className="text-xl font-black text-[#1F1F1F] md:text-2xl">
                    {plan.name}
                  </CardTitle>
                </div>

                <div className="mt-5 text-xl font-bold text-[#1F1F1F] md:text-2xl">
                  {plan.price}
                </div>
                <div className="mt-1 text-xs text-[#6B6B6B]">
                  Menos que 10 minutos con un contador.
                </div>
                <div className="mt-4 rounded-2xl border border-[#FFA75D]/25 bg-[#FFA75D]/10 px-4 py-3 text-center text-xs leading-5 font-semibold text-[#8A4B13]">
                  Recategorización de julio en semanas. El radar sirve si lo
                  prendés antes.
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      className="flex gap-3 text-sm leading-6 text-[#6B6B6B]"
                      key={feature}
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#3CC68A]">
                        <Check className="size-3 text-white" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto flex-col gap-3 border-0 bg-transparent">
                <Button
                  className={`min-h-12 w-full rounded-2xl px-3 py-3 leading-tight font-bold whitespace-normal ${
                    plan.badge
                      ? "landing-primary-gradient text-white shadow-xl hover:opacity-95"
                      : "border-2 border-[#185FA5] bg-white text-[#185FA5] hover:bg-[#185FA5]/5"
                  }`}
                  data-track-detail={plan.name}
                  data-track-event="waitlist_open"
                  data-track-source="pricing"
                  onClick={onOpenWaitlist}
                >
                  <Sparkles className="size-4" />
                  Empezar gratis — 30 días
                </Button>
                <p className="text-center text-xs leading-5 text-[#6B6B6B]">
                  Si no te sirve en 30 días, te devolvemos todo. Sin preguntas.
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-14 text-center">
          <div className="inline-flex max-w-3xl items-center rounded-3xl border border-[#FFA75D]/25 bg-[#FFA75D]/10 px-6 py-4 text-center text-sm font-semibold text-[#8A4B13] md:text-base">
            <Sparkles className="mr-3 size-5 shrink-0 text-[#FFA75D]" />
            Oferta de lanzamiento: los primeros usuarios acceden a 30 días
            gratis y onboarding guiado.
          </div>
        </div>
      </div>
    </section>
  )
}
