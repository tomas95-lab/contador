import { Check, Crown, Rocket, Sparkles, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
      "Facturación C conectada a ARCA",
      "Radar de categoría con proyección",
      "Alertas de riesgo fiscal",
      "Conta, tu contador IA",
    ],
  },
  {
    name: "Plan Exportador",
    price: "$12.000 ARS/mes",
    badge: null,
    features: [
      "Todo lo del plan Simple",
      "Factura E para cobros en USD",
      "Clientes extranjeros guardados",
      "Tipo de cambio y equivalente ARS",
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
            Más barato que un contador.{" "}
            <span className="landing-text-gradient">Sin ataduras.</span>
          </h2>
          <p className="mt-5 text-lg text-[#6B6B6B] md:text-xl">
            30 días gratis, sin tarjeta de crédito
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 pt-5 md:grid-cols-2">
          {plans.map((plan, index) => (
            <Card
              className={`landing-hover-lift relative rounded-[2rem] p-4 md:py-6 ${
                plan.badge
                  ? "overflow-visible landing-glass scale-[1.01] border-2 border-[#185FA5]/25 shadow-2xl"
                  : "border border-[#DDE8FF] bg-white shadow-lg"
              }`}
              key={plan.name}
            >
              {plan.badge ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="landing-primary-gradient flex items-center rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg">
                    <Crown className="mr-2 size-4" />
                    {plan.badge}
                  </div>
                </div>
              ) : null}

              <CardHeader>
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl shadow-lg">
                  <div
                    className={`grid size-16 place-items-center rounded-2xl ${
                      plan.badge
                        ? "landing-primary-gradient text-white"
                        : "bg-[#DDE8FF] text-[#185FA5]"
                    }`}
                  >
                    {index === 0 ? (
                      <Rocket className="size-8" />
                    ) : (
                      <Crown className="size-8" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <CardTitle className="text-2xl font-black text-[#1F1F1F]">
                    {plan.name}
                  </CardTitle>
                  {plan.badge ? (
                    <Badge className="mt-3 bg-[#639922]/15 text-[#477012] md:hidden">
                      {plan.badge}
                    </Badge>
                  ) : null}
                </div>
                <div className="pt-5 text-center text-4xl font-black text-[#1F1F1F]">
                  {plan.price}
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
              <CardFooter className="border-0 bg-transparent">
                <Button
                  className={`h-12 w-full rounded-2xl font-bold ${
                    plan.badge
                      ? "landing-primary-gradient text-white shadow-xl hover:opacity-95"
                      : "border-2 border-[#185FA5] bg-white text-[#185FA5] hover:bg-[#185FA5]/5"
                  }`}
                  onClick={onOpenWaitlist}
                >
                  <Sparkles className="size-4" />
                  Empezar gratis
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-14 text-center">
          <div className="inline-flex max-w-3xl items-center rounded-3xl border border-[#FFA75D]/25 bg-[#FFA75D]/10 px-6 py-4 text-left text-sm font-semibold text-[#8A4B13] md:text-base">
            <Sparkles className="mr-3 size-5 shrink-0 text-[#FFA75D]" />
            Oferta de lanzamiento: los primeros usuarios acceden a 30 días
            gratis y onboarding guiado.
          </div>
        </div>
      </div>
    </section>
  )
}
