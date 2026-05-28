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
          504
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
