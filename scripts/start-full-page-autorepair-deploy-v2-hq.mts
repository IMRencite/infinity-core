import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { commitMissionActivityDurably } from "../lib/infinity/mission-activity/commit.ts";
import { emitMissionActivity } from "../lib/infinity/mission-activity/emit.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { refreshMissionActivityFromDisk } from "../lib/infinity/mission-activity/store.ts";
import {
  CRE_CANDIDATE_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "../lib/infinity/market-validation-experiment/constants.ts";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();
refreshMissionActivityFromDisk();

const organizationId = LIVE_ORG;
const ventureId = `candidate:${CRE_CANDIDATE_ID}`;
const predecessors = [
  {
    missionId: "msn_cre_pricing_prerender_build_repair_v1",
    missionType: "CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_V1",
    summary:
      "Provider-equivalent pricing prerender repair frozen. Founder authorized GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2.",
  },
  {
    missionId: "msn_cre_full_page_autorepair_deploy_v1",
    missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
    summary:
      "V1 deploy remained READY_BLOCKED on PROVIDER_EQUIVALENT_BUILD_GATE_FAILED. Successor art_e9e0356a261866b6d534 handed to V2.",
  },
];
const deploy = {
  missionId: "msn_cre_full_page_autorepair_deploy_v2",
  missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2",
};
const trace = {
  missionId: deploy.missionId,
  artifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
};

for (const predecessor of predecessors) {
  const completedPredecessor = emitMissionActivity({
    organizationId,
    ventureId,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: predecessor.missionId,
    missionType: predecessor.missionType,
    engine: "mission_runtime",
    stepType: "PUBLISHABILITY_REVIEW",
    eventType: "MISSION_COMPLETED",
    summary: predecessor.summary,
    source: "governed_cre_full_page_autorepair_deployment_v2",
    executionClass: "VENTURE_EXECUTION",
    synthetic: false,
    traceability: {
      missionId: predecessor.missionId,
      artifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
    },
  });
  await commitMissionActivityDurably(completedPredecessor);
}

const base = {
  organizationId,
  ventureId,
  candidateId: CRE_CANDIDATE_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  missionId: deploy.missionId,
  missionType: deploy.missionType,
  source: "governed_cre_full_page_autorepair_deployment_v2",
  executionClass: "VENTURE_EXECUTION" as const,
  synthetic: false,
  traceability: trace,
};

const started = emitMissionActivity({
  ...base,
  engine: "mission_runtime",
  stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY",
  eventType: "MISSION_STARTED",
  summary: "Starting the governed full-page autorepair deployment of the pricing-prerender repair successor",
});
await commitMissionActivityDurably(started);

for (const step of [
  {
    stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY",
    engine: "mission_runtime",
    summary: "Coordinating Validation Station and Deployment Depot for art_e9e0356a261866b6d534",
  },
  {
    stepType: "QUALITY_REVIEW",
    engine: "market_validation",
    summary: "Reconfirming artifact identity, digest lock, and 93-route page-level admission",
  },
  {
    stepType: "PREPARE_SOURCE_BUNDLE",
    engine: "launch_gateway",
    summary: "Preparing the immutable pricing-prerender repair source bundle for a single staging deploy",
  },
]) {
  const event = emitMissionActivity({
    ...base,
    engine: step.engine,
    stepType: step.stepType,
    eventType: "STEP_STARTED",
    summary: step.summary,
  });
  await commitMissionActivityDurably(event);
}

const view = projectCommandActivity({ organizationId });
process.stdout.write(
  `${JSON.stringify(
    {
      digest: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      currentMission: view.nowInspecting.currentMission,
      currentStep: view.nowInspecting.currentStep,
      status: view.nowInspecting.status,
      currentTask: view.nowInspecting.currentTask,
      counts: view.counts,
      rooms: Object.fromEntries(
        Object.entries(view.rooms).map(([id, slice]) => [id, { status: slice.status, summary: slice.summary }]),
      ),
      latestCompleted: view.latestCompleted?.missionType ?? null,
    },
    null,
    2,
  )}\n`,
);
