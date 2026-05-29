import * as React from "react"

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground">
          <div className="max-w-md rounded-lg border bg-card p-5 text-sm shadow-sm">
            <h1 className="text-base font-semibold">Algo salió mal</h1>
            <p className="mt-2 text-muted-foreground">
              No pudimos mostrar esta pantalla. Recargá la página o volvé a
              iniciar sesión.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
