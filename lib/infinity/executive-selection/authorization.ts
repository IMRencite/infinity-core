import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isOpportunityApprovedForPlanning } from "@/lib/infinity/validation";
import { getActiveExecutiveDecisionForOpportunity } from "@/lib/infinity/executive/queries";
import {
  isExecutivePlanningEligibleDecision,
  type ExecutiveDecisionDb,
} from "@/lib/infinity/executive/constants-db";

type InfinitySupabase = SupabaseClient<Database>;

export type ExecutiveAuthorizationSourceSystem =
  | "executive_selection_v2"
  | "executive_decisions_v1";

export type PlannerExecutiveAuthorization = {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  canonicalDecisionId: string;
  canonicalDecisionType: string;
  sourceSystem: ExecutiveAuthorizationSourceSystem;
  planningEligible: boolean;
  reviewStatus: string;
  qaStatus: string;
  deterministicScore: number;
  confidence: number;
  policyVersion: string;
  modelVersion: string;
  contextHash: string;
  finalizedAt: string;
  superseded: boolean;
  blockers: string[];
  escalationRequired: boolean;
  executiveContextId: string | null;
  validationRunId: string | null;
};

export class PlannerAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerAuthorizationError";
  }
}

export function authorizationFromSelectionRow(row: {
  id: string;
  organization_id: string;
  mission_id: string;
  runtime_instance_id: string;
  opportunity_id: string | null;
  decision: string;
  planning_eligible: boolean;
  review_status: string;
  deterministic_score: number;
  confidence: number;
  policy_version: string;
  decision_model_version: string;
  context_hash: string;
  finalized_at: string | null;
  status: string;
  executive_context_id: string;
  blockers: unknown;
  escalation_reasons: unknown;
  validation_run_id: string | null;
}): PlannerExecutiveAuthorization | null {
  if (row.status !== "finalized" || !row.finalized_at || !row.opportunity_id) {
    return null;
  }

  const escalationReasons = Array.isArray(row.escalation_reasons)
    ? (row.escalation_reasons as string[])
    : [];

  return {
    organizationId: row.organization_id,
    missionId: row.mission_id,
    runtimeInstanceId: row.runtime_instance_id,
    opportunityId: row.opportunity_id,
    canonicalDecisionId: row.id,
    canonicalDecisionType: row.decision,
    sourceSystem: "executive_selection_v2",
    planningEligible: row.planning_eligible,
    reviewStatus: row.review_status,
    qaStatus: row.review_status === "passed" ? "passed" : row.review_status,
    deterministicScore: Number(row.deterministic_score),
    confidence: Number(row.confidence),
    policyVersion: row.policy_version,
    modelVersion: row.decision_model_version,
    contextHash: row.context_hash,
    finalizedAt: row.finalized_at,
    superseded: false,
    blockers: Array.isArray(row.blockers) ? (row.blockers as string[]) : [],
    escalationRequired: escalationReasons.length > 0 || row.decision === "escalate_for_human_review",
    executiveContextId: row.executive_context_id,
    validationRunId: row.validation_run_id,
  };
}

