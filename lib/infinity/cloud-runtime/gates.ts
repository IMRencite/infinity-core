import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import {
  ALWAYS_ON_AUTONOMY_GATE,
  CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE,
  CLOUD_RUNTIME_AUTHORIZATION_GATE,
  CLOUD_RUNTIME_CATCHUP_GATE,
  CLOUD_RUNTIME_EVENT_WAKE_GATE,
  CLOUD_RUNTIME_HEARTBEAT_GATE,
  CLOUD_RUNTIME_IDEMPOTENCY_GATE,
  CLOUD_RUNTIME_LEASE_GATE,
  CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE,
  CLOUD_RUNTIME_PERSISTENCE_GATE,
  CLOUD_RUNTIME_RESTART_SAFETY_GATE,
  CLOUD_RUNTIME_RUNAWAY_GATE,
  CLOUD_RUNTIME_SCHEDULER_GATE,
  CLOUD_RUNTIME_SINGLE_SCHEDULER_GATE,
  LOCAL_LOOP_STATE_FILE,
} from "./contract";
import { resolveCloudRuntimeCatchup } from "./catchup";
import { executeCloudRuntimeWake } from "./executor";
import { localProductionSchedulerEnabled } from "./auth";
import { MemoryCloudRuntimeStore } from "./store";
import { readCloudRuntimeSchedulerConfig } from "./scheduler";
import type { NamedCloudRuntimeGate } from "./types";

function pass(gate: string, reason: string): NamedCloudRuntimeGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedCloudRuntimeGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateCloudRuntimePersistenceGate(store = new MemoryCloudRuntimeStore()): NamedCloudRuntimeGate {
  if (store.uses_local_file) return fail(CLOUD_RUNTIME_PERSISTENCE_GATE, ["LOCAL_FILE_STORE"]);
  if (store.kind !== "DURABLE_MEMORY" && store.kind !== "DURABLE_POSTGRES") {
    return fail(CLOUD_RUNTIME_PERSISTENCE_GATE, ["UNKNOWN_STORE"]);
  }
  return pass(CLOUD_RUNTIME_PERSISTENCE_GATE, store.kind);
}

export function evaluateCloudRuntimeSchedulerGate(cwd = process.cwd()): NamedCloudRuntimeGate {
  const config = readCloudRuntimeSchedulerConfig(cwd);
  return config.hourly && config.daily
    ? pass(CLOUD_RUNTIME_SCHEDULER_GATE, "VERCEL_CRON_HOURLY_AND_DAILY")
    : fail(CLOUD_RUNTIME_SCHEDULER_GATE, ["SCHEDULER_INCOMPLETE"]);
}

export async function evaluateCloudRuntimeLeaseGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const now = "2026-09-15T08:00:00.000Z";
  const first = await store.claimLease({ holder: "a", instance_id: "1", now, seconds: 60 });
  const second = await store.claimLease({ holder: "b", instance_id: "2", now, seconds: 60 });
  const expired = await store.claimLease({
    holder: "c",
    instance_id: "3",
    now: "2026-09-15T08:02:00.000Z",
    seconds: 60,
  });
  if (!first.acquired || second.acquired) return fail(CLOUD_RUNTIME_LEASE_GATE, ["CONCURRENT_NOT_BLOCKED"]);
  if (!expired.acquired || expired.reason !== "LEASE_TAKEOVER") {
    return fail(CLOUD_RUNTIME_LEASE_GATE, ["EXPIRED_LEASE_UNRECOVERABLE"]);
  }
  return pass(CLOUD_RUNTIME_LEASE_GATE, "ATOMIC_LEASE");
}

export async function evaluateCloudRuntimeIdempotencyGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const event = {
    event_id: "evt-dup",
    type: "INBOUND_LEAD" as const,
    at: "2026-09-15T08:00:00.000Z",
    venture_id: null,
    reason: "fixture",
    fixture: true,
  };
  const first = await executeCloudRuntimeWake({ source: "EVENT", now: event.at, store, event, holder: "idemp-1" });
  const second = await executeCloudRuntimeWake({ source: "EVENT", now: event.at, store, event, holder: "idemp-2" });
  return first.ran && second.duplicate && !second.mission_created
    ? pass(CLOUD_RUNTIME_IDEMPOTENCY_GATE, "DUPLICATE_EVENT_SUPPRESSED")
    : fail(CLOUD_RUNTIME_IDEMPOTENCY_GATE, ["DUPLICATE_NOT_SUPPRESSED"]);
}

export async function evaluateCloudRuntimeRestartSafetyGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const first = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T08:00:00.000Z", store, holder: "r1" });
  const snap = store.snapshot();
  const restored = new MemoryCloudRuntimeStore();
  restored.restore(snap);
  const second = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T08:05:00.000Z", store: restored, holder: "r2" });
  const repeated = first.state.last_completed_action_key
    && first.state.last_completed_action_key === second.state.last_completed_action_key
    && second.mission_created;
  return first.ran && second.ran && !repeated && !second.state.local_file_used
    ? pass(CLOUD_RUNTIME_RESTART_SAFETY_GATE, "RESTART_CONTINUES")
    : fail(CLOUD_RUNTIME_RESTART_SAFETY_GATE, ["RESTART_REPEATED_ACTION"]);
}

export async function evaluateCloudRuntimeCatchupGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T06:00:00.000Z", store, holder: "c1" });
  const delayed = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T10:00:00.000Z", store, holder: "c2" });
  const plan = resolveCloudRuntimeCatchup({
    state: await store.load("2026-09-15T10:00:00.000Z"),
    now: "2026-09-15T10:00:00.000Z",
  });
  return delayed.catchup && plan.replay_missed_ticks === false && plan.missed_ticks_replayed === 0
    ? pass(CLOUD_RUNTIME_CATCHUP_GATE, "CURRENT_STATE_ONLY")
    : fail(CLOUD_RUNTIME_CATCHUP_GATE, ["BLIND_REPLAY"]);
}

export async function evaluateCloudRuntimeEventWakeGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const sales = await executeCloudRuntimeWake({
    source: "EVENT",
    now: "2026-09-15T08:00:00.000Z",
    store,
    holder: "sales",
    event: {
      event_id: "sales-fixture-1",
      type: "INBOUND_LEAD",
      at: "2026-09-15T08:00:00.000Z",
      venture_id: null,
      reason: "fixture inbound",
      fixture: true,
    },
  });
  const affiliate = await executeCloudRuntimeWake({
    source: "EVENT",
    now: "2026-09-15T08:01:00.000Z",
    store,
    holder: "aff",
    event: {
      event_id: "aff-fixture-1",
      type: "AFFILIATE_APPLICATION",
      at: "2026-09-15T08:01:00.000Z",
      venture_id: null,
      reason: "fixture application",
      fixture: true,
    },
  });
  return sales.ran && affiliate.ran && sales.state.observation.sales_floor_available && affiliate.state.observation.affiliate_available
    ? pass(CLOUD_RUNTIME_EVENT_WAKE_GATE, "SALES_AND_AFFILIATE_WAKES")
    : fail(CLOUD_RUNTIME_EVENT_WAKE_GATE, ["EVENT_WAKE_FAILED"]);
}

export function evaluateCloudRuntimeAuthorizationGate(): NamedCloudRuntimeGate {
  const denied = authorizeRuntimeTickRequest(new Request("https://infinity-runtime.vercel.app/api/runtime/tick"), process.env);
  const allowed = authorizeRuntimeTickRequest(
    new Request("https://infinity-runtime.vercel.app/api/runtime/tick", {
      headers: { authorization: "Bearer test-runtime-secret" },
    }),
    { ...process.env, CRON_SECRET: "test-runtime-secret" },
  );
  return !denied.ok && allowed.ok
    ? pass(CLOUD_RUNTIME_AUTHORIZATION_GATE, "BEARER_REQUIRED")
    : fail(CLOUD_RUNTIME_AUTHORIZATION_GATE, ["AUTH_BYPASS"]);
}

export function evaluateCloudRuntimeArtifactIdentityGate(input?: {
  deployment_id?: string | null;
  git_sha?: string | null;
  expected_deployment_id?: string | null;
  served_deployment_id?: string | null;
  production_required?: boolean;
}): NamedCloudRuntimeGate {
  const deployment = input?.served_deployment_id ?? input?.deployment_id ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local-proof";
  const sha = input?.git_sha ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "source-not-served";
  if (!deployment) return fail(CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE, ["MISSING_DEPLOYMENT_ID"]);
  if (input?.production_required && (deployment === "local-proof" || sha === "source-not-served")) {
    return fail(CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE, ["SOURCE_NOT_SERVED"]);
  }
  if (input?.expected_deployment_id && input.expected_deployment_id !== deployment) {
    return fail(CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE, ["SOURCE_SERVED_MISMATCH"]);
  }
  return pass(CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE, `${deployment}:${sha}`);
}

export type AlwaysOnAutonomyProductionEvidence = {
  runtime_deployed: boolean;
  durable_postgres: boolean;
  production_scheduler_live: boolean;
  authenticated_wake: boolean;
  independent_invocations: boolean;
  lease_proven: boolean;
  idempotency_proven: boolean;
  restart_continuity: boolean;
  artifact_identity: boolean;
  heartbeat_healthy: boolean;
  founder_pc_required: boolean;
  founder_browser_required: boolean;
  hq_required: boolean;
  public_imros_required: boolean;
  local_state_file_required: boolean;
};

