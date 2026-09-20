import { createClient } from "@supabase/supabase-js";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION, getCommunicationCutoverEpochValue } from "./cutover";
import { COMMUNICATION_STALE_HEARTBEAT_MS } from "./pacing";
import { COMMUNICATION_SCHEMA_VERSION, vercelRuntimeIdentity } from "./release";
import { runtimeReleaseIdentity } from "./release-identity";

export const COMMUNICATION_HEARTBEAT_SCOPE = "communication-runtime-heartbeats-v1" as const;
export const COMMUNICATION_HEARTBEAT_RUNTIMES = [
  "scheduler",
  "discovery",
  "worker",
  "watchdog",
  "provider",
] as const;
export type CommunicationHeartbeatRuntime = (typeof COMMUNICATION_HEARTBEAT_RUNTIMES)[number];

export type CommunicationRuntimeHeartbeat = {
  runtime: CommunicationHeartbeatRuntime;
  runtime_name: CommunicationHeartbeatRuntime;
  deployment: string | null;
  deployment_id: string | null;
  git_sha: string | null;
  instance: string | null;
  last_started_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  work_seen: number;
  work_claimed: number;
  version: string;
  build_version: string;
  cutover_runtime_version: typeof COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION;
  cutover_epoch_seen: string;
  invoked_by: "cron" | "manual" | "recovery" | "synthetic_canary" | string | null;
  started_at: string | null;
  deployable_unit: "infinity-runtime";
  release_sha: string | null;
  release_tree_hash: string | null;
  build_graph_hash: string | null;
  release_dirty: boolean;
  schema_version_seen: string | null;
  schema_version_required: string;
  timestamp: string | null;
};

export type CommunicationHeartbeatStore = {
  version: 1;
  scope: typeof COMMUNICATION_HEARTBEAT_SCOPE;
  runtimes: Record<CommunicationHeartbeatRuntime, CommunicationRuntimeHeartbeat>;
  updated_at: string;
};

