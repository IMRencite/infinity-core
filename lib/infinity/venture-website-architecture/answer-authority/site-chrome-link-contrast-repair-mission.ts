import { attachCommandActivity, emitMissionActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { commitMissionActivityDurably } from "@/lib/infinity/mission-activity/commit";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { reconstructCreSiteChromeLinkContrastSuccessor } from "../cre-site-chrome-link-contrast-successor";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
} from "../public-authority-standard/rendered-link-contrast-gate";
import { SITE_CHROME_LINK_CONTRAST_MARKER } from "../site-chrome-link-contrast-css";

export const CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1 =
  "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1" as const;
export const CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID =
  "msn_cre_site_chrome_link_contrast_repair_v1" as const;
export const CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_REQUIRED =
  "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_REQUIRED" as const;
export const GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED =
  "GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED" as const;
export const DEPLOYED_NOT_ACTIVATED = "DEPLOYED_NOT_ACTIVATED" as const;

export const CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_STEPS = [
  "ORCHESTRATE_SITE_CHROME_LINK_CONTRAST_REPAIR",
  "REPRODUCE_SITE_CHROME_LINK_CONTRAST",
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
      missionId: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID,
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

async function closeConsumedHubLayoutDeploymentState(organizationId: string) {
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const shared = {
    organizationId,
    ventureId,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    source: "cre_site_chrome_link_contrast_repair_runtime",
    executionClass: "VENTURE_EXECUTION" as const,
    synthetic: false,
  };
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_hub_question_board_layout_repair_v1",
      missionType: "CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1",
      engine: "mission_runtime",
      stepType: "QUALITY_REVIEW",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      summary:
        "Hub question-board layout repair completed. The authorized provider write already occurred, so this mission is no longer current.",
      technicalDetail: "authorization_consumed=GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED",
      traceability: {
        missionId: "msn_cre_hub_question_board_layout_repair_v1",
        artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_hub_layout_repair_deploy_v1",
      missionType: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      failureCode: DEPLOYED_NOT_ACTIVATED,
      summary:
        "Staging source-bundle write completed. Activation was refused. Terminal DEPLOYED_NOT_ACTIVATED. Next repair is CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1.",
      technicalDetail: `outcome=${DEPLOYED_NOT_ACTIVATED};blocker=${CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_REQUIRED};deployment=dpl_GCXe4ywFkqxE78Es7YzQxWrDkkA8`,
      traceability: {
        missionId: "msn_cre_hub_layout_repair_deploy_v1",
        artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
        deploymentId: "dpl_GCXe4ywFkqxE78Es7YzQxWrDkkA8",
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
}

export async function runCreSiteChromeLinkContrastRepairMission(input?: {
  organizationId?: string;
  runIsolatedBuild?: boolean;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const runIsolatedBuild = input?.runIsolatedBuild !== false;
  await closeConsumedHubLayoutDeploymentState(organizationId);
  refreshMissionActivityFromDisk();
  const liveProof: {
    dashboardDuring: Array<{ phase: string; active: boolean; rooms: Record<string, string> }>;
  } = { dashboardDuring: [] };

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID,
      missionType: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1,
      source: "cre_site_chrome_link_contrast_repair_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID,
        artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_STEPS],
    orchestrationStepType: "ORCHESTRATE_SITE_CHROME_LINK_CONTRAST_REPAIR",
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
        stepType: "ORCHESTRATE_SITE_CHROME_LINK_CONTRAST_REPAIR",
        engine: "mission_runtime",
        summary: "Coordinating the shared site-chrome link contrast repair",
        run: () => ({ mission: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID }),
      });
      const reproduction = await handle.step({
        stepType: "REPRODUCE_SITE_CHROME_LINK_CONTRAST",
        engine: "market_validation",
        summary: "Reproducing the seven repeating .pv-nav samples that produced 609 near-invisible failures",
        run: () => ({
          failingFixture: evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall,
          repairedFixture: evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall,
          sharedComponent: ".pv-nav",
          samples: 7,
        }),
      });
      let successorCache: Awaited<ReturnType<typeof reconstructCreSiteChromeLinkContrastSuccessor>> | null = null;
      const loadSuccessor = async () => {
        successorCache ??= await reconstructCreSiteChromeLinkContrastSuccessor();
        return successorCache;
      };
      const architecture = await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Replacing translucent color-mix nav background with an opaque --pv-surface token",
        run: () =>
          loadSuccessor().then((successor) => ({
            predecessor: successor.predecessorArtifactId,
            artifactId: successor.artifactId,
            marker: successor.files.some((file) => file.content.includes(SITE_CHROME_LINK_CONTRAST_MARKER)),
          })),
      });
      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Freezing the unpublished site-chrome link-contrast successor",
        run: () => loadSuccessor(),
      });
      const technical = await handle.step({
        stepType: "VALIDATE_TECHNICAL",
        engine: "market_validation",
        summary: "Running the provider-equivalent clean-room production build",
        run: async () => {
          if (!runIsolatedBuild) {
            return { skipped: true, hookBoundary: successor.hookBoundary.overall, pageLoop: successor.pageLoop.overall };
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
        summary: "Re-validating rendered contrast, hub boards, human-first language, and 93-route admission",
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
          missionId: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID,
          missionType: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1,
          engine: "market_validation",
          stepType: "QUALITY_REVIEW",
          eventType: "MISSION_BLOCKED",
          status: "READY_BLOCKED",
          blocker: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
          authorizationRequired: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
          summary:
            "Site-chrome link contrast is repaired and frozen. Provider deployment remains unauthorized.",
          technicalDetail: `predecessor=${successor.predecessorArtifactId}:${successor.predecessorDigest} successor=${successor.artifactId}:${successor.digest}`,
          source: "cre_site_chrome_link_contrast_repair_runtime",
          executionClass: "VENTURE_EXECUTION",
          synthetic: false,
          traceability: {
            missionId: CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_MISSION_ID,
            artifactId: successor.artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          },
        }),
      );
      handle.blocked({
        stepType: "QUALITY_REVIEW",
        blocker: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
        authorizationRequired: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
        summary:
          "Site-chrome link contrast repair is frozen. Provider deployment still requires GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED.",
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
    validationStation: during.some((item) => item.rooms.validation === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentDepot: roomDuring("ARTIFACT_GENERATION", "deployment") === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
    growthNexus: roomDuring("ARTIFACT_GENERATION", "growth") === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
    after: projectCommandActivity({ organizationId }),
  };
}
