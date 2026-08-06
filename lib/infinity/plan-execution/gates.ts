import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadCanonicalExecutiveSelectionForMission } from "@/lib/infinity/executive-selection/authorization";
import { isOpportunityApprovedForPlanning } from "@/lib/infinity/validation";
import { resolveCapability } from "@/lib/infinity/registry";
import { classifyPlanSteps } from "./step-classification";
import type { PlanStep } from "@/lib/infinity/types";
import { PLAN_EXECUTION_POLICY_VERSION, PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL } from "./constants";
import { resolveBuilderKeyForProjectType } from "@/lib/infinity/build-factory/builder-registry";
import {
  VENTURE_TYPE_TO_BUILD_PROJECT,
  type BuildProjectType,
} from "@/lib/infinity/build-factory/constants";

function buildProjectTypeFromVentureType(ventureType: string): BuildProjectType {
  const mapped = VENTURE_TYPE_TO_BUILD_PROJECT[ventureType];
  if (mapped) {
    return mapped;
  }
  return ventureType as BuildProjectType;
}

export type PlanExecutionGateResult =
  | { allowed: true; executiveDecisionId: string; opportunityId: string }
  | { allowed: false; classification: string; reason: string };

export async function evaluatePlanExecutionGates(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    planId: string;
    ventureBlueprintId?: string | null;
  },
): Promise<PlanExecutionGateResult> {
  const executive = await loadCanonicalExecutiveSelectionForMission(
    admin,
    input.organizationId,
    input.missionId,
  );

  if (!executive || executive.canonicalDecisionType !== "select_for_planning") {
    return {
      allowed: false,
      classification: "executive_ineligible",
      reason: "Canonical Executive selection (select_for_planning) required.",
    };
  }

  if (executive.reviewStatus !== "passed" && executive.qaStatus !== "passed") {
    return {
      allowed: false,
      classification: "executive_qa_incomplete",
      reason: "Executive QA must pass before plan execution.",
    };
  }

  if (executive.escalationRequired) {
    return {
      allowed: false,
      classification: "executive_escalation",
      reason: "Unresolved Executive escalation blocks execution.",
    };
  }

  const approved = await isOpportunityApprovedForPlanning(
    admin,
    input.organizationId,
    executive.opportunityId,
  );
  if (!approved) {
    return {
      allowed: false,
      classification: "validation_incomplete",
      reason: "Opportunity is not approved_for_planning.",
    };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, status, mission_id, version, metadata")
    .eq("id", input.planId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!plan || plan.status !== "active") {
    return {
      allowed: false,
      classification: "plan_ineligible",
      reason: "Active eligible plan is required.",
    };
  }

  if (plan.mission_id !== input.missionId) {
    return {
      allowed: false,
      classification: "plan_mission_mismatch",
      reason: "Plan mission mismatch.",
    };
  }

  const meta =
    typeof plan.metadata === "object" && plan.metadata !== null && !Array.isArray(plan.metadata)
      ? (plan.metadata as Record<string, unknown>)
      : {};

  if (meta.plan_qa_verdict !== "pass") {
    return {
      allowed: false,
      classification: "plan_qa_incomplete",
      reason: "Plan QA must pass before execution.",
    };
  }

  if (meta.canonical_executive_selection_decision_id !== executive.canonicalDecisionId) {
    return {
      allowed: false,
      classification: "planner_authorization_mismatch",
      reason: "Planner authorization does not match canonical Executive decision.",
    };
  }

  const { data: steps } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .order("step_order", { ascending: true });

  const classified = classifyPlanSteps((steps ?? []) as PlanStep[], {
    organizationId: input.organizationId,
    missionId: input.missionId,
    planId: input.planId,
    planVersion: plan.version ?? 1,
    executionPolicyVersion: PLAN_EXECUTION_POLICY_VERSION,
  });

  for (const step of classified) {
    if (step.eligibilityStatus === PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL) {
      continue;
    }
    if (step.classification === "build" || step.classification === "planning_support") {
      continue;
    }
    try {
      await resolveCapability(admin, input.organizationId, step.capabilityKey);
    } catch {
      return {
        allowed: false,
        classification: "capability_unregistered",
        reason: `Unregistered capability: ${step.capabilityKey}`,
      };
    }
  }

  if (input.ventureBlueprintId) {
    const { data: blueprint } = await admin
      .from("venture_blueprints")
      .select("venture_type, status, opportunity_id")
      .eq("id", input.ventureBlueprintId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (!blueprint || blueprint.status !== "validated") {
      return {
        allowed: false,
        classification: "blueprint_ineligible",
        reason: "Validated venture blueprint required for internal build segment.",
      };
    }

    if (blueprint.opportunity_id !== executive.opportunityId) {
      return {
        allowed: false,
        classification: "blueprint_opportunity_mismatch",
        reason: "Blueprint opportunity mismatch.",
      };
    }

    const builderKey = resolveBuilderKeyForProjectType(
      buildProjectTypeFromVentureType(blueprint.venture_type),
    );
    if (!builderKey) {
      return {
        allowed: false,
        classification: "builder_unregistered",
        reason: "No registered builder for blueprint venture type.",
      };
    }
  }

  return {
    allowed: true,
    executiveDecisionId: executive.canonicalDecisionId,
    opportunityId: executive.opportunityId,
  };
}
