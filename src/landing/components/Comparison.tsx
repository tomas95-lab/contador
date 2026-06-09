import { Check, FileSpreadsheet, Sparkles, X } from "lucide-react"

const manualItems = [
  "Tenés que revisar todo manualmente.",
  "Tenés que actualizar cada cobro.",
  "No recibís alertas útiles.",
  "No proyecta tu ritmo de facturación.",
  "No te explica qué hacer.",
]

const contableItems = [
  "Radar actualizado de categoría.",
  "Proyección de riesgo.",
  "Alertas antes de pasarte.",
  "Facturación C y E.",
  "Conta IA con tu contexto fiscal.",
]

export function Comparison() {
  return (
    <section className="bg-white py-20 md:py-32" id="comparacion">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[#185FA5]/20 bg-[#185FA5]/10 px-4 py-2 text-sm font-semibold text-[#185FA5]">
            <Sparkles className="mr-2 size-4" />
            Del control manual a la anticipación
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            ARCA te muestra el pasado.{" "}
            <span className="landing-text-gradient">
              Contable te ayuda a anticiparte.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
            Ver cuánto facturaste es solo el comienzo. Lo importante es entender
            qué puede pasar si seguís al mismo ritmo.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
          <ComparisonCard
            icon={FileSpreadsheet}
            items={manualItems}
            title="Con ARCA o planilla"
            tone="manual"
          />
          <ComparisonCard
            icon={Sparkles}
            items={contableItems}
            title="Con Contable"
            tone="contable"
          />
        </div>
      </div>
    </section>
  )
}

function ComparisonCard({
  icon: Icon,
  items,
  title,
  tone,
}: {
  icon: typeof FileSpreadsheet
  items: string[]
  title: string
  tone: "manual" | "contable"
}) {
  const isContable = tone === "contable"

  return (
    <div
      className={`rounded-[2rem] border p-6 shadow-lg md:p-8 ${
        isContable
          ? "landing-glass border-[#185FA5]/20"
          : "border-[#E5E7EB] bg-[#F7F9FC]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`grid size-14 place-items-center rounded-2xl ${
            isContable
              ? "landing-primary-gradient text-white shadow-lg"
              : "bg-white text-[#6B6B6B] shadow-sm"
          }`}
        >
          <Icon className="size-7" />
        </div>
        <h3 className="text-2xl font-black text-[#1F1F1F]">{title}</h3>
      </div>

      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li className="flex gap-3 text-[#475569]" key={item}>
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                isContable
                  ? "bg-[#3CC68A] text-white"
                  : "bg-white text-[#9CA3AF]"
              }`}
            >
              {isContable ? (
                <Check className="size-3.5" />
              ) : (
                <X className="size-3.5" />
              )}
            </span>
            <span className={isContable ? "font-semibold" : ""}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
