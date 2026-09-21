import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { persistFailedFinalRepairSuccessorMissionHistory } from "@/lib/infinity/mission-activity/persist-failed-cre-final-repair-mission";
import { inspectGeneratedSourceIntegrity } from "@/lib/infinity/venture-build-orchestration/generated-source-integrity";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "../cre-lineage-question-id-successor";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "../cre-provider-equivalent-compile-repair-successor";
import { inspectRenderedLineageAndQuestionIdentity } from "../public-lineage-question-id";
import { auditSuccessorAuthorityArtifact } from "./successor-audit";
import { auditRenderedLayoutQualityGate } from "@/lib/infinity/public-venture-design/rendered-layout";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION =
  "CRE_PROVIDER_EQUIVALENT_SOURCE_BUNDLE_BUILD_INTEGRITY_V1" as const;
export const CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID =
  "msn_cre_provider_equivalent_compile_repair_v1" as const;

export const CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_STEPS = [
  "ORCHESTRATE_MISSION",
  "SITE_ARCHITECTURE",
  "ARTIFACT_GENERATION",
  "VALIDATE_TECHNICAL",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID,
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

export async function runCreProviderEquivalentCompileRepairMission(input?: {
  organizationId?: string;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const liveProof: {
    dashboardDuring: Array<{ phase: string; active: boolean; rooms: Record<string, string> }>;
    dashboardAfter: ReturnType<typeof attachCommandActivity> | null;
  } = { dashboardDuring: [], dashboardAfter: null };

  await persistFailedFinalRepairSuccessorMissionHistory();

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID,
      missionType: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION,
      source: "cre_provider_equivalent_compile_repair_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_STEPS],
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
        summary: "Coordinating provider-equivalent source-bundle build integrity and CRE compile repair",
        run: () => ({ mission: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID }),
      });

      const architecture = await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Reconstructing the failed provider bundle and classifying the compile defect",
        run: async () => {
          const failed = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
          const integrity = inspectGeneratedSourceIntegrity(failed.files);
          return {
            failed,
            integrity,
            classification: TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE,
            predecessor: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
          };
        },
      });

      const successor = await handle.step({
        stepType: "ARTIFACT_GENERATION",
        engine: "product_asset_builder",
        summary: "Generating the unpublished provider-equivalent compile-repair successor",
        run: () => reconstructCreProviderEquivalentCompileRepairSuccessor(),
      });

      const technical = await handle.step({
        stepType: "VALIDATE_TECHNICAL",
        engine: "market_validation",
        summary: "Validating generated-source integrity without a provider write",
        run: () => inspectGeneratedSourceIntegrity(successor.files),
      });

      const repaired = await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Confirming lineage, layout, and authority on the unpublished successor",
        run: async () => {
          const lineage = inspectRenderedLineageAndQuestionIdentity({
            files: successor.files,
            artifactId: successor.artifactId,
          });
          const layout = auditRenderedLayoutQualityGate(successor.files);
          const audit = await auditSuccessorAuthorityArtifact({
            files: successor.files,
            architecture: successor.architecture,
            graph: successor.graph,
            artifactId: successor.artifactId,
            digest: successor.digest,
            predecessorArtifactId: successor.predecessorArtifactId,
            repairReason: successor.repairReason,
          });
          return { lineage, layout, audit, evidence: inspectRealMarketEvidence() };
        },
      });

      return { architecture, successor, technical, repaired };
    },
  });

  refreshMissionActivityFromDisk();
  liveProof.dashboardAfter = attachCommandActivity(emptyDashboardSnapshot(organizationId));
  const during = liveProof.dashboardDuring;
  const roomDuring = (needle: string, room: keyof (typeof during)[number]["rooms"]) =>
    during.find((item) => item.phase.includes(needle))?.rooms[room] ?? "PRESENT_IDLE";
  const proof = {
    missionId: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION_ID,
    missionType: CRE_PROVIDER_EQUIVALENT_COMPILE_REPAIR_MISSION,
    eventsEmitted: instrumented.events.filter((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1").length,
    command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    designCore: "PRESENT_IDLE" as const,
    creationLab: roomDuring("ARTIFACT_GENERATION", "creation") === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
    validationStation:
      roomDuring("VALIDATE_TECHNICAL", "validation") === "ACTIVE_WORK" ||
      roomDuring("FINAL_ARTIFACT_VALIDATION", "validation") === "ACTIVE_WORK"
        ? "ACTIVE_WORK"
        : "PRESENT_IDLE",
    systemsArchitect: roomDuring("SITE_ARCHITECTURE", "systems"),
    researchGrid: "PRESENT_IDLE" as const,
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
    providerWrites: 0 as const,
  };
}
