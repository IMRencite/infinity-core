export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length ? trimmed : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.replace(/\s+/g, " ").trim();
      const record = asRecord(item);
      return asString(record?.claim) ?? asString(record?.observation) ?? asString(record?.title) ?? "";
    })
    .filter(Boolean);
}

export function packageValue(record: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const direct = asString(record[key]);
    if (direct) return direct;
    const nested = asRecord(record[key]);
    const nestedValue = nested ? asString(nested.value) ?? asString(nested.workingName) ?? asString(nested.displayName) : null;
    if (nestedValue) return nestedValue;
  }
  return null;
}
