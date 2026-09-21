import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";
import {
  hydrateOrganicGrowthSchedulerState,
  persistOrganicGrowthSchedulerState,
} from "../lib/infinity/organic-growth-engine/obligation/persist";
import { pauseOrganicPublishingForSecondQcEscape } from "../lib/infinity/organic-growth-engine/obligation/scheduler";

async function main() {
  await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
  pauseOrganicPublishingForSecondQcEscape("SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE");
  await persistOrganicGrowthSchedulerState().catch(() => undefined);

  const deploy = await deployOccupancyNpvOrganicLivePage({ deploy: true, pollAttempts: 60, pollDelayMs: 8000 });
  const liveUrl = `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE.replace(/\/+$/, "")}/`;
  let live = { ok: false, status: 0, body: "", final_url: liveUrl };
  if (deploy.deployed) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      live = await fetchPublicHtml(liveUrl);
      if (live.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
  const report = {
    url: liveUrl,
    deployed: deploy.deployed,
    aliased: deploy.aliased,
    deployment_id: deploy.deployment_id,
    live_status: live.status,
    checklist: /Quick lease input checklist/i.test(live.body),
    example: /Worked teaching sample/i.test(live.body),
    leaked: /pilot concept|validation \/ pilot|input checklist only|second process explainer/i.test(live.body),
    pricing: live.body.includes("/pricing"),
    trial: /3-day free trial/i.test(live.body),
    publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE",
    isolation: "organic-occupancynpv-project",
    communication_runtime_changed: false,
    safe_error: deploy.safe_error,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!live.ok || report.leaked || !report.checklist) process.exitCode = 1;
}

void main();
