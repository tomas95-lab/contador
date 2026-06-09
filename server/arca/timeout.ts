import { config } from "../config.js"
import { ArcaError } from "./errors.js"

export async function withArcaRequestTimeout<T>(
  operation: string,
  promise: Promise<T>
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        new ArcaError(
          `${operation} timed out after ${config.arca.requestTimeoutMs}ms.`,
          504,
          { operation }
        )
      )
    }, config.arca.requestTimeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export function isAmbiguousArcaAuthorizationTimeout(error: unknown) {
  if (!(error instanceof ArcaError) || error.statusCode !== 504) {
    return false
  }

  const operation =
    error.details &&
    typeof error.details === "object" &&
    "operation" in error.details
      ? String(error.details.operation)
      : ""

  return operation === "FECAESolicitar" || operation === "FEXAuthorize"
}
