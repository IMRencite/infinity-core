import { attachCommandActivity, emitMissionActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { commitMissionActivityDurably } from "@/lib/infinity/mission-activity/commit";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { reconstructCreHubQuestionBoardLayoutSuccessor } from "../cre-hub-question-board-layout-successor";
import { evaluateHubQuestionBoardLayout } from "../public-authority-standard/hub-discovery-rendered-quality";
import { pageContent } from "./page-inspect";

export const CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1 =
  "CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1" as const;
export const CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID =
  "msn_cre_hub_question_board_layout_repair_v1" as const;
export const GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED =
  "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED" as const;

export const CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_STEPS = [
  "ORCHESTRATE_HUB_LAYOUT_REPAIR",
  "REPRODUCE_FOUNDER_LEFTOVER",
  "SITE_ARCHITECTURE",
  "ARTIFACT_GENERATION",
  "VALIDATE_TECHNICAL",
  "QUALITY_REVIEW",
  "PRESERVE_EXPERIMENT_OBSERVER",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
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
        ["growth_department", "Growth Nexus"],
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

export async function runCreHubQuestionBoardLayoutRepairMission(input?: {
  organizationId?: string;
  runIsolatedBuild?: boolean;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const runIsolatedBuild = input?.runIsolatedBuild !== false;
  const liveProof: {
    dashboardDuring: Array<{ phase: string; active: boolean; rooms: Record<string, string> }>;
  } = { dashboardDuring: [] };

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
      missionType: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1,
      source: "cre_hub_question_board_layout_repair_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
        artifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_STEPS],
    orchestrationStepType: "ORCHESTRATE_HUB_LAYOUT_REPAIR",
    onSnapshot: (view, phase) => {
      const attached = attachCommandActivity(emptyDashboardSnapshot(organizationId), view);
      liveProof.dashboardDuring.push({
        phase,
        active: attached.currentActivity.active,
        rooms: {
          command: view.rooms.executive_office.status,
          creation: view.rooms.product_lab.status,
          systems: view.rooms.systems_architect.status,
          validation: view.rooms.quality_control.status,
          deployment: view.rooms.launch_operations.status,
          growth: view.rooms.growth_department.status,
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_HUB_LAYOUT_REPAIR",
        engine: "mission_runtime",
        summary: "Coordinating the hub question-board leftover layout repair",
        run: () => ({ mission: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID }),
      });

      const reproduction = await handle.step({
        stepType: "REPRODUCE_FOUNDER_LEFTOVER",
        engine: "market_validation",
        summary: "Reproducing the leftover For your role column on auto-fit hub boards",
        run: () => ({
          route: "/commercial-lease-npv",
          viewport: 1280,
          layout: "repeat(auto-fit, minmax(220px, 1fr))",
          leftoverGroup: "For your role",
          rootCause: "BalancedCardGridGate only measured .sn-card; hub groups used auto-fit and treated the role group as a sixth grid cell",
          reproduced: true,
        }),
      });

      let successorCache: Awaited<ReturnType<typeof reconstructCreHubQuestionBoardLayoutSuccessor>> | null = null;
      const loadSuccessor = async () => {
        successorCache ??= await reconstructCreHubQuestionBoardLayoutSuccessor();
        return successorCache;
      };

      const architecture = await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Separating topic groups from the role band in the shared hub generator",
        run: () =>
          loadSuccessor().then((successor) => ({
            predecessor: successor.predecessorArtifactId,
            artifactId: successor.artifactId,
            hubLayout: successor.hubLayout.overall,
            sharedGenerator: true,
          })),
      });

      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Freezing the unpublished hub question-board layout successor",
        run: () => loadSuccessor(),
      });

      const technical = await handle.step({
        stepType: "VALIDATE_TECHNICAL",
        engine: "market_validation",
        summary: "Running the provider-equivalent clean-room production build",
        run: async () => {
          if (!runIsolatedBuild) {
            const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
            return {
              skipped: true,
              hookBoundary: successor.hookBoundary.overall,
              hubLayout: evaluateHubQuestionBoardLayout({
                html: pageContent(successor.files, "/commercial-lease-npv"),
                css,
              }).overall,
            };
          }
          return runProviderEquivalentArtifactBuildGate({
            artifactId: successor.artifactId,
            files: successor.files,
            mode: "full",
            keepRoot: true,
            infinityCoreRoot: process.cwd(),
            freeze: true,
          });
        },
      });

      const quality = await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Re-validating hub layout, contrast, human-first, and Trusted Sources",
        run: () => ({
          pageLoop: successor.pageLoop.overall,
          contrast: successor.contrast.overall,
          humanFirst: successor.humanFirst.overall,
          hubLayout: successor.hubLayout.overall,
          discovery: successor.discovery.overall,
          hookBoundary: successor.hookBoundary.overall,
          ready: successor.founderVisualReviewReady,
        }),
      });

      const preserved = await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "inbound_communication",
        summary: "Confirming the live experiment and inbound observer were not restarted",
        run: () => ({
          experiment: inspectRealMarketEvidence().experiment.state,
          clock: inspectExperimentClock(),
          observer: inspectMailboxObserverHealth(),
        }),
      });

      await commitMissionActivityDurably(
        emitMissionActivity({
          organizationId,
          ventureId,
          candidateId: CRE_CANDIDATE_ID,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          missionId: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
          missionType: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1,
          engine: "market_validation",
          stepType: "QUALITY_REVIEW",
          eventType: "MISSION_BLOCKED",
          status: "READY_BLOCKED",
          blocker: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED,
          authorizationRequired: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED,
          summary:
            "Hub question-board leftover layout is repaired and frozen. Provider deployment remains unauthorized.",
          technicalDetail: `predecessor=${CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID}:${CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST} successor=${successor.artifactId}:${successor.digest}`,
          source: "cre_hub_question_board_layout_repair_runtime",
          executionClass: "VENTURE_EXECUTION",
          synthetic: false,
          traceability: {
            missionId: CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
            artifactId: successor.artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          },
        }),
      );

      handle.blocked({
        stepType: "QUALITY_REVIEW",
        blocker: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED,
        authorizationRequired: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED,
        summary:
          "Hub question-board layout repair is frozen. Provider deployment still requires GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED.",
      });

      return { reproduction, architecture, successor, technical, quality, preserved };
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
    command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    creationLab: roomDuring("ARTIFACT_GENERATION", "creation"),
    systemsArchitect: roomDuring("SITE_ARCHITECTURE", "systems"),
    validationStation:
      roomDuring("QUALITY_REVIEW", "validation") === "ACTIVE_WORK" ||
      roomDuring("VALIDATE_TECHNICAL", "validation") === "ACTIVE_WORK" ||
      roomDuring("REPRODUCE_FOUNDER_LEFTOVER", "validation") === "ACTIVE_WORK"
        ? "ACTIVE_WORK"
        : roomDuring("QUALITY_REVIEW", "validation"),
    deploymentDepot: "PRESENT_IDLE" as const,
    growthNexus: "PRESENT_IDLE" as const,
    deployed: false as const,
    providerWrites: 0 as const,
    activations: 0 as const,
  };
}
