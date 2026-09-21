import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
  getCommunicationCutoverEpochValue,
  setCommunicationCutoverEpochValue,
  type CommunicationCutoverEpoch,
} from "./cutover";
import { CONVERSATION_PLANNER_VERSION } from "../conversation-planner";
import { attachEvidenceClass, type GateEvidenceClass, type GatedEvidence } from "./evidence";
import { COMMUNICATION_STALE_HEARTBEAT_MS } from "./pacing";

export const COMMUNICATION_INTENDED_RELEASE_SCOPE = "communication-intended-release-v1" as const;
export const COMMUNICATION_CUTOVER_EPOCH_SCOPE = "communication-cutover-epoch-v1" as const;
export const COMMUNICATION_SCHEMA_VERSION = "communication-recovery-release-v8" as const;
export type { CommunicationCutoverEpoch };

export type CommunicationIntendedRelease = {
  release_id: string;
  intended_git_sha: string;
  expected_deployment_target: "infinity-runtime" | "infinity-hq";
  expected_deployment_id: string | null;
  communication_schema_version: string;
  planner_version: typeof CONVERSATION_PLANNER_VERSION;
  cutover_epoch: CommunicationCutoverEpoch;
  created_at: string;
  status: "INTENDED" | "BUILDING" | "BUILD_FAILED" | "PROMOTED" | "OBSERVED_RUNNING" | "FAILED" | "SUPERSEDED";
};

export type CommunicationCutoverEpochRecord = {
  epoch: CommunicationCutoverEpoch;
  cohort_thread_id: string;
  updated_at: string;
  reversible: true;
  preserves: ["obligation_history", "outbound_ledger", "suppression", "provider_identity"];
};

