const ARCA_DATE_RE = /^\d{8}$/;

export function toArcaDate(input: Date | string = new Date()): string {
  if (typeof input === "string") {
    if (ARCA_DATE_RE.test(input)) {
      return input;
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${input}`);
    }

    return toArcaDate(parsed);
  }

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function fromArcaDate(input?: string | null): string | null {
  if (!input || !ARCA_DATE_RE.test(input)) {
    return input ?? null;
  }

  return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`;
}

export function isoDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
