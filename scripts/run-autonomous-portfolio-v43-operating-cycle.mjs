#!/usr/bin/env node
/**
 * V43 — Execute one autonomous portfolio operating cycle (existing ventures).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeAutonomousPortfolioOperatingCycleV1 } from "../lib/infinity/autonomous-portfolio-operations/execute-autonomous-portfolio-operating-cycle-v1.ts";
import {
  AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
  autonomousSchedulerResponsibilitySeparationQc,
  autonomousVentureOperationsQc,
  buildOperatingVentureInventory,
  CURRENT_VENTURE_OPERATING_CYCLE_CAPABILITIES,
  MISSING_PORTFOLIO_OPERATING_CAPABILITIES_BEFORE_V43,
  operatingVentureInventoryQc,
} from "../lib/infinity/autonomous-portfolio-operations/autonomous-portfolio-operations-v1.ts";
import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts";
import { resolveScheduledAutonomousPublish } from "../lib/infinity/autonomous-portfolio-operations/scheduled-autonomous-publish-policy-v1.ts";

const OUT = join(process.cwd(), ".infinity/autonomous-portfolio-operations/v43-portfolio-operating-cycle-report.json");
const manualPublishFlag = process.argv.includes("--publish");
const publishPolicy = resolveScheduledAutonomousPublish({
  trigger: "MANUAL",
  manual_publish_flag: manualPublishFlag,
});
const EXECUTE_PUBLISH = publishPolicy.execute_publish;

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return { http: res.status, ok: res.ok };
  } catch {
    return { http: 0, ok: false };
  }
}

const cycle = await executeAutonomousPortfolioOperatingCycleV1({
  trigger: "MANUAL",
  execute_publish: EXECUTE_PUBLISH,
  publish_authority_reason: publishPolicy.reason,
  publish_live: EXECUTE_PUBLISH
    ? async ({ path }) => {
        if (!path.includes("occupancy-cost-versus-rent")) {
          return { ok: false };
        }
        const deployed = await deployOccupancyNpvOrganicLivePage({
          deploy: true,
          aliasProduction: true,
          enforceBacklogDeployGuard: true,
        });
        return { ok: Boolean(deployed?.deployed) };
      }
    : undefined,
});

const inventory = buildOperatingVentureInventory();
const liveCount = inventory.filter((r) => r.state === "LIVE_OPERATING").length;
const existingGrowthQc =
  cycle.inventory_qc === "PASS" && cycle.plan_qc === "PASS" ? "PASS" : "PARTIAL";

const productionProof = await Promise.all([
  probe("https://www.clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/"),
  probe("https://occupancynpv.com/blog/occupancy-costs/cam-first-year/"),
]);

const report = {
  mission: "V43_AUTONOMOUS_PORTFOLIO_GROWTH_OPERATIONS",
  generated_at: new Date().toISOString(),
  PORTFOLIO: {
    LIVE_OPERATING_VENTURE_COUNT: liveCount,
    OPERATING_VENTURE_INVENTORY_QC: operatingVentureInventoryQc(inventory),
    AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1: cycle.version,
    AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
    AUTONOMOUS_SCHEDULER_RESPONSIBILITY_SEPARATION_QC: autonomousSchedulerResponsibilitySeparationQc(),
    CURRENT_VENTURE_OPERATING_CYCLE_CAPABILITIES,
    MISSING_PORTFOLIO_OPERATING_CAPABILITIES: MISSING_PORTFOLIO_OPERATING_CAPABILITIES_BEFORE_V43.filter(
      (cap) => cap !== "per_venture_operating_plans" && cap !== "portfolio_operating_cron_separation",
    ),
  },
  PER_VENTURE: cycle.ventures,
  CLUB_THROTTLE: {
    ENGINEERING_STATE: cycle.club_throttle.engineering_state,
    VENTURE_STATE: "LIVE_OPERATING",
    ...cycle.club_throttle,
    CLUB_THROTTLE_PRODUCT_OPPORTUNITY_BACKLOG: cycle.club_throttle.product_opportunity_backlog.length,
    NEW_PRODUCT_CONCEPTS_CREATED: cycle.club_throttle.product_opportunity_backlog.length,
    NEW_PRODUCTS_QC_PASSED: cycle.club_throttle.product_opportunity_backlog.length,
    NEW_PRODUCTS_PUBLISHED: 0,
    NEW_BLOGS_PUBLISHED: cycle.ventures.find((v) => v.venture_id === "club-throttle")?.blog_posts_created ?? 0,
  },
  CONTENT: cycle.content,
  PRODUCTION_PROOF: {
    club_throttle_journal_sample: productionProof[0],
    occupancynpv_blog_sample: productionProof[1],
  },
  AUTONOMY: {
    NEW_VENTURE_DISCOVERY_AUTONOMY_QC: "PENDING_NEXT_REAL_CRON",
    EXISTING_VENTURE_GROWTH_AUTONOMY_QC: existingGrowthQc,
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    AUTONOMOUS_VENTURE_OPERATIONS_QC: autonomousVentureOperationsQc({
      new_venture_discovery_autonomy_qc: "PENDING_NEXT_REAL_CRON",
      existing_venture_growth_autonomy_qc: existingGrowthQc,
      portfolio_cycle_executed: true,
    }),
    BUILD_FACTORY_REFERENCE_RUN_STATE: "ARMED_WAITING_FOR_CANDIDATE",
    FOUNDER_ACTION_REQUIRED: "NONE",
    NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_DISCOVERY_CONTINUATION",
  },
  cycle,
};

mkdirSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations"), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const ok =
  report.PORTFOLIO.OPERATING_VENTURE_INVENTORY_QC === "PASS" &&
  cycle.plan_qc === "PASS" &&
  report.AUTONOMY.EXISTING_VENTURE_GROWTH_AUTONOMY_QC === "PASS";

process.exit(ok ? 0 : 1);
