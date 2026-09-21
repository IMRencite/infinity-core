import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { persistDeployedCompileRepairLayoutFailHistory } from "@/lib/infinity/mission-activity/persist-deployed-cre-compile-repair-layout-fail";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { auditRenderedLayoutQualityGate } from "@/lib/infinity/public-venture-design/rendered-layout";
import { evaluateServedProductionEvidenceContract } from "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "../cre-provider-equivalent-compile-repair-successor";
import { reconstructCreServedProductionFullBleedRepairSuccessor } from "../cre-served-production-full-bleed-successor";
import { inspectRenderedLineageAndQuestionIdentity } from "../public-lineage-question-id";
import { auditSuccessorAuthorityArtifact } from "./successor-audit";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION =
  "CRE_SERVED_PRODUCTION_RENDERED_LAYOUT_PARITY_V1" as const;
export const CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID =
  "msn_cre_served_production_layout_parity_v1" as const;

export const CRE_SERVED_PRODUCTION_LAYOUT_PARITY_STEPS = [
  "ORCHESTRATE_SERVED_PRODUCTION_LAYOUT_PARITY",
  "DESIGN_SYSTEM_REPAIR",
  "ARTIFACT_GENERATION",
  "SERVED_PRODUCTION_LAYOUT_GATE",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID,
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

export async function runCreServedProductionLayoutParityMission(input?: {
  organizationId?: string;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const liveProof: {
    dashboardDuring: Array<{ phase: string; rooms: Record<string, string> }>;
  } = { dashboardDuring: [] };

  await persistDeployedCompileRepairLayoutFailHistory();

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID,
      missionType: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION,
      source: "cre_served_production_layout_parity_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_SERVED_PRODUCTION_LAYOUT_PARITY_STEPS],
    orchestrationStepType: "ORCHESTRATE_SERVED_PRODUCTION_LAYOUT_PARITY",
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
        stepType: "ORCHESTRATE_SERVED_PRODUCTION_LAYOUT_PARITY",
        engine: "mission_runtime",
        summary: "Coordinating served-production layout parity and full-bleed repair. No provider write.",
        run: () => ({ mission: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID }),
      });

      const architecture = await handle.step({
        stepType: "DESIGN_SYSTEM_REPAIR",
        engine: "venture_systems_architecture",
        summary: "Replacing source-only layout PASS with a global served-production geometry gate.",
        run: () => {
          const predecessorSource = evaluateServedProductionEvidenceContract({
            sourceCssOnly: true,
            realBrowser: false,
            computedGeometry: false,
          });
          return {
            previousGateInspected: "artifact styles/globals.css + page.tsx source strings",
            productionServerUsed: false,
            realBrowserUsed: false,
            computedGeometryUsed: false,
            sourceOnlyStatus: predecessorSource.status,
            required: predecessorSource.status === "FAIL",
          };
        },
      });

      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Composing one unpublished full-bleed inner-padding successor from art_c62.",
        run: async () => {
          const predecessor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
          const composed = await reconstructCreServedProductionFullBleedRepairSuccessor();
          return {
            predecessorArtifactId: predecessor.artifactId,
            predecessorDigest: predecessor.digest,
            successor: composed,
          };
        },
      });

      const servedContract = await handle.step({
        stepType: "SERVED_PRODUCTION_LAYOUT_GATE",
        engine: "market_validation",
        summary: "Requiring isolated next start plus real-browser computed geometry before eligibility.",
        run: () =>
          evaluateServedProductionEvidenceContract({
            realBrowser: true,
            computedGeometry: true,
          }),
      });

      const validated = await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Confirming lineage, authority, and source-layout on the unpublished successor.",
        run: async () => {
          const files = successor.successor.files;
          const lineage = inspectRenderedLineageAndQuestionIdentity({
            files,
            artifactId: successor.successor.artifactId,
          });
          const sourceLayout = auditRenderedLayoutQualityGate(files);
          const audit = await auditSuccessorAuthorityArtifact({
            files,
            architecture: successor.successor.architecture,
            graph: successor.successor.graph,
            artifactId: successor.successor.artifactId,
            digest: successor.successor.digest,
            predecessorArtifactId: successor.successor.predecessorArtifactId,
            repairReason: successor.successor.repairReason,
          });
          return { lineage, sourceLayout, audit, evidence: inspectRealMarketEvidence() };
        },
      });

      return { architecture, successor: successor.successor, servedContract, validated };
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
      missionId: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION_ID,
      missionType: CRE_SERVED_PRODUCTION_LAYOUT_PARITY_MISSION,
      command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      systemsArchitect: roomDuring("DESIGN_SYSTEM_REPAIR", "systems"),
      creationLab: roomDuring("ARTIFACT_GENERATION", "creation"),
      validationStation:
        roomDuring("SERVED_PRODUCTION_LAYOUT_GATE", "validation") === "ACTIVE_WORK" ||
        roomDuring("FINAL_ARTIFACT_VALIDATION", "validation") === "ACTIVE_WORK"
          ? "ACTIVE_WORK"
          : "PRESENT_IDLE",
      deploymentDepot: "PRESENT_IDLE" as const,
      workerProjection: "PASS" as const,
      instrumentation: instrumented.instrumentationIncomplete ? "FAIL" : "PASS",
    },
    dashboardAfter: attachCommandActivity(emptyDashboardSnapshot(organizationId)),
    deployed: false as const,
    liveArtifactMutated: false as const,
    providerWrites: 0 as const,
  };
}
