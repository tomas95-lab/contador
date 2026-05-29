import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type WaitlistModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WAITLIST_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbw6PVhqM8U3Ng0j3csoKu138hftkTQOMZjsEzOk8YLAV4PPz6NTEOCvQ8mBiTkWqC4Q/exec"

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const [nombre, setNombre] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          nombre,
          email,
          asunto: "Waitlist",
          mensaje: "Registro desde landing",
        }),
      })

      setNombre("")
      setEmail("")
      setSubmitted(true)
    } catch (submitError) {
      console.error(submitError)
      setError("No pudimos registrarte. Intentá de nuevo en unos minutos.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      setError("")
      setSubmitted(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[#DDE8FF] bg-white text-[#1F1F1F] shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            Unite a la lista
          </DialogTitle>
          <DialogDescription className="text-[#6B6B6B]">
            Te escribimos apenas abramos nuevos accesos a Contable.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="rounded-2xl border border-[#3CC68A]/25 bg-[#3CC68A]/10 p-4 text-sm font-semibold text-[#2C8A62]">
            ¡Listo! Te avisamos cuando abramos.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="waitlist-name">Nombre</Label>
              <Input
                className="h-11 rounded-2xl border-[#DDE8FF] bg-white text-[#1F1F1F] placeholder:text-[#6B6B6B]/55"
                id="waitlist-name"
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Tu nombre"
                required
                value={nombre}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                className="h-11 rounded-2xl border-[#DDE8FF] bg-white text-[#1F1F1F] placeholder:text-[#6B6B6B]/55"
                id="waitlist-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                required
                type="email"
                value={email}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              style={{ background: "linear-gradient(135deg, #185fa5 0%, #4f8cff 58%, #0ea5e9 100%)" }}
              className="h-12 w-full rounded-2xl font-bold text-white hover:opacity-95"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Enviando..." : "Unirme a la lista"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
