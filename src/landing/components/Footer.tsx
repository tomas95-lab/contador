import { brandAssets } from "@/lib/brand-assets"
import { professionalDisclaimer } from "@/lib/legal-copy"

export function Footer() {
  return (
    <footer className="border-t border-[#185FA5]/10 bg-white py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 text-sm text-[#6B6B6B] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <img
              alt="contable."
              className="h-5 w-auto"
              src={brandAssets.wordmark.navy}
            />
            <span>Tu monotributo bajo control</span>
          </div>
          <p className="text-xs leading-5 text-[#6B6B6B]">
            {professionalDisclaimer}
          </p>
        </div>
        <div className="flex flex-wrap gap-5">
          <span>Hecho en Argentina 🇦🇷</span>
        </div>
      </div>
    </footer>
  )
}
