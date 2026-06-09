const ARCA_DATE_RE = /^\d{8}$/
const INPUT_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const argentinaDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
})

export function toArcaDate(input: Date | string = new Date()): string {
  if (typeof input === "string") {
    if (ARCA_DATE_RE.test(input)) {
      return input
    }

    const inputDateMatch = INPUT_DATE_RE.exec(input)

    if (inputDateMatch) {
      const [, year, month, day] = inputDateMatch

      if (!isValidInputDate(Number(year), Number(month), Number(day))) {
        throw new Error(`Invalid date: ${input}`)
      }

      return `${year}${month}${day}`
    }

    const parsed = new Date(input)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${input}`)
    }

    return toArcaDate(parsed)
  }

  const parts = Object.fromEntries(
    argentinaDateFormatter
      .formatToParts(input)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}${parts.month}${parts.day}`
}

export function fromArcaDate(input?: string | null): string | null {
  if (!input || !ARCA_DATE_RE.test(input)) {
    return input ?? null
  }

  return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`
}

export function isoDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function isValidInputDate(year: number, month: number, day: number) {
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}
