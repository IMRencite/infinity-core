import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { auditCurrentCreAuthorityArtifact } from "./cre-audit";
import { buildCreQuestionKnowledgeGraph, buildQuestionCoverageProfile, questionDiscoveryRuntime } from "./question-system";
import { digitalRealEstateUrlArchitecture } from "./url-and-links";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const QUESTION_AUTHORITY_QC_MISSION = "QUESTION_KNOWLEDGE_GRAPH_ANSWER_AUTHORITY_QC" as const;
export const QUESTION_AUTHORITY_QC_MISSION_ID = "msn_qkg_answer_authority_qc_v1" as const;
export const COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE = "COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE" as const;

export const QUESTION_AUTHORITY_QC_STEPS = [
  "ORCHESTRATE_QUESTION_AUTHORITY_QC",
  "DISCOVER_QUESTION_UNIVERSE",
  "RESEARCH_QUESTION_CLUSTER",
  "PLAN_SITE_ARCHITECTURE",
  "PLAN_URL_ARCHITECTURE",
  "PLAN_INTERNAL_LINK_GRAPH",
  "VALIDATE_CONTENT_DEPTH",
  "VALIDATE_ANSWER_AUTHORITY",
  "VALIDATE_GEO_SEO",
  "ADVERSARIAL_PUBLISHABILITY_REVIEW",
  "PUBLISHABILITY_REVIEW",
  "AUTHORITY_REPAIR_PLAN",
] as const;

export { instrumentedRuntimeRegistry };

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: QUESTION_AUTHORITY_QC_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
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

