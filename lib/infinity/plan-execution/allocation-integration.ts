import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { emitPlanExecutionEvent, PLAN_EXECUTION_EVENTS } from "./events";
import { planExecutionAllocationKey } from "./idempotency";
import type { PlanExecutionContract } from "./contract";

export async function ensureZeroCostAllocationForPlanExecution(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    planExecution: PlanExecutionContract;
    correlationId?: string | null;
  },
): Promise<{ allocationId: string; status: "created" | "reused" | "denied"; reason?: string }> {
  if (input.planExecution.allocationProposalId) {
    const { data: existing } = await admin
      .from("allocation_proposals")
      .select("id, status")
      .eq("id", input.planExecution.allocationProposalId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (existing && ["approved", "reserved"].includes(existing.status)) {
      return { allocationId: existing.id, status: "reused" };
    }
  }

  const proposalKey = planExecutionAllocationKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: input.opportunityId,
    planExecutionId: input.planExecution.id,
  });

  const { data: byKey } = await admin
    .from("allocation_proposals")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("proposal_key", proposalKey)
    .maybeSingle();

  if (byKey && ["approved", "reserved"].includes(byKey.status)) {
    return { allocationId: byKey.id, status: "reused" };
  }

  const { data: allocation, error } = await admin
    .from("allocation_proposals")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      opportunity_id: input.opportunityId,
      allocation_type: "build",
      expected_outcome: "internally_complete",
      proposal_key: proposalKey,
      status: "approved",
      approved_at: new Date().toISOString(),
      requested_resources: { cost_usd: 0 },
      approved_resources: { cost_usd: 0 },
      rationale: "Zero-cost autonomous internal plan execution (v1)",
    })
    .select("id")
    .single();

  if (error || !allocation) {
    await emitPlanExecutionEvent(admin, {
      organizationId: input.organizationId,
      eventType: PLAN_EXECUTION_EVENTS.blocked,
      message: "Allocation denied for plan execution",
      correlationId: input.correlationId,
      missionId: input.missionId,
      planExecutionId: input.planExecution.id,
      payload: { reason: error?.message ?? "insert_failed" },
    });
    return { allocationId: "", status: "denied", reason: error?.message ?? "allocation_denied" };
  }

  await emitPlanExecutionEvent(admin, {
    organizationId: input.organizationId,
    eventType: PLAN_EXECUTION_EVENTS.allocationApproved,
    message: "Zero-cost allocation approved for plan execution",
    correlationId: input.correlationId,
    missionId: input.missionId,
    planExecutionId: input.planExecution.id,
    allocationId: allocation.id,
  });

  return { allocationId: allocation.id, status: "created" };
}
