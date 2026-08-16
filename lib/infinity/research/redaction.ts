const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{10,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /GEMINI_API_KEY\s*=\s*\S+/gi,
  /GOOGLE_API_KEY\s*=\s*\S+/gi,
  /OPENAI_API_KEY\s*=\s*\S+/gi,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/gi,
  /Bearer\s+[A-Za-z0-9._-]{20,}/gi,
];

export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

export function containsSecretMaterial(text: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

export function assertNoSecretsInPayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (containsSecretMaterial(serialized)) {
    throw new Error("Secret material detected in research payload.");
  }
}
