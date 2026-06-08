import * as React from "react"
import { DownloadIcon, ShareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type BeforeInstallPromptEvent,
  isStandaloneDisplayMode,
  shouldShowIosInstallInstructions,
} from "@/lib/pwa-install"

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [showIosInstructions, setShowIosInstructions] = React.useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = React.useState(false)

  React.useEffect(() => {
    setIsInstalled(isStandaloneDisplayMode())
    setShowIosInstructions(shouldShowIosInstallInstructions())

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
      setIsInstalled(true)
      setIsInstructionsOpen(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if (isInstalled || (!installPrompt && !showIosInstructions)) {
    return null
  }

  async function handleInstallClick() {
    if (!installPrompt) {
      setIsInstructionsOpen(true)
      return
    }

    const prompt = installPrompt
    setInstallPrompt(null)
    await prompt.prompt()
    await prompt.userChoice.catch(() => null)
  }

  return (
    <>
      <Button
        className="fixed right-4 bottom-4 z-40 h-9 gap-1.5 px-3 text-xs shadow-lg sm:right-5 sm:bottom-5"
        onClick={() => void handleInstallClick()}
        type="button"
        variant="outline"
      >
        {showIosInstructions && !installPrompt ? (
          <ShareIcon className="size-3.5" />
        ) : (
          <DownloadIcon className="size-3.5" />
        )}
        <span>Agregar Contable al inicio</span>
      </Button>

      <Dialog
        onOpenChange={setIsInstructionsOpen}
        open={isInstructionsOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Contable al inicio</DialogTitle>
            <DialogDescription>
              Tocá Compartir y después Agregar a pantalla de inicio.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Safari puede pedirte confirmar el nombre. Dejalo como Contable y
            tocá Agregar.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
