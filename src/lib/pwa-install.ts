export type BeforeInstallPromptEvent = Event & {
  platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

export function shouldShowIosInstallInstructions() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent
  const isIos =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)

  return isIos && !isStandaloneDisplayMode()
}
