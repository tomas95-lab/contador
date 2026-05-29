import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import "./index.css"
import { ErrorBoundary } from "@/components/error-boundary.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

const LandingPage = lazy(() => import("./landing/LandingPage.tsx"))
const App = lazy(() => import("./App.tsx"))

function RouteFallback() {
  return <div aria-hidden className="min-h-svh" />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteFallback />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="/app"
            element={
              <ErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <App />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
