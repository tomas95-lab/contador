"use client"

import * as React from "react"
import { Loader2Icon, PlayCircleIcon, ReceiptTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signInWithEmail, signUpWithEmail } from "@/lib/supabase-auth"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

export function LoginForm({
  canUseEmailAuth,
  className,
  onUseDemo,
  ...props
}: React.ComponentProps<"div"> & {
  canUseEmailAuth: boolean
  onUseDemo: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [mode, setMode] = React.useState<AuthMode>("login")
  const [password, setPassword] = React.useState("")
  const [isPending, setIsPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")

    if (!canUseEmailAuth) {
      setError("El acceso con email no está configurado en este entorno.")
      return
    }

    setIsPending(true)

    try {
      if (mode === "login") {
        await signInWithEmail(email, password)
      } else {
        const data = await signUpWithEmail(email, password)

        if (!data.session) {
          setMessage("Cuenta creada. Revisá tu email para confirmar el acceso.")
          setMode("login")
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos iniciar sesión. Verificá tu email y contraseña."
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptTextIcon className="size-4" />
          </div>
          <CardTitle>
            {mode === "login" ? "Entrar a contable." : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Usa tu email para acceder a tus cobros, facturas y chat."
              : "Crea tu acceso para guardar tus datos en Supabase."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Clave</FieldLabel>
                <Input
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  id="password"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              {message && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  {message}
                </p>
              )}
              <Field>
                <Button disabled={isPending} type="submit">
                  {isPending && <Loader2Icon className="animate-spin" />}
                  {mode === "login" ? "Entrar" : "Crear cuenta"}
                </Button>
                <FieldDescription className="text-center">
                  {mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
                  <button
                    className="font-medium"
                    onClick={() =>
                      setMode((current) =>
                        current === "login" ? "signup" : "login"
                      )
                    }
                    type="button"
                  >
                    {mode === "login" ? "Registrate" : "Iniciar sesión"}
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>o</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              className="w-full"
              disabled={isPending}
              onClick={onUseDemo}
              type="button"
              variant="outline"
            >
              <PlayCircleIcon />
              Entrar con demo
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Usá datos de ejemplo sin crear cuenta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
