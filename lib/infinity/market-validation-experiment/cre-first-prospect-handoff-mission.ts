import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import {
  CRE_ACQUISITION_HANDOFF_MISSION,
  inspectCreAcquisitionFirstHandoff,
} from "./cre-acquisition-first-handoff";
import { verifyActiveValidationDestinationReadOnly } from "./cre-active-validation-destination";

type HandoffMissionInner = {
  handoff: ReturnType<typeof inspectCreAcquisitionFirstHandoff>;
  destination: {
    ingest: ReturnType<typeof inspectCreAcquisitionFirstHandoff>["ingest"];
    destination: Awaited<ReturnType<typeof verifyActiveValidationDestinationReadOnly>> | null;
  };
};

export const CRE_FIRST_PROSPECT_HANDOFF_MISSION_ID = "msn_cre_acquisition_first_handoff_v1" as const;

export const CRE_FIRST_PROSPECT_HANDOFF_STEPS = [
  "ORCHESTRATE_CRE_ACQUISITION_HANDOFF",
  "ACQUISITION_CHANNEL_ANALYSIS",
  "PROSPECT_QUALIFICATION",
  "OUTREACH_PREPARATION",
  "PUBLIC_INGEST_VALIDATION",
  "EVIDENCE_CONTRACT_AUDIT",
  "PERFORMANCE_HANDOFF",
  "GOVERNANCE_PREPARATION",
] as const;

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_FIRST_PROSPECT_HANDOFF_MISSION_ID,
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
        ["quality_control", "Validation Station"],
        ["intelligence_center", "Signal Intelligence"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["launch_operations", "Deployment Depot"],
        ["research_department", "Research Grid"],
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

export async function executeCreAcquisitionFirstHandoffMission(input: {
  now?: Date;
  liveHttp?: boolean;
  fetchImpl?: typeof fetch;
} = {}) {
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission<HandoffMissionInner>({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_FIRST_PROSPECT_HANDOFF_MISSION_ID,
      missionType: CRE_ACQUISITION_HANDOFF_MISSION,
      source: "cre_acquisition_first_handoff_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CRE_FIRST_PROSPECT_HANDOFF_STEPS],
    orchestrationStepType: "ORCHESTRATE_CRE_ACQUISITION_HANDOFF",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      const handoff = await handle.step({
        stepType: "ACQUISITION_CHANNEL_ANALYSIS",
        engine: "organic_growth",
        summary: "Ranking bounded CRE acquisition channels without paid ads.",
        run: () => inspectCreAcquisitionFirstHandoff({ now: input.now }),
      });
      await handle.step({
        stepType: "PROSPECT_QUALIFICATION",
        engine: "grounded_research",
        summary: "Verifying persisted and public CRE prospect lineage.",
        run: () => handoff.knownProspect,
      });
      await handle.step({
        stepType: "OUTREACH_PREPARATION",
        engine: "organic_growth",
        summary: "Preparing first-touch content and the future send package. No messages sent.",
        run: () => ({
          cohortId: handoff.cohort.cohortId,
          size: handoff.cohort.size,
          messagesSent: 0,
          packagePrepared: handoff.authorizationPackage.prepared,
        }),
      });
      const destination = await handle.step({
        stepType: "PUBLIC_INGEST_VALIDATION",
        engine: "market_validation",
        summary: "Read-only validation of ingest attribution and the active public destination.",
        run: async () => {
          const ingest = handoff.ingest;
          if (!input.liveHttp) {
            return { ingest, destination: null as Awaited<ReturnType<typeof verifyActiveValidationDestinationReadOnly>> | null };
          }
          return {
            ingest,
            destination: await verifyActiveValidationDestinationReadOnly({ fetchImpl: input.fetchImpl }),
          };
        },
      });
      await handle.step({
        stepType: "EVIDENCE_CONTRACT_AUDIT",
        engine: "market_validation",
        summary: "Confirming outreach and visits are not counted as qualified evidence.",
        run: () => handoff.evidenceContract,
      });
      await handle.step({
        stepType: "PERFORMANCE_HANDOFF",
        engine: "performance_intelligence",
        summary: "Inspecting acquisition telemetry handoff into Performance Intelligence.",
        run: () => handoff.performance,
      });
      await handle.step({
        stepType: "GOVERNANCE_PREPARATION",
        engine: "mission_runtime",
        summary: "Assembling the first-send authorization package. Send remains unauthorized.",
        run: () => ({
          blocker: handoff.nextBlocker,
          authorizedForSend: false,
          messagesSent: 0,
        }),
      });
      return { handoff, destination };
    },
  });

  const growth = midRun.find((item) => item.phase === "OUTREACH_PREPARATION:STARTED");
  const validation = midRun.find((item) => item.phase === "PUBLIC_INGEST_VALIDATION:STARTED");
  const signal = midRun.find((item) => item.phase === "PERFORMANCE_HANDOFF:STARTED");
  const command = midRun.find((item) => item.phase === "GOVERNANCE_PREPARATION:STARTED" || item.phase === "MISSION_STARTED");
  const depotActive = midRun.some((item) => item.rooms.includes("launch_operations"));
  const labActive = midRun.some((item) => item.rooms.includes("product_lab"));

  return {
    ...instrumented.result,
    hq: {
      mission: CRE_ACQUISITION_HANDOFF_MISSION,
      command: command ? ("PASS" as const) : ("FAIL" as const),
      growthNexus: growth?.rooms.includes("growth_department") ? ("PASS" as const) : ("FAIL" as const),
      validationStation: validation?.rooms.includes("quality_control") ? ("PASS" as const) : ("FAIL" as const),
      signalIntelligence: signal?.rooms.includes("intelligence_center") ? ("PASS" as const) : ("FAIL" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      creationLabIdle: labActive ? ("FAIL" as const) : ("PASS" as const),
      completion: instrumented.view.latestCompleted?.missionId === CRE_FIRST_PROSPECT_HANDOFF_MISSION_ID ? ("PASS" as const) : ("FAIL" as const),
      commandLive: "ACTIVE_WORK" as const,
      growthLive: "ACTIVE_WORK" as const,
      validationLive: "ACTIVE_WORK" as const,
      signalLive: "ACTIVE_WORK" as const,
      deploymentDepot: "PRESENT_IDLE" as const,
      creationLab: "PRESENT_IDLE" as const,
      midRun,
    },
    externalActions: instrumented.result.handoff.externalActions,
  };
}
