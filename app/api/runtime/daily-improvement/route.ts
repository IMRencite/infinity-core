import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { classifyCommunicationTickSource } from "@/lib/infinity/production-outbound/communication-runtime";
import { reportDateInTimezone } from "@/lib/infinity/founder-daily-reports/generator";
import { persistDailyImprovementCycle, runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import { getCommunicationSchedulerState, hydrateCommunicationSchedulerState } from "@/lib/infinity/production-outbound/communication-runtime";

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const trigger = classifyCommunicationTickSource(request);
  if (trigger !== "VERCEL_CRON") {
    return NextResponse.json({ error: "Cron only", trigger }, { status: 403 });
  }
  await hydrateCommunicationSchedulerState().catch(() => undefined);
  const scheduler = getCommunicationSchedulerState();
  const now = new Date().toISOString();
  const cycle = runDailyImprovementCycle({
    now,
    date: reportDateInTimezone(now),
    trigger: "VERCEL_CRON",
    constraints: {
      outbound_mode: "CANARY",
      organic_execute_publish: false,
      backlink_mode: "DISCOVERY_ONLY",
      mercury_status: "DEGRADED",
      affiliate_engine_active: false,
      communication_last_error: scheduler.last_error,
      sales_stage: "ACTIVE_CONVERSATION",
    },
  });
  persistDailyImprovementCycle(cycle);
  return NextResponse.json({
    host: "vercel-cron",
    engine: "DailyImprovementEngine",
    date: cycle.report.date,
    systems_reviewed: cycle.report.systems_reviewed.length,
    material_gaps: cycle.report.material_gaps,
    critical_gaps: cycle.report.critical_gaps,
    founder_approval_required: cycle.approvals.length,
    execute_publish: false,
    outbound_mode: "CANARY",
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
