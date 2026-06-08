import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ConfirmationSeverity = "destructive" | "primary" | "default"

type ConfirmationDialogProps = {
  actionLabel?: string
  cancelLabel?: string
  content?: ReactNode
  description: string
  disabled?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  severity?: ConfirmationSeverity
  title: string
}

const actionClassName: Record<ConfirmationSeverity, string> = {
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30",
  default:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/30",
}

export function ConfirmationDialog({
  actionLabel = "Confirmar",
  cancelLabel = "Cancelar",
  content,
  description,
  disabled = false,
  onConfirm,
  onOpenChange,
  open,
  severity = "default",
  title,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {content ? <div className="-mt-2">{content}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            className={cn(actionClassName[severity])}
            disabled={disabled}
            onClick={onConfirm}
            type="button"
          >
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
