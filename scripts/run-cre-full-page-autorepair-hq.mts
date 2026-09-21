import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants.ts";
import { runCreFullPageAutorepairMission } from "../lib/infinity/venture-website-architecture/answer-authority/full-page-autorepair-mission.ts";

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

const run = await runCreFullPageAutorepairMission();
const view = projectCommandActivity({ organizationId: LIVE_ORG });
console.log(
  JSON.stringify(
    {
      mission: run.commandLiveProof.missionType,
      missionId: run.commandLiveProof.missionId,
      eventsEmitted: run.commandLiveProof.eventsEmitted,
      during: run.commandLiveProof,
      now: {
        currentMission: view.nowInspecting.currentMission,
        status: view.nowInspecting.status,
        currentRoom: view.nowInspecting.currentRoom,
        currentTask: view.nowInspecting.currentTask,
        blocker: view.nowInspecting.blocker,
        authorizationRequired: view.nowInspecting.authorizationRequired,
        latestCompleted: view.latestCompleted?.missionType ?? null,
      },
      rooms: Object.fromEntries(
        Object.entries(view.rooms).map(([id, slice]) => [id, { status: slice.status, summary: slice.summary }]),
      ),
      counts: view.counts,
      deployed: run.deployed,
    },
    null,
    2,
  ),
);
