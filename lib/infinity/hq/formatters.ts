export function displayCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "No data yet";
  }
  return String(value);
}

export function displayOptionalText(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "No data yet";
  }
  return value;
}

export function displayNotImplemented(label: string): string {
  return `${label} not implemented`;
}

export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/OPENAI_API_KEY[=:]\S+/gi, "OPENAI_API_KEY=[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}

export function formatIsoTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ageFromIso(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) {
    return null;
  }
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

export function parseContextBlockingReason(context: unknown): string | null {
  if (typeof context !== "object" || context === null || Array.isArray(context)) {
    return null;
  }
  const blocking = (context as Record<string, unknown>).blockingReason;
  return typeof blocking === "string" ? blocking : null;
}
