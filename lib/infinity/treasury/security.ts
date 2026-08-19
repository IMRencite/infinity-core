import { FORBIDDEN_TREASURY_SERIALIZATION_FIELDS } from "./constants";

const FORBIDDEN_PATTERN = /secret|token|authorization|api[_-]?key|password|cardnumber|cvv|cvc|pin|credential|banklogin|routingnumber|accountnumber|privatekey|clientsecret|webhooksecret/i;

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
    if (FORBIDDEN_TREASURY_SERIALIZATION_FIELDS.includes(key as (typeof FORBIDDEN_TREASURY_SERIALIZATION_FIELDS)[number]) || FORBIDDEN_PATTERN.test(key)) {
      violations.push(`${path}.${key}`);
    }
    walk(nested, `${path}.${key}`, violations);
  }
}

export function orgScoped<T extends { organizationId: string }>(rows: T[], organizationId: string): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}
