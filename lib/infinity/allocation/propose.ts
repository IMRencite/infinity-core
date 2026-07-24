import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import { isAllocationType } from "./constants";
import { ensureDefaultResourcePools, getResourcePoolByType } from "./pools";
import type { ProposeAllocationInput, ProposeAllocationResult } from "./types";

function buildProposalKey(
  evaluationId: string,
  allocationType: string,
  correlationId?: string | null,
): string {
  return correlationId
    ? `allocation:${evaluationId}:${allocationType}:${correlationId}`
    : `allocation:${evaluationId}:${allocationType}`;
}

export async function proposeAllocation(
  admin: AdminSupabaseClient,
  input: ProposeAllocationInput,
): Promise<ProposeAllocationResult> {
  if (!isAllocationType(input.allocationType)) {
    throw new Error(`Invalid allocation type: ${input.allocationType}`);
  }

  const proposalKey =
    input.proposalKey ?? buildProposalKey(input.evaluationId, input.allocationType, input.correlationId);

  const { data: existing, error: existingError } = await admin
    .from("allocation_proposals")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("proposal_key", proposalKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check allocation proposal: ${existingError.message}`);
  }

  if (existing) {
    return { alreadyProposed: true, proposal: existing, status: existing.status };
  }

  const { data: evaluation, error: evaluationError } = await admin
    .from("opportunity_evaluations")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.evaluationId)
    .maybeSingle();

  if (evaluationError || !evaluation) {
    throw new Error(`Evaluation not found: ${evaluationError?.message ?? input.evaluationId}`);
  }

  await ensureDefaultResourcePools(admin, input.organizationId);

  const poolType =
    input.allocationType === "validation"
      ? "validation_slots"
      : input.allocationType === "research"
        ? "research_slots"
        : input.allocationType === "initiative"
          ? "research_slots"
          : input.allocationType === "build"
            ? "build_slots"
            : "other";

  const pool = await getResourcePoolByType(admin, input.organizationId, poolType);

  const requestedResources =
    pool !== null
      ? [
          {
            resource_pool_id: pool.id,
            resource_type: pool.resource_type,
            amount: 1,
          },
        ]
      : [];

  const policyResults =
    typeof evaluation.policy_results === "object" &&
    evaluation.policy_results !== null &&
    !Array.isArray(evaluation.policy_results)
      ? (evaluation.policy_results as Record<string, unknown>)
      : {};

  const blocked = Boolean(policyResults.blocked);
  const requiresApproval = Boolean(policyResults.requiresApproval);

  let status = "proposed";
  if (blocked) {
    status = "policy_blocked";
  } else if (
    requiresApproval ||
    evaluation.recommendation === "approve_build" ||
    evaluation.recommendation === "acquire"
  ) {
    status = "awaiting_approval";
  } else if (pool && pool.total_capacity <= 0) {
    status = "policy_blocked";
  } else if (
    evaluation.recommendation === "validate" ||
    evaluation.recommendation === "approve_initiative"
  ) {
    status = "awaiting_approval";
  }

  const { data: proposal, error } = await admin
    .from("allocation_proposals")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      evaluation_id: input.evaluationId,
      mission_id: input.missionId ?? evaluation.mission_id,
      allocation_type: input.allocationType,
      status,
      expected_outcome: `Support ${input.allocationType} work for opportunity evaluation ${evaluation.id}`,
      proposal_key: proposalKey,
      expected_value: evaluation.expected_value_score,
      expected_value_currency: "USD",
      expected_time_to_value_days: 30,
      risk_score: evaluation.risk_adjusted_score !== null ? 100 - Number(evaluation.risk_adjusted_score) : null,
      confidence_score: evaluation.confidence_score,
      rationale: evaluation.reasoning,
      policy_results: policyResults as Json,
      requested_resources: requestedResources as Json,
    })
    .select("*")
    .single();

  if (error || !proposal) {
    throw new Error(`Failed to create allocation proposal: ${error?.message ?? "unknown error"}`);
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "allocation_engine",
    eventType: "allocation.proposed",
    entityType: "allocation_proposal",
    entityId: proposal.id,
    message: `Allocation proposed: ${input.allocationType}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      allocation_proposal_id: proposal.id,
      evaluation_id: input.evaluationId,
      opportunity_id: input.opportunityId,
      allocation_type: input.allocationType,
      status,
      policy_results: policyResults as Json,
    },
  });

  if (status === "awaiting_approval") {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "allocation_engine",
      eventType: "allocation.awaiting_approval",
      entityType: "allocation_proposal",
      entityId: proposal.id,
      message: "Allocation awaiting approval",
      correlationId: input.correlationId ?? undefined,
      payload: {
        allocation_proposal_id: proposal.id,
        evaluation_id: input.evaluationId,
      },
    });
  }

  if (status === "policy_blocked") {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "allocation_engine",
      eventType: "decision.policy_blocked",
      entityType: "allocation_proposal",
      entityId: proposal.id,
      message: "Allocation blocked by policy or zero-capacity pool",
      correlationId: input.correlationId ?? undefined,
      payload: {
        allocation_proposal_id: proposal.id,
        evaluation_id: input.evaluationId,
      },
    });
  }

  return { alreadyProposed: false, proposal, status };
}
