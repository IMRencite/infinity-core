import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeAutonomousPortfolioOperatingCycleV1 } from "@/lib/infinity/autonomous-portfolio-operations/execute-autonomous-portfolio-operating-cycle-v1";
import {
  AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
  autonomousSchedulerResponsibilitySeparationQc,
  autonomousVentureOperationsQc,
  PORTFOLIO_OPERATING_CRON_SCHEDULE,
} from "@/lib/infinity/autonomous-portfolio-operations/autonomous-portfolio-operations-v1";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { resolveScheduledAutonomousPublish } from "@/lib/infinity/autonomous-portfolio-operations/scheduled-autonomous-publish-policy-v1";
import { portfolioOperatingPublishOccupancyNpvPath } from "@/lib/infinity/autonomous-portfolio-operations/portfolio-operating-live-publish-v1";
import {
  founderDailyReportPortfolioOperationsQc,
  portfolioOperatingFounderDailyItems,
  type PortfolioOperatingReportSnapshot,
} from "@/lib/infinity/founder-daily-reports/portfolio-operations-v1";
import {
  PORTFOLIO_OPERATING_CRON_PROOF_PATH,
  reconcilePortfolioOperatingCronProof,
  type PortfolioCronProofRecord,
} from "@/lib/infinity/autonomous-portfolio-operations/portfolio-operating-cron-reconciliation-v1";

export const maxDuration = 300;

function resolveTrigger(request: Request): "SCHEDULED" | "MANUAL" {
  return request.headers.get("x-vercel-cron") === "1" ? "SCHEDULED" : "MANUAL";
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const trigger = resolveTrigger(request);
  const url = new URL(request.url);
  const manualPublishFlag = url.searchParams.get("publish") === "1";
  const publishPolicy = resolveScheduledAutonomousPublish({
    trigger,
    manual_publish_flag: manualPublishFlag,
  });

  try {
    const cycle = await executeAutonomousPortfolioOperatingCycleV1({
      trigger,
      execute_publish: publishPolicy.execute_publish,
      publish_authority_reason: publishPolicy.reason,
      execute_live_creative: (process.env.INFINITY_PORTFOLIO_LIVE_CREATIVE ?? "").trim() === "1",
      publish_live: publishPolicy.execute_publish
        ? async ({ path }) => portfolioOperatingPublishOccupancyNpvPath({ path })
        : undefined,
    });

    if (trigger === "SCHEDULED") {
      const cronProof: PortfolioCronProofRecord = {
        trigger: "SCHEDULED",
        provenance: "x-vercel-cron",
        completed_at: new Date().toISOString(),
        route: "/api/runtime/portfolio-operating-tick",
        cycle_version: cycle.version,
        assets_published: cycle.ventures.reduce((s, v) => s + v.assets_published, 0),
      };
      writeLocalJsonIfDurable(PORTFOLIO_OPERATING_CRON_PROOF_PATH, cronProof);
    }

    const cronReconcile = reconcilePortfolioOperatingCronProof();
    const architecturePass =
      cycle.inventory_qc === "PASS" &&
      cycle.plan_qc === "PASS" &&
      cycle.content_self_healing_qc === "PASS" &&
      cycle.publish.SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC === "PASS" &&
      cycle.publish.AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC === "PASS";

    const existingVentureGrowthQc = architecturePass
      ? cronReconcile.PORTFOLIO_OPERATING_SCHEDULER_QC === "PASS"
        ? "PASS_PRODUCTION"
        : "PASS_PRODUCTION_ARCHITECTURE_AWAITING_REAL_CRON_PROOF"
      : "PARTIAL";
    const autonomyQc = autonomousVentureOperationsQc({
      new_venture_discovery_autonomy_qc: "PENDING_NEXT_REAL_CRON",
      existing_venture_growth_autonomy_qc: existingVentureGrowthQc,
      portfolio_cycle_executed: true,
    });

    const portfolioSnapshot: PortfolioOperatingReportSnapshot = {
      ventures_operated: cycle.ventures.length,
      assets_considered: cycle.ventures.reduce((s, v) => s + v.assets_researched, 0),
      assets_published: cycle.ventures.reduce((s, v) => s + v.assets_published, 0),
      quality_holds: cycle.ventures.reduce((s, v) => s + v.assets_held, 0),
      self_heal_attempts: cycle.self_heal.SELF_HEAL_ATTEMPTS,
      self_heal_recoveries: cycle.self_heal.SELF_HEAL_RECOVERIES,
      product_concepts: cycle.club_throttle.product_opportunity_backlog.length,
      products_advanced_beyond_concept: cycle.club_throttle.PRODUCTS_ADVANCED_BEYOND_CONCEPT,
      blockers: cycle.self_heal.SELF_HEAL_EXHAUSTED ? ["CONTENT_SELF_HEAL_EXHAUSTED"] : [],
    };

    const payload = {
      trigger,
      cadence: PORTFOLIO_OPERATING_CRON_SCHEDULE,
      PORTFOLIO_OPERATING_SCHEDULER_QC: cronReconcile.PORTFOLIO_OPERATING_SCHEDULER_QC,
      portfolio_cron_reconciliation: cronReconcile,
      AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
      AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1: cycle.version,
      OPERATING_VENTURE_INVENTORY_QC: cycle.inventory_qc,
      VENTURE_OPERATING_PLAN_QC: cycle.plan_qc,
      AUTONOMOUS_CONTENT_SELF_HEALING_QC: cycle.content_self_healing_qc,
      HIGH_VALUE_PAGE_OPPORTUNITY_QC: cycle.high_value_page_qc,
      AUTONOMOUS_INTERNAL_LINKING_QC: cycle.internal_linking_qc,
      AUTONOMOUS_SCHEDULER_RESPONSIBILITY_SEPARATION_QC: autonomousSchedulerResponsibilitySeparationQc(),
      AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC: cycle.publish.AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC,
      SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC: cycle.publish.SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC,
      AUTONOMOUS_PRODUCTION_PUBLISH_CAPABILITY_QC:
        cycle.publish.SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC === "PASS" ? "PASS" : "FAIL",
      AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: cycle.occupancynpv.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC,
      AUTONOMOUS_PRODUCTION_PUBLICATION_EXECUTION_QC: cycle.occupancynpv.AUTONOMOUS_PRODUCTION_PUBLICATION_EXECUTION_QC,
      FOUNDER_DAILY_REPORT_PORTFOLIO_OPERATIONS_QC: founderDailyReportPortfolioOperationsQc(portfolioSnapshot),
      founder_daily_portfolio_items: portfolioOperatingFounderDailyItems(portfolioSnapshot),
      publish_policy: publishPolicy,
      EXISTING_VENTURE_GROWTH_AUTONOMY_QC: existingVentureGrowthQc,
      NEW_VENTURE_DISCOVERY_AUTONOMY_QC: "PENDING_NEXT_REAL_CRON",
      AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
      AUTONOMOUS_VENTURE_OPERATIONS_QC: autonomyQc,
      cycle,
    };

    writeLocalJsonIfDurable(".infinity/autonomous-portfolio-operations/last-portfolio-operating-tick.json", payload);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "PORTFOLIO_OPERATING_TICK_FAILED", root_cause: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
