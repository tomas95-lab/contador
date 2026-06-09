import {
  CheckCircle2,
  KeyRound,
  Laptop,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

const trustItems = [
  {
    icon: KeyRound,
    title: "No guardamos tu clave fiscal",
    description:
      "La conexión con ARCA se realiza con un certificado, sin pedirte ni almacenar tu clave fiscal.",
  },
  {
    icon: Laptop,
    title: "Conexión inicial desde computadora",
    description:
      "La conexión inicial con ARCA se recomienda desde computadora.",
  },
  {
    icon: LockKeyhole,
    title: "Certificados cifrados",
    description:
      "Tus certificados se guardan cifrados y asociados únicamente a tu cuenta.",
  },
  {
    icon: CheckCircle2,
    title: "Vos confirmás cada factura",
    description:
      "Antes de emitir una factura real, siempre te mostramos un resumen para confirmar.",
  },
]

export function Trust() {
  return (
    <section className="bg-white py-20 md:py-32" id="confianza">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[#3CC68A]/25 bg-[#3CC68A]/10 px-4 py-2 text-sm font-semibold text-[#2C8A62]">
            <ShieldCheck className="mr-2 size-4" />
            Seguridad y control
          </div>
          <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-[#1F1F1F] md:text-6xl">
            Conectado con ARCA.{" "}
            <span className="landing-text-gradient">Bajo tu control.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6B6B6B] md:text-xl">
            Automatizá tareas fiscales simples sin entregar decisiones
            importantes ni compartir tu clave fiscal.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {trustItems.map((item) => (
            <div
              className="landing-hover-lift rounded-3xl border border-[#DDE8FF] bg-[#F7F9FC] p-6 md:p-8"
              key={item.title}
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-[#DDE8FF] text-[#185FA5]">
                <item.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#1F1F1F]">
                {item.title}
              </h3>
              <p className="mt-3 leading-7 text-[#6B6B6B]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
