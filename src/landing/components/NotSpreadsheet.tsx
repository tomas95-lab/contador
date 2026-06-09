import { BellRing, FileSpreadsheet, Radar } from "lucide-react"

export function NotSpreadsheet() {
  return (
    <section className="landing-bg-pattern py-20 md:py-28" id="no-planilla">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="landing-glass mx-auto grid max-w-6xl gap-10 rounded-[2rem] p-7 md:grid-cols-[1fr_0.9fr] md:items-center md:p-12">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-[#3CC68A]/25 bg-[#3CC68A]/10 px-4 py-2 text-sm font-semibold text-[#2C8A62]">
              <Radar className="mr-2 size-4" />
              Seguimiento proactivo
            </div>
            <h2 className="landing-text-balance text-4xl leading-tight font-black text-[#1F1F1F] md:text-6xl">
              No es otra planilla.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
              Una planilla te sirve si la actualizás siempre. Contable trabaja
              al revés: centraliza tus facturas, entiende tu categoría y te
              avisa cuando algo requiere atención.
            </p>
          </div>

          <div className="grid gap-4">
            <Signal
              icon={FileSpreadsheet}
              label="Tus facturas"
              value="Centralizadas"
            />
            <Signal icon={Radar} label="Tu categoría" value="Proyectada" />
            <Signal
              icon={BellRing}
              label="Lo que requiere atención"
              value="Avisado a tiempo"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Signal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Radar
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-[#185FA5]/10 bg-white/80 p-4 shadow-sm">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#DDE8FF] text-[#185FA5]">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-sm text-[#6B6B6B]">{label}</p>
        <p className="font-bold text-[#1F1F1F]">{value}</p>
      </div>
    </div>
  )
}
