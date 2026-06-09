import {
  AlertTriangle,
  BellOff,
  FileSpreadsheet,
  HelpCircle,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const painPoints = [
  {
    icon: FileSpreadsheet,
    text: "Una planilla solo sirve si te acordás de actualizarla",
  },
  {
    icon: BellOff,
    text: "ARCA muestra lo facturado, pero no te avisa qué puede pasar",
  },
  {
    icon: AlertTriangle,
    text: "Cuando cambia tu ritmo de ingresos, el riesgo puede aparecer tarde",
  },
]

export function Problem() {
  return (
    <section className="bg-white py-20 md:py-32" id="problema">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[#FFA75D]/25 bg-[#FFA75D]/10 px-4 py-2 text-sm font-semibold text-[#B56518]">
            <HelpCircle className="mr-2 size-4" />
            Para quienes trabajan por su cuenta
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            No deberías vivir pendiente de{" "}
            <span className="landing-text-gradient">ARCA.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
            Contable organiza el monotributo de freelancers, profesionales
            independientes y exportadores de servicios para que puedan
            anticiparse sin revisar portales y planillas todo el tiempo.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {painPoints.map((item) => (
            <Card
              className="landing-glass landing-hover-lift rounded-3xl border-white/70 p-4"
              key={item.text}
            >
              <CardHeader>
                <div className="landing-primary-gradient grid size-14 place-items-center rounded-2xl text-white shadow-lg">
                  <item.icon className="size-7" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-xl leading-8 text-[#1F1F1F]">
                  {item.text}
                </CardTitle>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
