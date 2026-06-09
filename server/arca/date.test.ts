import { describe, expect, it } from "vitest"

import { toArcaDate } from "./date.js"

describe("toArcaDate", () => {
  it("uses the Argentina calendar date for timestamps", () => {
    expect(toArcaDate(new Date("2026-06-09T01:30:00.000Z"))).toBe("20260608")
  })

  it("preserves explicit input dates without timezone shifts", () => {
    expect(toArcaDate("2026-06-08")).toBe("20260608")
  })

  it("rejects impossible explicit dates", () => {
    expect(() => toArcaDate("2026-02-30")).toThrow("Invalid date")
  })
})
