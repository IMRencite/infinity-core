import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { commitMissionActivityDurably } from "../lib/infinity/mission-activity/commit.ts";
import { emitMissionActivity } from "../lib/infinity/mission-activity/emit.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { refreshMissionActivityFromDisk } from "../lib/infinity/mission-activity/store.ts";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
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

const hold = {
  organizationId: LIVE_ORG,
  ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  candidateId: CRE_CANDIDATE_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  missionId: "msn_cre_full_page_autorepair_deploy_v1",
  missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
  eventType: "MISSION_BLOCKED" as const,
  status: "READY_BLOCKED" as const,
  blocker: "PROVIDER_EQUIVALENT_BUILD_GATE_FAILED",
  authorizationRequired: "CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REPAIR_REQUIRED",
  summary:
    "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
  technicalDetail:
    `isolated_build_failed next@16.2.11 turbopack prerender /pricing TypeError: Cannot read properties of null (reading 'useOptimistic'). digest=${SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST}. deployments=0 activations=0.`,
  source: "governed_cre_full_page_autorepair_deployment_v1",
  executionClass: "VENTURE_EXECUTION" as const,
  synthetic: false,
  traceability: {
    missionId: "msn_cre_full_page_autorepair_deploy_v1",
    artifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
  },
};
await commitMissionActivityDurably(
  emitMissionActivity({
    ...hold,
    engine: "mission_runtime",
    stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY",
  }),
);
await commitMissionActivityDurably(
  emitMissionActivity({
    ...hold,
    engine: "market_validation",
    stepType: "QUALITY_REVIEW",
  }),
);
await commitMissionActivityDurably(
  emitMissionActivity({
    ...hold,
    engine: "launch_gateway",
    stepType: "PROVIDER_BUILD",
  }),
);

const view = projectCommandActivity({ organizationId: LIVE_ORG });
process.stdout.write(
  `${JSON.stringify(
    {
      currentMission: view.nowInspecting.currentMission,
      status: view.nowInspecting.status,
      currentTask: view.nowInspecting.currentTask,
      blocker: view.nowInspecting.blocker,
      authorizationRequired: view.nowInspecting.authorizationRequired,
      counts: view.counts,
      command: view.rooms.executive_office.status,
      validation: view.rooms.quality_control.status,
      deployment: view.rooms.launch_operations.status,
      latestCompleted: view.latestCompleted?.missionType ?? null,
    },
    null,
    2,
  )}\n`,
);
