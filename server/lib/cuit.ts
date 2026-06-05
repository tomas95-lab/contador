import { ArcaError } from "../arca/errors.js"

const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

export function normalizeCuit(value: string): string {
  const cuit = value.replace(/\D/g, "")

  if (cuit.length !== 11) {
    throw new ArcaError("Ingresá un CUIT válido de 11 dígitos.", 400)
  }

  if (!isValidCuit(cuit)) {
    throw new ArcaError(
      "Ingresá un CUIT válido: el dígito verificador no coincide.",
      400
    )
  }

  return cuit
}

export function isValidCuit(value: string): boolean {
  const cuit = value.replace(/\D/g, "")

  if (!/^\d{11}$/.test(cuit) || /^(\d)\1{10}$/.test(cuit)) {
    return false
  }

  return Number(cuit.at(-1)) === calculateCuitCheckDigit(cuit.slice(0, 10))
}

export function calculateCuitCheckDigit(firstTenDigits: string): number {
  if (!/^\d{10}$/.test(firstTenDigits)) {
    throw new ArcaError("Ingresá un CUIT válido de 11 dígitos.", 400)
  }

  const sum = firstTenDigits
    .split("")
    .reduce(
      (total, digit, index) => total + Number(digit) * CUIT_WEIGHTS[index],
      0
    )
  const remainder = sum % 11
  const checkDigit = 11 - remainder

  if (checkDigit === 11) {
    return 0
  }

  if (checkDigit === 10) {
    return 9
  }

  return checkDigit
}
