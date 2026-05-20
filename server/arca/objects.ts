export type UnknownRecord = Record<string, unknown>;

export function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}
