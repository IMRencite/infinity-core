import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  GOVERNED_REASONING_SCHEMA_VERSION,
  type GovernedReasoningMode,
} from "./constants";
import type { GovernedReasoningStructuredOutput } from "./schema";
import type { ContextManifest } from "./context";
import { manifestToJson } from "./context";

type InfinitySupabase = SupabaseClient<Database>;
type ReasoningSessionUpdate = Database["public"]["Tables"]["reasoning_sessions"]["Update"];

export type PersistedReasoningSession = {
  id: string;
  organizationId: string;
  missionId: string | null;
  opportunityId: string | null;
  validationRunId: string | null;
  executiveDecisionId: string | null;
  runtimeInstanceId: string | null;
  provider: string;
  model: string;
  mode: GovernedReasoningMode;
  promptVersion: string;
  schemaVersion: string;
  status: string;
  contextManifest: ContextManifest;
  contextHash: string;
  structuredOutput: GovernedReasoningStructuredOutput | Record<string, never>;
  recommendation: string | null;
  confidence: number | null;
  usage: Json;
  estimatedCost: number | null;
  latencyMs: number | null;
  error: Json;
  correlationId: string | null;
  idempotencyKey: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): PersistedReasoningSession {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: (row.mission_id as string | null) ?? null,
    opportunityId: (row.opportunity_id as string | null) ?? null,
    validationRunId: (row.validation_run_id as string | null) ?? null,
    executiveDecisionId: (row.executive_decision_id as string | null) ?? null,
    runtimeInstanceId: (row.runtime_instance_id as string | null) ?? null,
    provider: String(row.provider),
    model: String(row.model),
    mode: row.mode as GovernedReasoningMode,
    promptVersion: String(row.prompt_version),
    schemaVersion: String(row.schema_version),
    status: String(row.status),
    contextManifest: row.context_manifest as ContextManifest,
    contextHash: String(row.context_hash),
    structuredOutput: (row.structured_output ?? {}) as GovernedReasoningStructuredOutput,
    recommendation: (row.recommendation as string | null) ?? null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    usage: (row.usage ?? {}) as Json,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
    error: (row.error ?? {}) as Json,
    correlationId: (row.correlation_id as string | null) ?? null,
    idempotencyKey: String(row.idempotency_key),
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    failedAt: (row.failed_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function findReasoningSessionByIdempotency(
  supabase: InfinitySupabase,
  organizationId: string,
  idempotencyKey: string,
): Promise<PersistedReasoningSession | null> {
  const { data, error } = await supabase
    .from("reasoning_sessions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

export async function insertReasoningSessionRequest(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    validationRunId?: string | null;
    executiveDecisionId?: string | null;
    runtimeInstanceId?: string | null;
    provider: string;
    model: string;
    mode: GovernedReasoningMode;
    promptVersion: string;
    contextManifest: ContextManifest;
    contextHash: string;
    correlationId: string | null;
    idempotencyKey: string;
  },
): Promise<PersistedReasoningSession> {
  const existing = await findReasoningSessionByIdempotency(
    supabase,
    input.organizationId,
    input.idempotencyKey,
  );

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("reasoning_sessions")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      opportunity_id: input.opportunityId,
      validation_run_id: input.validationRunId ?? null,
      executive_decision_id: input.executiveDecisionId ?? null,
      runtime_instance_id: input.runtimeInstanceId ?? null,
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      prompt_version: input.promptVersion,
      schema_version: GOVERNED_REASONING_SCHEMA_VERSION,
      status: "requested",
      context_manifest: manifestToJson(input.contextManifest),
      context_hash: input.contextHash,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const retry = await findReasoningSessionByIdempotency(
        supabase,
        input.organizationId,
        input.idempotencyKey,
      );
      if (retry) {
        return retry;
      }
    }

    throw new Error(error?.message ?? "Failed to create reasoning session.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function updateReasoningSession(
  supabase: InfinitySupabase,
  sessionId: string,
  organizationId: string,
  patch: ReasoningSessionUpdate,
): Promise<PersistedReasoningSession> {
  const { data, error } = await supabase
    .from("reasoning_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update reasoning session.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function listRecentReasoningSessions(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 20,
): Promise<PersistedReasoningSession[]> {
  const { data, error } = await supabase
    .from("reasoning_sessions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function findLatestCompletedReasoningSessionForRuntime(
  supabase: InfinitySupabase,
  organizationId: string,
  runtimeInstanceId: string,
): Promise<PersistedReasoningSession | null> {
  const { data } = await supabase
    .from("reasoning_sessions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("runtime_instance_id", runtimeInstanceId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}
