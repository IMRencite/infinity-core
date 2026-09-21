import { executeAutonomousDailyOperatingLoop } from "@/lib/infinity/autonomous-operating-loop/loop";
import { nextDailyReviewAt } from "@/lib/infinity/autonomous-operating-loop/persist";
import { CLOUD_RUNTIME_VERSION, MAX_EVENTS_PER_WAKE, MAX_RUNTIME_RETRIES } from "./contract";
import { resolveCloudRuntimeCatchup } from "./catchup";
import { projectCloudRuntimeHq } from "./hq";
import { acquireCloudRuntimeLease, releaseCloudRuntimeLease } from "./lease";
import { observeCloudRuntimePortfolio } from "./observe";
import { sanitizeRuntimeError } from "./sanitize";
import type { CloudRuntimeStateStore } from "./store";
import { getCloudRuntimeStore } from "./store";
import type { CloudRuntimeEvent, CloudRuntimeIterationResult, CloudRuntimePersistedState } from "./types";
import type { CloudRuntimeWakeSource } from "./contract";

function artifactIdentity() {
  return {
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_DEPLOYMENT_ID ?? null,
    git_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.INFINITY_RUNTIME_GIT_SHA ?? null,
  };
}

function freshness(last: string | null, now: string): "FRESH" | "STALE" | "UNKNOWN" {
  if (!last) return "UNKNOWN";
  return Date.parse(now) - Date.parse(last) <= 2 * 60 * 60 * 1000 ? "FRESH" : "STALE";
}

