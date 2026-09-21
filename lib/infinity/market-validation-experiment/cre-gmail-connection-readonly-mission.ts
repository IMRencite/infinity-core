import { gmailFounderSetupContract } from "@/lib/infinity/communication-provider";
import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import {
  CRE_GMAIL_CONNECTION_READONLY,
  inspectCreGmailConnectionReadonly,
} from "./cre-gmail-connection-readonly";

type ConnectionInner = Awaited<ReturnType<typeof inspectCreGmailConnectionReadonly>>;

export const CRE_GMAIL_CONNECTION_READONLY_MISSION_ID = "msn_cre_gmail_connection_readonly_v1" as const;

export const CRE_GMAIL_CONNECTION_READONLY_STEPS = [
  "ORCHESTRATE_GMAIL_CONNECTION_READONLY",
  "GMAIL_OAUTH_INTEGRATION",
  "GMAIL_IDENTITY_SCOPE_VERIFICATION",
  "GOVERNANCE_PREPARATION",
] as const;

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_GMAIL_CONNECTION_READONLY_MISSION_ID,
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
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["growth_department", "Growth Nexus"],
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

export async function executeCreGmailConnectionReadonlyMission(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  const midRun: Array<{ phase: string; rooms: string[] }> = [];
  const instrumented = await runInstrumentedMission<ConnectionInner>({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_GMAIL_CONNECTION_READONLY_MISSION_ID,
      missionType: CRE_GMAIL_CONNECTION_READONLY,
      source: "cre_gmail_connection_readonly_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...CRE_GMAIL_CONNECTION_READONLY_STEPS],
    orchestrationStepType: "ORCHESTRATE_GMAIL_CONNECTION_READONLY",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({ phase, rooms: read.currentDepartments });
    },
    run: async (handle) => {
      await handle.step({
        stepType: "GMAIL_OAUTH_INTEGRATION",
        engine: "venture_systems_architecture",
        summary: "Inspecting the Gmail OAuth environment contract. No secrets are printed.",
        run: () => gmailFounderSetupContract(),
      });
      const inspected = await handle.step({
        stepType: "GMAIL_IDENTITY_SCOPE_VERIFICATION",
        engine: "market_validation",
        summary: "Read-only Google identity and scope verification. No email is sent.",
        run: () => inspectCreGmailConnectionReadonly({ now: input.now, fetchImpl: input.fetchImpl }),
      });
      await handle.step({
        stepType: "GOVERNANCE_PREPARATION",
        engine: "mission_runtime",
        summary: "Connection remains unverified until founder OAuth is configured. No outreach.",
        run: () => ({
          state: inspected.capability.after,
          emailsSent: 0,
          nextBlocker: inspected.nextBlocker,
        }),
      });
      return inspected;
    },
  });

  const architect = midRun.find((item) => item.phase === "GMAIL_OAUTH_INTEGRATION:STARTED");
  const validation = midRun.find((item) => item.phase === "GMAIL_IDENTITY_SCOPE_VERIFICATION:STARTED");
  const command = midRun.find(
    (item) => item.phase === "GOVERNANCE_PREPARATION:STARTED" || item.phase === "MISSION_STARTED",
  );
  const growthActive = midRun.some((item) => item.rooms.includes("growth_department"));
  const depotActive = midRun.some((item) => item.rooms.includes("launch_operations"));

  return {
    ...instrumented.result,
    hq: {
      mission: CRE_GMAIL_CONNECTION_READONLY,
      command: command ? ("PASS" as const) : ("FAIL" as const),
      systemsArchitect: architect?.rooms.includes("systems_architect") ? ("PASS" as const) : ("FAIL" as const),
      validationStation: validation?.rooms.includes("quality_control") ? ("PASS" as const) : ("FAIL" as const),
      growthNexusIdle: growthActive ? ("FAIL" as const) : ("PASS" as const),
      deploymentDepotIdle: depotActive ? ("FAIL" as const) : ("PASS" as const),
      completion:
        instrumented.view.latestCompleted?.missionId === CRE_GMAIL_CONNECTION_READONLY_MISSION_ID
          ? ("PASS" as const)
          : ("FAIL" as const),
      commandLive: "ACTIVE_WORK" as const,
      systemsArchitectLive: "ACTIVE_WORK" as const,
      validationLive: "ACTIVE_WORK" as const,
      growthLive: "PRESENT_IDLE" as const,
      deploymentDepot: "PRESENT_IDLE" as const,
      midRun,
    },
  };
}
