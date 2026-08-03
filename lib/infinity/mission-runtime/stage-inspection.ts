import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
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
  latestValidationApprovedForPlanning: false,
  hasExecutiveApproveOrQueue: false,
  hasExecutiveRejectOrDefer: false,
  hasPlannerEligiblePlan: false,
  hasCompletedPlanStepJob: false,
  hasDeterministicReasoningComplete: false,
  allocationProposalRecorded: false,
};

export async function inspectMissionRuntimeStage(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<StageInspectionSnapshot> {
  const snapshot = { ...EMPTY_STAGE_INSPECTION };

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

  const { count: buildCount } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .like("capability_key", `${BUILD_FACTORY_CAPABILITY_PREFIX}%`)
    .in("status", [...PENDING_JOB_STATUSES]);

  snapshot.hasPendingBuildJobs = (buildCount ?? 0) > 0;

  const { data: validationRun } = await supabase
    .from("validation_runs")
    .select("recommendation")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  return snapshot;
}

export async function runDeterministicReasoningForMission(input: {
  organizationId: string;
  missionId: string;
  correlationId: string;
}): Promise<{ complete: boolean }> {
  const { runReasoningPipeline, createReasoningSession } = await import(
    "@/lib/infinity/reasoning"
  );

  const session = createReasoningSession({
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: "runtime-opportunity",
    validationRunId: "runtime-validation",
    executiveDecisionId: "runtime-executive",
    plannerPlanId: null,
    correlationId: input.correlationId,
  });

  const result = runReasoningPipeline(
    { session },
    {
      organizationId: input.organizationId,
      correlationId: input.correlationId,
      mission: {
        missionId: input.missionId,
        title: "Mission Runtime",
        objective: "Deterministic advisory reasoning",
      },
      opportunity: {
        opportunityId: "runtime-opportunity",
        name: "Runtime",
        industry: "internal",
        category: "runtime",
      },
      validation: {
        validationRunId: "runtime-validation",
        recommendation: "approved_for_planning",
        overallScore: 70,
        overallConfidence: 70,
      },
      executive: {
        executiveDecisionId: "runtime-executive",
        decision: "approve",
        planningEligible: true,
        priorityScore: 70,
        rationale: ["Runtime deterministic reasoning."],
      },
      planner: {
        plannerPlanId: null,
        gateStatus: "eligible",
        notes: ["Mission runtime deterministic reasoning."],
      },
      build: {
        buildFactoryEnabled: false,
        notes: ["Build Factory disabled for mission runtime v1."],
      },
      policy: { policyKeys: ["founding"], autonomyLevel: "bounded" },
      memoryRecords: [],
    },
  );

  return { complete: result.session.status === "completed" };
}
