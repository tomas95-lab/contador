import { LoginForm } from "@/components/login-form"

export function AuthScreen() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  )
}
