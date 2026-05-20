export class ArcaError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ArcaError";
  }
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function nonZeroCode(value: unknown): boolean {
  if (value == null || value === "") {
    return false;
  }

  return Number(value) !== 0;
}