export async function executeCloudRuntimeWake(input: {
  source: CloudRuntimeWakeSource;
  now?: string;
  holder?: string;
  store?: CloudRuntimeStateStore;
  event?: CloudRuntimeEvent;
  createMission?: boolean;
}): Promise<CloudRuntimeIterationResult> {
  const now = input.now ?? new Date().toISOString();
  const store = input.store ?? getCloudRuntimeStore();
  const holder = input.holder ?? `wake:${input.source}:${now}`;
  const identity = artifactIdentity();
  const loaded = await store.load(now);
  const claim = await acquireCloudRuntimeLease(store, {
    holder,
    instance_id: identity.deployment_id ?? loaded.instance_id,
    now,
  });
  if (!claim.acquired) {
    return {
      ran: false,
      deferred: true,
      duplicate: false,
      catchup: false,
      decision: null,
      mission_created: false,
      external_action: false,
      payout_executed: false,
      sales_outreach_sent: false,
      affiliate_outreach_sent: false,
      state: loaded,
      hq: projectCloudRuntimeHq(loaded),
    };
  }

  try {
    if (input.event) {
      const first = await store.rememberEvent(input.event.event_id);
      if (!first) {
        const state = await store.load(now);
        await releaseCloudRuntimeLease(store, holder);
        return {
          ran: false,
          deferred: false,
          duplicate: true,
          catchup: false,
          decision: state.loop.last_decision?.outcome ?? null,
          mission_created: false,
          external_action: false,
          payout_executed: false,
          sales_outreach_sent: false,
          affiliate_outreach_sent: false,
          state,
          hq: projectCloudRuntimeHq(state),
        };
      }
    }

    const catchup = resolveCloudRuntimeCatchup({ state: loaded, now });
    const observation = observeCloudRuntimePortfolio();
    const pending = input.event
      ? [...loaded.loop.pending_events, {
          type: input.event.type,
          at: input.event.at,
          venture_id: input.event.venture_id,
          reason: input.event.reason,
        }].slice(-MAX_EVENTS_PER_WAKE)
      : loaded.loop.pending_events;

    const actionKey = `${input.source}:${input.event?.event_id ?? "tick"}:${loaded.loop.last_action_idempotency_key ?? "none"}`;
    if (input.source !== "CRON_HOURLY" && input.source !== "CRON_DAILY" && input.source !== "CATCHUP" && await store.hasIdempotency(actionKey)) {
      await releaseCloudRuntimeLease(store, holder);
      return {
        ran: false,
        deferred: false,
        duplicate: true,
        catchup: catchup.catchup,
        decision: loaded.loop.last_decision?.outcome ?? null,
        mission_created: false,
        external_action: false,
        payout_executed: false,
        sales_outreach_sent: false,
        affiliate_outreach_sent: false,
        state: loaded,
        hq: projectCloudRuntimeHq(loaded),
      };
    }

    const loop = executeAutonomousDailyOperatingLoop({
      now,
      persist: false,
      createMission: input.createMission === true,
      executeExternal: false,
      overrides: {
        loop: { ...loaded.loop, pending_events: pending },
        skip_disk_finance: true,
      },
    });

    await store.rememberIdempotency({
      key: loop.state.last_action_idempotency_key ?? actionKey,
      kind: input.source,
      result: loop.decision.outcome,
      at: now,
    });

    const nextReview = loop.state.next_daily_review_at ?? nextDailyReviewAt(now);
    const next: CloudRuntimePersistedState = {
      ...loaded,
      version: loaded.version + 1,
      loop: loop.state,
      heartbeat: {
        ...loaded.heartbeat,
        state: loop.portfolio_state === "IDLE_NO_ACTION"
          ? "IDLE"
          : loop.portfolio_state === "WAITING_FOR_EVIDENCE" || loop.portfolio_state === "WAITING_FOR_DEPENDENCY"
            ? "WAITING"
            : loop.portfolio_state === "DEGRADED"
              ? "DEGRADED"
              : loop.portfolio_state === "BLOCKED"
                ? "BLOCKED"
                : "HEALTHY",
        last_wake_at: now,
        last_wake_source: catchup.catchup ? "CATCHUP" : input.source,
        last_successful_iteration_at: now,
        last_meaningful_action: loop.decision.reason,
        next_review_at: nextReview,
        next_expected_wake_at: input.source === "CRON_DAILY" ? nextReview : nextReview,
        runtime_version: CLOUD_RUNTIME_VERSION,
        deployment_id: identity.deployment_id,
        git_sha: identity.git_sha,
        lease_held: false,
        current_mission: loop.mission_id ?? loop.decision.selected_mission,
        failure_reason: null,
        freshness: freshness(now, now),
        scheduler_freshness: "FRESH",
        invocation_count: loaded.heartbeat.invocation_count + 1,
        known_execution_cost: "UNKNOWN",
        provider_calls: loaded.heartbeat.provider_calls,
      },
      lease: null,
      observation,
      last_completed_action_key: loop.state.last_action_idempotency_key,
      last_catchup_reason: catchup.reason,
      local_file_used: false,
      updated_at: now,
    };
    const saved = await store.save(next);
    await releaseCloudRuntimeLease(store, holder);
    return {
      ran: true,
      deferred: false,
      duplicate: false,
      catchup: catchup.catchup,
      decision: loop.decision.outcome,
      mission_created: loop.mission_created,
      external_action: false,
      payout_executed: false,
      sales_outreach_sent: false,
      affiliate_outreach_sent: false,
      state: saved,
      hq: projectCloudRuntimeHq(saved),
    };
  } catch (error) {
    const safe = sanitizeRuntimeError(error);
    await store.recordFailure({
      action_id: `wake:${input.source}:${now}`,
      reason: "TECHNICAL_FAILURE",
      attempt_count: 1,
      provider: null,
      at: now,
      safe_error: safe,
      recovery_state: 1 >= MAX_RUNTIME_RETRIES ? "DEAD_LETTER" : "RETRY_ELIGIBLE",
      next_retry_at: new Date(Date.parse(now) + 15 * 60 * 1000).toISOString(),
    });
    const failed = await store.load(now);
    const next = await store.save({
      ...failed,
      heartbeat: {
        ...failed.heartbeat,
        state: "DEGRADED",
        last_wake_at: now,
        last_failed_iteration_at: now,
        failure_reason: safe,
        freshness: freshness(failed.heartbeat.last_successful_iteration_at, now),
      },
      updated_at: now,
    });
    await releaseCloudRuntimeLease(store, holder);
    return {
      ran: false,
      deferred: false,
      duplicate: false,
      catchup: false,
      decision: null,
      mission_created: false,
      external_action: false,
      payout_executed: false,
      sales_outreach_sent: false,
      affiliate_outreach_sent: false,
      state: next,
      hq: projectCloudRuntimeHq(next),
    };
  }
}

export function boundedRetryEligible(attemptCount: number): boolean {
  return attemptCount < MAX_RUNTIME_RETRIES;
}

export function technicalFailureIsNotBusinessRejection(reason: string): boolean {
  return !/NO_MARKET|LEAD_REJECTED|VENTURE_INVALID|CUSTOMER_NOT_INTERESTED/.test(reason);
}
