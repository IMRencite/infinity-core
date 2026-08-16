const SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/g,
  /github_pat_[a-zA-Z0-9_]{20,}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /\bBearer\s+[a-zA-Z0-9._-]{20,}/gi,
];

export function redactSecrets(value: string): string {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED_SECRET]");
  }
  return out;
}

export function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSecrets(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactUnknown);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|api_key|authorization/i.test(k)) {
        out[k] = "[REDACTED_FIELD]";
      } else {
        out[k] = redactUnknown(v);
      }
    }
    return out;
  }
  return value;
}

export function assertNoSecretsInPayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  const redacted = redactSecrets(serialized);
  if (redacted !== serialized) {
    throw new Error("Secret-like content detected in payload");
  }
}
