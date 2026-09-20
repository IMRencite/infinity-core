import { createClient } from "@supabase/supabase-js";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { getCommunicationHeartbeats, heartbeatLiveness, type CommunicationHeartbeatRuntime } from "./heartbeat";
import { getCommunicationCutoverEpoch, getCommunicationIntendedRelease, evaluateObservedReleaseParityGate, evaluateProductionReleaseParityGate } from "./release";
import { COMMUNICATION_STALE_HEARTBEAT_MS } from "./pacing";
import { listCommunicationObligations } from "./store";
import { COMMUNICATION_TERMINAL_STATES } from "./types";

export const COMMUNICATION_OBSERVER_SCOPE = "communication-external-observer-v1" as const;
export const COMMUNICATION_WATCHDOG_INDEPENDENT_PROJECT = "github-actions-communication-observer" as const;
export const COMMUNICATION_WORKER_PROJECT = "infinity-runtime" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ExternalObserverSnapshot = {
  observer_project: typeof COMMUNICATION_WATCHDOG_INDEPENDENT_PROJECT;
  worker_project: typeof COMMUNICATION_WORKER_PROJECT;
  stale_threshold_ms: number;
  intended_vs_observed: NamedOutboundLoopGate;
  epoch_mismatch: boolean;
  stale: CommunicationHeartbeatRuntime[];
  missing_obligations: number;
  overdue: number;
  stuck_claim: number;
  stuck_sent: number;
  release_failed: boolean;
  ExternalCommunicationObserverGate: NamedOutboundLoopGate;
  CommunicationWatchdogIndependenceGate: NamedOutboundLoopGate;
};

export function evaluateCommunicationWatchdogIndependenceGate(input: {
  observer_project: string;
  worker_project: string;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.observer_project) && Boolean(input.worker_project) && input.observer_project !== input.worker_project;
  return named("CommunicationWatchdogIndependenceGate", pass ? "PASS" : "FAIL", [input.observer_project, input.worker_project]);
}

export function evaluateExternalCommunicationObserver(input: {
  now: string;
  promoted_deployment_id?: string | null;
  observed_git_sha?: string | null;
  observed_deployment_id?: string | null;
  missing_obligations?: number;
}): ExternalObserverSnapshot {
  const intended = getCommunicationIntendedRelease();
  const epoch = getCommunicationCutoverEpoch();
  const beats = getCommunicationHeartbeats();
  const observed = {
    runtime_name: "observer",
    git_sha: input.observed_git_sha ?? beats.runtimes.scheduler.version ?? null,
    deployment_id: input.observed_deployment_id ?? beats.runtimes.scheduler.deployment,
    cutover_epoch_seen: epoch.epoch,
    build_version: beats.runtimes.scheduler.version,
    invoked_by: "cron" as const,
    started_at: beats.runtimes.scheduler.last_started_at,
    last_success_at: beats.runtimes.scheduler.last_success_at,
    last_failure_at: beats.runtimes.scheduler.last_failure_at,
    last_error: beats.runtimes.scheduler.last_error,
    work_seen: beats.runtimes.scheduler.work_seen,
    work_claimed: beats.runtimes.scheduler.work_claimed,
  };
  const observedParity = evaluateObservedReleaseParityGate({ intended, observed, now: input.now });
  const releaseParity = evaluateProductionReleaseParityGate({
    intended_git_sha: intended?.intended_git_sha ?? null,
    intended_deployment_id: intended?.expected_deployment_id ?? null,
    promoted_deployment_id: input.promoted_deployment_id ?? intended?.expected_deployment_id ?? null,
    observed_git_sha: observed.git_sha,
    observed_deployment_id: observed.deployment_id,
  });
  const stale = (["scheduler", "discovery", "worker", "watchdog", "provider"] as CommunicationHeartbeatRuntime[])
    .filter((runtime) => heartbeatLiveness(runtime, input.now) !== "RUNNING");
  const open = listCommunicationObligations().filter((row) => !COMMUNICATION_TERMINAL_STATES.includes(row.state));
  const overdue = open.filter((row) => Date.parse(input.now) - Date.parse(row.received_at) > 20 * 60 * 1000).length;
  const stuck_claim = open.filter((row) => row.state === "CLAIMED").length;
  const stuck_sent = listCommunicationObligations().filter((row) => row.state === "SENT").length;
  const independence = evaluateCommunicationWatchdogIndependenceGate({
    observer_project: COMMUNICATION_WATCHDOG_INDEPENDENT_PROJECT,
    worker_project: COMMUNICATION_WORKER_PROJECT,
  });
  const fail = observedParity.result !== "PASS" || stale.length > 0 || (input.missing_obligations ?? 0) > 0 || overdue > 0;
  return {
    observer_project: COMMUNICATION_WATCHDOG_INDEPENDENT_PROJECT,
    worker_project: COMMUNICATION_WORKER_PROJECT,
    stale_threshold_ms: COMMUNICATION_STALE_HEARTBEAT_MS,
    intended_vs_observed: observedParity,
    epoch_mismatch: Boolean(intended && intended.cutover_epoch !== epoch.epoch),
    stale,
    missing_obligations: input.missing_obligations ?? 0,
    overdue,
    stuck_claim,
    stuck_sent,
    release_failed: releaseParity.result !== "PASS",
    ExternalCommunicationObserverGate: named(
      "ExternalCommunicationObserverGate",
      fail ? "FAIL" : "PASS",
      fail ? [...observedParity.reasons, ...stale] : ["OBSERVER_OK"],
    ),
    CommunicationWatchdogIndependenceGate: independence,
  };
}

export async function persistExternalObserverSnapshot(snapshot: ExternalObserverSnapshot, now: string): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_OBSERVER_SCOPE,
    version: 1,
    instance_id: "communication-external-observer",
    payload: { ...snapshot, observed_at: now },
    updated_at: now,
  });
}

export function evaluateFailedDeploymentAlert(input: {
  intended_release_id: string;
  commit: string;
  deployment: string;
  reason: string;
}): { kind: "RELEASE_FAILED"; release: string; commit: string; deployment: string; reason: string; owner: string; next_action: string } {
  return {
    kind: "RELEASE_FAILED",
    release: input.intended_release_id,
    commit: input.commit,
    deployment: input.deployment,
    reason: input.reason,
    owner: "FounderHqRelease",
    next_action: "REPAIR_BUILD_THEN_PROVE_RUNTIME_IDENTITY",
  };
}