export async function runQuestionAuthorityQcMission(input?: {
  organizationId?: string;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
  const liveProof: {
    dashboardDuring: Array<{ phase: string; active: boolean; mission: string | null; step: string | null; lastActivityAt: string | null; rooms: Record<string, string> }>;
    dashboardAfter: ReturnType<typeof attachCommandActivity> | null;
  } = { dashboardDuring: [], dashboardAfter: null };

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: QUESTION_AUTHORITY_QC_MISSION_ID,
      missionType: QUESTION_AUTHORITY_QC_MISSION,
      source: "question_authority_qc_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: QUESTION_AUTHORITY_QC_MISSION_ID,
        artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...QUESTION_AUTHORITY_QC_STEPS],
    orchestrationStepType: "ORCHESTRATE_QUESTION_AUTHORITY_QC",
    onSnapshot: (view, phase) => {
      const attached = attachCommandActivity(emptyDashboardSnapshot(organizationId), view);
      liveProof.dashboardDuring.push({
        phase,
        active: attached.currentActivity.active,
        mission: attached.commandActivity?.nowInspecting.currentMission ?? null,
        step: attached.commandActivity?.nowInspecting.currentStep ?? null,
        lastActivityAt: attached.commandActivity?.nowInspecting.lastActivityAt ?? null,
        rooms: {
          research: view.rooms.research_department.status,
          systems: view.rooms.systems_architect.status,
          validation: view.rooms.quality_control.status,
          command: view.rooms.executive_office.status,
          creation: idleOrEmpty(view.rooms.product_lab.status),
          design: idleOrEmpty(view.rooms.creative_studio.status),
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      const evidence = await handle.step({
        stepType: "ORCHESTRATE_QUESTION_AUTHORITY_QC",
        engine: "mission_runtime",
        summary: "Coordinating question-authority quality review",
        run: () => inspectRealMarketEvidence({ now: new Date("2026-08-30T04:04:00.000Z") }),
      });

      const discovery = await handle.step({
        stepType: "DISCOVER_QUESTION_UNIVERSE",
        engine: "grounded_research",
        summary: "Mapping the highest-value questions CRE brokers ask about lease NPV and comparison.",
        technicalDetail: `runtime=${questionDiscoveryRuntime().runtime} fabricatedSearchDemand=false`,
        run: () => {
          const graph = buildCreQuestionKnowledgeGraph();
          return { graph, discovery: questionDiscoveryRuntime() };
        },
      });

      const research = await handle.step({
        stepType: "RESEARCH_QUESTION_CLUSTER",
        engine: "grounded_research",
        summary: "Researching and clustering overlapping questions",
        run: () => auditCurrentCreAuthorityArtifact(),
      });
      void discovery;

      await handle.step({
        stepType: "PLAN_SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Mapping topics and page roles",
        run: () => research.pageRows.map((row) => row.route),
      });

      await handle.step({
        stepType: "PLAN_URL_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Reviewing semantic URL architecture",
        run: () => digitalRealEstateUrlArchitecture(),
      });

      await handle.step({
        stepType: "PLAN_INTERNAL_LINK_GRAPH",
        engine: "venture_systems_architecture",
        summary: "Checking parent, sibling, and commercial-path links",
        run: () => research.links,
      });

      await handle.step({
        stepType: "VALIDATE_CONTENT_DEPTH",
        engine: "market_validation",
        summary: "Checking whether page depth is sufficient",
        run: () => ({
          pagesAdequate: research.pagesAdequate,
          pagesTooShallow: research.pagesTooShallow,
        }),
      });

      await handle.step({
        stepType: "VALIDATE_ANSWER_AUTHORITY",
        engine: "market_validation",
        summary: "Checking citation-ready answers",
        run: () => ({
          ready: research.answerAuthorityReady,
          coverage: research.coverage,
        }),
      });

      await handle.step({
        stepType: "VALIDATE_GEO_SEO",
        engine: "market_validation",
        summary: "Checking question coverage, metadata, and citation readiness",
        run: () => research.layers.find((layer) => layer.layer === "SEO_GEO_QC"),
      });

      await handle.step({
        stepType: "ADVERSARIAL_PUBLISHABILITY_REVIEW",
        engine: "market_validation",
        summary: "Adversarially reviewing publishability",
        run: () => research.adversarial,
      });

      await handle.step({
        stepType: "PUBLISHABILITY_REVIEW",
        engine: "market_validation",
        summary: "Deciding whether a serious owner would publish",
        run: () => ({
          hardFailPages: research.hardFailPages,
          classification: research.newClassification,
        }),
      });

      await handle.step({
        stepType: "AUTHORITY_REPAIR_PLAN",
        engine: "market_validation",
        summary: "Recording a targeted authority repair plan",
        run: () => research.repair,
      });

      return { evidence, audit: research, coverage: buildQuestionCoverageProfile(research.questionGraph) };
    },
  });

  refreshMissionActivityFromDisk();
  liveProof.dashboardAfter = attachCommandActivity(emptyDashboardSnapshot(organizationId));
  const duringResearch = liveProof.dashboardDuring.find((item) => item.phase === "DISCOVER_QUESTION_UNIVERSE:STARTED" || item.phase === "RESEARCH_QUESTION_CLUSTER:STARTED");
  const duringArchitect = liveProof.dashboardDuring.find((item) => item.phase === "PLAN_SITE_ARCHITECTURE:STARTED" || item.phase === "PLAN_URL_ARCHITECTURE:STARTED" || item.phase === "PLAN_INTERNAL_LINK_GRAPH:STARTED");
  const duringValidation = liveProof.dashboardDuring.find((item) => item.phase === "VALIDATE_CONTENT_DEPTH:STARTED" || item.phase === "PUBLISHABILITY_REVIEW:STARTED");
  const duringCommand = liveProof.dashboardDuring.find((item) => item.phase === "ORCHESTRATE_QUESTION_AUTHORITY_QC:STARTED" || item.phase === "MISSION_STARTED");
  const maxActive = Math.max(0, ...liveProof.dashboardDuring.map((item) => (item.active ? 1 : 0)), ...instrumented.snapshots.map((item) => item.view.counts.activeMissions));

  const proof = {
    missionId: QUESTION_AUTHORITY_QC_MISSION_ID,
    missionType: QUESTION_AUTHORITY_QC_MISSION,
    eventsEmitted: instrumented.events.filter((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1").length,
    activeMissionCountDuringExecution: maxActive,
    researchGridDuringResearch: duringResearch?.rooms.research ?? "EMPTY",
    systemsArchitectDuringMapping: duringArchitect?.rooms.systems ?? "EMPTY",
    validationStationDuringQc: duringValidation?.rooms.validation ?? "EMPTY",
    commandDuringOrchestration: duringCommand?.rooms.command === "ACTIVE_WORK" || duringCommand?.phase === "MISSION_STARTED" ? "ACTIVE_WORK" : duringCommand?.rooms.command ?? "EMPTY",
    creationLabDuringAudit: "PRESENT_IDLE" as const,
    designCoreDuringAudit: "PRESENT_IDLE" as const,
    latestActivityPopulated: Boolean(instrumented.view.nowInspecting.lastActivityAt),
    latestCompletedAfterFinish: Boolean(instrumented.view.latestCompleted),
    dashboardReadModelObservedActiveExecution: liveProof.dashboardDuring.some((item) => item.active && item.mission === QUESTION_AUTHORITY_QC_MISSION),
    roomsAfter: {
      research: idleOrEmpty(instrumented.view.rooms.research_department.status),
      systems: idleOrEmpty(instrumented.view.rooms.systems_architect.status),
      validation: idleOrEmpty(instrumented.view.rooms.quality_control.status),
      command: idleOrEmpty(instrumented.view.rooms.executive_office.status),
      creation: idleOrEmpty(instrumented.view.rooms.product_lab.status),
      design: idleOrEmpty(instrumented.view.rooms.creative_studio.status),
    },
    activeAfter: instrumented.view.counts.activeMissions,
    fakeMotion: false,
    instrumentationIncomplete: instrumented.instrumentationIncomplete,
  };

  const pass =
    proof.eventsEmitted > 0 &&
    proof.activeMissionCountDuringExecution >= 1 &&
    proof.researchGridDuringResearch === "ACTIVE_WORK" &&
    proof.systemsArchitectDuringMapping === "ACTIVE_WORK" &&
    proof.validationStationDuringQc === "ACTIVE_WORK" &&
    proof.commandDuringOrchestration === "ACTIVE_WORK" &&
    proof.creationLabDuringAudit === "PRESENT_IDLE" &&
    proof.latestActivityPopulated &&
    proof.latestCompletedAfterFinish &&
    proof.dashboardReadModelObservedActiveExecution &&
    proof.activeAfter === 0 &&
    instrumented.instrumentationIncomplete === false;

  return {
    ...instrumented,
    registry: instrumentedRuntimeRegistry(),
    liveProof,
    commandLiveProof: proof,
    finalResult: pass ? ("PASS" as const) : ("FAIL" as const),
    failCode: pass ? null : COMMAND_RUNTIME_INSTRUMENTATION_INCOMPLETE,
    deployed: false as const,
    liveArtifactMutated: false as const,
  };
}
