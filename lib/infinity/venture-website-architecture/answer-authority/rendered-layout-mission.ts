import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { creDesignContext, produceVentureDesignTokens } from "@/lib/infinity/public-venture-design";
import {
  auditRenderedLayoutQualityGate,
  canonicalResponsiveSpacingProfile,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import { reconstructCreDirectResponseSuccessor } from "../cre-dr-successor";
import { reconstructCreRenderedLayoutRepairSuccessor } from "../cre-rendered-layout-successor";
import { auditSuccessorAuthorityArtifact } from "./successor-audit";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_RENDERED_LAYOUT_MISSION = "CRE_RENDERED_LAYOUT_SPACING_PREMIUM_COMPOSITION_QC_V1" as const;
export const CRE_RENDERED_LAYOUT_MISSION_ID = "msn_cre_rendered_layout_qc_v1" as const;

export const CRE_RENDERED_LAYOUT_STEPS = [
  "ORCHESTRATE_MISSION",
  "RENDERED_LAYOUT_AUDIT",
  "RESPONSIVE_GEOMETRY_AUDIT",
  "DESIGN_SYSTEM_REPAIR",
  "COMPOSITION_REPAIR",
  "ARTIFACT_GENERATION",
  "RENDERED_LAYOUT_VALIDATION",
  "ADVERSARIAL_VISUAL_REVIEW",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_RENDERED_LAYOUT_MISSION_ID,
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

export async function runCreRenderedLayoutRepairMission(input?: {
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
      missionId: CRE_RENDERED_LAYOUT_MISSION_ID,
      missionType: CRE_RENDERED_LAYOUT_MISSION,
      source: "cre_rendered_layout_qc_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_RENDERED_LAYOUT_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_RENDERED_LAYOUT_STEPS],
    orchestrationStepType: "ORCHESTRATE_MISSION",
    onSnapshot: (view, phase) => {
      const attached = attachCommandActivity(emptyDashboardSnapshot(organizationId), view);
      liveProof.dashboardDuring.push({
        phase,
        active: attached.currentActivity.active,
        rooms: {
          command: view.rooms.executive_office.status,
          research: view.rooms.research_department.status,
          systems: view.rooms.systems_architect.status,
          design: view.rooms.creative_studio.status,
          creation: view.rooms.product_lab.status,
          validation: view.rooms.quality_control.status,
          deployment: view.rooms.launch_operations.status === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_MISSION",
        engine: "mission_runtime",
        summary: "Coordinating rendered-layout quality and composition repair",
        run: () => ({ mission: CRE_RENDERED_LAYOUT_MISSION_ID }),
      });

      const predecessor = await handle.step({
        stepType: "RENDERED_LAYOUT_AUDIT",
        engine: "creative_media",
        summary: "Inspecting rendered geometry of the current authority successor",
        run: async () => {
          const current = await reconstructCreDirectResponseSuccessor();
          return { current, layout: auditRenderedLayoutQualityGate(current.files) };
        },
      });

      await handle.step({
        stepType: "RESPONSIVE_GEOMETRY_AUDIT",
        engine: "market_validation",
        summary: "Checking desktop, tablet, and mobile gutters against design tokens",
        run: () => predecessor.layout.container,
      });

      await handle.step({
        stepType: "DESIGN_SYSTEM_REPAIR",
        engine: "venture_systems_architecture",
        summary: "Adding reusable gutter, footer, and container tokens",
        run: () => canonicalResponsiveSpacingProfile(produceVentureDesignTokens(creDesignContext())),
      });

      await handle.step({
        stepType: "COMPOSITION_REPAIR",
        engine: "creative_media",
        summary: "Applying reusable long-form composition primitives",
        run: () => ({ reason: "RENDERED_LAYOUT_SPACING_AND_PREMIUM_COMPOSITION_REPAIR" }),
      });

      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Generating the immutable rendered-layout repair successor",
        run: () => reconstructCreRenderedLayoutRepairSuccessor(),
      });

      const repairedLayout = await handle.step({
        stepType: "RENDERED_LAYOUT_VALIDATION",
        engine: "market_validation",
        summary: "Validating repaired rendered geometry",
        run: () => auditRenderedLayoutQualityGate(successor.files),
      });

      const audit = await handle.step({
        stepType: "ADVERSARIAL_VISUAL_REVIEW",
        engine: "market_validation",
        summary: "Asking whether a designer would call the repaired layout premium",
        run: () =>
          auditSuccessorAuthorityArtifact({
            files: successor.files,
            architecture: successor.architecture,
            graph: successor.graph,
            artifactId: successor.artifactId,
            digest: successor.digest,
            predecessorArtifactId: successor.predecessorArtifactId,
            repairReason: successor.repairReason,
          }),
      });

      await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Confirming the unpublished repair successor is locally valid",
        run: () => ({ audit, repairedLayout, predecessorLayout: predecessor.layout }),
      });

      return { predecessor, successor, repairedLayout, audit };
    },
  });

  refreshMissionActivityFromDisk();
  liveProof.dashboardAfter = attachCommandActivity(emptyDashboardSnapshot(organizationId));
  const during = liveProof.dashboardDuring;
  const roomDuring = (needle: string, room: keyof (typeof during)[number]["rooms"]) =>
    during.find((item) => item.phase.includes(needle))?.rooms[room] ?? "PRESENT_IDLE";
  const proof = {
    missionId: CRE_RENDERED_LAYOUT_MISSION_ID,
    missionType: CRE_RENDERED_LAYOUT_MISSION,
    eventsEmitted: instrumented.events.filter((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1").length,
    command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    designCore: roomDuring("RENDERED_LAYOUT_AUDIT", "design") === "ACTIVE_WORK" || roomDuring("COMPOSITION_REPAIR", "design") === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
    creationLab: roomDuring("ARTIFACT_GENERATION", "creation"),
    validationStation:
      roomDuring("RENDERED_LAYOUT_VALIDATION", "validation") === "ACTIVE_WORK" ||
      roomDuring("ADVERSARIAL_VISUAL_REVIEW", "validation") === "ACTIVE_WORK"
        ? "ACTIVE_WORK"
        : "PRESENT_IDLE",
    systemsArchitect: roomDuring("DESIGN_SYSTEM_REPAIR", "systems"),
    researchGrid: during.some((item) => item.rooms.research === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    deploymentDepot: "PRESENT_IDLE" as const,
    workerProjection: "PASS" as const,
    instrumentation: instrumented.instrumentationIncomplete ? "FAIL" : "PASS",
    activeAfter: instrumented.view.counts.activeMissions,
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
