import { HQ_PRODUCTION_ERROR_CORRELATION_GATE, type HqNamedGate } from "./contract";

export const HQ_PRODUCTION_ERROR_CORRELATION_FIELDS = [
  "request_id",
  "route",
  "deployment_id",
  "safe_digest",
  "error_class",
  "stage",
  "timestamp",
] as const;

export const HQ_PRODUCTION_ERROR_FORBIDDEN_FIELDS = [
  "cookies",
  "tokens",
  "passwords",
  "authorization",
  "cookie",
  "set-cookie",
  "email",
  "pii",
] as const;

export type HqProductionErrorRecord = {
  request_id: string | null;
  route: string;
  deployment_id: string | null;
  safe_digest: string | null;
  error_class: string;
  stage: string;
  timestamp: string;
};

export function classifyHqSafeErrorClass(error: unknown): string {
  if (error && typeof error === "object" && "error_class" in error && typeof error.error_class === "string") {
    return error.error_class;
  }
  if (error instanceof Error) {
    const message = error.message.split(":")[0]?.trim() || error.name;
    if (message === "FROZEN_BUNDLE_SNAPSHOT_MISSING") return "FROZEN_BUNDLE_SNAPSHOT_MISSING";
    if (message === "FROZEN_BUNDLE_FILES_MISSING") return "FROZEN_BUNDLE_FILES_MISSING";
    if (message.startsWith("legal_predecessor")) return "LEGAL_PREDECESSOR_DRIFT";
    if (error.name === "FrozenBundleSnapshotMissingError") return "FROZEN_BUNDLE_SNAPSHOT_MISSING";
    return error.name || "ERROR";
  }
  return "UNKNOWN_ERROR";
}

export function hqProductionErrorRecord(input: {
  route: string;
  error_class: string;
  stage: string;
  request_id?: string | null;
  deployment_id?: string | null;
  safe_digest?: string | null;
}): HqProductionErrorRecord {
  return {
    request_id: input.request_id ?? process.env.VERCEL_REQUEST_ID ?? null,
    route: input.route,
    deployment_id: input.deployment_id ?? process.env.VERCEL_DEPLOYMENT_ID ?? null,
    safe_digest: input.safe_digest ?? null,
    error_class: input.error_class,
    stage: input.stage,
    timestamp: new Date().toISOString(),
  };
}

export function logHqProductionError(input: {
  route: string;
  error_class: string;
  stage: string;
  request_id?: string | null;
  deployment_id?: string | null;
  safe_digest?: string | null;
}): HqProductionErrorRecord {
  const record = hqProductionErrorRecord(input);
  console.error("[hq-production-error]", record);
  return record;
}

export function evaluateHQProductionErrorCorrelationGate(input: {
  retainsSafeFields: boolean;
  storesSecretsOrPii: boolean;
  currentBrowserErrorCorrelated: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.retainsSafeFields) reasons.push("SAFE_FIELDS_MISSING");
  if (input.storesSecretsOrPii) reasons.push("SECRET_OR_PII_RETAINED");
  if (!input.currentBrowserErrorCorrelated) reasons.push("BROWSER_ERROR_NOT_CORRELATED");
  return {
    gate: HQ_PRODUCTION_ERROR_CORRELATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PRODUCTION_ERRORS_CORRELATABLE"],
  };
}
