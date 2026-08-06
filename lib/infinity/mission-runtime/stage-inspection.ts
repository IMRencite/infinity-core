import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  PENDING_JOB_STATUSES,
  REASONING_ADVISORY_CAPABILITY_KEY,
} from "@/lib/infinity/constants";
import { V1_WORKER_CAPABILITY_KEYS } from "@/lib/infinity/workers/constants";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { BUILD_FACTORY_CAPABILITY_PREFIX } from "./constants";
import { missionHasCanonicalHandoffPlan } from "@/lib/infinity/orchestration/mission-planner-handoff";
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
  hasExecutiveSelectionQaPassed: false,
  hasExecutiveSelectionPlanningEligible: false,
  hasExecutiveEscalationPending: false,
  canonicalExecutiveSelectionDecisionId: null,
  plannerHandoffPlanId: null,
  plannerHandoffBlocker: null,
  executiveContextId: null,
  executiveContextHash: null,
  allocationProposalRecorded: false,
  primaryOpportunityId: null,
  hasPendingWorkerCapabilityJobs: false,
  hasWorkerResultsAwaitingReview: false,
  hasCompletedReviewedWorkerResults: false,
  planExecutionId: null,
  planExecutionStatus: null,
  planExecutionAllocationApproved: false,
  planExecutionBuildJobLinked: false,
  planExecutionInternallyComplete: false,
  planExecutionVentureBlueprintId: null,
  planExecutionEngineJobCount: 0,
  planExecutionSchedulingComplete: false,
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

  const { data: executiveContext } = await supabase
    .from("executive_contexts")
    .select("id, status, context_hash, context_manifest")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  snapshot.hasExecutiveContext = Boolean(executiveContext);
  snapshot.executiveContextId = executiveContext?.id ?? null;
  snapshot.executiveContextHash = executiveContext?.context_hash ?? null;

  const manifest = executiveContext?.context_manifest as { qa?: { verdict?: string } } | null;
  snapshot.hasExecutiveSelectionQaPassed = manifest?.qa?.verdict === "pass";

  const { data: selectionPlanning } = await supabase
    .from("executive_selection_decisions")
    .select("id, review_status, opportunity_id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("decision", "select_for_planning")
    .eq("planning_eligible", true)
    .eq("status", "finalized")
    .eq("review_status", "passed")
    .limit(1)
    .maybeSingle();

  snapshot.hasExecutiveSelectionPlanningEligible = Boolean(selectionPlanning);
  snapshot.canonicalExecutiveSelectionDecisionId = selectionPlanning?.id ?? null;
  if (selectionPlanning?.opportunity_id) {
    snapshot.primaryOpportunityId = selectionPlanning.opportunity_id;
  }

  const { data: escalationDecision } = await supabase
    .from("executive_selection_decisions")
    .select("id, decision, escalation_reasons")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "finalized")
    .order("finalized_at", { ascending: false })
    .limit(5);

  snapshot.hasExecutiveEscalationPending = (escalationDecision ?? []).some((row) => {
    const reasons = Array.isArray(row.escalation_reasons)
      ? (row.escalation_reasons as string[])
      : [];
    return row.decision === "escalate_for_human_review" || reasons.length > 0;
  }) && !snapshot.hasExecutiveSelectionPlanningEligible;

  const decision = executiveDecision?.decision;
  snapshot.hasExecutiveApproveOrQueue =
    snapshot.hasExecutiveSelectionPlanningEligible ||
    decision === "approve" ||
    decision === "queue";
  snapshot.hasExecutiveRejectOrDefer =
    !snapshot.hasExecutiveSelectionPlanningEligible &&
    !snapshot.hasExecutiveContext &&
    (decision === "reject" || decision === "defer" || decision === "research");

  const handoffPlan = await missionHasCanonicalHandoffPlan(supabase, organizationId, missionId);
  snapshot.hasPlannerEligiblePlan = handoffPlan.hasPlan && handoffPlan.qaPassed;
  snapshot.plannerHandoffPlanId = handoffPlan.planId;
  if (handoffPlan.hasPlan && !handoffPlan.qaPassed) {
    snapshot.plannerHandoffBlocker = "plan_qa_not_passed";
  }

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

  const { data: planExecution } = await supabase
    .from("plan_executions")
    .select(
      "id, status, allocation_proposal_id, build_job_id, venture_blueprint_id, plan_id, executable_step_ids, blocked_step_ids, completed_step_ids",
    )
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  snapshot.planExecutionId = planExecution?.id ?? null;
  snapshot.planExecutionStatus = planExecution?.status ?? null;
  snapshot.planExecutionVentureBlueprintId = planExecution?.venture_blueprint_id ?? null;

  if (snapshot.plannerHandoffPlanId && !snapshot.planExecutionVentureBlueprintId) {
    const { data: planMeta } = await supabase
      .from("plans")
      .select("metadata")
      .eq("id", snapshot.plannerHandoffPlanId)
      .maybeSingle();
    const meta =
      typeof planMeta?.metadata === "object" &&
      planMeta.metadata !== null &&
      !Array.isArray(planMeta.metadata)
        ? (planMeta.metadata as Record<string, unknown>)
        : {};
    if (typeof meta.venture_blueprint_id === "string") {
      snapshot.planExecutionVentureBlueprintId = meta.venture_blueprint_id;
    }
  }

  snapshot.planExecutionBuildJobLinked = Boolean(planExecution?.build_job_id);
  snapshot.planExecutionAllocationApproved =
    Boolean(planExecution?.allocation_proposal_id) &&
    ["allocation_approved", "scheduling", "running", "awaiting_review", "internally_complete"].includes(
      planExecution?.status ?? "",
    );
  snapshot.planExecutionInternallyComplete = planExecution?.status === "internally_complete";

  if (planExecution?.plan_id) {
    const { count: planJobCount } = await supabase
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("plan_id", planExecution.plan_id);

    snapshot.planExecutionEngineJobCount = planJobCount ?? 0;

    const executableIds = Array.isArray(planExecution.executable_step_ids)
      ? (planExecution.executable_step_ids as string[])
      : [];
    const blockedIds = new Set(
      Array.isArray(planExecution.blocked_step_ids)
        ? (planExecution.blocked_step_ids as string[])
        : [],
    );
    const completedIds = new Set(
      Array.isArray(planExecution.completed_step_ids)
        ? (planExecution.completed_step_ids as string[])
        : [],
    );

    if (executableIds.length === 0) {
      snapshot.planExecutionSchedulingComplete = snapshot.planExecutionBuildJobLinked;
    } else {
      const internalExecutable = executableIds.filter((id) => !blockedIds.has(id));
      let covered = 0;
      for (const stepId of internalExecutable) {
        if (completedIds.has(stepId)) {
          covered += 1;
          continue;
        }
        const { count: stepJobs } = await supabase
          .from("engine_jobs")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("plan_step_id", stepId)
          .in("status", [...PENDING_JOB_STATUSES, "completed"]);
        if ((stepJobs ?? 0) > 0) {
          covered += 1;
        }
      }
      snapshot.planExecutionSchedulingComplete =
        snapshot.planExecutionBuildJobLinked && covered >= internalExecutable.length;
    }
  }

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
