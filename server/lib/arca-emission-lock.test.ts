import { describe, expect, it } from "vitest"

import { buildArcaEmissionLockKey } from "./arca-emission-lock.js"

describe("buildArcaEmissionLockKey", () => {
  it("isolates emissions by environment, user, type and point of sale", () => {
    expect(
      buildArcaEmissionLockKey({
        environment: "production",
        invoiceType: "C",
        pointOfSale: 4,
        userId: "user-1",
      })
    ).toBe("production:user-1:C:4")
  })
})
