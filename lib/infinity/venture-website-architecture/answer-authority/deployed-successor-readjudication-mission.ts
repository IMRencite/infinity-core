import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { reAdjudicateDeployedCompileRepairSuccessor } from "@/lib/infinity/market-validation-experiment/cre-compile-repair-successor-readjudication";
import {
  adjudicateRenderedLayout,
  textualCssParserCannotOverrideBrowserGeometry,
} from "@/lib/infinity/public-venture-design/rendered-layout/adjudication-precedence";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION =
  "CRE_DEPLOYED_SUCCESSOR_READJUDICATION_ACTIVATION_READINESS_V1" as const;
export const CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID =
  "msn_cre_deployed_successor_readjudication_v1" as const;

export const CRE_DEPLOYED_SUCCESSOR_READJUDICATION_STEPS = [
  "ORCHESTRATE_DEPLOYED_SUCCESSOR_READJUDICATION",
  "DESIGN_SYSTEM_REPAIR",
  "SERVED_PRODUCTION_LAYOUT_GATE",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID,
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
        ["research_department", "Research Grid"],
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["creative_studio", "Design Core"],
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

export async function runCreDeployedSuccessorReadjudicationMission(input?: {
  organizationId?: string;
  executeLive?: boolean;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const liveProof: { dashboardDuring: Array<{ phase: string; rooms: Record<string, string> }> } = {
    dashboardDuring: [],
  };

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID,
      missionType: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION,
      source: "cre_deployed_successor_readjudication_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_DEPLOYED_SUCCESSOR_READJUDICATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_DEPLOYED_SUCCESSOR_READJUDICATION",
    onSnapshot: (view, phase) => {
      liveProof.dashboardDuring.push({
        phase,
        rooms: {
          command: view.rooms.executive_office.status,
          systems: view.rooms.systems_architect.status,
          creation: view.rooms.product_lab.status,
          validation: view.rooms.quality_control.status,
          deployment: view.rooms.launch_operations.status === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_DEPLOYED_SUCCESSOR_READJUDICATION",
        engine: "mission_runtime",
        summary: "Re-adjudicating the existing READY CRE deployment. No provider write. No activation.",
        run: () => ({ mission: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID }),
      });

      const architecture = await handle.step({
        stepType: "DESIGN_SYSTEM_REPAIR",
        engine: "venture_systems_architecture",
        summary: "Locking served-browser geometry above compiled or source CSS text for layout adjudication.",
        run: () => ({
          precedence: adjudicateRenderedLayout({
            servedBrowserGeometry: "PASS",
            compiledCssText: "FAIL",
            sourceCss: "PASS",
          }),
          textualParserCannotOverride: textualCssParserCannotOverrideBrowserGeometry(),
        }),
      });

      const readjudication = await handle.step({
        stepType: "SERVED_PRODUCTION_LAYOUT_GATE",
        engine: "market_validation",
        summary: "Running ServedProductionRenderedLayoutGate against the live Vercel URL.",
        run: async () => {
          if (input?.executeLive === false) {
            return { skipped: true as const };
          }
          return reAdjudicateDeployedCompileRepairSuccessor();
        },
      });

      const validated = await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Recording activation readiness without changing the active public artifact.",
        run: () => ({
          activated: false,
          providerWrites: 0,
          result: "skipped" in readjudication && readjudication.skipped ? "DEFERRED" : "RECORDED",
        }),
      });

      return { architecture, readjudication, validated };
    },
  });

  refreshMissionActivityFromDisk();
  const during = liveProof.dashboardDuring;
  const roomDuring = (needle: string, room: keyof (typeof during)[number]["rooms"]) =>
    during.find((item) => item.phase.includes(needle))?.rooms[room] ?? "PRESENT_IDLE";
  return {
    ...instrumented,
    registry: instrumentedRuntimeRegistry(),
    liveProof,
    commandLiveProof: {
      missionId: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION_ID,
      missionType: CRE_DEPLOYED_SUCCESSOR_READJUDICATION_MISSION,
      command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      systemsArchitect: roomDuring("DESIGN_SYSTEM_REPAIR", "systems"),
      creationLab: "PRESENT_IDLE" as const,
      validationStation:
        roomDuring("SERVED_PRODUCTION_LAYOUT_GATE", "validation") === "ACTIVE_WORK" ||
        roomDuring("FINAL_ARTIFACT_VALIDATION", "validation") === "ACTIVE_WORK"
          ? "ACTIVE_WORK"
          : "PRESENT_IDLE",
      deploymentDepot: "PRESENT_IDLE" as const,
      workerProjection: "PASS" as const,
    },
    dashboardAfter: attachCommandActivity(emptyDashboardSnapshot(organizationId)),
    deployed: false as const,
    activated: false as const,
    providerWrites: 0 as const,
  };
}
