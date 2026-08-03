import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  PENDING_JOB_STATUSES,
  REASONING_ADVISORY_CAPABILITY_KEY,
} from "@/lib/infinity/constants";
import { V1_WORKER_CAPABILITY_KEYS } from "@/lib/infinity/workers/constants";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { BUILD_FACTORY_CAPABILITY_PREFIX } from "./constants";
import type { StageInspectionSnapshot } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export const EMPTY_STAGE_INSPECTION: StageInspectionSnapshot = {
  missionActive: false,
  hasPendingDiscoveryJobs: false,
  hasPendingDecisionJobs: false,
  hasPendingValidationJobs: false,
  hasPendingExecutiveJobs: false,
  hasPendingBuildJobs: false,
  latestValidationRunCompleted: false,
  latestValidationApprovedForPlanning: false,
  hasExecutiveApproveOrQueue: false,
  hasExecutiveRejectOrDefer: false,
  hasPlannerEligiblePlan: false,
  hasCompletedPlanStepJob: false,
  hasDeterministicReasoningComplete: false,
  hasPendingReasoningJobs: false,
  hasCompletedGovernedReasoningSession: false,
  governedReasoningMode: "disabled",
  hasExecutiveContext: false,
  allocationProposalRecorded: false,
  primaryOpportunityId: null,
  hasPendingWorkerCapabilityJobs: false,
  hasWorkerResultsAwaitingReview: false,
  hasCompletedReviewedWorkerResults: false,
};

export async function inspectMissionRuntimeStage(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
  runtimeInstanceId?: string | null,
): Promise<StageInspectionSnapshot> {
  const snapshot = { ...EMPTY_STAGE_INSPECTION };
  snapshot.governedReasoningMode = loadGovernedReasoningMode();

  const { data: mission } = await supabase
    .from("missions")
    .select("status")
    .eq("id", missionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  snapshot.missionActive = mission?.status === "active";

  const pending = async (capabilityPrefix: string) => {
    const { count } = await supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .like("capability_key", `${capabilityPrefix}%`)
      .in("status", [...PENDING_JOB_STATUSES]);

    return (count ?? 0) > 0;
  };

  snapshot.hasPendingDiscoveryJobs = await pending("discovery.");
  snapshot.hasPendingDecisionJobs = await pending("decision.");
  snapshot.hasPendingValidationJobs = await pending("validation.");
  snapshot.hasPendingExecutiveJobs = await pending("executive.");

  const { count: reasoningPending } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("capability_key", REASONING_ADVISORY_CAPABILITY_KEY)
    .in("status", [...PENDING_JOB_STATUSES]);

  snapshot.hasPendingReasoningJobs = (reasoningPending ?? 0) > 0;

  const { count: buildCount } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .like("capability_key", `${BUILD_FACTORY_CAPABILITY_PREFIX}%`)
    .in("status", [...PENDING_JOB_STATUSES]);

  snapshot.hasPendingBuildJobs = (buildCount ?? 0) > 0;

  let workerPending = false;
  for (const key of V1_WORKER_CAPABILITY_KEYS) {
    const { count } = await supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .eq("capability_key", key)
      .in("status", [...PENDING_JOB_STATUSES]);
    if ((count ?? 0) > 0) {
      workerPending = true;
      break;
    }
  }
  snapshot.hasPendingWorkerCapabilityJobs = workerPending;

  const { count: awaitingReview } = await supabase
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("review_status", "pending");

  snapshot.hasWorkerResultsAwaitingReview = (awaitingReview ?? 0) > 0;

  const { count: reviewedComplete } = await supabase
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "completed")
    .in("review_status", ["passed", "not_required"]);

  snapshot.hasCompletedReviewedWorkerResults = (reviewedComplete ?? 0) > 0;

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  snapshot.primaryOpportunityId = opportunity?.id ?? null;

  const { data: validationRun } = await supabase
    .from("validation_runs")
    .select("recommendation, run_status, completed_at")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  snapshot.latestValidationRunCompleted =
    validationRun?.run_status === "completed" && validationRun.completed_at != null;

  snapshot.latestValidationApprovedForPlanning =
    validationRun?.recommendation === "approved_for_planning";

  const { data: executiveDecision } = await supabase
    .from("executive_decisions")
    .select("decision")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  snapshot.hasExecutiveContext = Boolean(executiveDecision);
  const decision = executiveDecision?.decision;
  snapshot.hasExecutiveApproveOrQueue =
    decision === "approve" || decision === "queue";
  snapshot.hasExecutiveRejectOrDefer =
    decision === "reject" || decision === "defer" || decision === "research";

  const { count: planCount } = await supabase
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId);

  snapshot.hasPlannerEligiblePlan = (planCount ?? 0) > 0;

  const { count: completedJobs } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "completed");

  snapshot.hasCompletedPlanStepJob = (completedJobs ?? 0) > 0;

  const { count: allocationCount } = await supabase
    .from("allocation_proposals")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId);

  snapshot.allocationProposalRecorded = (allocationCount ?? 0) > 0;

  if (runtimeInstanceId) {
    const { count: completedSessions } = await supabase
      .from("reasoning_sessions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("runtime_instance_id", runtimeInstanceId)
      .eq("status", "completed");

    snapshot.hasCompletedGovernedReasoningSession = (completedSessions ?? 0) > 0;
    snapshot.hasDeterministicReasoningComplete = snapshot.hasCompletedGovernedReasoningSession;
  }

  return snapshot;
}
