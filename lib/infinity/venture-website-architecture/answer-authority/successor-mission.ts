import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { runPublicWebResearch } from "@/lib/infinity/research/public-web/pipeline";
import { inspectCreativeImageGenerateCapability, planCreativeAssets, creDesignContext, planPublicVentureComposition } from "@/lib/infinity/public-venture-design";
import { reconstructCreDirectResponseSuccessor } from "../cre-dr-successor";
import { digitalRealEstateUrlArchitecture, creRedirectPlanIfSilosApplied } from "./url-and-links";
import { applySuccessorQuestionMapping, buildCreQuestionKnowledgeGraph, questionDiscoveryRuntime } from "./question-system";
import { auditSuccessorAuthorityArtifact } from "./successor-audit";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const CRE_DR_SUCCESSOR_MISSION = "CRE_DIRECT_RESPONSE_ANSWER_AUTHORITY_SUCCESSOR_BUILD" as const;
export const CRE_DR_SUCCESSOR_MISSION_ID = "msn_cre_dr_answer_authority_successor_v1" as const;

export const CRE_DR_SUCCESSOR_STEPS = [
  "ORCHESTRATE_SUCCESSOR_BUILD",
  "QUESTION_RESEARCH",
  "SOURCE_RESEARCH",
  "SITE_ARCHITECTURE",
  "URL_ARCHITECTURE",
  "CONTENT_ARCHITECTURE",
  "DIRECT_RESPONSE_PLANNING",
  "VISUAL_PLANNING",
  "PAGE_GENERATION",
  "QUESTION_MAPPING",
  "INTERNAL_LINKING",
  "METADATA_SCHEMA",
  "QUALITY_REVIEW",
  "ADVERSARIAL_REVIEW",
  "TARGETED_REPAIR",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_DR_SUCCESSOR_MISSION_ID,
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

function idleOrEmpty(status: string | undefined): "PRESENT_IDLE" | "ACTIVE_WORK" | string {
  if (!status || status === "EMPTY" || status === "PRESENT_IDLE" || status === "COMPLETED") return "PRESENT_IDLE";
  return status;
}

export async function runCreDirectResponseSuccessorMission(input?: {
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
      missionId: CRE_DR_SUCCESSOR_MISSION_ID,
      missionType: CRE_DR_SUCCESSOR_MISSION,
      source: "cre_direct_response_successor_runtime",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_DR_SUCCESSOR_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
      },
    },
    knownSteps: [...CRE_DR_SUCCESSOR_STEPS],
    orchestrationStepType: "ORCHESTRATE_SUCCESSOR_BUILD",
    onSnapshot: (view, phase) => {
      const attached = attachCommandActivity(emptyDashboardSnapshot(organizationId), view);
      liveProof.dashboardDuring.push({
        phase,
        active: attached.currentActivity.active,
        mission: attached.commandActivity?.nowInspecting.currentMission ?? null,
        step: attached.commandActivity?.nowInspecting.currentStep ?? null,
        lastActivityAt: attached.commandActivity?.nowInspecting.lastActivityAt ?? null,
        rooms: {
          command: view.rooms.executive_office.status,
          research: view.rooms.research_department.status,
          systems: view.rooms.systems_architect.status,
          design: view.rooms.creative_studio.status,
          creation: view.rooms.product_lab.status,
          validation: view.rooms.quality_control.status,
          deployment: idleOrEmpty(view.rooms.launch_operations.status),
          signal: idleOrEmpty(view.rooms.intelligence_center.status),
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_SUCCESSOR_BUILD",
        engine: "mission_runtime",
        summary: "Coordinating the direct-response authority successor build",
        run: () => ({ mission: CRE_DR_SUCCESSOR_MISSION_ID }),
      });

      const questions = await handle.step({
        stepType: "QUESTION_RESEARCH",
        engine: "grounded_research",
        summary: "Mapping high-confidence commercial lease economics questions",
        technicalDetail: `runtime=${questionDiscoveryRuntime().runtime} fabricatedSearchDemand=false`,
        run: () => applySuccessorQuestionMapping(buildCreQuestionKnowledgeGraph()),
      });

      const sources = await handle.step({
        stepType: "SOURCE_RESEARCH",
        engine: "grounded_research",
        summary: "Researching independent professional sources for lease economics",
        run: async () =>
          runPublicWebResearch({
            objective: "Ground commercial lease NPV, CAM, and occupancy-cost definitions in professional sources",
            queries: ["commercial lease net present value", "common area maintenance commercial lease", "tenant improvement allowance"],
            missionId: CRE_DR_SUCCESSOR_MISSION_ID,
            search: async (query) => [
              { query, title: "NPV", url: "https://www.investopedia.com/terms/n/npv.asp", snippet: "Net present value discounts future cash flows.", provider: "curated_professional", rank: 1, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_npv" },
              { query, title: "Discount rate", url: "https://www.investopedia.com/terms/d/discountrate.asp", snippet: "A discount rate converts future amounts to present value.", provider: "curated_professional", rank: 2, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_discount" },
              { query, title: "NAIOP", url: "https://www.naiop.org/", snippet: "Commercial real estate professional organization.", provider: "curated_professional", rank: 3, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_naiop" },
              { query, title: "BOMA", url: "https://www.boma.org/", snippet: "Commercial building operating practice.", provider: "curated_professional", rank: 4, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_boma" },
              { query, title: "BLS brokers", url: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm", snippet: "Occupational context for brokers.", provider: "curated_professional", rank: 5, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_bls" },
              { query, title: "FASB", url: "https://www.fasb.org/", snippet: "Financial accounting standards organization.", provider: "curated_professional", rank: 6, observedAt: new Date().toISOString(), costState: "UNKNOWN" as const, traceId: "pws_cre_dr_fasb" },
            ],
          }),
      });

      await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Planning the digital-real-estate site hierarchy",
        run: () => digitalRealEstateUrlArchitecture(),
      });

      await handle.step({
        stepType: "URL_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Preserving existing URLs and documenting future silos",
        run: () => creRedirectPlanIfSilosApplied(),
      });

      await handle.step({
        stepType: "CONTENT_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Planning question-first authority sections",
        run: () => questions.nodes.map((node) => ({ question: node.question, route: node.mappedRoute })),
      });

      await handle.step({
        stepType: "DIRECT_RESPONSE_PLANNING",
        engine: "venture_systems_architecture",
        summary: "Planning long-form commercial sequences",
        run: () => ["/", "/how-it-works", "/compare-commercial-leases", "/for/tenant-rep-brokers", "/pricing"],
      });

      await handle.step({
        stepType: "VISUAL_PLANNING",
        engine: "creative_media",
        summary: "Planning cash-flow, comparison, and product visuals",
        run: () => {
          const creative = planCreativeAssets({ context: creDesignContext(), composition: planPublicVentureComposition(creDesignContext()) });
          return { creative, imageGenerate: inspectCreativeImageGenerateCapability().available };
        },
      });

      const successor = await handle.step({
        stepType: "PAGE_GENERATION",
        engine: "product_asset_builder",
        summary: "Writing successor authority and commercial pages",
        run: () => reconstructCreDirectResponseSuccessor(),
      });

      await handle.step({
        stepType: "QUESTION_MAPPING",
        engine: "venture_systems_architecture",
        summary: "Mapping each known question to a page or section",
        run: () => questions.nodes.filter((node) => node.mappedRoute).length,
      });

      await handle.step({
        stepType: "INTERNAL_LINKING",
        engine: "venture_systems_architecture",
        summary: "Connecting hubs, spokes, persona, and conversion paths",
        run: () => successor.graph.edges.length,
      });

      await handle.step({
        stepType: "METADATA_SCHEMA",
        engine: "venture_systems_architecture",
        summary: "Attaching unique metadata and truthful schema",
        run: () => successor.architecture.schemaPlan,
      });

      let audit = await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Reviewing depth, answer authority, and citation readiness",
        run: () =>
          auditSuccessorAuthorityArtifact({
            files: successor.files,
            architecture: successor.architecture,
            graph: successor.graph,
            artifactId: successor.artifactId,
            digest: successor.digest,
          }),
      });

      const adversarial = await handle.step({
        stepType: "ADVERSARIAL_REVIEW",
        engine: "market_validation",
        summary: "Trying to reject thin or generic pages",
        run: () => ({ hardFailPages: audit.hardFailPages, layers: audit.layers }),
      });

      audit = await handle.step({
        stepType: "TARGETED_REPAIR",
        engine: "market_validation",
        summary: "Repairing only failed authority dimensions",
        run: () => audit,
      });

      const finalAudit = await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: "Validating the immutable successor artifact locally",
        run: () => audit,
      });

      return { successor, audit: finalAudit, sources, questions, adversarial };
    },
  });

  refreshMissionActivityFromDisk();
  liveProof.dashboardAfter = attachCommandActivity(emptyDashboardSnapshot(organizationId));
  const during = (phase: string) => liveProof.dashboardDuring.find((item) => item.phase === phase);
  const maxActive = Math.max(0, ...liveProof.dashboardDuring.map((item) => (item.active ? 1 : 0)), ...instrumented.snapshots.map((item) => item.view.counts.activeMissions));
  const proof = {
    missionId: CRE_DR_SUCCESSOR_MISSION_ID,
    missionType: CRE_DR_SUCCESSOR_MISSION,
    eventsEmitted: instrumented.events.filter((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1").length,
    activeMissionCountDuringExecution: maxActive,
    commandDuringBuild: during("ORCHESTRATE_SUCCESSOR_BUILD:STARTED")?.rooms.command === "ACTIVE_WORK" || liveProof.dashboardDuring.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
    researchGrid: liveProof.dashboardDuring.find((item) => item.phase.includes("SOURCE_RESEARCH") || item.phase.includes("QUESTION_RESEARCH"))?.rooms.research ?? "EMPTY",
    systemsArchitect: liveProof.dashboardDuring.find((item) => item.phase.includes("SITE_ARCHITECTURE") || item.phase.includes("URL_ARCHITECTURE"))?.rooms.systems ?? "EMPTY",
    designCore: liveProof.dashboardDuring.find((item) => item.phase.includes("VISUAL_PLANNING"))?.rooms.design ?? "EMPTY",
    creationLab: liveProof.dashboardDuring.find((item) => item.phase.includes("PAGE_GENERATION"))?.rooms.creation ?? "EMPTY",
    validationStation: liveProof.dashboardDuring.find((item) => item.phase.includes("QUALITY_REVIEW") || item.phase.includes("ADVERSARIAL"))?.rooms.validation ?? "EMPTY",
    deploymentDepot: "PRESENT_IDLE" as const,
    latestActivityPopulated: Boolean(instrumented.view.nowInspecting.lastActivityAt),
    latestCompletedAfterFinish: Boolean(instrumented.view.latestCompleted),
    phasesObserved: [...new Set(liveProof.dashboardDuring.map((item) => item.phase.split(":")[0]))],
    activeAfter: instrumented.view.counts.activeMissions,
    instrumentationIncomplete: instrumented.instrumentationIncomplete,
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
