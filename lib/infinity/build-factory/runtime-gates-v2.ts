import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { loadCanonicalExecutiveSelectionForMission } from "@/lib/infinity/executive-selection/authorization";
import { evaluateBuildFactoryGates, type BuildPolicyGateResult } from "./policies";
import type { BuildFactoryRequestInput } from "./types";

export async function evaluateBuildFactoryRuntimeV2Gates(
  admin: AdminSupabaseClient,
  input: BuildFactoryRequestInput,
): Promise<BuildPolicyGateResult> {
  const base = await evaluateBuildFactoryGates(admin, input);
  if (!base.allowed) {
    return base;
  }

  const executive = await loadCanonicalExecutiveSelectionForMission(
    admin,
    input.organizationId,
    input.missionId,
  );

  if (!executive || executive.canonicalDecisionType !== "select_for_planning") {
    return {
      allowed: false,
      classification: "executive_ineligible",
      reason: "Canonical Executive selection (select_for_planning) required for Build Factory v2.",
    };
  }

  if (executive.opportunityId !== input.opportunityId) {
    return {
      allowed: false,
      classification: "executive_opportunity_mismatch",
      reason: "Executive selection opportunity mismatch.",
    };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, metadata")
    .eq("id", input.planId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (plan?.metadata && typeof plan.metadata === "object" && !Array.isArray(plan.metadata)) {
    const meta = plan.metadata as Record<string, unknown>;
    if (meta.plan_qa_verdict !== "pass") {
      return {
        allowed: false,
        classification: "plan_qa_incomplete",
        reason: "Planner plan QA must pass before Build Factory.",
      };
    }
  }

  return { allowed: true };
}

export async function loadExecutiveDecisionIdForBuild(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<string | null> {
  const auth = await loadCanonicalExecutiveSelectionForMission(
    admin,
    organizationId,
    missionId,
  );
  return auth?.canonicalDecisionId ?? null;
}

export type { BuildFactoryRequestInput };
