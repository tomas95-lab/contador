import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="border-t border-[#185FA5]/10 bg-white py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 text-sm text-[#6B6B6B] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <span className="font-black text-[#1F1F1F]">contable.</span> — Tu
          monotributo bajo control
        </div>
        <div className="flex flex-wrap gap-5">
          <span>Hecho en Argentina 🇦🇷</span>
        </div>
      </div>
    </footer>
  )
}
