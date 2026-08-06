import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  resolvePlannerExecutiveAuthorization,
  PlannerAuthorizationError,
} from "@/lib/infinity/executive-selection/authorization";
import { getActiveExecutiveDecisionForOpportunity } from "@/lib/infinity/executive/queries";
import {
  isExecutivePlanningEligibleDecision,
  type ExecutiveDecisionDb,
} from "@/lib/infinity/executive/constants-db";
import { isOpportunityApprovedForPlanning } from "@/lib/infinity/validation";

type InfinitySupabase = SupabaseClient<Database>;

export class ExecutiveGatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutiveGatingError";
  }
}

/**
 * v2: canonical executive_selection_decisions; v1 fallback via executive_decisions.
 */
export async function assertExecutiveEligibleForInitiativePlanning(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
  missionId?: string | null,
): Promise<void> {
  const validationApproved = await isOpportunityApprovedForPlanning(
    supabase,
    organizationId,
    opportunityId,
  );

  if (!validationApproved) {
    throw new ExecutiveGatingError(
      "Initiative planning requires validation recommendation approved_for_planning.",
    );
  }

  if (missionId) {
    const auth = await resolvePlannerExecutiveAuthorization({
      supabase,
      organizationId,
      missionId,
      opportunityId,
    });

    if (auth) {
      if (auth.opportunityId !== opportunityId) {
        throw new ExecutiveGatingError("Executive authorization opportunity mismatch.");
      }
      if (auth.canonicalDecisionType !== "select_for_planning" || !auth.planningEligible) {
        throw new ExecutiveGatingError(
          `Executive decision "${auth.canonicalDecisionType}" is not eligible for initiative planning.`,
        );
      }
      if (auth.sourceSystem === "executive_selection_v2" && auth.reviewStatus !== "passed") {
        throw new ExecutiveGatingError("Executive selection QA must pass before planning.");
      }
      if (auth.escalationRequired && auth.sourceSystem === "executive_selection_v2") {
        throw new ExecutiveGatingError("Escalated Executive decisions cannot authorize planning.");
      }
      return;
    }
  }

  const executive = await getActiveExecutiveDecisionForOpportunity(
    supabase,
    organizationId,
    opportunityId,
  );

  if (
    executive &&
    executive.planning_eligible &&
    isExecutivePlanningEligibleDecision(executive.decision as ExecutiveDecisionDb)
  ) {
    return;
  }

  throw new ExecutiveGatingError(
    "Initiative planning requires a finalized canonical Executive selection or legacy approve/queue decision.",
  );
}

export { PlannerAuthorizationError };
