import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewStatus } from "./constants";
import { planStepMayComplete } from "./lifecycle";

type InfinitySupabase = SupabaseClient<Database>;

/**
 * Mission Runtime observation hook: marks plan steps complete when governed worker
 * results are reviewed — does not advance runtime stage directly.
 */
export async function observeGovernedWorkerPlanSteps(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<number> {
  const { data: results } = await supabase
    .from("worker_results")
    .select("id, plan_step_id, review_status, status")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .in("status", ["completed", "needs_review"])
    .not("plan_step_id", "is", null);

  if (!results?.length) {
    return 0;
  }

  let updated = 0;
  for (const result of results) {
    if (
      !result.plan_step_id ||
      !planStepMayComplete(result.review_status as ReviewStatus)
    ) {
      continue;
    }

    const { data: step } = await supabase
      .from("plan_steps")
      .select("status")
      .eq("id", result.plan_step_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!step || step.status === "completed") {
      continue;
    }

    const { error } = await supabase
      .from("plan_steps")
      .update({ status: "completed" })
      .eq("id", result.plan_step_id)
      .eq("organization_id", organizationId);

    if (!error) {
      updated += 1;
    }
  }

  return updated;
}
