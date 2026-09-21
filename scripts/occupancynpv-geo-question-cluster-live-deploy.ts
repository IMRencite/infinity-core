import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";

async function main() {
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
    only_rent: /Do you only need rent to compare two commercial leases/i.test(live.body),
    toc: /On this page/i.test(live.body),
    citation: /data-citation-ready|Rent alone is not a comparison/i.test(live.body),
    publishing_hold: "UNCHANGED",
    communication_runtime_changed: false,
    safe_error: deploy.safe_error,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!live.ok || !report.only_rent) process.exitCode = 1;
}

void main();
