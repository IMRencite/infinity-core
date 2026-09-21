import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOrganicGrowthSchedulerTick } from "@/lib/infinity/organic-growth-engine/obligation/scheduler";
import { hydrateOrganicGrowthSchedulerState, persistOrganicGrowthSchedulerState } from "@/lib/infinity/organic-growth-engine/obligation/persist";
import { productionCrossSystemIsolationEvidence } from "@/lib/infinity/organic-growth-engine/obligation/gates";
import { advanceVentureBlogOperatingSystem } from "@/lib/infinity/organic-growth-engine/blog-os";
import { projectVentureBlogLiveWork } from "@/lib/infinity/organic-growth-engine/blog-os/live-work";
import { DurableBlogStore } from "@/lib/infinity/organic-growth-engine/blog-os/durable/store";
import { backfillKnownDay, createDailyBlogObligation } from "@/lib/infinity/organic-growth-engine/blog-os/durable/creator";
import { hydrateDurableBlogOs, persistDurableBlogOs } from "@/lib/infinity/organic-growth-engine/blog-os/durable/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cron = request.headers.get("x-vercel-cron") === "1" || /vercel-cron/i.test(request.headers.get("user-agent") ?? "");
  const isolation = productionCrossSystemIsolationEvidence();
  await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
  const result = executeOrganicGrowthSchedulerTick({
    trigger_source: cron ? "VERCEL_CRON" : "HTTP",
    cursor_triggered: !cron,
    founder_triggered: false,
    execute_publish: cron && isolation.result === "PASS",
  });
  // Discovery continues. New pages do not publish while publishing_hold is set.
  const blog = advanceVentureBlogOperatingSystem({
    venture_id: "occupancynpv",
    public_name: "OccupancyNPV",
    now: new Date().toISOString(),
  });
  const blogWork = projectVentureBlogLiveWork("occupancynpv");
  const durable = new DurableBlogStore();
  const hold = await hydrateDurableBlogOs(durable).catch(() => null);
  if (hold) {
    const now = new Date().toISOString();
    if (!durable.get("occupancynpv", "2026-09-18")) {
      backfillKnownDay({
        store: durable,
        operating_date: "2026-09-18",
        now,
        candidate_id: "unassigned",
        expected_url: "",
        created_at: "2026-09-18T07:00:00.000Z",
      });
    }
    if (!durable.get("occupancynpv", "2026-09-19")) {
      backfillKnownDay({
        store: durable,
        operating_date: "2026-09-19",
        now,
        candidate_id: "unassigned",
        expected_url: "",
        created_at: "2026-09-19T07:00:00.000Z",
      });
    }
    if (!durable.get("occupancynpv", "2026-09-20")) {
      backfillKnownDay({
        store: durable,
        operating_date: "2026-09-20",
        now,
        candidate_id: "cand:cam-operating-year",
        expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
        created_at: "2026-09-20T07:00:00.000Z",
      });
    }
    createDailyBlogObligation({
      store: durable,
      venture_id: "occupancynpv",
      now: new Date().toISOString(),
      hold_id: hold.hold_id,
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      actor: cron ? "VERCEL_CRON" : "HTTP",
    });
    await persistDurableBlogOs(durable, hold).catch(() => undefined);
  }
  await persistOrganicGrowthSchedulerState(result.state).catch(() => undefined);
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "0 7 * * *",
    system: "OrganicGrowth",
    lease_namespace: result.state.lease_namespace,
    health_scope: result.state.scope,
    CrossSystemRuntimeIsolationGate: isolation,
    execute_publish: result.execute_publish,
    opportunity: result.opportunity.opportunity_id,
    decision: result.opportunity.decision,
    obligation: result.obligation
      ? {
        obligation_id: result.obligation.obligation_id,
        state: result.obligation.state,
        owner: result.obligation.owner,
        next_action_at: result.obligation.next_action_at,
        route: result.obligation.route,
      }
      : null,
    scheduler: {
      last_tick_at: result.state.last_tick_at,
      next_run_at: result.state.next_run_at,
      published_today: result.state.published_today,
      business_loop: result.state.business_loop,
      manual_trigger: result.state.manual_trigger,
      cursor_triggered: result.state.cursor_triggered,
      founder_triggered: result.state.founder_triggered,
    },
    blog: {
      obligation_id: blog.obligation?.obligation_id ?? null,
      state: blog.obligation?.state ?? null,
      topic: blog.obligation?.topic ?? null,
      hq_current_work: blogWork.hq_current_work,
      public_occupancy: blogWork.public_occupancy,
      public_activity: blogWork.public_activity,
      latest_article: blogWork.latest_article,
      latest_article_url: blogWork.latest_article_url,
    },
    durable: hold
      ? {
        hold_id: hold.hold_id,
        resolved: Boolean(hold.resolved_at),
        obligations: durable.list().map((row) => ({
          operating_date: row.operating_date,
          pipeline_state: row.pipeline_state,
          candidate_id: row.candidate_id,
          hold_id: row.hold_id,
        })),
      }
      : null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
