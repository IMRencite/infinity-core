import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOrganicGrowthSchedulerTick } from "@/lib/infinity/organic-growth-engine/obligation/scheduler";
import { deriveEffectiveOrganicExecutionState } from "@/lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state";
import { getLastOrganicEffectiveExecutionState, hydrateOrganicGrowthSchedulerState, persistOrganicGrowthSchedulerState, recordOrganicTickFailure } from "@/lib/infinity/organic-growth-engine/obligation/persist";
import { assembleOrganicTickReport, safePersistFailure } from "@/lib/infinity/organic-growth-engine/obligation/tick-result";
import { productionCrossSystemIsolationEvidence } from "@/lib/infinity/organic-growth-engine/obligation/gates";
import { advanceVentureBlogOperatingSystem } from "@/lib/infinity/organic-growth-engine/blog-os";
import { projectVentureBlogLiveWork } from "@/lib/infinity/organic-growth-engine/blog-os/live-work";
import { DurableBlogStore } from "@/lib/infinity/organic-growth-engine/blog-os/durable/store";
import { backfillKnownDay, createDailyBlogObligation } from "@/lib/infinity/organic-growth-engine/blog-os/durable/creator";
import { hydrateDurableBlogOs, persistDurableBlogOs } from "@/lib/infinity/organic-growth-engine/blog-os/durable/persist";
import { executeOrganicScheduledWorkflow } from "@/lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution";
import { fetchPublicCamPage, publishOrganicScheduledLivePage } from "@/lib/infinity/organic-growth-engine/blog-os/durable/scheduled-live-publisher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cron = request.headers.get("x-vercel-cron") === "1" || /vercel-cron/i.test(request.headers.get("user-agent") ?? "");
  const isolation = productionCrossSystemIsolationEvidence();
  const prior = await hydrateOrganicGrowthSchedulerState().catch(() => null);
  const effective = prior
    ? getLastOrganicEffectiveExecutionState()
    : deriveEffectiveOrganicExecutionState({ canonical: null, canonical_readable: false });
  const durableLastTick = prior?.last_tick_at ?? null;
  const result = executeOrganicGrowthSchedulerTick({
    trigger_source: cron ? "VERCEL_CRON" : "HTTP",
    cursor_triggered: !cron,
    founder_triggered: false,
    execute_publish: cron && isolation.result === "PASS",
    effective: effective ?? undefined,
  });
  const blog = advanceVentureBlogOperatingSystem({
    venture_id: "occupancynpv",
    public_name: "OccupancyNPV",
    now: new Date().toISOString(),
  });
  const blogWork = projectVentureBlogLiveWork("occupancynpv");
  const durable = new DurableBlogStore();
  const hold = await hydrateDurableBlogOs(durable).catch(() => null);
  let persistDurableError = null;
  let workflow = null;
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
    if (cron && result.execute_publish && effective?.result === "AUTHORIZED") {
      workflow = await executeOrganicScheduledWorkflow({
        store: durable,
        hold,
        effective,
        now: new Date().toISOString(),
        owner: `vercel-cron:${process.env.VERCEL_DEPLOYMENT_ID ?? "organic"}`,
        execute_publish: true,
        adapters: {
          readCanonical: async () => {
            await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
            return getLastOrganicEffectiveExecutionState() ?? effective;
          },
          publishLive: publishOrganicScheduledLivePage,
          fetchPublic: fetchPublicCamPage,
        },
      }).catch(() => null);
    }
    try {
      await persistDurableBlogOs(durable, hold);
    } catch (error) {
      persistDurableError = safePersistFailure(error, "persist_durable");
    }
  }
  let persistSchedulerError = null;
  try {
    await persistOrganicGrowthSchedulerState(result.state);
  } catch (error) {
    persistSchedulerError = safePersistFailure(error, "persist_scheduler");
  }
  const report = assembleOrganicTickReport({
    persistSchedulerError,
    persistDurableError,
    durableLastTick,
    inMemoryLastTick: result.state.last_tick_at,
    publishingHold: effective?.result === "AUTHORIZED" ? null : (effective?.scheduler_projection ?? result.state.publishing_hold),
  });
  if (report.business_execution === "FAIL" && report.failure) {
    await recordOrganicTickFailure({
      failure: report.failure,
      requestId: request.headers.get("x-vercel-id"),
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    }).catch(() => undefined);
  }
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "*/15 * * * *",
    system: "OrganicGrowth",
    business_execution: report.business_execution,
    last_tick_advanced: report.last_tick_advanced,
    error_surfaced: report.error_surfaced,
    persist_failure: report.failure,
    lease_namespace: result.state.lease_namespace,
    health_scope: result.state.scope,
    CrossSystemRuntimeIsolationGate: isolation,
    execute_publish: result.execute_publish,
    effective_execution: effective,
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
      last_tick_at: report.last_tick_at,
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
          failure_reason: row.failure_reason,
          live_url: row.live_url,
        })),
      }
      : null,
    workflow: workflow
      ? {
        stage: workflow.stage,
        claimed: workflow.claimed,
        public_mutation: workflow.public_mutation,
        public_url: workflow.public_url,
        live_verified: workflow.live_verified,
        authorization: workflow.authorization,
        reasons: workflow.reasons,
        obligation_id: workflow.obligation?.id ?? null,
        pipeline_state: workflow.obligation?.pipeline_state ?? null,
      }
      : null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
