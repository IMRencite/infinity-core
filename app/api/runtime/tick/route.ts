import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOccupancynpvGrowthRuntimeCycleDurable } from "@/lib/infinity/growth-engine/runtime-cycle";
import { createProductionCloudRuntimeStore, executeCloudRuntimeWake } from "@/lib/infinity/cloud-runtime";

export const maxDuration = 60;

async function observeGrowthCycleSafely(): Promise<{
  cycleId: string;
  experimentStatus: string;
  nextRunAt: string | Date | null;
  sent: number;
  outbound?: {
    mode: string;
    kill_switch: boolean;
    authorized: number;
    blocked: number;
    sent: number;
    delivered: number;
    bounced: number;
    replies: number;
    last_reason: string | null;
    last_outbox_status: string | null;
    provider_message_present: boolean;
    event_kinds: string[];
    duplicates_prevented: number;
    kill_switch_events: number;
    opt_outs: number;
    last_failure_category: string | null;
    provider_healthy: boolean;
    token_exchange: boolean;
    send_scope: boolean;
    readonly_scope: boolean;
    userinfo_scope: boolean;
    credential_fingerprint: string | null;
  };
  inbound?: {
    inbound_connection: "PASS" | "FAIL";
    detector_enabled: boolean;
    detector_mode: string;
    last_successful_check: string | null;
    last_error: string | null;
    reply_found: boolean;
    provider_message_id: string | null;
    thread_id: string | null;
    received_at: string | null;
    ingested: boolean;
    classification: string | null;
    next_action: string | null;
    eligible: boolean;
    pacing_state: string;
    send_attempted: boolean;
    send_accepted: boolean;
    same_thread: boolean | null;
    pipeline_state: string;
    opt_out?: boolean;
    suppression_persisted?: boolean;
    duplicate?: boolean;
  } | null;
  observe_error?: string;
}> {
  try {
    const cycle = await executeOccupancynpvGrowthRuntimeCycleDurable({
      persist: process.env.VERCEL === "1" || process.env.INFINITY_CLOUD_RUNTIME === "1" ? false : true,
    });
    const outbound = cycle.outbound;
    return {
      ...cycle,
      sent: cycle.sent,
      outbound: outbound
        ? {
          mode: outbound.state.control.mode,
          kill_switch: outbound.state.control.kill_switch,
          authorized: outbound.state.metrics.authorized,
          blocked: outbound.state.metrics.blocked,
          sent: outbound.state.metrics.sent,
          delivered: outbound.state.metrics.delivered,
          bounced: outbound.state.metrics.bounced,
          replies: outbound.state.metrics.replies,
          last_reason: outbound.decisions.at(-1)?.reasons[0] ?? null,
          last_outbox_status: outbound.state.outbox.at(-1)?.status ?? null,
          provider_message_present: Boolean(outbound.state.outbox.at(-1)?.provider_message_id),
          event_kinds: outbound.state.events.map((event) => event.kind),
          duplicates_prevented: outbound.state.metrics.duplicates_prevented,
          kill_switch_events: outbound.state.metrics.kill_switch_events,
          opt_outs: outbound.state.metrics.opt_outs,
          last_failure_category: outbound.state.metrics.last_failure_category ?? null,
          provider_healthy: Boolean(cycle.provider?.healthy),
          token_exchange: Boolean(cycle.provider?.token_exchange),
          send_scope: Boolean(cycle.provider?.send_scope),
          readonly_scope: Boolean(cycle.provider?.readonly_scope),
          userinfo_scope: Boolean(cycle.provider?.userinfo_scope),
          credential_fingerprint: cycle.provider?.credential_fingerprint ?? null,
        }
        : undefined,
      inbound: cycle.inbound
        ? {
          inbound_connection: cycle.inbound.inbound_connection,
          detector_enabled: cycle.inbound.detector_enabled,
          detector_mode: cycle.inbound.detector_mode,
          last_successful_check: cycle.inbound.last_successful_check,
          last_error: cycle.inbound.last_error,
          reply_found: cycle.inbound.reply_found,
          provider_message_id: cycle.inbound.provider_message_id,
          thread_id: cycle.inbound.thread_id,
          received_at: cycle.inbound.received_at,
          ingested: cycle.inbound.ingested,
          classification: cycle.inbound.classification,
          next_action: cycle.inbound.next_action,
          eligible: cycle.inbound.eligible,
          pacing_state: cycle.inbound.pacing_state,
          send_attempted: cycle.inbound.send_attempted,
          send_accepted: cycle.inbound.send_accepted,
          same_thread: cycle.inbound.same_thread,
          pipeline_state: cycle.inbound.pipeline_state,
          opt_out: cycle.inbound.opt_out,
          suppression_persisted: cycle.inbound.suppression_persisted,
          duplicate: cycle.inbound.duplicate,
        }
        : null,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "CYCLE_FAILED";
    const safe = raw.replace(/ya29\.|GOCSPX-|1\/\/[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]").slice(0, 180);
    return {
      cycleId: "cloud-tick-observe",
      experimentStatus: "OBSERVE_ONLY",
      nextRunAt: null,
      sent: 0,
      observe_error: safe,
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cycle = await observeGrowthCycleSafely();
  const cloud = await executeCloudRuntimeWake({
    source: "CRON_HOURLY",
    store: createProductionCloudRuntimeStore(),
    createMission: false,
  });
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "0 * * * *",
    cycleId: cycle.cycleId,
    outcome: cycle.experimentStatus,
    nextRunAt: cloud.state.heartbeat.next_review_at ?? cycle.nextRunAt,
    sent: cycle.sent ?? 0,
    outbound: cycle.outbound ?? null,
    inbound: "inbound" in cycle ? cycle.inbound ?? null : null,
    deferred: cloud.deferred,
    duplicate: cloud.duplicate,
    autonomousLoop: {
      state: cloud.state.loop.portfolio_state,
      decision: cloud.decision,
      reason: cloud.state.heartbeat.last_meaningful_action,
      missionCreated: cloud.mission_created,
    },
    cloudRuntime: cloud.hq,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
