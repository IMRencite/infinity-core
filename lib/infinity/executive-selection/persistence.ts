import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  EXECUTIVE_SELECTION_MODEL_KEY,
  EXECUTIVE_SELECTION_MODEL_VERSION,
  EXECUTIVE_SELECTION_POLICY_VERSION,
} from "./constants";
import type { ExecutiveContextManifest, ExecutiveSelectionOutcome } from "./types";

export async function findExecutiveContextByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data } = await admin
    .from("executive_contexts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data;
}

export async function insertExecutiveContext(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    contextVersion: number;
    objective: string;
    portfolioStrategy: string;
    opportunityIds: string[];
    contextManifest: ExecutiveContextManifest;
    contextHash: string;
    idempotencyKey: string;
    correlationId: string | null;
  },
) {
  const { data, error } = await admin
    .from("executive_contexts")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      context_version: input.contextVersion,
      objective: input.objective,
      portfolio_strategy: input.portfolioStrategy,
      opportunity_ids: input.opportunityIds,
      context_manifest: input.contextManifest as unknown as Json,
      context_hash: input.contextHash,
      scoring_model_key: EXECUTIVE_SELECTION_MODEL_KEY,
      scoring_model_version: EXECUTIVE_SELECTION_MODEL_VERSION,
      policy_version: EXECUTIVE_SELECTION_POLICY_VERSION,
      resource_constraints: {} as Json,
      risk_constraints: {} as Json,
      decision_thresholds: input.contextManifest.decisionThresholds as Json,
      escalation_thresholds: input.contextManifest.escalationThresholds as Json,
      status: "running",
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return findExecutiveContextByIdempotency(admin, input.organizationId, input.idempotencyKey);
    }
    throw new Error(error.message);
  }

  return data;
}

export async function updateExecutiveContextManifest(
  admin: AdminSupabaseClient,
  organizationId: string,
  contextId: string,
  manifest: ExecutiveContextManifest,
  patch?: { status?: string; completed_at?: string; failed_at?: string; error?: Json },
) {
  const { data, error } = await admin
    .from("executive_contexts")
    .update({
      context_manifest: manifest as unknown as Json,
      ...(patch?.status ? { status: patch.status } : {}),
      ...(patch?.completed_at ? { completed_at: patch.completed_at } : {}),
      ...(patch?.failed_at ? { failed_at: patch.failed_at } : {}),
      ...(patch?.error ? { error: patch.error } : {}),
    })
    .eq("organization_id", organizationId)
    .eq("id", contextId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadExecutiveContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  contextId: string,
) {
  const { data, error } = await admin
    .from("executive_contexts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", contextId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function findSelectionDecisionByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data;
}

export async function insertSelectionDecisionDraft(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    executiveContextId: string;
    outcome: ExecutiveSelectionOutcome;
    contextHash: string;
    idempotencyKey: string;
    validationRunId: string | null;
  },
) {
  const o = input.outcome;
  const { data, error } = await admin
    .from("executive_selection_decisions")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      executive_context_id: input.executiveContextId,
      opportunity_id: o.opportunityId,
      decision: o.decision,
      status: "draft",
      rank: o.rank,
      deterministic_score: o.deterministicScore,
      adjusted_score: o.adjustedScore,
      confidence: o.confidence,
      rationale_summary: o.rationaleSummary,
      supporting_evidence_reference_ids: o.supportingEvidenceReferenceIds,
      validation_run_id: input.validationRunId ?? o.validationRunId,
      reasoning_session_ids: [],
      decision_model_key: EXECUTIVE_SELECTION_MODEL_KEY,
      decision_model_version: EXECUTIVE_SELECTION_MODEL_VERSION,
      policy_version: EXECUTIVE_SELECTION_POLICY_VERSION,
      context_hash: input.contextHash,
      threshold_results: {} as Json,
      policy_results: {} as Json,
      constraint_results: {} as Json,
      ai_advisory_reference_ids: [],
      missing_information: o.missingInformation as unknown as Json,
      risks: o.risks as unknown as Json,
      blockers: o.blockers as unknown as Json,
      escalation_reasons: o.escalationReasons as unknown as Json,
      planning_eligible: false,
      review_status: "pending",
      reversible: true,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return findSelectionDecisionByIdempotency(admin, input.organizationId, input.idempotencyKey);
    }
    throw new Error(error.message);
  }

  return data;
}

export async function finalizeSelectionDecision(
  admin: AdminSupabaseClient,
  organizationId: string,
  decisionId: string,
  input: { planningEligible: boolean; reviewStatus: string },
) {
  const { data, error } = await admin
    .from("executive_selection_decisions")
    .update({
      status: "finalized",
      planning_eligible: input.planningEligible,
      review_status: input.reviewStatus,
      finalized_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", decisionId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listFinalizedDecisionsForContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  executiveContextId: string,
) {
  const { data, error } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("executive_context_id", executiveContextId)
    .eq("status", "finalized");
  if (error) throw new Error(error.message);
  return data ?? [];
}
