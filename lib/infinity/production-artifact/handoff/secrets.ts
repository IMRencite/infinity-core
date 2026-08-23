import { assertNoSecretsInContent } from "@/lib/infinity/production-artifact/types";

const SECRET_VALUE_PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/,
  /sk-(?:live|test)?[_-]?[a-zA-Z0-9]{16,}/,
  /sk_live_[a-zA-Z0-9]{16,}/,
  /rk_live_[a-zA-Z0-9]{16,}/,
  /whsec_[a-zA-Z0-9]{16,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE|VERCEL_TOKEN|GITHUB_TOKEN/i,
];

const SECRET_ASSIGNMENT = /(?:api[_-]?key|secret|password|token|private[_-]?key|credential)\s*[:=]\s*['"][^'"]{8,}['"]/i;

const ALLOWED_KEYS = new Set([
  "key",
  "handoffId",
  "ventureId",
  "companyId",
  "missionId",
  "buildContractId",
  "ventureSystemsBuildContractId",
  "pabBuildRunId",
  "pabArtifactId",
  "codeChangeSetId",
  "codingTaskId",
  "artifactId",
  "sourceRef",
  "provider",
  "model",
  "schemaVersion",
  "source",
  "summary",
  "status",
  "kind",
  "path",
]);

export function scanValueForSecrets(value: string, path: string): string[] {
  const hits: string[] = [];
  try {
    assertNoSecretsInContent(value, path);
  } catch (error) {
    hits.push(error instanceof Error ? error.message : `secret_pattern:${path}`);
  }
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(value)) hits.push(`secret_pattern:${path}`);
  }
  if (SECRET_ASSIGNMENT.test(value)) hits.push(`secret_assignment:${path}`);
  return [...new Set(hits)];
}

export function scanHandoffObjectForSecrets(value: unknown, path = "handoff"): string[] {
  if (typeof value === "string") {
    return scanValueForSecrets(value, path);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => scanHandoffObjectForSecrets(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      if (ALLOWED_KEYS.has(key) && typeof child === "string" && child.length < 200 && !SECRET_VALUE_PATTERNS.some((p) => p.test(child))) {
        return [];
      }
      if (key === "value" && typeof child === "string" && /(?:SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL)/i.test(path)) {
        return [`secret_value_field:${path}.${key}`];
      }
      return scanHandoffObjectForSecrets(child, `${path}.${key}`);
    });
  }
  return [];
}
