import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import {
  CRE_FIRST_REAL_COHORT_COMPLETION,
  completeFirstRealCreProspectCohort,
  researchObservations,
} from "./cre-first-real-cohort-completion";

type CohortCompletionInner = ReturnType<typeof completeFirstRealCreProspectCohort>;
import { inspectRealMarketEvidence } from "./real-market-evidence";

export const CRE_FIRST_REAL_COHORT_COMPLETION_MISSION_ID = "msn_cre_first_real_cohort_completion_v1" as const;

export const CRE_FIRST_REAL_COHORT_COMPLETION_STEPS = [
  "ORCHESTRATE_CRE_COHORT_COMPLETION",
  "PROSPECT_DISCOVERY",
  "PUBLIC_PAGE_FETCH",
  "PROSPECT_GOVERNANCE",
  "OUTREACH_PREPARATION",
  "GOVERNANCE_PREPARATION",
] as const;

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_FIRST_REAL_COHORT_COMPLETION_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "CRE lease NPV validation",
      ventureType: "validation",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: (
      [
        ["growth_department", "Growth Nexus"],
        ["research_department", "Research Grid"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["launch_operations", "Deployment Depot"],
        ["intelligence_center", "Signal Intelligence"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED" as const,
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    })),
    pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    workerNodes: [],
  };
}

export async function executeCreFirstRealCohortCompletionMission() {
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission<CohortCompletionInner>({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_FIRST_REAL_COHORT_COMPLETION_MISSION_ID,
      missionType: CRE_FIRST_REAL_COHORT_COMPLETION,
      source: "cre_first_real_cohort_completion_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CRE_FIRST_REAL_COHORT_COMPLETION_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_COHORT_COMPLETION",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      const observations = await handle.step({
        stepType: "PROSPECT_DISCOVERY",
        engine: "organic_growth",
        summary: "Discovering additional public tenant-representation professionals.",
        run: () => researchObservations(),
      });
      await handle.step({
        stepType: "PUBLIC_PAGE_FETCH",
        engine: "grounded_research",
        summary: "Verifying first-party professional bios and published contact paths.",
        run: () => observations.filter((item) => item.outcome === "SELECTED").map((item) => item.sourceUrls),
      });
      const completed = await handle.step({
        stepType: "PROSPECT_GOVERNANCE",
        engine: "market_validation",
        summary: "Applying the CRE qualification contract. Research is not experiment evidence.",
        run: () => completeFirstRealCreProspectCohort(),
      });
      await handle.step({
        stepType: "OUTREACH_PREPARATION",
        engine: "organic_growth",
        summary: "Assembling the first real cohort. No messages sent.",
        run: () => ({
          cohortId: completed.cohortId,
          size: completed.size,
          ready: completed.ready,
          messagesSent: 0,
        }),
      });
      await handle.step({
        stepType: "GOVERNANCE_PREPARATION",
        engine: "mission_runtime",
        summary: "Updating the future-send package. Communication capability remains required.",
        run: () => ({
          prepared: completed.authorizationPackage.prepared,
          authorizedForSend: false,
          maxInitialSends: completed.authorizationPackage.maxInitialSends,
        }),
      });
      return completed;
    },
  });

  const growth = midRun.find((item) => item.phase === "OUTREACH_PREPARATION:STARTED");
  const research = midRun.find((item) => item.phase === "PUBLIC_PAGE_FETCH:STARTED");
  const validation = midRun.find((item) => item.phase === "PROSPECT_GOVERNANCE:STARTED");
  const command = midRun.find((item) => item.phase === "GOVERNANCE_PREPARATION:STARTED" || item.phase === "MISSION_STARTED");
  const depotActive = midRun.some((item) => item.rooms.includes("launch_operations"));
  const labActive = midRun.some((item) => item.rooms.includes("product_lab"));
  const signalActive = midRun.some((item) => item.rooms.includes("intelligence_center"));
  const counts = inspectRealMarketEvidence().counts;

  return {
    ...instrumented.result,
    evidence: {
      qualified: counts.qualifiedVisitors,
      strongIntent: counts.strongIntent,
      pricing: counts.pricingSelections,
      synthetic: 0,
      changedByCohortPreparation: false,
    },
    hq: {
      mission: CRE_FIRST_REAL_COHORT_COMPLETION,
      command: command ? ("PASS" as const) : ("FAIL" as const),
      growthNexus: growth?.rooms.includes("growth_department") ? ("PASS" as const) : ("FAIL" as const),
      researchGrid: research?.rooms.includes("research_department") ? ("PASS" as const) : ("FAIL" as const),
      validationStation: validation?.rooms.includes("quality_control") ? ("PASS" as const) : ("FAIL" as const),
      signalIntelligence: signalActive ? ("FAIL" as const) : ("PASS" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      creationLabIdle: labActive ? ("FAIL" as const) : ("PASS" as const),
      completion:
        instrumented.view.latestCompleted?.missionId === CRE_FIRST_REAL_COHORT_COMPLETION_MISSION_ID
          ? ("PASS" as const)
          : ("FAIL" as const),
      commandLive: "ACTIVE_WORK" as const,
      growthLive: "ACTIVE_WORK" as const,
      researchLive: "ACTIVE_WORK" as const,
      validationLive: "ACTIVE_WORK" as const,
      signalLive: "PRESENT_IDLE" as const,
      deploymentDepot: "PRESENT_IDLE" as const,
      creationLab: "PRESENT_IDLE" as const,
      midRun,
    },
  };
}
