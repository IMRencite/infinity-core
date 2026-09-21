import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { NamedOutboundLoopGate } from "../closed-loop";

export const COMMUNICATION_REQUIRED_ROUTES = [
  "/api/runtime/communication-tick",
  "/api/runtime/communication-attest",
] as const;

export const COMMUNICATION_REQUIRED_TRACKED_FILES = [
  "app/api/runtime/communication-tick/route.ts",
  "app/api/runtime/communication-attest/route.ts",
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
