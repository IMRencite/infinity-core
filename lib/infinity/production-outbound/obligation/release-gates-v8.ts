import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { NamedOutboundLoopGate } from "../closed-loop";

/** Frozen 2026-09-21. Do not add evaluate*Gate functions. Release-path checks live in scripts/infinity-runtime-release.mjs. */
export const COMMUNICATION_GATES_FROZEN = true;
export const COMMUNICATION_RELEASE_PATH_CHECKS = [
  "clean_checkout",
  "identity_baked_into_artifact",
  "production_stage_skip_domain",
  "staged_smoke",
  "promote_staged_production_only",
  "wait_real_cron_route",
  "rollback_if_cron_absent",
] as const;

export const COMMUNICATION_REQUIRED_ROUTES = [
  "/api/runtime/communication-tick",
  "/api/runtime/communication-attest",
  "/api/runtime/communication-coverage",
] as const;

export const COMMUNICATION_REQUIRED_TRACKED_FILES = [
  "app/api/runtime/communication-tick/route.ts",
  "app/api/runtime/communication-attest/route.ts",
  "app/api/runtime/communication-coverage/route.ts",
  "lib/infinity/production-outbound/obligation/ownership-claim.ts",
  "lib/infinity/production-outbound/obligation/admission.ts",
  "lib/infinity/production-outbound/obligation/shadow-store.ts",
  "lib/infinity/production-outbound/obligation/cutover.ts",
  "supabase/migrations/20260920220000_communication_recovery_release_v7.sql",
] as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function cronPathsFromVercelJson(raw: string): string[] {
  const parsed = JSON.parse(raw) as { crons?: Array<{ path?: string }> };
  return (parsed.crons ?? []).map((row) => row.path ?? "").filter(Boolean);
}

export function evaluateCronRouteExistsGate(input: {
  cron_paths: string[];
  built_routes: string[];
}): NamedOutboundLoopGate {
  const missing = input.cron_paths.filter((path) => !input.built_routes.includes(path));
  return named("CronRouteExistsGate", missing.length ? "FAIL" : "PASS", missing.length ? missing : ["ALL_CRON_ROUTES_BUILT"]);
}

export function evaluateTrackedRuntimeSourceGate(input: {
  required_files: string[];
  tracked_files: string[];
  dirty_required: string[];
}): NamedOutboundLoopGate {
  const untracked = input.required_files.filter((file) => !input.tracked_files.includes(file));
  const dirty = input.dirty_required;
  const fail = untracked.length > 0 || dirty.length > 0;
  return named("TrackedRuntimeSourceGate", fail ? "FAIL" : "PASS", fail ? [...untracked, ...dirty] : ["ALL_REQUIRED_TRACKED"]);
}

export function evaluateServingEvidenceBindingGate(input: {
  evidence_deployment: string | null;
  serving_deployment: string | null;
  evidence_content_hash: string | null;
  serving_content_hash: string | null;
  fresh: boolean;
}): NamedOutboundLoopGate {
  const bound = Boolean(input.evidence_deployment)
    && input.evidence_deployment === input.serving_deployment
    && Boolean(input.evidence_content_hash)
    && input.evidence_content_hash === input.serving_content_hash
    && input.fresh;
  return named("ServingEvidenceBindingGate", bound ? "PASS" : "FAIL", [
    bound ? "BOUND_TO_SERVING" : "STALE_OR_MISBOUND",
  ]);
}

