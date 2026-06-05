import { describe, expect, it } from "vitest"

import { calculateCuitCheckDigit, isValidCuit, normalizeCuit } from "./cuit.js"
import { ArcaError } from "../arca/errors.js"

describe("CUIT validation", () => {
  it("accepts valid CUITs with or without hyphens", () => {
    expect(normalizeCuit("20-12345678-6")).toBe("20123456786")
    expect(normalizeCuit("30-71234567-1")).toBe("30712345671")
    expect(isValidCuit("27-30111222-5")).toBe(true)
  })

  it("rejects invalid checksum", () => {
    expect(() => normalizeCuit("20-12345678-3")).toThrow(ArcaError)
    expect(() => normalizeCuit("20-12345678-3")).toThrow(
      "el dígito verificador no coincide"
    )
  })

  it("rejects malformed CUITs", () => {
    expect(isValidCuit("00000000000")).toBe(false)
    expect(() => normalizeCuit("20-12345678")).toThrow(
      "CUIT válido de 11 dígitos"
    )
  })

  it("calculates check digit with modulo 11 weights", () => {
    expect(calculateCuitCheckDigit("2012345678")).toBe(6)
    expect(calculateCuitCheckDigit("3071234567")).toBe(1)
  })
})
