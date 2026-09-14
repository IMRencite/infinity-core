import { FORBIDDEN_TREASURY_SERIALIZATION_FIELDS } from "./constants";

const SAFE_POLICY_FIELD_KEYS = new Set([
  "authorizationSource",
  "authorization_source",
  "authorization_state",
  "remaining_authorization",
  "remainingAuthorization",
  "authorized_capital",
  "authorizedCapital",
  "authorized_amount",
  "authorizedAmount",
  "authorized_at",
  "authorizedAt",
  "authorized_by",
  "authorizedBy",
  "authorizedActor",
  "authorized_actor",
  "provider_account_reference",
  "providerAccountReference",
  "founder_decision",
  "tokenVisible",
  "cash_completeness",
  "authorizationRequired",
  "authorization_required",
]);

const EXTRA_FORBIDDEN_NORMALIZED = [
  "apikey",
  "apitoken",
  "accesstoken",
  "refreshtoken",
  "clientsecret",
  "password",
  "privatekey",
  "routingnumber",
  "accountnumber",
  "credential",
  "credentials",
  "webhooksecret",
  "banklogin",
  "cardnumber",
  "mercuryapitoken",
  "authorizationheader",
  "secret",
] as const;

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

const SAFE_POLICY_NORMALIZED = new Set([...SAFE_POLICY_FIELD_KEYS].map(normalizeKey));
const EXACT_FORBIDDEN_NORMALIZED = new Set([
  ...FORBIDDEN_TREASURY_SERIALIZATION_FIELDS.map(normalizeKey),
  ...EXTRA_FORBIDDEN_NORMALIZED,
]);

export function isForbiddenTreasuryCredentialKey(key: string): boolean {
  if (SAFE_POLICY_FIELD_KEYS.has(key) || SAFE_POLICY_NORMALIZED.has(normalizeKey(key))) return false;
  const normalized = normalizeKey(key);
  if (EXACT_FORBIDDEN_NORMALIZED.has(normalized)) return true;
  return normalized === "authorization";
}

export function assertNoCredentialFields(value: unknown, path = "root"): string[] {
  const violations: string[] = [];
  walk(value, path, violations);
  return violations;
}

function walk(value: unknown, path: string, violations: string[]): void {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, violations));
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenTreasuryCredentialKey(key)) {
      violations.push(`${path}.${key}`);
    }
    walk(nested, `${path}.${key}`, violations);
  }
}

export function orgScoped<T extends { organizationId: string }>(rows: T[], organizationId: string): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}
