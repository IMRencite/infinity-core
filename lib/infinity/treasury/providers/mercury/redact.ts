import { assertNoCredentialFields } from "../../security";
import type { MercuryCredentials } from "./config";

const SENSITIVE_KEYS = /token|secret|authorization|password|api[_-]?key|accountnumber|routingnumber|cardnumber|credential/i;

export function redactMercuryValue(value: string, credentials: MercuryCredentials | null): string {
  const withoutToken = credentials ? credentials.redact(value) : value;
  return withoutToken.replace(/\bBearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED_MERCURY_TOKEN]");
}

export function sanitizeMercuryObject<T>(value: T, credentials: MercuryCredentials | null): T {
  return walk(value, credentials) as T;
}

function walk(value: unknown, credentials: MercuryCredentials | null): unknown {
  if (typeof value === "string") return redactMercuryValue(value, credentials);
  if (Array.isArray(value)) return value.map((item) => walk(item, credentials));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = walk(nested, credentials);
    }
    return out;
  }
  return value;
}

export function mercurySafeErrorMessage(error: unknown, credentials: MercuryCredentials | null): string {
  if (error instanceof Error) return redactMercuryValue(error.message, credentials);
  return redactMercuryValue(String(error), credentials);
}

export function assertMercuryPayloadSafe(payload: unknown): string[] {
  return assertNoCredentialFields(payload);
}
