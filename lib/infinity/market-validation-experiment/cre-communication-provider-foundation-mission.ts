import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import {
  CRE_COMMUNICATION_PROVIDER_FOUNDATION,
  inspectCreCommunicationProviderFoundation,
} from "./cre-communication-provider-foundation";

type FoundationInner = Awaited<ReturnType<typeof inspectCreCommunicationProviderFoundation>>;

export const CRE_COMMUNICATION_PROVIDER_FOUNDATION_MISSION_ID =
  "msn_cre_communication_provider_foundation_v1" as const;

export const CRE_COMMUNICATION_PROVIDER_FOUNDATION_STEPS = [
  "ORCHESTRATE_COMMUNICATION_PROVIDER_FOUNDATION",
  "COMMUNICATION_ARCHITECTURE",
  "ACQUISITION_REQUIREMENT_BIND",
  "PROVIDER_CONNECTION_VERIFICATION",
  "GOVERNANCE_PREPARATION",
] as const;

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_COMMUNICATION_PROVIDER_FOUNDATION_MISSION_ID,
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
        ["systems_architect", "Systems Architect"],
        ["growth_department", "Growth Nexus"],
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

export async function executeCreCommunicationProviderFoundationMission(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission<FoundationInner>({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_COMMUNICATION_PROVIDER_FOUNDATION_MISSION_ID,
      missionType: CRE_COMMUNICATION_PROVIDER_FOUNDATION,
      source: "cre_communication_provider_foundation_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CRE_COMMUNICATION_PROVIDER_FOUNDATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_COMMUNICATION_PROVIDER_FOUNDATION",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "COMMUNICATION_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Reviewing the provider-neutral communication.email.send architecture.",
        run: () => ({ capability: "communication.email.send" as const, global: true }),
      });
      const foundation = await handle.step({
        stepType: "ACQUISITION_REQUIREMENT_BIND",
        engine: "organic_growth",
        summary: "Binding CRE acquisition requirements to the global email-send capability. No prospect contact.",
        run: () => inspectCreCommunicationProviderFoundation({ now: input.now, fetchImpl: input.fetchImpl }),
      });
      await handle.step({
        stepType: "PROVIDER_CONNECTION_VERIFICATION",
        engine: "market_validation",
        summary: "Verifying Gmail connection read-only. Write verification is not executed.",
        run: () => ({
          connected: foundation.connection.connected,
          readOnly: foundation.capability.readOnlyVerification,
          write: foundation.capability.writeVerification,
          liveWrite: foundation.capability.liveWriteVerified,
        }),
      });
      await handle.step({
        stepType: "GOVERNANCE_PREPARATION",
        engine: "mission_runtime",
        summary: "Confirming separate prospect-send authorization remains required.",
        run: () => ({
          authorizedForSend: false,
          nextBlocker: foundation.nextBlocker,
          prospectsContacted: 0,
        }),
      });
      return foundation;
    },
  });

  const architect = midRun.find((item) => item.phase === "COMMUNICATION_ARCHITECTURE:STARTED");
  const growth = midRun.find((item) => item.phase === "ACQUISITION_REQUIREMENT_BIND:STARTED");
  const validation = midRun.find((item) => item.phase === "PROVIDER_CONNECTION_VERIFICATION:STARTED");
  const command = midRun.find(
    (item) => item.phase === "GOVERNANCE_PREPARATION:STARTED" || item.phase === "MISSION_STARTED",
  );
  const depotActive = midRun.some((item) => item.rooms.includes("launch_operations"));
  const labActive = midRun.some((item) => item.rooms.includes("product_lab"));
  const signalActive = midRun.some((item) => item.rooms.includes("intelligence_center"));

  return {
    ...instrumented.result,
    hq: {
      mission: CRE_COMMUNICATION_PROVIDER_FOUNDATION,
      command: command ? ("PASS" as const) : ("FAIL" as const),
      systemsArchitect: architect?.rooms.includes("systems_architect") ? ("PASS" as const) : ("FAIL" as const),
      growthNexus: growth?.rooms.includes("growth_department") ? ("PASS" as const) : ("FAIL" as const),
      validationStation: validation?.rooms.includes("quality_control") ? ("PASS" as const) : ("FAIL" as const),
      signalIntelligence: signalActive ? ("FAIL" as const) : ("PASS" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      creationLabIdle: labActive ? ("FAIL" as const) : ("PASS" as const),
      completion:
        instrumented.view.latestCompleted?.missionId === CRE_COMMUNICATION_PROVIDER_FOUNDATION_MISSION_ID
          ? ("PASS" as const)
          : ("FAIL" as const),
      commandLive: "ACTIVE_WORK" as const,
      systemsArchitectLive: "ACTIVE_WORK" as const,
      growthLive: "ACTIVE_WORK" as const,
      validationLive: "ACTIVE_WORK" as const,
      signalLive: "PRESENT_IDLE" as const,
      deploymentDepot: "PRESENT_IDLE" as const,
      creationLab: "PRESENT_IDLE" as const,
      midRun,
    },
  };
}
