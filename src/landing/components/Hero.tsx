import { ArrowRight, Check, Radar, ShieldCheck, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type HeroProps = {
  onOpenWaitlist: () => void
}

const quickWins = [
  "Margen de categoría siempre visible",
  "Proyección según tu ritmo de facturación",
  "Alertas antes de que ARCA te sorprenda",
]

export function Hero({ onOpenWaitlist }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="landing-bg-pattern relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-28 pb-20 sm:px-6 lg:px-8"
      id="inicio"
    >
      <div
        aria-hidden="true"
        className="landing-float absolute top-28 left-6 hidden h-24 w-24 rounded-3xl border border-[#185FA5]/10 bg-white/55 shadow-xl md:block"
        style={{ "--landing-rotate": "12deg" } as React.CSSProperties}
      />
      <div
        aria-hidden="true"
        className="landing-float absolute top-36 right-10 hidden h-20 w-20 rounded-2xl border border-[#639922]/10 bg-white/60 shadow-xl lg:block"
        style={
          {
            "--landing-rotate": "-12deg",
            animationDelay: "1.8s",
          } as React.CSSProperties
        }
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-[24rem] text-center sm:max-w-5xl">
          <div className="landing-fade-in-up flex flex-wrap justify-center gap-2">
            <Badge
              className="h-8 rounded-full border-[#3CC68A]/25 bg-[#3CC68A]/10 px-4 text-sm text-[#2C8A62]"
              variant="outline"
            >
              Radar fiscal para monotributistas
            </Badge>
            <Badge
              className="h-8 rounded-full border-[#185FA5]/20 bg-[#185FA5]/10 px-4 text-sm text-[#185FA5]"
              variant="outline"
            >
              <ShieldCheck className="size-3" />
              No guardamos tu clave fiscal
            </Badge>
          </div>

          <h1
            className="landing-fade-in-up landing-text-balance mt-8 text-4xl leading-[1.02] font-black tracking-normal text-[#1F1F1F] sm:text-6xl md:text-7xl"
            id="hero-title"
            style={{ animationDelay: "0.08s" }}
          >
            Tu monotributo no debería depender de{" "}
            <span className="landing-text-gradient">una planilla.</span>
          </h1>
          <p
            className="landing-fade-in-up landing-text-balance mx-auto mt-6 max-w-[23rem] text-xl leading-8 text-[#6B6B6B] sm:max-w-4xl md:text-2xl md:leading-10"
            style={{ animationDelay: "0.16s" }}
          >
            Contable te muestra cuánto margen te queda, proyecta cuándo podrías
            pasarte de categoría y te avisa antes de que ARCA te sorprenda.
          </p>

          <div
            className="landing-fade-in-up mx-auto mt-10 grid max-w-[18.5rem] gap-4 sm:max-w-4xl md:grid-cols-3"
            role="list"
            style={{ animationDelay: "0.24s" }}
          >
            {quickWins.map((win) => (
              <div
                className="landing-glass landing-hover-lift flex items-center justify-center rounded-3xl p-4 text-left"
                key={win}
                role="listitem"
              >
                <Check className="mr-3 size-5 shrink-0 text-[#3CC68A]" />
                <span className="text-sm font-semibold text-[#1F1F1F]">
                  {win}
                </span>
              </div>
            ))}
          </div>

          <div
            className="landing-fade-in-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "0.32s" }}
          >
            <Button
              className="landing-primary-gradient landing-hover-lift h-14 rounded-2xl px-8 text-base font-bold text-white shadow-2xl hover:opacity-95"
              data-track-event="waitlist_open"
              data-track-source="hero"
              onClick={onOpenWaitlist}
              size="lg"
            >
              <Radar className="size-5" />
              Probar radar fiscal
              <ArrowRight className="size-4" />
            </Button>
            <Button
              asChild
              className="landing-hover-lift h-14 rounded-2xl border-2 border-[#185FA5]/20 bg-white/80 px-8 text-base font-bold text-[#185FA5] shadow-lg hover:bg-white"
              data-track-event="navigation_click"
              data-track-source="hero_how_it_works"
              size="lg"
              variant="outline"
            >
              <a href="#comparacion">Ver cómo funciona</a>
            </Button>
          </div>

          <div
            className="landing-fade-in-up mt-8 flex flex-col items-center justify-center gap-3 text-sm text-[#6B6B6B] sm:flex-row sm:flex-wrap sm:gap-6"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#3CC68A]" />
              Para freelancers y profesionales independientes
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#3CC68A]" />
              Facturas C y E
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#3CC68A]" />
              Conexión segura con ARCA
            </div>
          </div>
        </div>

        <div
          className="landing-fade-in-up mx-auto mt-14 w-full max-w-[18.5rem] sm:max-w-5xl"
          style={{ animationDelay: "0.48s" }}
        >
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="landing-glass w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/70">
      <div className="flex min-w-0 items-center justify-between border-b border-[#185FA5]/10 bg-white/55 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#FF6B6B]" />
          <span className="size-3 rounded-full bg-[#FFA75D]" />
          <span className="size-3 rounded-full bg-[#3CC68A]" />
        </div>
        <div className="hidden rounded-full bg-[#185FA5]/10 px-3 py-1 text-xs font-semibold text-[#185FA5] sm:block">
          Dashboard fiscal
        </div>
      </div>

      <div className="grid min-w-0 gap-6 p-5 md:grid-cols-[0.95fr_1.05fr] md:p-8">
        <div className="min-w-0 rounded-3xl bg-white p-5 shadow-lg">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#639922]">
                Radar de categoría
              </p>
              <h3 className="mt-1 text-2xl font-black text-[#1F1F1F]">
                Categoría B
              </h3>
            </div>
            <div className="w-fit rounded-full bg-[#3CC68A]/12 px-3 py-1 text-xs font-bold text-[#2C8A62]">
              Riesgo bajo
            </div>
          </div>

          <div className="mt-8 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto grid size-32 place-items-center rounded-full border-[12px] border-[#3CC68A] bg-[#3CC68A]/10 sm:mx-0">
              <div>
                <div className="text-4xl font-black text-[#1F1F1F]">72</div>
                <div className="text-xs font-semibold text-[#6B6B6B]">
                  score
                </div>
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <MockupProgress label="Facturado anual" value="58%" />
              <MockupProgress label="Proyección" value="64%" />
              <MockupProgress label="Margen disponible" value="36%" />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#185FA5]/10 bg-[#F7F9FC] p-4">
            <p className="text-sm font-bold text-[#1F1F1F]">
              Te quedan $1.240.000 de margen en tu categoría.
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6B6B6B]">
              Si seguís a este ritmo, llegás tranquilo a la próxima
              recategorización.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <MockupSignal color="bg-[#3CC68A]" label="Hoy" value="OK" />
            <MockupSignal color="bg-[#FFA75D]" label="90 días" value="Atento" />
            <MockupSignal color="bg-[#185FA5]" label="Conta" value="Activa" />
          </div>

          <div className="min-w-0 rounded-3xl bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#185FA5]">
                  Alertas fiscales
                </p>
                <h3 className="mt-1 text-xl font-black text-[#1F1F1F]">
                  Próximas acciones
                </h3>
              </div>
              <Star className="size-5 fill-[#FFA75D] text-[#FFA75D]" />
            </div>

            <div className="space-y-3">
              {[
                "Recategorización: sin riesgo este mes",
                "Proyección: atención en los próximos 90 días",
                "Factura E: lista para confirmar",
              ].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-2xl bg-[#F7F9FC] px-4 py-3 text-sm font-semibold text-[#475569]"
                  key={item}
                >
                  <Check className="size-4 text-[#3CC68A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupProgress({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-[#6B6B6B]">{label}</span>
        <span className="font-bold text-[#1F1F1F]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E8EEF8]">
        <div
          className="landing-primary-gradient h-full rounded-full"
          style={{ width: value }}
        />
      </div>
    </div>
  )
}

function MockupSignal({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-[#185FA5]/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${color}`} />
        <span className="text-xs font-semibold text-[#6B6B6B]">{label}</span>
      </div>
      <div className="mt-2 text-sm font-bold text-[#1F1F1F]">{value}</div>
    </div>
  )
}
