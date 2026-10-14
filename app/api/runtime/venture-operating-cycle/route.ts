import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executePostLaunchOperatingCycle } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { createProductionCloudRuntimeStore, executeCloudRuntimeWake } from "@/lib/infinity/cloud-runtime";
import { projectVentureDiscoveryBusinessExecution } from "@/lib/infinity/venture-operating-scale/venture-discovery-business-execution-projection";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { appendScheduledExecutionLedger } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-runtime-scheduled-execution-ledger-v1";
import { resolvePortfolioCronProvenance } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-provenance-v1";
import { executeAutonomousPortfolioOperatingCycleV1 } from "@/lib/infinity/autonomous-portfolio-operations/execute-autonomous-portfolio-operating-cycle-v1";

export const maxDuration = 60;

const DISCOVERY_CRON_UTC = "0 12 * * *" as const;

function resolveDiscoveryTrigger(request: Request): "SCHEDULED" | "MANUAL" {
  const provenance = resolvePortfolioCronProvenance(request);
  return provenance.trigger_type === "REAL_CRON" ? "SCHEDULED" : "MANUAL";
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const startedAt = new Date().toISOString();
  const trigger = resolveDiscoveryTrigger(request);
  try {
    const postLaunch = executePostLaunchOperatingCycle({ persist: false });
    const portfolioGrowth = await executeAutonomousPortfolioOperatingCycleV1({ execute_publish: false });
    const cloud = await executeCloudRuntimeWake({
      source: "CRON_DAILY",
      store: createProductionCloudRuntimeStore(),
      createMission: false,
    });
    const cycleId = postLaunch.runtime.last_cycle_id ?? postLaunch.cycleId;
    const discovery = projectVentureDiscoveryBusinessExecution({
      cycle_id: cycleId,
      trigger: trigger === "SCHEDULED" ? "scheduled" : "manual",
      post_launch_outcome: postLaunch.daily.snapshot.dailyResult,
      cloud_decision: cloud.decision,
    });
    const completedAt = new Date().toISOString();
    const scheduledExecutionRecord = {
      trigger,
      scheduled_for: DISCOVERY_CRON_UTC,
      started_at: startedAt,
      completed_at: completedAt,
      route_status: 200,
      business_execution_status: discovery.success ? "PASS" : "FAIL",
      cycle_id: cycleId,
      opportunities_evaluated: discovery.opportunities_evaluated ?? null,
      candidates_advanced: discovery.candidates_advanced ?? null,
      persist_status: "EPHEMERAL_NO_LOCAL_FS",
      next_scheduled_execution: DISCOVERY_CRON_UTC,
    };
    writeLocalJsonIfDurable(
      ".infinity/growth-engine/venture-discovery-scheduled-execution-last.json",
      scheduledExecutionRecord,
    );
    await appendScheduledExecutionLedger({
      route: "/api/runtime/venture-operating-cycle",
      schedule_identity: DISCOVERY_CRON_UTC,
      platform_provenance: resolvePortfolioCronProvenance(request).platform_provenance,
      trigger_type: trigger === "SCHEDULED" ? "REAL_CRON" : "MANUAL",
      cycle_id: cycleId,
      accepted_status: "ACCEPTED",
      completed_status: discovery.success ? "COMPLETED" : "FAILED",
      completion_timestamp: completedAt,
      payload: scheduledExecutionRecord,
    });

    return NextResponse.json({
      host: trigger === "SCHEDULED" ? "vercel-cron" : "manual-auth",
      cadence: DISCOVERY_CRON_UTC,
      cycleId,
      outcome: cloud.decision,
      nextRunAt: cloud.state.heartbeat.next_review_at ?? postLaunch.runtime.next_run_at,
      improvementMissionCreated: false,
      postLaunchOutcome: postLaunch.daily.snapshot.dailyResult,
      venture_discovery_business_execution: discovery,
      venture_discovery_scheduled_execution: scheduledExecutionRecord,
      VENTURE_DISCOVERY_SCHEDULED_EXECUTION_QC: trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
      VENTURE_DISCOVERY_ROUTE_QC: "PASS",
      autonomousLoop: {
        state: cloud.state.loop.portfolio_state,
        decision: cloud.decision,
        reason: cloud.state.heartbeat.last_meaningful_action,
        dailyReview: Boolean(cloud.state.loop.last_daily_review_at),
        missionCreated: cloud.mission_created,
      },
      cloudRuntime: cloud.hq,
      portfolio_operating_cycle: {
        AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1: portfolioGrowth.version,
        OPERATING_VENTURE_INVENTORY_QC: portfolioGrowth.inventory_qc,
        EXISTING_VENTURE_GROWTH_AUTONOMY_QC:
          portfolioGrowth.inventory_qc === "PASS" && portfolioGrowth.plan_qc === "PASS" ? "PASS" : "PARTIAL",
        ventures: portfolioGrowth.ventures.map((v) => ({
          venture_id: v.venture_id,
          assets_published: v.assets_published,
          next_best_growth_action: v.next_best_growth_action,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "VENTURE_OPERATING_CYCLE_FAILED",
        VENTURE_DISCOVERY_ROUTE_QC: "FAIL",
        root_cause: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
