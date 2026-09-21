const SECRET = /(secret|authorization|api[_-]?key|token|password|bearer\s+[a-z0-9._-]+|sk_live_|routing number|ssn)/i;
const PII = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export function sanitizeRuntimeError(value: unknown): string {
  const text = typeof value === "string" ? value : value instanceof Error ? value.message : "RUNTIME_ERROR";
  return text.replace(PII, "[redacted]").replace(SECRET, "[redacted]").slice(0, 240);
}

export function runtimePayloadLeaksSecrets(payload: unknown): boolean {
  const raw = JSON.stringify(payload);
  return SECRET.test(raw) && /CRON_SECRET|SERVICE_ROLE|sk_live_|Bearer\s+[A-Za-z0-9]{12,}/.test(raw);
}
