"use client"

import * as React from "react"
import { SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatARS } from "@/lib/accounting"
import type { UserFiscalProfile } from "@/types/accounting"

type FiscalProfileCardProps = {
  profile: UserFiscalProfile
  onSave: (profile: UserFiscalProfile) => Promise<void>
}

const workStatusOptions = [
  "Freelance",
  "Prestador de servicios",
  "Comercio",
  "Profesional independiente",
  "Relación de dependencia + monotributo",
  "Emprendimiento",
]

const categoryOptions = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]

const specialCaseOptions = [
  {
    label: "Cripto",
    note: "Tengo operaciones con cripto o cobros en stablecoins.",
  },
  {
    label: "Exterior",
    note: "Tengo clientes del exterior o facturas de exportación.",
  },
  {
    label: "Dependencia",
    note: "También trabajo en relación de dependencia.",
  },
]

export function FiscalProfileCard({ onSave, profile }: FiscalProfileCardProps) {
  const [draft, setDraft] = React.useState(profile)
  const [incomeInput, setIncomeInput] = React.useState(
    formatIncomeInput(profile.expectedMonthlyIncome)
  )
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setDraft(profile)
    setIncomeInput(formatIncomeInput(profile.expectedMonthlyIncome))
  }, [profile])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      await onSave({
        ...draft,
        activity: draft.activity.trim(),
        workStatus: draft.workStatus.trim(),
        currentCategory: draft.currentCategory.trim(),
        notes: draft.notes.trim(),
      })
    } finally {
      setIsSaving(false)
    }
  }

  function toggleSpecialCase(note: string, checked: boolean) {
    setDraft((current) => {
      const notes = current.notes
      const nextNotes = checked
        ? appendNote(notes, note)
        : notes.replace(note, "").replace(/\n{3,}/g, "\n\n").trim()

      return {
        ...current,
        notes: nextNotes,
      }
    })
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <CardTitle>Tu situación para Conta</CardTitle>
        <CardDescription>
          Contale tu situación una vez y la IA la usa en cada respuesta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="activity">Actividad</Label>
            <Input
              id="activity"
              placeholder="Ej: desarrollo web, diseño, clases"
              value={draft.activity}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  activity: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de trabajo</Label>
            <Select
              value={draft.workStatus || undefined}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  workStatus: value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {workStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={draft.currentCategory || undefined}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    currentCategory: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Cat." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected-income">Ingreso mensual estimado</Label>
              <Input
                id="expected-income"
                inputMode="decimal"
                placeholder="Ej: 2, 500, 500k o 500000"
                type="text"
                value={incomeInput}
                onChange={(event) => {
                  const value = event.target.value

                  setIncomeInput(value)
                  setDraft((current) => ({
                    ...current,
                    expectedMonthlyIncome: parseIncomeInput(value),
                  }))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Atajos: 2 = $2.000.000, 500 = $500.000.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Casos especiales</Label>
            <div className="grid gap-2">
              {specialCaseOptions.map((option) => (
                <label
                  className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                  key={option.label}
                >
                  <Checkbox
                    checked={draft.notes.includes(option.note)}
                    onCheckedChange={(checked) =>
                      toggleSpecialCase(option.note, checked === true)
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Situación y objetivos</Label>
            <Textarea
              id="notes"
              placeholder="Ej: estoy arrancando, cobro por proyectos, quiero no pasarme de categoría, tengo clientes del exterior..."
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          {draft.expectedMonthlyIncome ? (
            <p className="text-xs text-muted-foreground">
              Proyección simple: {formatARS(draft.expectedMonthlyIncome * 12)}{" "}
              al año.
            </p>
          ) : null}
          <Button className="w-full" disabled={isSaving} type="submit">
            <SaveIcon />
            {isSaving ? "Guardando..." : "Guardar tu situación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function appendNote(notes: string, note: string) {
  if (notes.includes(note)) {
    return notes
  }

  return [notes.trim(), note].filter(Boolean).join("\n")
}

function formatIncomeInput(value: number | null) {
  return value === null ? "" : String(value)
}

function parseIncomeInput(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")

  if (!normalized) {
    return null
  }

  if (normalized.endsWith("m")) {
    return Number(normalized.replace("m", "")) * 1000000
  }

  if (normalized.endsWith("k")) {
    return Number(normalized.replace("k", "")) * 1000
  }

  const parsedValue = Number(normalized)

  if (!Number.isFinite(parsedValue)) {
    return null
  }

  if (parsedValue > 0 && parsedValue < 100) {
    return parsedValue * 1000000
  }

  if (parsedValue >= 100 && parsedValue < 1000) {
    return parsedValue * 1000
  }

  return parsedValue
}