export function evaluateAlwaysOnAutonomyProductionGate(
  evidence?: AlwaysOnAutonomyProductionEvidence,
): NamedCloudRuntimeGate {
  if (!evidence) return fail(ALWAYS_ON_AUTONOMY_GATE, ["PRODUCTION_EVIDENCE_REQUIRED"]);
  const reasons: string[] = [];
  if (!evidence.runtime_deployed) reasons.push("RUNTIME_NOT_DEPLOYED");
  if (!evidence.durable_postgres) reasons.push("STORE_NOT_DURABLE_POSTGRES");
  if (!evidence.production_scheduler_live) reasons.push("SCHEDULER_NOT_LIVE");
  if (!evidence.authenticated_wake) reasons.push("WAKE_UNAUTHENTICATED");
  if (!evidence.independent_invocations) reasons.push("INDEPENDENT_INVOCATIONS_UNPROVEN");
  if (!evidence.lease_proven) reasons.push("LEASE_UNPROVEN");
  if (!evidence.idempotency_proven) reasons.push("IDEMPOTENCY_UNPROVEN");
  if (!evidence.restart_continuity) reasons.push("RESTART_UNPROVEN");
  if (!evidence.artifact_identity) reasons.push("ARTIFACT_IDENTITY_UNPROVEN");
  if (!evidence.heartbeat_healthy) reasons.push("HEARTBEAT_UNHEALTHY");
  if (evidence.founder_pc_required) reasons.push("FOUNDER_PC_REQUIRED");
  if (evidence.founder_browser_required) reasons.push("FOUNDER_BROWSER_REQUIRED");
  if (evidence.hq_required) reasons.push("HQ_REQUIRED");
  if (evidence.public_imros_required) reasons.push("PUBLIC_IMROS_REQUIRED");
  if (evidence.local_state_file_required) reasons.push("LOCAL_STATE_REQUIRED");
  return reasons.length
    ? fail(ALWAYS_ON_AUTONOMY_GATE, reasons)
    : pass(ALWAYS_ON_AUTONOMY_GATE, "PRODUCTION_ALWAYS_ON");
}

export async function evaluateCloudRuntimeHeartbeatGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const result = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T08:00:00.000Z", store, holder: "hb" });
  return result.state.heartbeat.last_successful_iteration_at && result.state.heartbeat.state !== "OFFLINE"
    ? pass(CLOUD_RUNTIME_HEARTBEAT_GATE, result.state.heartbeat.state)
    : fail(CLOUD_RUNTIME_HEARTBEAT_GATE, ["HEARTBEAT_EMPTY"]);
}

export async function evaluateCloudRuntimeRunawayGate(): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const now = "2026-09-15T08:00:00.000Z";
  const held = await store.claimLease({ holder: "held", instance_id: "held", now, seconds: 90 });
  const overlap = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now, store, holder: "run-b" });
  return held.acquired && overlap.deferred && !overlap.mission_created && !overlap.ran
    ? pass(CLOUD_RUNTIME_RUNAWAY_GATE, "OVERLAP_DEFERRED")
    : fail(CLOUD_RUNTIME_RUNAWAY_GATE, ["RUNAWAY_OR_DUPLICATE"]);
}

export async function evaluateCloudRuntimeNoLocalDependencyGate(cwd = process.cwd()): Promise<NamedCloudRuntimeGate> {
  const store = new MemoryCloudRuntimeStore();
  const result = await executeCloudRuntimeWake({ source: "CRON_HOURLY", now: "2026-09-15T08:00:00.000Z", store, holder: "nolocal" });
  const productionPath = join(cwd, LOCAL_LOOP_STATE_FILE);
  if (result.state.local_file_used) return fail(CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE, ["LOCAL_FILE_USED"]);
  if (result.state.founder_pc_required || result.state.founder_browser_required || result.state.hq_required) {
    return fail(CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE, ["LOCAL_DEPENDENCY_FLAG"]);
  }
  if (existsSync(productionPath) && result.state.local_file_used) {
    return fail(CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE, ["PRODUCTION_READ_LOCAL_FILE"]);
  }
  return pass(CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE, "CLOUD_STORE_ONLY");
}

export function evaluateCloudRuntimeSingleSchedulerGate(env: Record<string, string | undefined> = { VERCEL: "1" }): NamedCloudRuntimeGate {
  return !localProductionSchedulerEnabled(env)
    ? pass(CLOUD_RUNTIME_SINGLE_SCHEDULER_GATE, "CLOUD_SCHEDULER_ONLY")
    : fail(CLOUD_RUNTIME_SINGLE_SCHEDULER_GATE, ["LOCAL_AND_CLOUD_SCHEDULERS"]);
}

export async function evaluateAlwaysOnAutonomyGate(): Promise<NamedCloudRuntimeGate> {
  const required = [
    evaluateCloudRuntimePersistenceGate(),
    evaluateCloudRuntimeSchedulerGate(),
    await evaluateCloudRuntimeLeaseGate(),
    await evaluateCloudRuntimeIdempotencyGate(),
    await evaluateCloudRuntimeRestartSafetyGate(),
    await evaluateCloudRuntimeNoLocalDependencyGate(),
    evaluateCloudRuntimeSingleSchedulerGate(),
    evaluateCloudRuntimeAuthorizationGate(),
  ];
  const failed = required.filter((row) => row.result !== "PASS");
  return failed.length === 0
    ? pass(ALWAYS_ON_AUTONOMY_GATE, "SCHEDULER_STATE_LEASE_IDEMPOTENCY_INDEPENDENT")
    : fail(ALWAYS_ON_AUTONOMY_GATE, failed.flatMap((row) => row.reasons));
}

export function vercelCronSourceExists(cwd = process.cwd()): boolean {
  return readFileSync(join(cwd, "vercel.json"), "utf8").includes("/api/runtime/tick");
}
