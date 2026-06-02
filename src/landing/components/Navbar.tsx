import * as React from "react"
import { Link } from "react-router-dom"
import { Clock, Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { brandAssets } from "@/lib/brand-assets"

type NavbarProps = {
  onOpenWaitlist: () => void
}

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#features", label: "Producto" },
  { href: "#pricing", label: "Planes" },
]

export function Navbar({ onOpenWaitlist }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [scrollProgress, setScrollProgress] = React.useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    function handleScroll() {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0

      setIsScrolled(window.scrollY > 10)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        isScrolled ? "landing-glass border-b border-white/60" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="group flex items-center gap-3" to="/">
          <img
            alt="contable."
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
            src={brandAssets.lockup.navy}
          />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="-mt-0.5 text-xs font-medium text-[#6B6B6B]">
              Radar fiscal
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              className="relative rounded-xl px-4 py-2 text-sm font-medium text-[#475569] transition-all duration-200 hover:bg-white/70 hover:text-[#185FA5]"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            className="landing-primary-gradient h-10 rounded-2xl px-5 text-white shadow-lg hover:opacity-95"
            onClick={onOpenWaitlist}
          >
            <Clock className="size-4" />
            Empezar gratis
          </Button>
        </div>

        <button
          aria-label="Abrir menú"
          className="rounded-xl p-2 text-[#1F1F1F] transition-colors hover:bg-white/70 md:hidden"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          type="button"
        >
          {isMobileMenuOpen ? (
            <X className="size-6" />
          ) : (
            <Menu className="size-6" />
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="landing-glass mx-4 mb-4 rounded-3xl p-4 md:hidden">
          <div className="grid gap-2">
            {navLinks.map((link) => (
              <a
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#475569] transition-colors hover:bg-white/70 hover:text-[#185FA5]"
                href={link.href}
                key={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button
              className="landing-primary-gradient h-11 rounded-2xl text-white"
              onClick={() => {
                setIsMobileMenuOpen(false)
                onOpenWaitlist()
              }}
            >
              Empezar gratis
            </Button>
          </div>
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#185FA5] via-[#4F8CFF] to-[#639922]"
        style={{ width: `${scrollProgress}%` }}
      />
    </header>
  )
}
