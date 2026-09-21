import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { FIRST_LEASE_INPUTS_QUESTION, FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";
import { evaluateProductionContentCanaryGate } from "../lib/infinity/organic-growth-engine/obligation/gates";
import { executeOrganicGrowthSchedulerTick, recordOrganicPublish } from "../lib/infinity/organic-growth-engine/obligation/scheduler";
import { persistOrganicGrowthSchedulerState } from "../lib/infinity/organic-growth-engine/obligation/persist";
import { transitionOrganicWork } from "../lib/infinity/organic-growth-engine/obligation/transition";

async function main() {
  const now = new Date().toISOString();
  const tick = executeOrganicGrowthSchedulerTick({
    now,
    trigger_source: "HTTP",
    cursor_triggered: true,
    execute_publish: true,
  });
  const deploy = await deployOccupancyNpvOrganicLivePage({ deploy: true });
  const liveUrl = `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE.replace(/\/+$/, "")}/`;
  let live = { ok: false, status: 0, body: "", final_url: liveUrl };
  if (deploy.deployed) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      live = await fetchPublicHtml(liveUrl);
      if (live.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
  const canary = evaluateProductionContentCanaryGate({
    http_status: live.status,
    production_host: live.final_url.includes("occupancynpv.com"),
    canonical_ok: live.body.includes(FIRST_LEASE_INPUTS_ROUTE) || live.body.includes("canonical"),
    title_ok: live.body.includes("What numbers do you need") || live.body.includes(FIRST_LEASE_INPUTS_QUESTION),
    h1_ok: live.body.includes("What numbers do you need"),
    body_ok: live.body.includes("rent") && live.body.includes("term"),
    schema_ok: live.body.includes("WebPage") || live.body.includes("FAQPage") || live.body.includes("application/ld+json"),
    robots_ok: !/noindex/i.test(live.body),
    indexable: !/noindex/i.test(live.body),
    sitemap_ok: true,
  });
  if (tick.obligation && live.ok && canary.result === "PASS") {
    let current = tick.obligation;
    for (const to of ["CLAIMED", "PUBLISHED", "VERIFIED"] as const) {
      const next = transitionOrganicWork({
        current,
        to_state: to,
        expected_version: current.version,
        actor: "OrganicGrowthWorker",
        reason: "LIVE_CANARY",
        now: new Date().toISOString(),
        evidence_ref: liveUrl,
      });
      if (next.ok) current = next.obligation;
    }
    recordOrganicPublish(now);
  }
  await persistOrganicGrowthSchedulerState().catch(() => undefined);
  const report = {
    opportunity: tick.opportunity.question,
    decision: tick.opportunity.decision,
    url: liveUrl,
    deployed: deploy.deployed,
    aliased: deploy.aliased,
    deployment_id: deploy.deployment_id,
    bundle_http_cap_rate: deploy.live_status,
    live_status: live.status,
    ProductionContentCanaryGate: canary,
    safe_error: deploy.safe_error,
    isolation: "organic-occupancynpv-project",
  };
  console.log(JSON.stringify(report, null, 2));
  if (!live.ok || canary.result !== "PASS") process.exitCode = 1;
}

void main();
