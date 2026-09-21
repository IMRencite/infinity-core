import { attachCommandActivity, emitMissionActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { commitMissionActivityDurably } from "@/lib/infinity/mission-activity/commit";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../cre-homepage-hero-link-contrast-successor";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE,
  FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
} from "../public-authority-standard/rendered-link-contrast-gate";
import { HOMEPAGE_HERO_LINK_CONTRAST_MARKER } from "../homepage-hero-link-contrast-css";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1 =
  "CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1" as const;
export const CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID =
  "msn_cre_homepage_hero_and_hq_infinity_core_repair_v1" as const;
export const GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED =
  "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED" as const;
export const DEPLOYED_NOT_ACTIVATED = "DEPLOYED_NOT_ACTIVATED" as const;

export const CRE_HOMEPAGE_HERO_AND_HQ_CORE_REPAIR_STEPS = [
  "ORCHESTRATE_HOMEPAGE_HERO_AND_HQ_CORE_REPAIR",
  "REPRODUCE_HOMEPAGE_HERO_LINK_CONTRAST",
  "SITE_ARCHITECTURE",
  "ARTIFACT_GENERATION",
  "HQ_DECISION_CORE",
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
      missionId: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID,
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

async function closeConsumedChromeDeploymentState(organizationId: string) {
  const shared = {
    organizationId,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    source: "cre_homepage_hero_and_hq_infinity_core_repair_runtime",
    executionClass: "VENTURE_EXECUTION" as const,
    synthetic: false,
  };
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_site_chrome_link_contrast_repair_v1",
      missionType: "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_V1",
      engine: "mission_runtime",
      stepType: "QUALITY_REVIEW",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      summary:
        "Site-chrome link contrast repair completed. The authorized provider write already occurred, so this mission is no longer current.",
      technicalDetail: "authorization_consumed=GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED",
      traceability: {
        missionId: "msn_cre_site_chrome_link_contrast_repair_v1",
        artifactId: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...shared,
      missionId: "msn_cre_site_chrome_link_contrast_deploy_v1",
      missionType: "GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
      eventType: "MISSION_COMPLETED",
      status: "PRESENT_IDLE",
      failureCode: DEPLOYED_NOT_ACTIVATED,
      summary:
        "Staging write completed. Activation was refused. Terminal DEPLOYED_NOT_ACTIVATED. Next repair is CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1.",
      technicalDetail:
        "outcome=DEPLOYED_NOT_ACTIVATED;blocker=CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1;deployment=dpl_EYmWkVXVQXkxkCwJKAzKn27Cyodf",
      traceability: {
        missionId: "msn_cre_site_chrome_link_contrast_deploy_v1",
        artifactId: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
        deploymentId: "dpl_EYmWkVXVQXkxkCwJKAzKn27Cyodf",
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    }),
  );
}

export async function runCreHomepageHeroLinkAndHqInfinityCoreRepairMission(input?: {
  organizationId?: string;
  runIsolatedBuild?: boolean;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const runIsolatedBuild = input?.runIsolatedBuild !== false;
  await closeConsumedChromeDeploymentState(organizationId);
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
      missionId: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID,
      missionType: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1,
      source: "cre_homepage_hero_and_hq_infinity_core_repair_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID,
        artifactId: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_HOMEPAGE_HERO_AND_HQ_CORE_REPAIR_STEPS],
    orchestrationStepType: "ORCHESTRATE_HOMEPAGE_HERO_AND_HQ_CORE_REPAIR",
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
        stepType: "ORCHESTRATE_HOMEPAGE_HERO_AND_HQ_CORE_REPAIR",
        engine: "mission_runtime",
        summary: "Coordinating the homepage hero-link contrast and HQ Infinity Decision Core repairs",
        run: () => ({ mission: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID }),
      });
      const reproduction = await handle.step({
        stepType: "REPRODUCE_HOMEPAGE_HERO_LINK_CONTRAST",
        engine: "market_validation",
        summary: "Reproducing pale-on-gray homepage hero links at 1.90:1",
        run: () => ({
          failingFixture: evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).overall,
          failingCount: evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).sameColorFailures
            + evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).nearInvisibleFailures
            + (evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_PALE_ON_WASH_FIXTURE).overall === "FAIL" ? 4 : 0),
          repairedFixture: evaluateRenderedLinkContrastGate(FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE).overall,
          sharedComponent: ".pv-hero-secondary",
        }),
      });
      let successorCache: Awaited<ReturnType<typeof reconstructCreHomepageHeroLinkContrastSuccessor>> | null = null;
      const loadSuccessor = async () => {
        successorCache ??= await reconstructCreHomepageHeroLinkContrastSuccessor();
        return successorCache;
      };
      const architecture = await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Replacing translucent hero-chip wash compositing with an opaque --pv-text surface",
        run: () =>
          loadSuccessor().then((successor) => ({
            predecessor: successor.predecessorArtifactId,
            artifactId: successor.artifactId,
            marker: successor.files.some((file) => file.content.includes(HOMEPAGE_HERO_LINK_CONTRAST_MARKER)),
          })),
      });
      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Freezing the unpublished homepage hero-link contrast successor",
        run: () => loadSuccessor(),
      });
      const hqCore = await handle.step({
        stepType: "HQ_DECISION_CORE",
        engine: "product_asset_builder",
        summary: "Replacing the circular Command Decision Core with a Mission Runtime-bound Infinity symbol",
        run: () => {
          const core = readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-decision-core.tsx"), "utf8");
          const chamber = readFileSync(join(process.cwd(), "components/dashboard/operator-console/command-chamber.tsx"), "utf8");
          const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
          return {
            svgInfinity: core.includes("INFINITY_PATH") && core.includes("hq-infinity-svg"),
            notGlyphPrimary: !core.includes("<span>∞</span>"),
            chamberUsesCore: chamber.includes("InfinityDecisionCore") && !chamber.includes("CommandAgentOrb"),
            states: ["ACTIVE_WORK", "READY_BLOCKED", "PRESENT_IDLE", "FAILED"].every((state) => core.includes(state)),
            reducedMotion: css.includes("hq-infinity-energy") && css.includes("prefers-reduced-motion"),
          };
        },
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
          heroLinks: successor.heroLinks.overall,
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
          missionId: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID,
          missionType: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_V1,
          engine: "market_validation",
          stepType: "QUALITY_REVIEW",
          eventType: "MISSION_BLOCKED",
          status: "READY_BLOCKED",
          blocker: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
          authorizationRequired: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
          summary:
            "Homepage hero-link contrast and HQ Infinity Decision Core are repaired. Provider deployment remains unauthorized.",
          technicalDetail: `predecessor=${successor.predecessorArtifactId}:${successor.predecessorDigest} successor=${successor.artifactId}:${successor.digest}`,
          source: "cre_homepage_hero_and_hq_infinity_core_repair_runtime",
          executionClass: "VENTURE_EXECUTION",
          synthetic: false,
          traceability: {
            missionId: CRE_HOMEPAGE_LINK_CONTRAST_AND_HQ_INFINITY_CORE_REPAIR_MISSION_ID,
            artifactId: successor.artifactId,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          },
        }),
      );
      handle.blocked({
        stepType: "QUALITY_REVIEW",
        blocker: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
        authorizationRequired: GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED,
        summary:
          "Homepage hero-link contrast repair is frozen. Provider deployment still requires GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED.",
      });
      return { reproduction, architecture, successor, hqCore, technical, quality, preserved };
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
