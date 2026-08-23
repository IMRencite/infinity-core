import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  GROUNDED_RESEARCH_PROMPT_VERSION,
  GROUNDED_RESEARCH_SCHEMA_VERSION,
} from "./constants";
import type { ResearchFailureClassification, ResearchRunStatus } from "./constants";
import type {
  FailedResearchResult,
  ResearchResult,
} from "./types";
import {
  canonicalizeResearchCandidateId,
  readCandidateIdFromStructuredResult,
} from "./candidate-lineage";

export type ResearchRunRow = {
  id: string;
  organization_id: string;
  mission_id: string | null;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  research_objective: string;
  input_hash: string;
  structured_result: Json;
  raw_provider_response: Json;
  grounding_metadata: Json;
  normalized_evidence: Json;
  normalized_sources: Json;
  token_usage: Json;
  grounding_usage: Json;
  estimated_cost: number | null;
  cost_uncertainty: string | null;
  latency_ms: number | null;
  request_id: string | null;
  retry_count: number;
  status: string;
  validation_status: string | null;
  failure_classification: string | null;
  error_message: string | null;
  correlation_id: string | null;
  idempotency_key: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
};

export async function findResearchRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<ResearchRunRow | null> {
  const { data, error } = await admin
    .from("research_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load research run: ${error.message}`);
  }

  return data as ResearchRunRow | null;
}

export async function insertResearchRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    candidateId?: string | null;
    missionId?: string | null;
    provider: string;
    model: string;
    researchObjective: string;
    inputHash: string;
    idempotencyKey: string;
    correlationId: string;
  },
): Promise<ResearchRunRow> {
  const candidateId = canonicalizeResearchCandidateId(input.candidateId);
  const { data, error } = await admin
    .from("research_runs")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId ?? null,
      provider: input.provider,
      model: input.model,
      prompt_version: GROUNDED_RESEARCH_PROMPT_VERSION,
      schema_version: GROUNDED_RESEARCH_SCHEMA_VERSION,
      research_objective: input.researchObjective,
      input_hash: input.inputHash,
      idempotency_key: input.idempotencyKey,
      correlation_id: input.correlationId,
      status: "requested",
      started_at: new Date().toISOString(),
      ...(candidateId ? { structured_result: { candidateId } as never } : {}),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert research run: ${error?.message ?? "unknown"}`);
  }

  return data as ResearchRunRow;
}

export async function updateResearchRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: TablesUpdate<"research_runs">,
): Promise<void> {
  const { error } = await admin
    .from("research_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to update research run: ${error.message}`);
  }
}

export function mapCompletedResearchRunToResult(row: ResearchRunRow): ResearchResult {
  const result = row.structured_result as unknown as ResearchResult;
  const candidateId = readCandidateIdFromStructuredResult(row.structured_result);
  return candidateId ? { ...result, candidateId } : result;
}

export function mapFailedResearchRunToResult(
  row: ResearchRunRow,
  failureClassification: ResearchFailureClassification,
  message: string,
): FailedResearchResult {
  return {
    researchRunId: row.id,
    organizationId: row.organization_id,
    candidateId: readCandidateIdFromStructuredResult(row.structured_result),
    researchObjective: row.research_objective,
    providerId: (row.provider as FailedResearchResult["providerId"]) ?? null,
    modelId: row.model ?? null,
    inputHash: row.input_hash,
    status: row.status as ResearchRunStatus,
    failureClassification,
    message,
    tokenUsage: (row.token_usage as FailedResearchResult["tokenUsage"]) ?? null,
    estimatedCostUsd: row.estimated_cost,
    latencyMs: row.latency_ms,
    requestId: row.request_id,
    failedAt: row.failed_at ?? new Date().toISOString(),
  };
}
