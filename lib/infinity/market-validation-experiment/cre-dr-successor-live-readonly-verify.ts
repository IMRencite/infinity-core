import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import {
  CRE_CANDIDATE_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";
import { getActivePublicValidationArtifactId } from "./active-public-artifact";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { loadEnvLocal } from "./live";
import { fetchPublicPath } from "./validation-grade-live-verify";
import {
  liveVerificationPassed,
  verifyDirectResponseSuccessorLivePublic,
} from "./cre-dr-successor-live-verify";

export const CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION =
  "CRE_DIRECT_RESPONSE_ANSWER_AUTHORITY_SUCCESSOR_LIVE_READONLY_VERIFY" as const;
export const CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION_ID =
  "msn_cre_dr_successor_live_readonly_verify_v1" as const;

export const EXISTING_DR_SUCCESSOR_DEPLOYMENT_ID = "dpl_39dsDat13c1V5nr1EkgDCqiR6RNw" as const;
export const EXISTING_DR_SUCCESSOR_PUBLIC_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-5le6m8tl1.vercel.app" as const;

export const READONLY_INTENDED_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/resources/cam-costs",
  "/resources/free-rent",
  "/resources/rent-escalations",
  "/resources/gross-vs-net-lease",
  "/for/tenant-rep-brokers",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
] as const;

function emptyHqSnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId: LIVE_ORG,
      missionId: CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION_ID,
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

async function getExistingVercelDeploymentReadonly(): Promise<{
  id: string;
  readyState: string | null;
  url: string | null;
  method: "GET";
}> {
  loadEnvLocal();
  const token = process.env[VERCEL_TOKEN_ENV];
  const teamId = process.env[VERCEL_TEAM_ID_ENV];
  if (!token) {
    return { id: EXISTING_DR_SUCCESSOR_DEPLOYMENT_ID, readyState: null, url: null, method: "GET" };
  }
  const path = `/v13/deployments/${EXISTING_DR_SUCCESSOR_DEPLOYMENT_ID}`;
  const url = teamId
    ? `https://api.vercel.com${path}?teamId=${teamId}`
    : `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; readyState?: string; url?: string };
  return {
    id: body.id ?? EXISTING_DR_SUCCESSOR_DEPLOYMENT_ID,
    readyState: body.readyState ?? null,
    url: body.url ?? null,
    method: "GET",
  };
}

export async function verifyExistingDirectResponseSuccessorLiveReadOnly() {
  loadEnvLocal();
  const midRun: Array<{ phase: string; rooms: string[]; workers: string[] }> = [];
  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION_ID,
      missionType: CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION,
      source: "cre_dr_successor_live_readonly_verify_v1",
      executionClass: "VENTURE_EXECUTION",
    },
    knownSteps: [
      "ORCHESTRATE_DR_SUCCESSOR_DEPLOY",
      "PUBLIC_ARTIFACT_QUALITY_GATE",
      "DEPLOYMENT_READY",
      "EVIDENCE_MONITORING",
    ],
    orchestrationStepType: "ORCHESTRATE_DR_SUCCESSOR_DEPLOY",
    onSnapshot: (view, phase) => {
      const read = attachCommandActivity(enrichOperatorSnapshot(emptyHqSnapshot()), view);
      midRun.push({
        phase,
        rooms: read.currentDepartments,
        workers: (read.workerNodes ?? []).filter((node) => node.motionActive).map((node) => node.displayRole),
      });
    },
    run: async (handle) => {
      const provider = await handle.step({
        stepType: "DEPLOYMENT_READY",
        engine: "launch_gateway",
        summary: "GET-only reconciliation of the existing READY successor deployment.",
        run: () => getExistingVercelDeploymentReadonly(),
      });
      const live = await handle.step({
        stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
        engine: "market_validation",
        summary: "Read-only live verification of the existing successor public URL.",
        run: () =>
          verifyDirectResponseSuccessorLivePublic({
            url: EXISTING_DR_SUCCESSOR_PUBLIC_URL,
            intendedRoutes: [...READONLY_INTENDED_ROUTES],
            artifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          }),
      });
      const npv = await fetchPublicPath(EXISTING_DR_SUCCESSOR_PUBLIC_URL, "/commercial-lease-npv");
      const npvText = npv.body.replace(/<[^>]+>/g, " ");
      await handle.step({
        stepType: "EVIDENCE_MONITORING",
        engine: "performance_intelligence",
        summary: "Checking page, section, and CTA identity on the existing live successor.",
        run: () => live.instrumentation,
      });
      return {
        provider,
        live,
        npvCommonMistakes: /Common mistakes/i.test(npvText),
        npvVsTotalCost: /NPV vs total lease cost|undiscounted totals|total lease cost/i.test(npvText),
      };
    },
  });

  const evidence = inspectRealMarketEvidence();
  const clock = inspectExperimentClock();
  const qc = midRun.find((item) => item.phase === "PUBLIC_ARTIFACT_QUALITY_GATE:STARTED");
  const depot = midRun.find((item) => item.phase === "DEPLOYMENT_READY:STARTED");
  const missionResult = instrumented.result as {
    provider: unknown;
    live: Parameters<typeof liveVerificationPassed>[0];
    npvCommonMistakes: boolean;
    npvVsTotalCost: boolean;
  };
  return {
    provider: missionResult.provider,
    live: missionResult.live,
    npvCommonMistakes: missionResult.npvCommonMistakes,
    npvVsTotalCost: missionResult.npvVsTotalCost,
    allLivePassed: liveVerificationPassed(missionResult.live),
    experiment: {
      state: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      restarted: clock.restarted,
      qualified: evidence.counts.qualifiedVisitors,
      strongIntent: evidence.counts.strongIntent,
      pricing: evidence.counts.pricingSelections,
      decision: evidence.decision.currentDecision,
      buildReady: evidence.decision.buildReady,
    },
    activeArtifactUnchanged: getActivePublicValidationArtifactId(),
    hq: {
      missionId: CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION_ID,
      command: qc || depot ? "ACTIVE_WORK" : "PRESENT_IDLE",
      validationStation: qc?.rooms.includes("quality_control") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      deploymentDepot: depot?.rooms.includes("launch_operations") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      creationLab: "PRESENT_IDLE",
      designCore: "PRESENT_IDLE",
      workers: midRun.some((item) => item.workers.length > 0),
      latestCompleted: instrumented.view.latestCompleted?.missionId === CRE_DR_SUCCESSOR_LIVE_READONLY_MISSION_ID,
      midRun,
    },
    writes: {
      providerWrites: 0,
      deployments: 0,
      activeArtifactMutation: false,
      experimentMutation: false,
    },
  };
}
