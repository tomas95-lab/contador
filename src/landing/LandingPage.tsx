import * as React from "react"

import { Comparison } from "@/landing/components/Comparison"
import { CtaFinal } from "@/landing/components/CtaFinal"
import { Features } from "@/landing/components/Features"
import { Footer } from "@/landing/components/Footer"
import { Hero } from "@/landing/components/Hero"
import { Navbar } from "@/landing/components/Navbar"
import { NotSpreadsheet } from "@/landing/components/NotSpreadsheet"
import { Pricing } from "@/landing/components/Pricing"
import { Problem } from "@/landing/components/Problem"
import { Trust } from "@/landing/components/Trust"
import { WaitlistModal } from "@/landing/components/WaitlistModal"
import { trackLandingEvent } from "@/lib/landing-tracking"

export default function LandingPage() {
  const [isWaitlistOpen, setIsWaitlistOpen] = React.useState(false)
  const openWaitlist = React.useCallback(() => setIsWaitlistOpen(true), [])

  React.useEffect(() => {
    trackLandingEvent({
      eventName: "landing_view",
      source: "landing",
      oncePerSession: true,
    })

    const sections = document.querySelectorAll<HTMLElement>("main section[id]")
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          trackLandingEvent({
            eventName: "section_view",
            source: entry.target.id,
            oncePerSession: true,
          })
          sectionObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.45 }
    )

    sections.forEach((section) => sectionObserver.observe(section))

    const scrollMilestones = [25, 50, 75, 100]

    function handleScrollDepth() {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight
      const scrollDepth =
        scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100

      scrollMilestones.forEach((milestone) => {
        if (scrollDepth < milestone) {
          return
        }

        trackLandingEvent({
          eventName: "scroll_depth",
          source: `${milestone}%`,
          oncePerSession: true,
        })
      })
    }

    function handleTrackedClick(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const trackedElement = target.closest<HTMLElement>("[data-track-event]")

      if (!trackedElement) {
        return
      }

      trackLandingEvent({
        eventName: trackedElement.dataset.trackEvent ?? "click",
        source: trackedElement.dataset.trackSource ?? "landing",
        detail: trackedElement.dataset.trackDetail,
      })
    }

    document.addEventListener("click", handleTrackedClick)
    window.addEventListener("scroll", handleScrollDepth, { passive: true })
    handleScrollDepth()

    return () => {
      sectionObserver.disconnect()
      document.removeEventListener("click", handleTrackedClick)
      window.removeEventListener("scroll", handleScrollDepth)
    }
  }, [])

  return (
    <div className="contable-landing min-h-svh overflow-x-clip selection:bg-[#4F8CFF]/25">
      <Navbar onOpenWaitlist={openWaitlist} />
      <main>
        <Hero onOpenWaitlist={openWaitlist} />
        <Problem />
        <Comparison />
        <NotSpreadsheet />
        <Features />
        <Trust />
        <Pricing onOpenWaitlist={openWaitlist} />
        <CtaFinal onOpenWaitlist={openWaitlist} />
      </main>
      <Footer />
      <WaitlistModal open={isWaitlistOpen} onOpenChange={setIsWaitlistOpen} />
    </div>
  )
}
