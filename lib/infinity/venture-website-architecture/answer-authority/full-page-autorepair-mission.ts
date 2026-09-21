import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { reconstructCreSearchDepthSuccessor } from "../cre-search-depth-successor";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_FULL_PAGE_AUTOREPAIR_MISSION = "CRE_FULL_PAGE_RENDER_VALIDATE_REPAIR_V1" as const;
export const CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID = "msn_cre_full_page_autorepair_v1" as const;

export const CRE_FULL_PAGE_AUTOREPAIR_STEPS = [
  "ORCHESTRATE_FULL_PAGE_AUTOREPAIR",
  "PAGE_COMPOSE",
  "DESIGN_SYSTEM_REPAIR",
  "PAGE_RENDER",
  "PAGE_VALIDATE",
  "PAGE_REPAIR_LOOP",
  "REPEATED_FAILURE_PROMOTION",
  "PAGE_ADMISSION",
  "FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION",
  "PRESERVE_EXPERIMENT_OBSERVER",
  "PUBLISHABILITY_REVIEW",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
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
        ["growth_department", "Growth Nexus"],
        ["launch_operations", "Deployment Depot"],
        ["intelligence_center", "Signal Intelligence"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED",
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
  } as OperatorVentureSnapshot;
}

function idleOrEmpty(status: string | undefined): "PRESENT_IDLE" | "ACTIVE_WORK" | string {
  if (!status || status === "EMPTY" || status === "PRESENT_IDLE" || status === "COMPLETED") return "PRESENT_IDLE";
  return status;
}