export function computeIndependentBuildGraphHash(input: {
  cron_paths: string[];
  route_files: Record<string, string>;
  package_name: string;
  dependency_names: string[];
}): string {
  const hash = createHash("sha256");
  hash.update("communication-runtime-build-graph-v8\n");
  hash.update(input.cron_paths.slice().sort().join("\n"));
  hash.update("\n");
  hash.update(input.package_name);
  hash.update("\n");
  hash.update(input.dependency_names.slice().sort().join("\n"));
  hash.update("\n");
  for (const file of Object.keys(input.route_files).sort()) {
    hash.update(file);
    hash.update("\n");
    hash.update(createHash("sha256").update(input.route_files[file]).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function evaluateCronHostParityGate(input: {
  domain_deployment: string | null;
  production_current: string | null;
  cron_configuration: string | null;
  cron_invocation_reached_expected_route: boolean;
  heartbeat_committed: boolean;
}): NamedOutboundLoopGate {
  const domainMatch = Boolean(input.domain_deployment) && input.domain_deployment === input.production_current;
  const cronMatch = Boolean(input.production_current) && input.production_current === input.cron_configuration;
  const pass = domainMatch && cronMatch && input.cron_invocation_reached_expected_route && input.heartbeat_committed;
  return named("CronHostParityGate", pass ? "PASS" : "FAIL", [
    domainMatch ? "DOMAIN_EQUALS_PRODUCTION" : "DOMAIN_PRODUCTION_SPLIT",
    cronMatch ? "PRODUCTION_EQUALS_CRON_HOST" : "PRODUCTION_CRON_SPLIT",
    input.cron_invocation_reached_expected_route ? "CRON_REACHED_ROUTE" : "CRON_ROUTE_NOT_REACHED",
    input.heartbeat_committed ? "HEARTBEAT_COMMITTED" : "HEARTBEAT_MISSING",
  ]);
}

export function evaluateFullRuntimeRollbackGate(input: {
  domain_restored: boolean;
  production_current_restored: boolean;
  cron_state_verified: boolean;
  real_cron_invocation: boolean;
  heartbeat_restored: boolean;
  provider_read_restored: boolean;
}): NamedOutboundLoopGate {
  const pass = input.domain_restored
    && input.production_current_restored
    && input.cron_state_verified
    && input.real_cron_invocation
    && input.heartbeat_restored
    && input.provider_read_restored;
  return named("FullRuntimeRollbackGate", pass ? "PASS" : "FAIL", [
    input.domain_restored ? "DOMAIN_RESTORED" : "DOMAIN_NOT_RESTORED",
    input.production_current_restored ? "PRODUCTION_CURRENT_RESTORED" : "PRODUCTION_CURRENT_NOT_RESTORED",
    input.cron_state_verified ? "CRON_STATE_VERIFIED" : "CRON_STATE_UNVERIFIED",
    input.real_cron_invocation ? "REAL_CRON_SEEN" : "REAL_CRON_NOT_SEEN",
    input.heartbeat_restored ? "HEARTBEAT_RESTORED" : "HEARTBEAT_NOT_RESTORED",
    input.provider_read_restored ? "PROVIDER_READ_RESTORED" : "PROVIDER_READ_NOT_RESTORED",
  ]);
}

export function evaluateEnvScopeParityGate(input: {
  preview_names: string[];
  production_names: string[];
  required: string[];
}): NamedOutboundLoopGate {
  const missingPreview = input.required.filter((key) => !input.preview_names.includes(key));
  const missingProduction = input.required.filter((key) => !input.production_names.includes(key));
  const fail = missingPreview.length + missingProduction.length > 0;
  return named("EnvScopeParityGate", fail ? "FAIL" : "PASS", fail
    ? [...missingPreview.map((key) => `PREVIEW_MISSING_${key}`), ...missingProduction.map((key) => `PRODUCTION_MISSING_${key}`)]
    : ["REQUIRED_NAMES_PRESENT_BOTH_SCOPES"]);
}

export function evaluateCommunicationBusinessLoopHealthGate(input: {
  scheduler: "PASS" | "FAIL" | "NOT_PROVEN";
  provider_auth: "PASS" | "FAIL" | "NOT_PROVEN";
  discovery: "PASS" | "PASS_IDLE" | "FAIL" | "NOT_IMPLEMENTED" | "NOT_PROVEN";
  worker: "PASS" | "PASS_IDLE" | "FAIL" | "NOT_IMPLEMENTED" | "NOT_PROVEN";
  watchdog: "PASS" | "PASS_IDLE" | "FAIL" | "NOT_IMPLEMENTED" | "NOT_PROVEN";
}): NamedOutboundLoopGate {
  const ok = (value: string) => value === "PASS" || value === "PASS_IDLE";
  const pass = ok(input.scheduler) && ok(input.provider_auth) && ok(input.discovery) && ok(input.worker) && ok(input.watchdog);
  return named("CommunicationBusinessLoopHealthGate", pass ? "PASS" : "FAIL", [
    `scheduler:${input.scheduler}`,
    `provider_auth:${input.provider_auth}`,
    `discovery:${input.discovery}`,
    `worker:${input.worker}`,
    `watchdog:${input.watchdog}`,
  ]);
}

export function evaluatePlatformCronTriggerEvidenceGate(input: {
  platform_record_found: boolean;
  deployment_matches: boolean;
  schedule_window_matches: boolean;
  auth_valid: boolean;
  no_manual_correlation: boolean;
  user_agent_compatible: boolean;
}): NamedOutboundLoopGate {
  if (!input.platform_record_found) return named("PlatformCronTriggerEvidenceGate", "FAIL", ["NOT_PROVEN"]);
  const pass = input.deployment_matches && input.schedule_window_matches && input.auth_valid && input.no_manual_correlation;
  return named("PlatformCronTriggerEvidenceGate", pass ? "PASS" : "FAIL", [
    pass ? "PLATFORM_RECORD_BOUND" : "PLATFORM_RECORD_INCOMPLETE",
    input.user_agent_compatible ? "UA_SUPPORTING" : "UA_NOT_EXPOSED",
  ]);
}

export function evaluateProviderTokenDurabilityGate(input: {
  publishing_status: "TESTING" | "IN_PRODUCTION" | "NOT_PROVEN";
  last_invalid_grant_at: string | null;
}): NamedOutboundLoopGate {
  if (input.publishing_status === "NOT_PROVEN") return named("ProviderTokenDurabilityGate", "FAIL", ["NOT_PROVEN"]);
  if (input.publishing_status === "TESTING") return named("ProviderTokenDurabilityGate", "FAIL", ["TESTING_MODE_TIME_LIMITED"]);
  return named("ProviderTokenDurabilityGate", input.last_invalid_grant_at ? "FAIL" : "PASS", [
    input.last_invalid_grant_at ? "INVALID_GRANT_SEEN" : "PRODUCTION_CONSENT",
  ]);
}

export function evaluateBadPromotionCoverageGate(input: {
  scanned: boolean;
  uncovered: number;
}): NamedOutboundLoopGate {
  if (!input.scanned) return named("BadPromotionCoverageGate", "FAIL", ["NOT_SCANNED"]);
  return named("BadPromotionCoverageGate", input.uncovered === 0 ? "PASS" : "FAIL", [
    input.uncovered === 0 ? "NO_UNCOVERED" : `UNCOVERED_${input.uncovered}`,
  ]);
}

export function readRequiredRouteFiles(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const rel of COMMUNICATION_REQUIRED_TRACKED_FILES) {
    const full = join(root, rel);
    if (existsSync(full)) files[rel] = readFileSync(full, "utf8");
  }
  return files;
}
