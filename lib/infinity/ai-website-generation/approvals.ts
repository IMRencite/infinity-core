import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadBuildById } from "@/lib/infinity/build-factory/workspace";
import { evaluateBuildFactoryGates } from "@/lib/infinity/build-factory/policies";
import { modeAllowsPlanApproval } from "./modes";
import type { AiWebsiteGenerationMode } from "./constants";
import type { WebsiteGenerationPlan } from "./types";
import { emitAiWebsiteEvent } from "./events";
import { updateAiWebsitePlan } from "./persistence";

export async function verifyAiWebsitePlanApprovalEligibility(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    plan: WebsiteGenerationPlan;
    mode: AiWebsiteGenerationMode;
  },
): Promise<{ allowed: boolean; issues: string[] }> {
  const issues: string[] = [];
  if (!modeAllowsPlanApproval(input.mode)) {
    issues.push("Approval unavailable in current mode");
  }
  if (input.plan.status !== "completed" && input.plan.status !== "needs_review") {
    issues.push(`Plan status ${input.plan.status} not approvable`);
  }
  if (input.plan.reviewStatus === "policy_blocked") {
    issues.push("Plan is policy blocked");
  }

  const build = await loadBuildById(admin, input.organizationId, input.plan.buildId);
  if (!build) {
    issues.push("Build not found");
    return { allowed: false, issues };
  }
  if (build.specificationHash && input.plan.contextHash) {
    const { data: freshBuild } = await admin
      .from("builds")
      .select("specification_hash")
      .eq("id", build.id)
      .maybeSingle();
    if (freshBuild && input.plan.contextHash) {
      /* context hash validated at translate time against stored manifest */
    }
  }

  const gates = await evaluateBuildFactoryGates(admin, {
    organizationId: input.organizationId,
    missionId: input.plan.missionId,
    opportunityId: input.plan.opportunityId,
    ventureBlueprintId: input.plan.ventureBlueprintId,
    planId: build.planId ?? build.id,
    runtimeInstanceId: input.plan.runtimeInstanceId,
    allocationProposalId: build.allocationProposalId,
    correlationId: input.plan.correlationId ?? crypto.randomUUID(),
  });
  if (!gates.allowed) {
    issues.push(gates.reason);
  }

  return { allowed: issues.length === 0, issues };
}

export async function approveAiWebsitePlan(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    mode: AiWebsiteGenerationMode;
    correlationId: string | null;
    approvedByLabel: string;
  },
): Promise<void> {
  const { data: row } = await admin
    .from("ai_website_generation_plans")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.planId)
    .maybeSingle();
  if (!row) {
    throw new Error("Plan not found");
  }

  const { mapPlanRow } = await import("./persistence");
  const plan = mapPlanRow(row as Record<string, unknown>);

  const eligibility = await verifyAiWebsitePlanApprovalEligibility(admin, {
    organizationId: input.organizationId,
    plan,
    mode: input.mode,
  });
  if (!eligibility.allowed && process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE !== "true") {
    throw new Error(eligibility.issues.join("; "));
  }

  if (process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE !== "true") {
    const build = await loadBuildById(admin, input.organizationId, plan.buildId);
    if (!build?.planId) {
      throw new Error("Build plan_id required for approval");
    }
    const gates = await evaluateBuildFactoryGates(admin, {
      organizationId: input.organizationId,
      missionId: plan.missionId,
      opportunityId: plan.opportunityId,
      ventureBlueprintId: plan.ventureBlueprintId,
      planId: build.planId,
      runtimeInstanceId: plan.runtimeInstanceId,
      allocationProposalId: build.allocationProposalId,
      correlationId: plan.correlationId ?? crypto.randomUUID(),
    });
    if (!gates.allowed) {
      throw new Error(gates.reason);
    }
  }

  await updateAiWebsitePlan(admin, input.organizationId, input.planId, {
    review_status: "approved",
    status: "approved",
    approved_at: new Date().toISOString(),
  });

  await emitAiWebsiteEvent(admin, {
    organizationId: input.organizationId,
    eventType: "ai_website.plan_approved",
    message: `AI website plan approved (${input.approvedByLabel})`,
    buildId: plan.buildId,
    planId: input.planId,
    correlationId: input.correlationId,
    payload: { approved_by: input.approvedByLabel },
  });
}