export async function runCreFullPageAutorepairMission(input?: {
  organizationId?: string;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const liveProof: {
    dashboardDuring: Array<{ phase: string; active: boolean; rooms: Record<string, string> }>;
    dashboardAfter: ReturnType<typeof attachCommandActivity> | null;
  } = { dashboardDuring: [], dashboardAfter: null };

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID,
      missionType: CRE_FULL_PAGE_AUTOREPAIR_MISSION,
      source: "cre_full_page_autorepair_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID,
        artifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_FULL_PAGE_AUTOREPAIR_STEPS],
    orchestrationStepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR",
    onSnapshot: (view, phase) => {
      const attached = attachCommandActivity(emptyDashboardSnapshot(organizationId), view);
      liveProof.dashboardDuring.push({
        phase,
        active: attached.currentActivity.active,
        rooms: {
          command: view.rooms.executive_office.status,
          creation: view.rooms.product_lab.status,
          systems: view.rooms.systems_architect.status,
          design: view.rooms.creative_studio.status,
          validation: view.rooms.quality_control.status,
          intelligence: view.rooms.intelligence_center.status,
          growth: view.rooms.growth_department.status,
          deployment: view.rooms.launch_operations.status === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR",
        engine: "mission_runtime",
        summary: "Coordinating per-page render, validate, and bounded repair",
        run: () => ({ mission: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID, deploy: false, outreach: false }),
      });

      const successor = await handle.step({
        stepType: "PAGE_COMPOSE",
        engine: "venture_build_orchestration",
        summary: "Composing every public authority page before render",
        run: () => reconstructCreSearchDepthSuccessor(),
      });

      await handle.step({
        stepType: "DESIGN_SYSTEM_REPAIR",
        engine: "venture_systems_architecture",
        summary: "Applying shared surface-ink and contrast tokens instead of per-page color hacks",
        run: () => ({
          sharedPromotions: successor.pageLoop.sharedPromotions,
          emphasisBandLink: true,
          sourceBoardInk: true,
        }),
      });

      await handle.step({
        stepType: "PAGE_RENDER",
        engine: "market_validation",
        summary: "Rendering every public route for visual inspection",
        run: () => ({ rendered: successor.pageLoop.rendered, expected: successor.routes }),
      });

      await handle.step({
        stepType: "PAGE_VALIDATE",
        engine: "market_validation",
        summary: "Running visual, content, SEO, GEO, and contrast gates on each page",
        run: () => ({
          validated: successor.pageLoop.validated,
          contrast: successor.contrast.overall,
          humanFirst: successor.pageLoop.humanFirstRemaining,
        }),
      });

      await handle.step({
        stepType: "PAGE_REPAIR_LOOP",
        engine: "market_validation",
        summary: "Repairing failed pages immediately and re-validating inside a bounded loop",
        run: () => ({
          requiredRepair: successor.pageLoop.requiredRepair,
          pagesRepaired: successor.pageLoop.pagesRepaired,
          iterations: successor.pageLoop.totalRepairIterations,
          ceilingExceeded: successor.pageLoop.repairCeilingExceeded,
        }),
      });

      await handle.step({
        stepType: "REPEATED_FAILURE_PROMOTION",
        engine: "venture_systems_architecture",
        summary: "Promoting repeated page defects to shared component or global token fixes",
        run: () => successor.pageLoop.promotion,
      });

      await handle.step({
        stepType: "PAGE_ADMISSION",
        engine: "market_validation",
        summary: "Admitting a page to the artifact only after it reaches READY_FOR_ARTIFACT",
        run: () => ({
          admitted: successor.pageLoop.validated,
          finalFailed: successor.pageLoop.finalFailed,
          missingEvidence: successor.pageLoop.missingEvidence,
        }),
      });

      await handle.step({
        stepType: "FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Re-checking the full public route manifest against the composed successor",
        run: () => successor.pageLoop.fullRoute,
      });

      await handle.step({
        stepType: "PRESERVE_EXPERIMENT_OBSERVER",
        engine: "performance_intelligence",
        summary: "Confirming the live experiment clock and inbound observer were not restarted",
        run: () => ({
          clock: inspectExperimentClock(),
          evidence: inspectRealMarketEvidence(),
          restarted: inspectExperimentClock().restarted,
        }),
      });

      await handle.step({
        stepType: "PUBLISHABILITY_REVIEW",
        engine: "market_validation",
        summary: "Holding deployment until a separate governed prompt authorizes it",
        run: () => ({
          ready: successor.founderVisualReviewReady,
          loop: successor.pageLoop.overall,
          deployed: successor.deployed,
        }),
      });

      handle.blocked({
        stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR",
        blocker: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED",
        authorizationRequired: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED",
        summary: "Per-page render/validate/repair finished. Deployment remains separately governed.",
      });

      return { successor };
    },
  });

  refreshMissionActivityFromDisk();
  liveProof.dashboardAfter = attachCommandActivity(emptyDashboardSnapshot(organizationId));
  const during = liveProof.dashboardDuring;
  const roomDuring = (needle: string, room: keyof (typeof during)[number]["rooms"]) =>
    during.find((item) => item.phase.includes(needle))?.rooms[room] ?? "PRESENT_IDLE";

  const proof = {
    missionId: CRE_FULL_PAGE_AUTOREPAIR_MISSION_ID,
    missionType: CRE_FULL_PAGE_AUTOREPAIR_MISSION,
    eventsEmitted: instrumented.events.filter((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1").length,
    command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? ("ACTIVE_WORK" as const) : ("PRESENT_IDLE" as const),
    creationLab: roomDuring("PAGE_COMPOSE", "creation"),
    systemsArchitect:
      roomDuring("DESIGN_SYSTEM_REPAIR", "systems") === "ACTIVE_WORK" || roomDuring("REPEATED_FAILURE_PROMOTION", "systems") === "ACTIVE_WORK"
        ? ("ACTIVE_WORK" as const)
        : ("PRESENT_IDLE" as const),
    validationStation:
      ["PAGE_RENDER", "PAGE_VALIDATE", "PAGE_REPAIR_LOOP", "PAGE_ADMISSION", "FULL_ROUTE"].some(
        (needle) => roomDuring(needle, "validation") === "ACTIVE_WORK",
      )
        ? ("ACTIVE_WORK" as const)
        : ("PRESENT_IDLE" as const),
    signalIntelligence: roomDuring("PRESERVE_EXPERIMENT_OBSERVER", "intelligence"),
    growthNexus: during.some((item) => item.rooms.growth === "ACTIVE_WORK") ? ("ACTIVE_WORK" as const) : ("PRESENT_IDLE" as const),
    deploymentDepot: during.some((item) => item.rooms.deployment === "ACTIVE_WORK") ? ("ACTIVE_WORK" as const) : ("PRESENT_IDLE" as const),
    roomsAfter: {
      command: idleOrEmpty(instrumented.view.rooms.executive_office.status),
      creation: idleOrEmpty(instrumented.view.rooms.product_lab.status),
      systems: idleOrEmpty(instrumented.view.rooms.systems_architect.status),
      validation: idleOrEmpty(instrumented.view.rooms.quality_control.status),
      intelligence: idleOrEmpty(instrumented.view.rooms.intelligence_center.status),
      growth: idleOrEmpty(instrumented.view.rooms.growth_department.status),
      deployment: idleOrEmpty(instrumented.view.rooms.launch_operations.status),
    },
    workerRoles: {
      command: workerRoleForStep("ORCHESTRATE_FULL_PAGE_AUTOREPAIR", "mission_runtime"),
      creation: workerRoleForStep("PAGE_COMPOSE", "venture_build_orchestration"),
      validation: workerRoleForStep("PAGE_VALIDATE", "market_validation"),
      systems: workerRoleForStep("REPEATED_FAILURE_PROMOTION", "venture_systems_architecture"),
    },
    rooms: {
      command: roomForStep("ORCHESTRATE_FULL_PAGE_AUTOREPAIR", "mission_runtime"),
      creation: roomForStep("PAGE_COMPOSE", "venture_build_orchestration"),
      validation: roomForStep("PAGE_VALIDATE", "market_validation"),
      systems: roomForStep("REPEATED_FAILURE_PROMOTION", "venture_systems_architecture"),
      intelligence: roomForStep("PRESERVE_EXPERIMENT_OBSERVER", "performance_intelligence"),
      deployment: roomForStep("CREATE_DEPLOYMENT", "launch_gateway"),
    },
    activeAfter: instrumented.view.counts.activeMissions,
    deployed: false as const,
    outreach: false as const,
    wave2: false as const,
  };

  return {
    ...instrumented,
    registry: instrumentedRuntimeRegistry(),
    liveProof,
    commandLiveProof: proof,
    deployed: false as const,
    liveArtifactMutated: false as const,
  };
}
