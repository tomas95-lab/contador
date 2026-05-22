import { CalendarDaysIcon, DatabaseIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type SiteHeaderProps = {
  title: string
  description: string
  dataStatus: "loading" | "connected" | "local" | "demo" | "error"
}

const dataStatusLabel = {
  loading: "Conectando",
  connected: "Supabase",
  local: "Local",
  demo: "Demo",
  error: "Sin sync",
} satisfies Record<SiteHeaderProps["dataStatus"], string>

export function SiteHeader({
  dataStatus,
  description,
  title,
}: SiteHeaderProps) {
  const period = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium">{title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>
        <Badge variant="outline" className="hidden gap-1 md:flex">
          <CalendarDaysIcon />
          {period}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "gap-1",
            dataStatus === "connected" &&
              "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
            dataStatus === "demo" &&
              "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
            dataStatus === "error" &&
              "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
          )}
        >
          <DatabaseIcon />
          {dataStatusLabel[dataStatus]}
        </Badge>
      </div>
    </header>
  )
}