const STALE_MS: Record<CommunicationHeartbeatRuntime, number> = {
  scheduler: COMMUNICATION_STALE_HEARTBEAT_MS,
  discovery: COMMUNICATION_STALE_HEARTBEAT_MS,
  worker: COMMUNICATION_STALE_HEARTBEAT_MS,
  watchdog: COMMUNICATION_STALE_HEARTBEAT_MS,
  provider: COMMUNICATION_STALE_HEARTBEAT_MS,
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function emptyHeartbeat(runtime: CommunicationHeartbeatRuntime): CommunicationRuntimeHeartbeat {
  return {
    runtime,
    runtime_name: runtime,
    deployment: null,
    deployment_id: null,
    git_sha: null,
    instance: null,
    last_started_at: null,
    last_success_at: null,
    last_failure_at: null,
    last_error: null,
    work_seen: 0,
    work_claimed: 0,
    version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    build_version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    cutover_runtime_version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    cutover_epoch_seen: getCommunicationCutoverEpochValue(),
    invoked_by: null,
    started_at: null,
    deployable_unit: "infinity-runtime",
    release_sha: null,
    release_tree_hash: null,
    build_graph_hash: null,
    release_dirty: true,
    schema_version_seen: null,
    schema_version_required: COMMUNICATION_SCHEMA_VERSION,
    timestamp: null,
  };
}

function emptyStore(now = new Date().toISOString()): CommunicationHeartbeatStore {
  return {
    version: 1,
    scope: COMMUNICATION_HEARTBEAT_SCOPE,
    runtimes: {
      scheduler: emptyHeartbeat("scheduler"),
      discovery: emptyHeartbeat("discovery"),
      worker: emptyHeartbeat("worker"),
      watchdog: emptyHeartbeat("watchdog"),
      provider: emptyHeartbeat("provider"),
    },
    updated_at: now,
  };
}

let memory = emptyStore();

export function resetCommunicationHeartbeats(): CommunicationHeartbeatStore {
  memory = emptyStore();
  return memory;
}

export function getCommunicationHeartbeats(): CommunicationHeartbeatStore {
  return memory;
}

export function heartbeatLiveness(runtime: CommunicationHeartbeatRuntime, now: string): "RUNNING" | "STALE" | "DOWN" {
  const row = memory.runtimes[runtime];
  if (!row.last_success_at && !row.last_started_at) return "DOWN";
  const at = Date.parse(row.last_success_at ?? row.last_started_at ?? now);
  if (Date.parse(now) - at > STALE_MS[runtime]) return "STALE";
  return "RUNNING";
}

export function recordCommunicationHeartbeat(input: {
  runtime: CommunicationHeartbeatRuntime;
  now: string;
  deployment?: string | null;
  instance?: string | null;
  success?: boolean;
  error?: string | null;
  work_seen?: number;
  work_claimed?: number;
  invoked_by?: CommunicationRuntimeHeartbeat["invoked_by"];
  git_sha?: string | null;
}): CommunicationRuntimeHeartbeat {
  const current = memory.runtimes[input.runtime];
  const identity = vercelRuntimeIdentity();
  const baked = runtimeReleaseIdentity();
  const next: CommunicationRuntimeHeartbeat = {
    ...current,
    runtime_name: input.runtime,
    deployment: input.deployment ?? current.deployment ?? identity.deployment_id,
    deployment_id: input.deployment ?? current.deployment_id ?? identity.deployment_id,
    git_sha: input.git_sha ?? identity.release_sha ?? identity.git_sha ?? current.git_sha,
    instance: input.instance ?? current.instance,
    last_started_at: current.last_started_at ?? input.now,
    started_at: current.started_at ?? current.last_started_at ?? input.now,
    last_success_at: input.success === false ? current.last_success_at : input.now,
    last_failure_at: input.success === false ? input.now : current.last_failure_at,
    last_error: input.success === false ? input.error ?? "RUNTIME_FAILURE" : null,
    work_seen: current.work_seen + (input.work_seen ?? 0),
    work_claimed: current.work_claimed + (input.work_claimed ?? 0),
    version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    build_version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    cutover_runtime_version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
    cutover_epoch_seen: getCommunicationCutoverEpochValue(),
    invoked_by: input.invoked_by ?? current.invoked_by,
    deployable_unit: "infinity-runtime",
    release_sha: identity.release_sha ?? (baked.release_sha || null),
    release_tree_hash: identity.release_tree_hash ?? (baked.release_tree_hash || null),
    build_graph_hash: identity.build_graph_hash ?? (baked.build_graph_hash || null),
    release_dirty: identity.release_dirty || baked.release_dirty,
    schema_version_seen: process.env.COMMUNICATION_SCHEMA_VERSION_SEEN || COMMUNICATION_SCHEMA_VERSION,
    schema_version_required: COMMUNICATION_SCHEMA_VERSION,
    timestamp: input.now,
  };
  memory.runtimes[input.runtime] = next;
  memory.updated_at = input.now;
  return next;
}

export function evaluateCommunicationRuntimeHeartbeatGate(now: string): NamedOutboundLoopGate {
  const stale = COMMUNICATION_HEARTBEAT_RUNTIMES.filter((runtime) => heartbeatLiveness(runtime, now) !== "RUNNING");
  return named(
    "CommunicationRuntimeHeartbeatGate",
    stale.length ? "FAIL" : "PASS",
    stale.length ? stale.map((runtime) => `${runtime}:${heartbeatLiveness(runtime, now)}`) : ["ALL_FRESH"],
  );
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function hydrateCommunicationHeartbeats(): Promise<CommunicationHeartbeatStore> {
  if (process.env.VITEST) return memory;
  const client = adminClient();
  if (!client) return memory;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", COMMUNICATION_HEARTBEAT_SCOPE).maybeSingle();
  const payload = data?.payload as CommunicationHeartbeatStore | undefined;
  if (payload?.version === 1 && payload.runtimes) {
    memory = {
      ...emptyStore(),
      ...payload,
      runtimes: { ...emptyStore().runtimes, ...payload.runtimes },
    };
  }
  return memory;
}

export async function persistCommunicationHeartbeats(): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_HEARTBEAT_SCOPE,
    version: 1,
    instance_id: "communication-runtime-heartbeats",
    payload: memory,
    updated_at: new Date().toISOString(),
  });
}

export function evaluateCommunicationCutoverRuntimeParityGate(input: {
  expected_thread_id: string;
  runtime_thread_id: string;
  runtime_version: string;
  deployment_id: string | null;
}): NamedOutboundLoopGate {
  const pass = input.expected_thread_id === input.runtime_thread_id
    && input.runtime_version === COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION
    && Boolean(input.deployment_id);
  return named("CommunicationCutoverRuntimeParityGate", pass ? "PASS" : "FAIL", [
    input.runtime_version,
    input.deployment_id ?? "NO_DEPLOYMENT",
  ]);
}

export function evaluateCommunicationSchedulerWorkerDeploymentParityGate(input: {
  scheduler_deployment: string | null;
  worker_deployment: string | null;
  handler: string;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.scheduler_deployment)
    && input.scheduler_deployment === input.worker_deployment
    && input.handler === "executeTestThreadCutoverTick";
  return named("CommunicationSchedulerWorkerDeploymentParityGate", pass ? "PASS" : "FAIL", [
    input.scheduler_deployment ?? "NONE",
    input.worker_deployment ?? "NONE",
    input.handler,
  ]);
}
