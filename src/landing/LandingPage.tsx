import * as React from "react"

import { CtaFinal } from "@/landing/components/CtaFinal"
import { Features } from "@/landing/components/Features"
import { Footer } from "@/landing/components/Footer"
import { Hero } from "@/landing/components/Hero"
import { Navbar } from "@/landing/components/Navbar"
import { Pricing } from "@/landing/components/Pricing"
import { Problem } from "@/landing/components/Problem"
import { WaitlistModal } from "@/landing/components/WaitlistModal"

export default function LandingPage() {
  const [isWaitlistOpen, setIsWaitlistOpen] = React.useState(false)
  const openWaitlist = React.useCallback(() => setIsWaitlistOpen(true), [])

  return (
    <div className="contable-landing min-h-svh overflow-x-clip selection:bg-[#4F8CFF]/25">
      <Navbar onOpenWaitlist={openWaitlist} />
      <main>
        <Hero onOpenWaitlist={openWaitlist} />
        <Problem />
        <Features />
        <Pricing onOpenWaitlist={openWaitlist} />
        <CtaFinal onOpenWaitlist={openWaitlist} />
      </main>
      <Footer />
      <WaitlistModal open={isWaitlistOpen} onOpenChange={setIsWaitlistOpen} />
    </div>
  )
}