export type ObservedRuntimeIdentity = {
  runtime_name: string;
  git_sha: string | null;
  deployment_id: string | null;
  cutover_epoch_seen: CommunicationCutoverEpoch | string | null;
  build_version: string | null;
  invoked_by: "cron" | "manual" | "recovery" | "synthetic_canary" | string | null;
  started_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  work_seen: number;
  work_claimed: number;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let intendedMemory: CommunicationIntendedRelease | null = null;
let epochUpdatedAt = "1970-01-01T00:00:00.000Z";

export function resetCommunicationReleaseState(): void {
  intendedMemory = null;
  epochUpdatedAt = "1970-01-01T00:00:00.000Z";
  setCommunicationCutoverEpochValue("LEGACY");
}

export function getCommunicationIntendedRelease(): CommunicationIntendedRelease | null {
  return intendedMemory;
}

export function getCommunicationCutoverEpoch(): CommunicationCutoverEpochRecord {
  return {
    epoch: getCommunicationCutoverEpochValue(),
    cohort_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    updated_at: epochUpdatedAt,
    reversible: true,
    preserves: ["obligation_history", "outbound_ledger", "suppression", "provider_identity"],
  };
}

export function persistCommunicationIntendedRelease(release: CommunicationIntendedRelease): CommunicationIntendedRelease {
  intendedMemory = release;
  return release;
}

export function flipCommunicationCutoverEpoch(epoch: CommunicationCutoverEpoch, now: string): CommunicationCutoverEpochRecord {
  setCommunicationCutoverEpochValue(epoch);
  epochUpdatedAt = now;
  return getCommunicationCutoverEpoch();
}

export function vercelRuntimeIdentity(): {
  git_sha: string | null;
  deployment_id: string | null;
  env: string | null;
  release_sha: string | null;
  release_tree_hash: string | null;
  build_graph_hash: string | null;
  release_dirty: boolean;
  deployable_unit: "infinity-runtime";
  schema_version_required: string;
} {
  const bakedSha = process.env.COMMUNICATION_RELEASE_SHA || process.env.COMMUNICATION_INTENDED_GIT_SHA || "";
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const sha = bakedSha || vercelSha || null;
  return {
    git_sha: sha,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    env: process.env.VERCEL_ENV ?? null,
    release_sha: bakedSha || null,
    release_tree_hash: process.env.COMMUNICATION_RELEASE_TREE_HASH || null,
    build_graph_hash: process.env.COMMUNICATION_BUILD_GRAPH_HASH || null,
    release_dirty: process.env.COMMUNICATION_RELEASE_DIRTY === "true",
    deployable_unit: "infinity-runtime",
    schema_version_required: COMMUNICATION_SCHEMA_VERSION,
  };
}

export function evaluateProductionReleaseParityGate(input: {
  intended_git_sha: string | null;
  intended_deployment_id: string | null;
  promoted_deployment_id: string | null;
  observed_git_sha: string | null;
  observed_deployment_id: string | null;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.intended_git_sha)
    && Boolean(input.intended_deployment_id)
    && input.intended_git_sha === input.observed_git_sha
    && input.intended_deployment_id === input.promoted_deployment_id
    && input.intended_deployment_id === input.observed_deployment_id;
  return named("ProductionReleaseParityGate", pass ? "PASS" : "FAIL", [
    input.intended_git_sha ?? "NO_INTENDED_SHA",
    input.observed_git_sha ?? "NO_OBSERVED_SHA",
    input.promoted_deployment_id ?? "NO_PROMOTED",
    input.observed_deployment_id ?? "NO_OBSERVED_DPL",
  ]);
}

export function evaluateObservedReleaseParityGate(input: {
  intended: CommunicationIntendedRelease | null;
  observed: ObservedRuntimeIdentity | null;
  now: string;
}): NamedOutboundLoopGate {
  if (!input.intended || !input.observed) {
    return named("ObservedReleaseParityGate", "FAIL", ["MISSING_INTENDED_OR_OBSERVED"]);
  }
  const age = input.observed.last_success_at ? Date.parse(input.now) - Date.parse(input.observed.last_success_at) : Number.POSITIVE_INFINITY;
  const pass = input.intended.intended_git_sha === input.observed.git_sha
    && (input.intended.expected_deployment_id == null || input.intended.expected_deployment_id === input.observed.deployment_id)
    && input.intended.cutover_epoch === input.observed.cutover_epoch_seen
    && age <= COMMUNICATION_STALE_HEARTBEAT_MS;
  return named("ObservedReleaseParityGate", pass ? "PASS" : "FAIL", [
    input.observed.git_sha ?? "NO_SHA",
    input.observed.deployment_id ?? "NO_DPL",
    String(input.observed.cutover_epoch_seen ?? "NO_EPOCH"),
    Number.isFinite(age) ? `${age}ms` : "NO_HEARTBEAT",
  ]);
}

export function evaluateCommunicationCutoverEpochParityGate(input: {
  database_epoch: CommunicationCutoverEpoch;
  runtime_epoch_seen: string | null;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.runtime_epoch_seen) && input.database_epoch === input.runtime_epoch_seen;
  return named("CommunicationCutoverEpochParityGate", pass ? "PASS" : "FAIL", [input.database_epoch, input.runtime_epoch_seen ?? "UNSEEN"]);
}

export function evaluateCommunicationRuntimeIdentityGate(identity: ObservedRuntimeIdentity | null): NamedOutboundLoopGate {
  const pass = Boolean(identity?.runtime_name)
    && Boolean(identity?.git_sha || identity?.deployment_id)
    && Boolean(identity?.cutover_epoch_seen)
    && Boolean(identity?.invoked_by)
    && Boolean(identity?.started_at || identity?.last_success_at);
  return named("CommunicationRuntimeIdentityGate", pass ? "PASS" : "FAIL", [
    identity?.runtime_name ?? "NO_RUNTIME",
    identity?.git_sha ?? "NO_SHA",
    identity?.deployment_id ?? "NO_DPL",
    identity?.invoked_by ?? "NO_INVOKER",
  ]);
}

export function evaluateMainBranchDeployabilityGate(input: {
  ignore_build_errors: boolean;
  typecheck_bypass: boolean;
  production_target_builds: boolean;
}): NamedOutboundLoopGate {
  const pass = !input.ignore_build_errors && !input.typecheck_bypass && input.production_target_builds;
  return named("MainBranchDeployabilityGate", pass ? "PASS" : "FAIL", [
    input.ignore_build_errors ? "IGNORE_BUILD_ERRORS" : "TYPECHECK_ENFORCED",
    input.production_target_builds ? "TARGET_BUILDS" : "TARGET_CANNOT_BUILD",
  ]);
}

export function evaluateCrossDomainBuildIsolationGate(input: {
  isolated_runtime_project: boolean;
  blog_os_excluded_from_runtime_typecheck: boolean;
  ignore_build_errors: boolean;
}): NamedOutboundLoopGate {
  const pass = input.isolated_runtime_project && input.blog_os_excluded_from_runtime_typecheck && !input.ignore_build_errors;
  return named("CrossDomainBuildIsolationGate", pass ? "PASS" : "FAIL", [
    input.isolated_runtime_project ? "RUNTIME_PROJECT" : "SHARED_ONLY",
    input.blog_os_excluded_from_runtime_typecheck ? "BLOG_OS_EXCLUDED" : "BLOG_OS_IN_RUNTIME_TYPECHECK",
  ]);
}

export function evaluateReleaseDependencyIsolationGate(input: {
  blog_type_error_can_block_communication: boolean;
}): NamedOutboundLoopGate {
  return named(
    "ReleaseDependencyIsolationGate",
    input.blog_type_error_can_block_communication ? "FAIL" : "PASS",
    [input.blog_type_error_can_block_communication ? "SHARED_FATE" : "ISOLATED"],
  );
}

export function inspectIgnoreBuildErrorsProhibited(root = process.cwd()): NamedOutboundLoopGate {
  const config = readFileSync(join(root, "next.config.ts"), "utf8");
  const isolated = readFileSync(join(root, "scripts/infinity-runtime-isolated-deploy.mjs"), "utf8");
  const forbidden = /ignoreBuildErrors\s*:\s*true/.test(config) || /ignoreBuildErrors\s*:\s*true/.test(isolated);
  return named("IgnoreBuildErrorsProhibitedGate", forbidden ? "FAIL" : "PASS", [forbidden ? "UNSAFE_BYPASS" : "ENFORCED"]);
}

export function inspectRuntimeBlogOsTypecheckExclusion(root = process.cwd()): boolean {
  const isolated = readFileSync(join(root, "scripts/infinity-runtime-isolated-deploy.mjs"), "utf8");
  return isolated.includes("organic-growth-engine") && isolated.includes("BLOG_OS_STILL_IN_DEST");
}

export async function hydrateCommunicationReleaseState(): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  const { data: intended } = await client.from("cloud_runtime_state").select("payload").eq("scope", COMMUNICATION_INTENDED_RELEASE_SCOPE).maybeSingle();
  if (intended?.payload && typeof intended.payload === "object") {
    intendedMemory = intended.payload as CommunicationIntendedRelease;
  }
  const { data: epoch } = await client.from("cloud_runtime_state").select("payload").eq("scope", COMMUNICATION_CUTOVER_EPOCH_SCOPE).maybeSingle();
  if (epoch?.payload && typeof epoch.payload === "object" && "epoch" in (epoch.payload as object)) {
    const row = epoch.payload as CommunicationCutoverEpochRecord;
    setCommunicationCutoverEpochValue(row.epoch);
    epochUpdatedAt = row.updated_at;
  }
}

export async function persistCommunicationReleaseState(): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  if (intendedMemory) {
    await client.from("cloud_runtime_state").upsert({
      scope: COMMUNICATION_INTENDED_RELEASE_SCOPE,
      version: 1,
      instance_id: "communication-intended-release",
      payload: intendedMemory,
      updated_at: new Date().toISOString(),
    });
  }
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_CUTOVER_EPOCH_SCOPE,
    version: 1,
    instance_id: "communication-cutover-epoch",
    payload: getCommunicationCutoverEpoch(),
    updated_at: new Date().toISOString(),
  });
}

export function withLiveEvidence(gate: NamedOutboundLoopGate, identity: ObservedRuntimeIdentity | null, now: string, evidence_class: GateEvidenceClass = "LIVE_PROD"): GatedEvidence {
  return attachEvidenceClass(gate, evidence_class, {
    now,
    git_sha: identity?.git_sha,
    deployment_id: identity?.deployment_id,
  });
}

export { COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION };
