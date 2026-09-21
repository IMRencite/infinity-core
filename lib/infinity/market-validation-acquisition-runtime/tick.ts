import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { ingestMustDisableLiveResearch } from "./ingest-guard";
import { invokeMarketValidationAcquisitionRuntime } from "./invoke";
import type { AcquisitionTrigger } from "./constants";
import { shouldRunScheduledEvaluation } from "./schedule";
import { loadDurableAcquisitionTick, persistDurableAcquisitionTick } from "./tick-persist";
import type { AcquisitionRuntimeResult } from "./types";

const PLAN_VERSION = "prospect_research_plan_v1";
const STALE_LOCK_MS = 10 * 60_000;
export const ACQUISITION_RETRY_BACKOFF_MS = 15 * 60_000;

const RETRY_BLOCKERS = new Set([
  "RESEARCH_EXECUTION_RETRY_REQUIRED",
  "RESEARCH_PROVIDER_UNAVAILABLE",
  "RESEARCH_CAPABILITY_TEMPORARILY_UNAVAILABLE",
]);

type TickLock = {
  tickKey: string;
  experimentId: string;
  startedAt: string;
  completedAt: string | null;
  lastStep: string | null;
  lockedBy: string;
  retryEligible: boolean;
  nextRetryAt: string | null;
};

const locks = new Map<string, TickLock>();
const completedKeys = new Set<string>();

export function acquisitionTickKey(input: {
  experimentId: string;
  qualified: number;
  strong: number;
  pricing: number;
  trigger: string;
}): string {
  return createHash("sha256")
    .update([input.experimentId, PLAN_VERSION, String(input.qualified), String(input.strong), String(input.pricing), input.trigger].join("|"))
    .digest("hex")
    .slice(0, 24);
}

export function claimAcquisitionTick(input: { experimentId: string; tickKey: string; lockedBy: string; now: Date }): {
  claimed: boolean;
  reason: string;
} {
  const current = locks.get(input.experimentId);
  if (current && !current.completedAt) {
    const age = input.now.getTime() - Date.parse(current.startedAt);
    if (age < STALE_LOCK_MS) {
      return { claimed: false, reason: "OVERLAP_PREVENTED" };
    }
    abandonStaleAcquisitionTick(input.experimentId, input.now);
  }
  if (current?.tickKey === input.tickKey && current.completedAt) {
    if (current.retryEligible && current.nextRetryAt && input.now.getTime() >= Date.parse(current.nextRetryAt)) {
      locks.set(input.experimentId, {
        tickKey: input.tickKey,
        experimentId: input.experimentId,
        startedAt: input.now.toISOString(),
        completedAt: null,
        lastStep: "retry_claimed",
        lockedBy: input.lockedBy,
        retryEligible: true,
        nextRetryAt: null,
      });
      return { claimed: true, reason: "RETRY_CLAIMED" };
    }
    if (current.retryEligible && current.nextRetryAt && input.now.getTime() < Date.parse(current.nextRetryAt)) {
      return { claimed: false, reason: "RETRY_BACKOFF" };
    }
    return { claimed: false, reason: "DUPLICATE_TICK" };
  }
  if (completedKeys.has(input.tickKey) && current?.tickKey === input.tickKey && !current.retryEligible) {
    return { claimed: false, reason: "DUPLICATE_TICK" };
  }
  locks.set(input.experimentId, {
    tickKey: input.tickKey,
    experimentId: input.experimentId,
    startedAt: input.now.toISOString(),
    completedAt: null,
    lastStep: "claimed",
    lockedBy: input.lockedBy,
    retryEligible: false,
    nextRetryAt: null,
  });
  return { claimed: true, reason: "CLAIMED" };
}

export function completeAcquisitionTick(
  experimentId: string,
  tickKey: string,
  lastStep: string,
  options?: { retryEligible?: boolean; now?: Date },
): void {
  const current = locks.get(experimentId);
  const now = options?.now ?? new Date();
  const retryEligible = Boolean(options?.retryEligible ?? RETRY_BLOCKERS.has(lastStep));
  if (current) {
    current.completedAt = now.toISOString();
    current.lastStep = lastStep;
    current.retryEligible = retryEligible;
    current.nextRetryAt = retryEligible ? new Date(now.getTime() + ACQUISITION_RETRY_BACKOFF_MS).toISOString() : null;
  }
  if (!retryEligible) completedKeys.add(tickKey);
}

export function abandonStaleAcquisitionTick(experimentId: string, now: Date): { abandoned: boolean; lastStep: string | null } {
  const current = locks.get(experimentId);
  if (!current || current.completedAt) return { abandoned: false, lastStep: current?.lastStep ?? null };
  if (now.getTime() - Date.parse(current.startedAt) < STALE_LOCK_MS) {
    return { abandoned: false, lastStep: current.lastStep };
  }
  current.completedAt = now.toISOString();
  current.lastStep = current.lastStep ? `${current.lastStep}:abandoned` : "abandoned";
  current.retryEligible = true;
  current.nextRetryAt = now.toISOString();
  return { abandoned: true, lastStep: current.lastStep };
}

export function resetAcquisitionTickLocks(): void {
  locks.clear();
  completedKeys.clear();
}

export function peekAcquisitionTickLock(experimentId: string): TickLock | null {
  return locks.get(experimentId) ?? null;
}

export function isEventDrivenAcquisitionTrigger(trigger: AcquisitionTrigger): boolean {
  return trigger !== "EXPERIMENT_ENTERED_COLLECTING" && trigger !== "EXPERIMENT_WINDOW_NEARING_EXPIRY";
}

export function acquisitionTriggerFromIngest(eventType: string): AcquisitionTrigger | null {
  if (eventType === "QUALIFIED_PILOT_APPLICATION" || eventType === "PILOT_REQUEST") return "REAL_SUBMISSION_RECEIVED";
  if (eventType === "STRONG_INTENT" || eventType === "INTENT_SIGNAL") return "STRONG_INTENT_RECEIVED";
  if (eventType === "PRICE_OPTION_SELECTED") return "PRICING_SELECTION_RECEIVED";
  return null;
}

export async function runAutonomousAcquisitionTick(input: {
  organizationId?: string;
  now?: Date;
  trigger?: AcquisitionTrigger;
  liveDiscovery?: boolean;
  lockedBy?: string;
  lastEvaluatedAt?: string | null;
  supabase?: SupabaseClient<Database>;
}): Promise<{
  skipped: boolean;
  reason: string;
  tickKey: string | null;
  result: AcquisitionRuntimeResult | null;
}> {
  if (process.env.VITEST && process.env.INFINITY_ACQUISITION_TICK !== "1") {
    return { skipped: true, reason: "TEST_HOST_DISABLED", tickKey: null, result: null };
  }
  const now = input.now ?? new Date();
  const trigger = input.trigger ?? "EXPERIMENT_ENTERED_COLLECTING";
  const organizationId = input.organizationId ?? LIVE_ORG;
  const evidence = inspectRealMarketEvidence({ now });
  const experimentId = evidence.experiment.experimentId || LOCKED_CRE_EXPERIMENT_ID;

  if (input.supabase) {
    const durable = await loadDurableAcquisitionTick(input.supabase, organizationId, experimentId).catch(() => null);
    if (durable) {
      const existing = locks.get(experimentId);
      if (!existing) {
        locks.set(experimentId, {
          tickKey: durable.tickKey,
          experimentId,
          startedAt: durable.startedAt,
          completedAt: durable.completedAt,
          lastStep: durable.lastStep,
          lockedBy: "durable-store",
          retryEligible: durable.retryEligible,
          nextRetryAt: durable.nextRetryAt,
        });
        if (durable.completedAt && !durable.retryEligible) completedKeys.add(durable.tickKey);
      }
    }
  }

  const current = locks.get(experimentId);
  const retryDue =
    Boolean(current?.retryEligible && current.nextRetryAt && now.getTime() >= Date.parse(current.nextRetryAt));
  const eventDriven = isEventDrivenAcquisitionTrigger(trigger);
  if (!eventDriven && !retryDue && !shouldRunScheduledEvaluation({ now, lastEvaluatedAt: input.lastEvaluatedAt ?? current?.completedAt ?? null })) {
    return { skipped: true, reason: "SCHEDULE_NOT_DUE", tickKey: null, result: null };
  }

  const tickKey = acquisitionTickKey({
    experimentId,
    qualified: evidence.counts.qualifiedSubmissions,
    strong: evidence.counts.strongIntent,
    pricing: evidence.counts.pricingSelections,
    trigger,
  });
  const claim = claimAcquisitionTick({
    experimentId,
    tickKey,
    lockedBy: input.lockedBy ?? "autonomous-acquisition-tick",
    now,
  });
  if (!claim.claimed) {
    return { skipped: true, reason: claim.reason, tickKey, result: null };
  }
  if (input.supabase) {
    const lock = locks.get(experimentId);
    if (lock) {
      await persistDurableAcquisitionTick(input.supabase, organizationId, {
        tickKey,
        experimentId,
        lastStep: lock.lastStep,
        completedAt: null,
        startedAt: lock.startedAt,
        retryEligible: lock.retryEligible,
        nextRetryAt: lock.nextRetryAt,
      }, "claim").catch(() => undefined);
    }
  }
  try {
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId,
      experimentId,
      now,
      trigger,
      liveDiscovery: ingestMustDisableLiveResearch(input.lockedBy)
        ? false
        : input.liveDiscovery ?? process.env.VITEST !== "true",
    });
    completeAcquisitionTick(experimentId, tickKey, result.governance.blocker, { now });
    if (input.supabase) {
      const lock = locks.get(experimentId);
      if (lock) {
        await persistDurableAcquisitionTick(input.supabase, organizationId, {
          tickKey,
          experimentId,
          lastStep: lock.lastStep,
          completedAt: lock.completedAt,
          startedAt: lock.startedAt,
          retryEligible: lock.retryEligible,
          nextRetryAt: lock.nextRetryAt,
        }, "complete").catch(() => undefined);
      }
    }
    return { skipped: false, reason: "EXECUTED", tickKey, result };
  } catch (error) {
    completeAcquisitionTick(experimentId, tickKey, error instanceof Error ? error.message : "failed", {
      now,
      retryEligible: true,
    });
    throw error;
  }
}
