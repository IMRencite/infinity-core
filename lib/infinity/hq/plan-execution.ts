import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { mapPlanExecutionRow } from "@/lib/infinity/plan-execution/persistence";

type InfinitySupabase = SupabaseClient<Database>;

export type HqPlanExecutionSummary = {
  planExecutionId: string | null;
  executionVersion: number | null;
  status: string | null;
  currentPhase: string | null;
  planId: string | null;
  allocationId: string | null;
  buildJobId: string | null;
  completedStepCount: number;
  blockedStepCount: number;
  failedStepCount: number;
  blockingReason: string | null;
  label: string;
};

export async function loadHqPlanExecutionSummary(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<HqPlanExecutionSummary> {
  const { data } = await supabase
    .from("plan_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      planExecutionId: null,
      executionVersion: null,
      status: null,
      currentPhase: null,
      planId: null,
      allocationId: null,
      buildJobId: null,
      completedStepCount: 0,
      blockedStepCount: 0,
      failedStepCount: 0,
      blockingReason: null,
      label: "Autonomous internal execution — not deployed or published.",
    };
  }

  const pe = mapPlanExecutionRow(data as Record<string, unknown>);
  return {
    planExecutionId: pe.id,
    executionVersion: pe.executionVersion,
    status: pe.status,
    currentPhase: pe.currentPhase,
    planId: pe.planId,
    allocationId: pe.allocationProposalId,
    buildJobId: pe.buildJobId,
    completedStepCount: pe.completedStepIds.length,
    blockedStepCount: pe.blockedStepIds.length,
    failedStepCount: pe.failedStepIds.length,
    blockingReason: pe.blockingReason,
    label: "Autonomous internal execution — not deployed or published.",
  };
}
