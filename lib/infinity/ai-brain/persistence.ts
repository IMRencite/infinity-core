import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { AI_BRAIN_PROMPT_VERSION, AI_BRAIN_SCHEMA_VERSION } from "./constants";
import type { AiBrainFailureClassification, AiBrainRunStatus } from "./constants";
import type {
  AiBrainStructuredOutput,
  AiBrainTokenUsage,
  CanonicalMissionDraft,
  FailedReasoningResult,
  ReasoningResult,
} from "./types";

export type AiBrainReasoningRunRow = {
  id: string;
  organization_id: string;
  mission_id: string | null;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  objective: string;
  objective_type: string;
  input_hash: string;
  structured_output: Json;
  validation_status: string | null;
  failure_classification: string | null;
  token_usage: Json;
  estimated_cost: number | null;
  latency_ms: number | null;
  request_id: string | null;
  retry_count: number;
  status: string;
  canonical_mission_draft: Json | null;
  error_message: string | null;
  correlation_id: string | null;
  idempotency_key: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
};

export async function findAiBrainRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<AiBrainReasoningRunRow | null> {
  const { data, error } = await admin
    .from("ai_brain_reasoning_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load AI Brain run: ${error.message}`);
  }

  return data as AiBrainReasoningRunRow | null;
}

export async function insertAiBrainReasoningRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId?: string | null;
    provider: string;
    model: string;
    objective: string;
    objectiveType: string;
    inputHash: string;
    idempotencyKey: string;
    correlationId: string;
  },
): Promise<AiBrainReasoningRunRow> {
  const { data, error } = await admin
    .from("ai_brain_reasoning_runs")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId ?? null,
      provider: input.provider,
      model: input.model,
      prompt_version: AI_BRAIN_PROMPT_VERSION,
      schema_version: AI_BRAIN_SCHEMA_VERSION,
      objective: input.objective,
      objective_type: input.objectiveType,
      input_hash: input.inputHash,
      idempotency_key: input.idempotencyKey,
      correlation_id: input.correlationId,
      status: "requested",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert AI Brain run: ${error?.message ?? "unknown"}`);
  }

  return data as AiBrainReasoningRunRow;
}

export async function updateAiBrainReasoningRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: TablesUpdate<"ai_brain_reasoning_runs">,
): Promise<void> {
  const { error } = await admin
    .from("ai_brain_reasoning_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to update AI Brain run: ${error.message}`);
  }
}

export function mapCompletedRunToResult(
  row: AiBrainReasoningRunRow,
  structuredOutput: AiBrainStructuredOutput,
  canonicalMissionDraft: CanonicalMissionDraft,
): ReasoningResult {
  const tokenUsage = (row.token_usage ?? {}) as AiBrainTokenUsage;

  return {
    reasoningRunId: row.id,
    organizationId: row.organization_id,
    missionId: row.mission_id,
    objective: row.objective,
    objectiveType: row.objective_type as ReasoningResult["objectiveType"],
    providerId: row.provider as ReasoningResult["providerId"],
    modelId: row.model,
    inputHash: row.input_hash,
    structuredOutput,
    validationStatus: "validated",
    tokenUsage,
    estimatedCostUsd: Number(row.estimated_cost ?? 0),
    latencyMs: Number(row.latency_ms ?? 0),
    requestId: row.request_id,
    retryMetadata: {
      attemptCount: row.retry_count + 1,
      maxAttempts: row.retry_count + 1,
      retried: row.retry_count > 0,
    },
    status: "completed",
    canonicalMissionDraft,
    completedAt: row.completed_at ?? new Date().toISOString(),
  };
}

export function mapFailedRunToResult(
  row: AiBrainReasoningRunRow,
  failureClassification: AiBrainFailureClassification,
  message: string,
): FailedReasoningResult {
  return {
    reasoningRunId: row.id,
    organizationId: row.organization_id,
    objective: row.objective,
    providerId: (row.provider as FailedReasoningResult["providerId"]) ?? null,
    modelId: row.model ?? null,
    inputHash: row.input_hash,
    status: row.status as AiBrainRunStatus,
    failureClassification,
    message,
    tokenUsage: (row.token_usage as AiBrainTokenUsage | null) ?? null,
    estimatedCostUsd: row.estimated_cost,
    latencyMs: row.latency_ms,
    requestId: row.request_id,
    retryMetadata: {
      attemptCount: row.retry_count + 1,
      maxAttempts: row.retry_count + 1,
      retried: row.retry_count > 0,
    },
    failedAt: row.failed_at ?? new Date().toISOString(),
  };
}
