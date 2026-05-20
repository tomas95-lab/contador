import type { ReactNode } from "react"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CardModifiedProps = {
  title: ReactNode
  description: string
  action: ReactNode
  footerMain?: string
  footerSub?: string
  variant?: "default" | "warning" | "success"
  className?: string
}

export default function CardModified({
  title,
  description,
  action,
  footerMain,
  footerSub,
  variant = "default",
  className,
}: CardModifiedProps) {
  return (
    <Card
      className={cn(
        "@container/card rounded-lg shadow-none",
        variant === "warning" &&
          "border-amber-200 dark:border-amber-900",
        variant === "success" &&
          "border-emerald-200 dark:border-emerald-900",
        className
      )}
    >
      <CardHeader>
        <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {description}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {title}
        </CardTitle>
        <CardAction>{action}</CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-0.5 text-sm">
        {footerMain && (
          <span className="font-medium text-foreground">{footerMain}</span>
        )}
        {footerSub && (
          <span className="text-xs text-muted-foreground">{footerSub}</span>
        )}
      </CardFooter>
    </Card>
  )
}
