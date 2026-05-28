import * as React from "react"
import { Loader2Icon, MailCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const helpEndpoint =
  "https://script.google.com/macros/s/AKfycbw6PVhqM8U3Ng0j3csoKu138hftkTQOMZjsEzOk8YLAV4PPz6NTEOCvQ8mBiTkWqC4Q/exec"

const subjectOptions = [
  "Problema con ARCA",
  "Problema con facturación",
  "Pregunta sobre mi categoría",
  "Problema técnico",
  "Otro",
]

type HelpViewProps = {
  userEmail?: string
  userName?: string
}

export function HelpView({ userEmail = "", userName = "" }: HelpViewProps) {
  const [nombre, setNombre] = React.useState(userName)
  const [email, setEmail] = React.useState(userEmail)
  const [asunto, setAsunto] = React.useState("")
  const [mensaje, setMensaje] = React.useState("")
  const [feedback, setFeedback] = React.useState<{
    message: string
    type: "error" | "success"
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = {
      nombre: nombre.trim(),
      email: email.trim(),
      asunto,
      mensaje: mensaje.trim(),
    }

    if (
      !payload.nombre ||
      !payload.email ||
      !payload.asunto ||
      payload.mensaje.length < 20
    ) {
      setFeedback({
        type: "error",
        message:
          "Completá todos los campos. El mensaje tiene que tener al menos 20 caracteres.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(helpEndpoint, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        method: "POST",
        mode: "no-cors",
      })

      if (response.type !== "opaque" && !response.ok) {
        throw new Error(response.statusText)
      }

      setFeedback({
        type: "success",
        message: "Tu consulta fue enviada. Te respondemos a la brevedad.",
      })
      setNombre("")
      setEmail("")
      setAsunto("")
      setMensaje("")
    } catch {
      setFeedback({
        type: "error",
        message:
          "No se pudo enviar. Intentá de nuevo o escribinos a hola@contable.app",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Ayuda</CardTitle>
          <CardDescription>
            Contanos qué pasó y te respondemos con contexto de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-name">Nombre</Label>
                <Input
                  id="support-name"
                  onChange={(event) => setNombre(event.target.value)}
                  required
                  value={nombre}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Email</Label>
                <Input
                  id="support-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Asunto</Label>
              <Select onValueChange={setAsunto} required value={asunto}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar asunto" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-message">Mensaje</Label>
              <Textarea
                id="support-message"
                minLength={20}
                onChange={(event) => setMensaje(event.target.value)}
                placeholder="Describí qué pasó, qué estabas intentando hacer y si viste algún error."
                required
                value={mensaje}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 20 caracteres.
              </p>
            </div>

            {feedback ? (
              <p
                className={
                  feedback.type === "success"
                    ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                    : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                }
              >
                {feedback.message}
              </p>
            ) : null}

            <Button className="w-fit" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
              {isSubmitting ? "Enviando..." : "Enviar consulta"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Soporte Contable</CardTitle>
              <CardDescription>Canal directo para consultas.</CardDescription>
            </div>
            <MailCheckIcon className="size-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Para problemas con ARCA, incluí el paso donde te trabaste y el
            mensaje de error si aparece.
          </p>
          <p>
            Para consultas fiscales, describí tu categoría actual, actividad y
            qué decisión estás evaluando.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
