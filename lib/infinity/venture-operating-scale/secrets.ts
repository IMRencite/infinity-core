import type { SecretReference, VentureOperationalRecord } from "./types";

const RAW_SECRET = /ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}|sk_live_|sk_test_|rk_live_|whsec_/i;
const RAW_VALUE_KEYS = /api[_-]?key|secret|token|password|private[_-]?key|authorization/i;

export function envSecretReference(key: string): SecretReference {
  return { kind: "ENV_KEY", key, rawSecretStored: false };
}

export function unconfiguredSecretReference(): SecretReference {
  return { kind: "UNCONFIGURED", key: null, rawSecretStored: false };
}

export function recordContainsRawSecrets(record: VentureOperationalRecord | unknown): boolean {
  const serialized = JSON.stringify(record);
  if (RAW_SECRET.test(serialized)) return true;
  const walk = (value: unknown, key = ""): boolean => {
    if (value == null) return false;
    if (typeof value === "string" && RAW_VALUE_KEYS.test(key) && value.length > 8 && value !== "UNCONFIGURED") {
      return true;
    }
    if (Array.isArray(value)) return value.some((item) => walk(item, key));
    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).some(([next, item]) => walk(item, next));
    }
    return false;
  };
  return walk(record);
}

export function enforceSecretReferences(record: VentureOperationalRecord): "PASS" | "FAIL" {
  if (recordContainsRawSecrets(record)) return "FAIL";
  if (record.payment_account_binding.rawSecretStored !== false) return "FAIL";
  if (record.payment_webhooks.rawSecretStored !== false) return "FAIL";
  if (record.secret_references.some((row) => row.rawSecretStored !== false)) return "FAIL";
  return "PASS";
}
