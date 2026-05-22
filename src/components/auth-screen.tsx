import { LoginForm } from "@/components/login-form"

type AuthScreenProps = {
  canUseEmailAuth: boolean
  onUseDemo: () => void
}

export function AuthScreen({ canUseEmailAuth, onUseDemo }: AuthScreenProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <LoginForm
          canUseEmailAuth={canUseEmailAuth}
          onUseDemo={onUseDemo}
        />
      </div>
    </main>
  )
}