export async function loadCanonicalExecutiveSelectionForMission(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<PlannerExecutiveAuthorization | null> {
  const { data: row } = await supabase
    .from("executive_selection_decisions")
    .select(
      "id, organization_id, mission_id, runtime_instance_id, opportunity_id, decision, planning_eligible, review_status, deterministic_score, confidence, policy_version, decision_model_version, context_hash, finalized_at, status, executive_context_id, blockers, escalation_reasons, validation_run_id",
    )
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("decision", "select_for_planning")
    .eq("planning_eligible", true)
    .eq("status", "finalized")
    .order("finalized_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return authorizationFromSelectionRow(row);
}

export async function loadLegacyExecutiveAuthorization(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
  opportunityId: string,
): Promise<PlannerExecutiveAuthorization | null> {
  const executive = await getActiveExecutiveDecisionForOpportunity(
    supabase,
    organizationId,
    opportunityId,
  );

  if (!executive || executive.mission_id !== missionId) {
    return null;
  }

  if (
    !executive.planning_eligible ||
    !isExecutivePlanningEligibleDecision(executive.decision as ExecutiveDecisionDb)
  ) {
    return null;
  }

  return {
    organizationId,
    missionId,
    runtimeInstanceId: null,
    opportunityId,
    canonicalDecisionId: executive.id,
    canonicalDecisionType: executive.decision,
    sourceSystem: "executive_decisions_v1",
    planningEligible: true,
    reviewStatus: "passed",
    qaStatus: "legacy",
    deterministicScore: Number(executive.priority_score ?? 0),
    confidence: 0,
    policyVersion: executive.executive_policy_version,
    modelVersion: executive.reasoning_version,
    contextHash: executive.dedup_key,
    finalizedAt: executive.created_at,
    superseded: executive.record_status === "superseded",
    blockers: [],
    escalationRequired: false,
    executiveContextId: null,
    validationRunId: executive.validation_run_id,
  };
}

export async function resolvePlannerExecutiveAuthorization(input: {
  supabase: InfinitySupabase;
  organizationId: string;
  missionId: string;
  runtimeInstanceId?: string | null;
  opportunityId?: string | null;
  requireV2?: boolean;
}): Promise<PlannerExecutiveAuthorization | null> {
  const v2 = await loadCanonicalExecutiveSelectionForMission(
    input.supabase,
    input.organizationId,
    input.missionId,
  );

  if (v2) {
    if (input.opportunityId && v2.opportunityId !== input.opportunityId) {
      return null;
    }
    if (input.runtimeInstanceId && v2.runtimeInstanceId && v2.runtimeInstanceId !== input.runtimeInstanceId) {
      return null;
    }
    return v2;
  }

  if (input.requireV2) {
    return null;
  }

  if (!input.opportunityId) {
    return null;
  }

  return loadLegacyExecutiveAuthorization(
    input.supabase,
    input.organizationId,
    input.missionId,
    input.opportunityId,
  );
}

export async function assertPlannerExecutiveAuthorization(
  supabase: InfinitySupabase,
  auth: PlannerExecutiveAuthorization,
  options?: { expectedContextHash?: string | null },
): Promise<void> {
  if (auth.superseded) {
    throw new PlannerAuthorizationError("Executive authorization is superseded.");
  }

  if (auth.canonicalDecisionType !== "select_for_planning") {
    throw new PlannerAuthorizationError("Only select_for_planning may authorize planning.");
  }

  if (!auth.planningEligible) {
    throw new PlannerAuthorizationError("Planning eligibility is not granted.");
  }

  if (auth.reviewStatus !== "passed" && auth.sourceSystem === "executive_selection_v2") {
    throw new PlannerAuthorizationError("Independent Executive QA has not passed.");
  }

  if (auth.escalationRequired && auth.sourceSystem === "executive_selection_v2") {
    throw new PlannerAuthorizationError("Escalation blocks autonomous planning.");
  }

  if (auth.blockers.length > 0) {
    throw new PlannerAuthorizationError("Executive authorization has unresolved blockers.");
  }

  const validationOk = await isOpportunityApprovedForPlanning(
    supabase,
    auth.organizationId,
    auth.opportunityId,
  );

  if (!validationOk) {
    throw new PlannerAuthorizationError("Validation is no longer approved_for_planning.");
  }

  if (options?.expectedContextHash && auth.contextHash !== options.expectedContextHash) {
    throw new PlannerAuthorizationError("Executive context hash is stale.");
  }

  if (auth.sourceSystem === "executive_selection_v2") {
    const { data: context } = await supabase
      .from("executive_contexts")
      .select("context_hash, status")
      .eq("organization_id", auth.organizationId)
      .eq("id", auth.executiveContextId ?? "")
      .maybeSingle();

    if (!context || context.status !== "completed" || context.context_hash !== auth.contextHash) {
      throw new PlannerAuthorizationError("Executive context is missing or stale.");
    }
  }
}

export function buildPlannerHandoffIdempotencyKey(auth: PlannerExecutiveAuthorization): string {
  return [
    "planner-handoff",
    auth.organizationId,
    auth.missionId,
    auth.canonicalDecisionId,
    auth.opportunityId,
    auth.contextHash,
    auth.modelVersion,
    auth.policyVersion,
  ].join(":");
}
