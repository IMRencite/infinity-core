import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { isOpportunityApprovedForPlanning } from "@/lib/infinity/validation";
import type { BuildFactoryRequestInput } from "./types";
import { emitBuildFactoryEvent } from "./events";

export type BuildPolicyGateResult =
  | { allowed: true }
  | { allowed: false; classification: string; reason: string };

export async function evaluateBuildFactoryGates(
  admin: AdminSupabaseClient,
  input: BuildFactoryRequestInput,
): Promise<BuildPolicyGateResult> {
  const { organizationId, opportunityId, missionId, ventureBlueprintId, planId } = input;

  const approved = await isOpportunityApprovedForPlanning(
    admin,
    organizationId,
    opportunityId,
  );
  if (!approved) {
    return {
      allowed: false,
      classification: "validation_incomplete",
      reason: "Opportunity is not approved_for_planning.",
    };
  }

  const { data: validationRun } = await admin
    .from("validation_runs")
    .select("id, recommendation, run_status")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .eq("recommendation", "approved_for_planning")
    .eq("run_status", "completed")
    .limit(1)
    .maybeSingle();

  if (!validationRun) {
    return {
      allowed: false,
      classification: "validation_incomplete",
      reason: "Completed validation recommending approved_for_planning is required.",
    };
  }

  const { data: executiveDecision } = await admin
    .from("command_decisions")
    .select("id, outcome")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!executiveDecision) {
    return {
      allowed: false,
      classification: "executive_ineligible",
      reason: "Executive decision record required before build factory.",
    };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, status, mission_id")
    .eq("id", planId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!plan || plan.status !== "active") {
    return {
      allowed: false,
      classification: "plan_ineligible",
      reason: "Active eligible plan is required.",
    };
  }

  if (plan.mission_id !== missionId) {
    return {
      allowed: false,
      classification: "plan_mission_mismatch",
      reason: "Plan mission mismatch.",
    };
  }

  const { data: blueprint } = await admin
    .from("venture_blueprints")
    .select("id, status, opportunity_id")
    .eq("id", ventureBlueprintId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!blueprint) {
    return {
      allowed: false,
      classification: "blueprint_missing",
      reason: "Approved venture blueprint required.",
    };
  }

  if (blueprint.status !== "validated") {
    return {
      allowed: false,
      classification: "blueprint_not_approved",
      reason: "Venture blueprint must be validated before build factory.",
    };
  }

  if (blueprint.opportunity_id !== opportunityId) {
    return {
      allowed: false,
      classification: "blueprint_opportunity_mismatch",
      reason: "Blueprint opportunity mismatch.",
    };
  }

  if (input.allocationProposalId) {
    const { data: allocation } = await admin
      .from("allocation_proposals")
      .select("id, status")
      .eq("id", input.allocationProposalId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!allocation || !["approved", "reserved"].includes(allocation.status)) {
      return {
        allowed: false,
        classification: "allocation_denied",
        reason: "Allocation authorization (approved or reserved) required.",
      };
    }
  } else {
    return {
      allowed: false,
      classification: "allocation_denied",
      reason: "Allocation proposal ID required for build factory v1.",
    };
  }

  const { data: mission } = await admin
    .from("missions")
    .select("status")
    .eq("id", missionId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission || mission.status !== "active") {
    return {
      allowed: false,
      classification: "mission_inactive",
      reason: "Active mission required.",
    };
  }

  if (input.runtimeInstanceId) {
    const { data: runtime } = await admin
      .from("mission_runtime_instances")
      .select("id, status, mission_id")
      .eq("id", input.runtimeInstanceId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!runtime || runtime.mission_id !== missionId) {
      return {
        allowed: false,
        classification: "runtime_inactive",
        reason: "Active runtime instance required.",
      };
    }

    if (["cancelled", "failed", "completed"].includes(runtime.status)) {
      return {
        allowed: false,
        classification: "runtime_inactive",
        reason: `Runtime status ${runtime.status} blocks build factory.`,
      };
    }
  }

  return { allowed: true };
}

export async function persistBlockedBuildAttempt(
  admin: AdminSupabaseClient,
  input: BuildFactoryRequestInput & { reason: string; classification: string },
): Promise<string> {
  const { data, error } = await admin
    .from("builds")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      opportunity_id: input.opportunityId,
      venture_blueprint_id: input.ventureBlueprintId,
      plan_id: input.planId,
      allocation_proposal_id: input.allocationProposalId,
      project_type: "internal_tool",
      template_key: "none",
      template_version: "0",
      build_version: "0",
      specification_version: "0",
      status: "blocked",
      specification: { blocked: true, classification: input.classification },
      specification_hash: input.classification,
      manifest: {},
      manifest_hash: "",
      workspace_reference: "",
      review_status: "not_required",
      idempotency_key: `blocked:${input.classification}:${input.ventureBlueprintId}:${Date.now()}`,
      error: { reason: input.reason, classification: input.classification },
      correlation_id: input.correlationId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to persist blocked build");
  }

  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: "build.blocked",
    message: input.reason,
    correlationId: input.correlationId,
    buildId: data.id,
    payload: { classification: input.classification },
    severity: "warning",
  });

  return data.id;
}
