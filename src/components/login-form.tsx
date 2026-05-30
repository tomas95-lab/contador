import * as React from "react"
import { Loader2Icon, PlayCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signInWithEmail, signUpWithEmail } from "@/lib/supabase-auth"

type AuthMode = "login" | "signup"

type LoginFormProps = React.ComponentProps<"form"> & {
  canUseEmailAuth: boolean
  onUseDemo: () => void
}

export function LoginForm({
  canUseEmailAuth,
  className,
  onUseDemo,
  ...props
}: LoginFormProps) {
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
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            {mode === "login"
              ? "Ingresá tu email para acceder a tu cuenta."
              : "Completá los datos para empezar."}
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            autoComplete="email"
            className="bg-background"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            type="email"
            value={email}
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          </div>
          <Input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="bg-background"
            id="password"
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        <Field>
          <Button disabled={isPending} type="submit">
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
          <FieldDescription className="text-center">
            {mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
            <button
              className="font-medium underline underline-offset-4"
              onClick={() =>
                setMode((m) => (m === "login" ? "signup" : "login"))
              }
              type="button"
            >
              {mode === "login" ? "Registrate" : "Iniciá sesión"}
            </button>
          </FieldDescription>
        </Field>

        <FieldSeparator>o</FieldSeparator>

        <Field>
          <Button
            disabled={isPending}
            onClick={onUseDemo}
            type="button"
            variant="outline"
          >
            <PlayCircleIcon />
            Explorar con datos de demo
          </Button>
          <FieldDescription className="text-center">
            Probá la app sin crear cuenta.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
