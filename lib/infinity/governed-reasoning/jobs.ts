import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { REASONING_ADVISORY_CAPABILITY_KEY, REASONING_ENGINE_NAME } from "@/lib/infinity/constants";
import { recordEngineEvent } from "@/lib/infinity/events";
import { resolveCapability } from "@/lib/infinity/registry";
import type { GovernedReasoningMode } from "./constants";

type InfinitySupabase = SupabaseClient<Database>;

export async function scheduleReasoningAdvisoryJob(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    runtimeInstanceId: string;
    correlationId: string | null;
    mode: GovernedReasoningMode;
    idempotencyKey: string;
  },
) {
  const capability = await resolveCapability(
    supabase,
    input.organizationId,
    REASONING_ADVISORY_CAPABILITY_KEY,
  );

  const correlationId = input.correlationId ?? randomUUID();

  const payload: Json = {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    opportunity_id: input.opportunityId,
    runtime_instance_id: input.runtimeInstanceId,
    mode: input.mode,
    correlation_id: correlationId,
  };

  const { data: existing } = await supabase
    .from("engine_jobs")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: job, error } = await supabase
    .from("engine_jobs")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      capability_key: REASONING_ADVISORY_CAPABILITY_KEY,
      resolved_capability_id: capability.id,
      resolved_engine_name: REASONING_ENGINE_NAME,
      resolved_version: capability.version,
      status: "queued",
      priority: 100,
      idempotency_key: input.idempotencyKey,
      correlation_id: correlationId,
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
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();

      return retry;
    }

    throw new Error(error.message);
  }

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: REASONING_ENGINE_NAME,
    eventType: "reasoning.session_requested",
    entityType: "engine_job",
    entityId: job.id,
    message: "Reasoning advisory job queued.",
    correlationId: correlationId,
    payload: { mode: input.mode, runtime_instance_id: input.runtimeInstanceId },
  });

  return job;
}
