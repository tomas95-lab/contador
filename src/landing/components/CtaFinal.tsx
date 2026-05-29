import { ArrowRight, CheckCircle2, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"

type CtaFinalProps = {
  onOpenWaitlist: () => void
}

export function CtaFinal({ onOpenWaitlist }: CtaFinalProps) {
  return (
    <section className="landing-primary-gradient py-20 md:py-28">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <h2 className="landing-text-balance text-4xl leading-tight font-black tracking-normal text-white md:text-6xl">
          Tu monotributo bajo control, desde hoy.
        </h2>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-50 md:text-xl">
          Sumate a la lista y recibí acceso cuando abramos nuevos cupos para
          monotributistas y exportadores.
        </p>
        <Button
          className="landing-hover-lift mt-8 h-14 rounded-2xl bg-white px-8 text-base font-bold text-[#185FA5] shadow-xl hover:bg-blue-50"
          onClick={onOpenWaitlist}
          size="lg"
        >
          <Clock className="size-5" />
          Empezar gratis
          <ArrowRight className="size-4" />
        </Button>
        <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm text-blue-50">
          {["14 días gratis", "Sin tarjeta", "Soporte argentino"].map(
            (item) => (
              <div className="flex items-center gap-2" key={item}>
                <CheckCircle2 className="size-4 text-[#B7F7D5]" />
                {item}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  )
}
