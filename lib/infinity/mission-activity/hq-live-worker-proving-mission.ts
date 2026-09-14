import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  creDesignContext,
  planCreativeAssets,
  planPublicVentureComposition,
} from "@/lib/infinity/public-venture-design";
import { creSiteArchitectureInput } from "@/lib/infinity/venture-website-architecture/cre-context";
import { planVentureSiteArchitecture } from "@/lib/infinity/venture-website-architecture/site-architecture-planner";
import { digitalRealEstateUrlArchitecture } from "@/lib/infinity/venture-website-architecture/answer-authority/url-and-links";
import {
  adversarialReview,
  reviewPublishability,
} from "@/lib/infinity/venture-website-architecture/answer-authority/publishability-and-qc";
import type { CommandActivityView } from "./types";

export const HQ_LIVE_WORKER_PROOF_MISSION = "HQ_LIVE_WORKER_VISUAL_EXECUTION_PROOF" as const;
export const HQ_LIVE_WORKER_PROOF_MISSION_ID = "msn_hq_live_worker_visual_proof_v1" as const;

export const HQ_LIVE_WORKER_PROOF_STEPS = [
  "ORCHESTRATE_HQ_LIVE_WORKER_PROOF",
  "SITE_ARCHITECTURE",
  "VISUAL_PLANNING",
  "PAGE_GENERATION",
  "QUALITY_REVIEW",
  "ADVERSARIAL_REVIEW",
] as const;

function provingSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: HQ_LIVE_WORKER_PROOF_MISSION_ID,
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

export function composeDisposableHqProofPage(): { path: string; content: string } {
  return {
    path: "app/hq-live-proof/page.tsx",
    content: `export default function HqLiveProofPage() {
  return (
    <main>
      <h1>HQ live worker proof</h1>
      <p>Disposable local proving page. Not a CRE successor route and not a public artifact.</p>
    </main>
  );
}
`,
  };
}

export function hqBrowserReadModel(organizationId = LIVE_ORG): OperatorVentureSnapshot {
  return enrichOperatorSnapshot(provingSnapshot(organizationId));
}

export async function runHqLiveWorkerVisualProofMission(input?: {
  organizationId?: string;
  onSnapshot?: (view: CommandActivityView, phase: string, readModel: OperatorVentureSnapshot) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const midRun: Array<{ phase: string; view: CommandActivityView; readModel: OperatorVentureSnapshot }> = [];
  const startedAt = new Date().toISOString();

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: HQ_LIVE_WORKER_PROOF_MISSION_ID,
      missionType: HQ_LIVE_WORKER_PROOF_MISSION,
      source: "hq_live_worker_visual_proof_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [...HQ_LIVE_WORKER_PROOF_STEPS],
    orchestrationStepType: "ORCHESTRATE_HQ_LIVE_WORKER_PROOF",
    onSnapshot: (view, phase) => {
      const readModel = hqBrowserReadModel(organizationId);
      midRun.push({ phase, view, readModel });
      input?.onSnapshot?.(view, phase, readModel);
    },
    run: async (handle) => {
      const architecture = await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Mapping question clusters into the lease economics resource architecture.",
        run: () => ({
          architecture: planVentureSiteArchitecture(creSiteArchitectureInput(`candidate:${CRE_CANDIDATE_ID}`), {
            includeDirectResponseSuccessorPages: true,
          }),
          urls: digitalRealEstateUrlArchitecture(),
        }),
      });

      const design = await handle.step({
        stepType: "VISUAL_PLANNING",
        engine: "creative_media",
        summary: "Planning cash-flow and NPV visual explanations.",
        run: () => {
          const context = creDesignContext();
          return planCreativeAssets({ context, composition: planPublicVentureComposition(context) });
        },
      });

      const generated = await handle.step({
        stepType: "PAGE_GENERATION",
        engine: "product_asset_builder",
        summary: "Writing a disposable local HQ proving page.",
        run: () => composeDisposableHqProofPage(),
      });

      const qc = await handle.step({
        stepType: "QUALITY_REVIEW",
        engine: "market_validation",
        summary: "Checking answer authority and citation readiness on the disposable proving page.",
        run: () =>
          reviewPublishability({
            route: "/hq-live-proof",
            role: "QUESTION_PAGE",
            content: generated.content,
            intendedPatternId: "FAQ_PAGE",
          }),
      });

      const adversarial = await handle.step({
        stepType: "ADVERSARIAL_REVIEW",
        engine: "market_validation",
        summary: "Trying to reject thin or generic content on the disposable proving page.",
        run: () => adversarialReview(qc),
      });

      return { architecture, design, generated, qc, adversarial };
    },
  });

  refreshMissionActivityFromDisk();
  const completedAt = new Date().toISOString();
  const after = attachCommandActivity(hqBrowserReadModel(organizationId), instrumented.view);

  return {
    ...instrumented,
    startedAt,
    completedAt,
    durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
    midRun,
    capturedBeforeCompletion: midRun.some((item) => item.readModel.currentActivity.active && (item.readModel.workerNodes?.length ?? 0) > 0),
    hqReadModelAfter: after,
    successorMutated: false,
    deployed: false,
  };
}
