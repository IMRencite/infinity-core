import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isOpportunityApprovedForPlanning } from "@/lib/infinity/validation";
import { getActiveExecutiveDecisionForOpportunity } from "./queries";
import { isExecutivePlanningEligibleDecision, type ExecutiveDecisionDb } from "./constants-db";

type InfinitySupabase = SupabaseClient<Database>;

export class ExecutiveGatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutiveGatingError";
  }
}

export async function assertExecutiveEligibleForInitiativePlanning(
  supabase: InfinitySupabase,
  organizationId: string,
  opportunityId: string,
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

  const executive = await getActiveExecutiveDecisionForOpportunity(
    supabase,
    organizationId,
    opportunityId,
  );

  if (!executive) {
    throw new ExecutiveGatingError(
      "Initiative planning requires an active Executive decision after deterministic reasoning.",
    );
  }

  if (
    !executive.planning_eligible ||
    !isExecutivePlanningEligibleDecision(executive.decision as ExecutiveDecisionDb)
  ) {
    throw new ExecutiveGatingError(
      `Executive decision "${executive.decision}" is not eligible for initiative planning.`,
    );
  }
}
