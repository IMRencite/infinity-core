import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { WORKER_CAPABILITY_ENGINE_NAME } from "@/lib/infinity/workers/constants";
import { resolveCapability } from "@/lib/infinity/registry";
import {
  EXECUTIVE_SELECTION_CAPABILITY_KEYS,
  type ExecutiveSelectionCapabilityKey,
} from "./constants";
import { emitExecutiveSelectionEvent } from "./events";

type InfinitySupabase = SupabaseClient<Database>;

export function buildExecutivePipelineIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  contextHash: string;
  capabilityKey: ExecutiveSelectionCapabilityKey;
}): string {
  return `exec-sel:${input.organizationId}:${input.missionId}:${input.runtimeInstanceId}:${input.contextHash}:${input.capabilityKey}`;
}

export function buildExecutiveContextIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  contextHash: string;
}): string {
  return `exec-ctx:${input.organizationId}:${input.missionId}:${input.runtimeInstanceId}:${input.contextHash}`;
}

export async function scheduleExecutiveCapabilityJob(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    contextHash: string;
    executiveContextId?: string | null;
    capabilityKey: ExecutiveSelectionCapabilityKey;
    correlationId: string | null;
    extraPayload?: Record<string, unknown>;
  },
) {
  const capability = await resolveCapability(
    supabase,
    input.organizationId,
    input.capabilityKey,
  );

  const idempotencyKey = buildExecutivePipelineIdempotencyKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    contextHash: input.contextHash,
    capabilityKey: input.capabilityKey,
  });

  const { data: existing } = await supabase
    .from("engine_jobs")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return existing;

  const payload: Json = {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    runtime_instance_id: input.runtimeInstanceId,
    context_hash: input.contextHash,
    executive_context_id: input.executiveContextId ?? null,
    correlation_id: input.correlationId,
    ...(input.extraPayload ?? {}),
  };

  const { data: job, error } = await supabase
    .from("engine_jobs")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      capability_key: input.capabilityKey,
      resolved_capability_id: capability.id,
      resolved_engine_name: WORKER_CAPABILITY_ENGINE_NAME,
      resolved_version: capability.version,
      status: "queued",
      priority: 95,
      idempotency_key: idempotencyKey,
      correlation_id: input.correlationId ?? randomUUID(),
      payload,
      available_at: new Date().toISOString(),
      max_attempts: 3,
      timeout_seconds: 300,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("engine_jobs")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      return retry;
    }
    throw new Error(error.message);
  }

  return job;
}

export async function scheduleExecutiveBuildContextJob(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    contextHash: string;
    correlationId: string | null;
  },
) {
  return scheduleExecutiveCapabilityJob(supabase, {
    ...input,
    capabilityKey: "executive.build_selection_context",
    executiveContextId: null,
  });
}

export async function scheduleExecutiveSelectionRemainderPipeline(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    contextHash: string;
    executiveContextId: string;
    correlationId: string | null;
  },
) {
  return scheduleExecutiveSelectionPipeline(supabase, {
    ...input,
    fromCapability: "executive.score_opportunity_set",
  });
}

export async function scheduleExecutiveSelectionPipeline(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    contextHash: string;
    correlationId: string | null;
    executiveContextId?: string | null;
    fromCapability?: ExecutiveSelectionCapabilityKey;
  },
) {
  const startIndex = input.fromCapability
    ? EXECUTIVE_SELECTION_CAPABILITY_KEYS.indexOf(input.fromCapability)
    : 0;

  const keys =
    startIndex <= 0
      ? EXECUTIVE_SELECTION_CAPABILITY_KEYS
      : EXECUTIVE_SELECTION_CAPABILITY_KEYS.slice(startIndex);

  const jobs = [];
  for (const capabilityKey of keys) {
    const job = await scheduleExecutiveCapabilityJob(supabase, {
      ...input,
      capabilityKey,
    });
    if (job) jobs.push(job);
  }

  await emitExecutiveSelectionEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "executive.context_requested",
    message: "Executive selection pipeline scheduled.",
    correlationId: input.correlationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    executiveContextId: input.executiveContextId ?? undefined,
    payload: { context_hash: input.contextHash, job_count: jobs.length },
  });

  return jobs;
}
