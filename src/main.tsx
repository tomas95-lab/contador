import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import "./index.css"
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
              <Suspense fallback={<RouteFallback />}>
                <App />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
