import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { commitMissionActivityDurably } from "../lib/infinity/mission-activity/commit.ts";
import { emitMissionActivity } from "../lib/infinity/mission-activity/emit.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { refreshMissionActivityFromDisk } from "../lib/infinity/mission-activity/store.ts";
import {
  CRE_CANDIDATE_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
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
const deploy = {
  missionId: "msn_cre_homepage_hero_link_contrast_deploy_v1",
  missionType: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
};
const trace = {
  missionId: deploy.missionId,
  artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
};

const base = {
  organizationId,
  ventureId,
  candidateId: CRE_CANDIDATE_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  missionId: deploy.missionId,
  missionType: deploy.missionType,
  source: "governed_cre_homepage_hero_link_contrast_deployment_v1",
  executionClass: "VENTURE_EXECUTION" as const,
  synthetic: false,
  traceability: trace,
};

await commitMissionActivityDurably(
  emitMissionActivity({
    ...base,
    engine: "mission_runtime",
    stepType: "ORCHESTRATE_HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY",
    eventType: "MISSION_STARTED",
    summary: "Starting the governed homepage hero-link contrast deployment of art_dbf624e41599420891e2",
  }),
);

for (const step of [
  {
    stepType: "ORCHESTRATE_HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY",
    engine: "mission_runtime",
    summary: "Coordinating Deployment Depot for a single staging write of art_dbf624e41599420891e2",
  },
  {
    stepType: "PREPARE_SOURCE_BUNDLE",
    engine: "launch_gateway",
    summary: "Preparing the immutable homepage hero-link contrast source bundle for one staging deploy",
  },
]) {
  await commitMissionActivityDurably(
    emitMissionActivity({
      ...base,
      engine: step.engine,
      stepType: step.stepType,
      eventType: "STEP_STARTED",
      summary: step.summary,
    }),
  );
}

const view = projectCommandActivity({ organizationId });
process.stdout.write(
  `${JSON.stringify(
    {
      digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
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
