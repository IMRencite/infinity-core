#!/usr/bin/env node
/**
 * V43.2 — Local production execution: deploy credentials audit, optional OccupancyNPV publish, cron reconcile.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditPortfolioDeployCredentials } from "../lib/infinity/autonomous-portfolio-operations/portfolio-deploy-credentials-v1.ts";
import { reconcilePortfolioOperatingCronProof } from "../lib/infinity/autonomous-portfolio-operations/portfolio-operating-cron-reconciliation-v1.ts";
import { reconcileOccupancyNpvBacklog } from "../lib/infinity/autonomous-portfolio-operations/occupancynpv-backlog-reconciliation-v1.ts";
import { resolveScheduledAutonomousPublish } from "../lib/infinity/autonomous-portfolio-operations/scheduled-autonomous-publish-policy-v1.ts";
import { executeAutonomousPortfolioOperatingCycleV1 } from "../lib/infinity/autonomous-portfolio-operations/execute-autonomous-portfolio-operating-cycle-v1.ts";
import { portfolioOperatingPublishOccupancyNpvPath } from "../lib/infinity/autonomous-portfolio-operations/portfolio-operating-live-publish-v1.ts";

const envPath = join(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i);
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const publishFlag = process.argv.includes("--publish");
const creativeFlag = process.argv.includes("--creative");
const policy = resolveScheduledAutonomousPublish({ trigger: "MANUAL", manual_publish_flag: publishFlag });
const credential = await auditPortfolioDeployCredentials();
const backlog = reconcileOccupancyNpvBacklog();
const cron = reconcilePortfolioOperatingCronProof();

const cycle = await executeAutonomousPortfolioOperatingCycleV1({
  trigger: "MANUAL",
  execute_publish: policy.execute_publish,
  publish_authority_reason: policy.reason,
  execute_live_creative: creativeFlag,
  publish_live: policy.execute_publish
    ? async ({ path }) => portfolioOperatingPublishOccupancyNpvPath({ path })
    : undefined,
});

const report = {
  mission: "V43_2_PRODUCTION_PORTFOLIO_EXECUTION",
  generated_at: new Date().toISOString(),
  PRODUCTION_VENTURE_PUBLISH_ROOT_CAUSE: credential.PORTFOLIO_DEPLOY_CREDENTIAL_SUFFICIENT
    ? "NONE_BLOCKING"
    : "VERCEL_TOKEN_OR_TEAM_ID_NOT_AVAILABLE_ON_INFINITY_RUNTIME",
  ...credential,
  portfolio_cron: cron,
  occupancynpv_backlog: {
    OCCUPANCYNPV_QC_PASS_BACKLOG_COUNT: backlog.OCCUPANCYNPV_QC_PASS_BACKLOG_COUNT,
    OCCUPANCYNPV_PUBLISH_ELIGIBLE_COUNT: backlog.OCCUPANCYNPV_PUBLISH_ELIGIBLE_COUNT,
    OCCUPANCYNPV_PUBLISH_BLOCKED_COUNT: backlog.OCCUPANCYNPV_PUBLISH_BLOCKED_COUNT,
    failed: backlog.failed_assets.slice(0, 3),
  },
  cycle_summary: {
    content: cycle.content,
    occupancynpv: cycle.occupancynpv,
    club_throttle_product_pipeline: cycle.club_throttle_product_pipeline,
  },
};

mkdirSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations"), { recursive: true });
writeFileSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations/v43.2-production-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
