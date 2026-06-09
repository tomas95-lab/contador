import { describe, expect, it } from "vitest"

import { ArcaError } from "./errors.js"
import { isAmbiguousArcaAuthorizationTimeout } from "./timeout.js"

describe("isAmbiguousArcaAuthorizationTimeout", () => {
  it("identifies authorization timeouts as ambiguous", () => {
    expect(
      isAmbiguousArcaAuthorizationTimeout(
        new ArcaError("timeout", 504, { operation: "FECAESolicitar" })
      )
    ).toBe(true)
    expect(
      isAmbiguousArcaAuthorizationTimeout(
        new ArcaError("timeout", 504, { operation: "FEXAuthorize" })
      )
    ).toBe(true)
  })

  it("does not classify pre-authorization timeouts as ambiguous", () => {
    expect(
      isAmbiguousArcaAuthorizationTimeout(
        new ArcaError("timeout", 504, { operation: "loginCms" })
      )
    ).toBe(false)
  })
})
