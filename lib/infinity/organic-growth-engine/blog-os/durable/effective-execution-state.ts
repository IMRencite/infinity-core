export const CANONICAL_ORGANIC_HOLD_KEY = "organic-growth-scheduler-v1.publishing_hold";

export type CanonicalAuthorizationRead = {
  hold_state?: string | null;
  execute_publish?: boolean | null;
  hold_version?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  authorized_decision_id?: string | null;
};

export type SchedulerProjectionRead = {
  publishing_hold?: string | null;
  execute_publish?: boolean | null;
  hold_version?: string | null;
};

export type EffectiveOrganicExecutionState = {
  result: "AUTHORIZED" | "BLOCKED_HOLD" | "BLOCKED_AUTHORIZATION";
  snapshot_class: "CURRENT" | "STALE" | "MISSING_CANONICAL";
  canonical_hold_state: "CLEARED" | "ACTIVE" | "UNKNOWN";
  scheduler_projection: string | null;
  execute_publish: boolean;
  reasons: string[];
};

export function schedulerProjectionIsPermissive(scheduler?: SchedulerProjectionRead | null): boolean {
  if (!scheduler) return false;
  return scheduler.publishing_hold == null && scheduler.execute_publish === true;
}

export function schedulerProjectionIsBlocking(scheduler?: SchedulerProjectionRead | null): boolean {
  if (!scheduler) return false;
  return typeof scheduler.publishing_hold === "string" && scheduler.publishing_hold.length > 0;
}

export function deriveEffectiveOrganicExecutionState(input: {
  canonical?: CanonicalAuthorizationRead | null;
  scheduler?: SchedulerProjectionRead | null;
  canonical_readable?: boolean;
}): EffectiveOrganicExecutionState {
  if (input.canonical_readable === false) {
    return {
      result: "BLOCKED_AUTHORIZATION",
      snapshot_class: "MISSING_CANONICAL",
      canonical_hold_state: "UNKNOWN",
      scheduler_projection: input.scheduler?.publishing_hold ?? null,
      execute_publish: false,
      reasons: ["CANONICAL_UNAVAILABLE"],
    };
  }
  const canonical = input.canonical;
  if (!canonical || !canonical.hold_state) {
    return {
      result: "BLOCKED_AUTHORIZATION",
      snapshot_class: "MISSING_CANONICAL",
      canonical_hold_state: "UNKNOWN",
      scheduler_projection: input.scheduler?.publishing_hold ?? null,
      execute_publish: false,
      reasons: ["CANONICAL_MISSING"],
    };
  }
  const cleared = canonical.hold_state === "CLEARED" && canonical.execute_publish === true;
  const paused = canonical.hold_state !== "CLEARED" || canonical.execute_publish !== true;
  const staleClear = paused && schedulerProjectionIsPermissive(input.scheduler);
  const stalePause = cleared && schedulerProjectionIsBlocking(input.scheduler);
  const stale = staleClear || stalePause;
  if (cleared) {
    return {
      result: "AUTHORIZED",
      snapshot_class: stale ? "STALE" : "CURRENT",
      canonical_hold_state: "CLEARED",
      scheduler_projection: input.scheduler?.publishing_hold ?? null,
      execute_publish: true,
      reasons: stale ? ["STALE_BLOCKING_SNAPSHOT", "CANONICAL_CLEARED"] : ["CANONICAL_CLEARED"],
    };
  }
  return {
    result: "BLOCKED_HOLD",
    snapshot_class: stale ? "STALE" : "CURRENT",
    canonical_hold_state: "ACTIVE",
    scheduler_projection: input.scheduler?.publishing_hold ?? null,
    execute_publish: false,
    reasons: stale ? ["STALE_PERMISSIVE_SNAPSHOT", "CANONICAL_PAUSED"] : ["CANONICAL_PAUSED"],
  };
}

export function inMemoryHoldFromEffective(effective: EffectiveOrganicExecutionState): "PAUSED_FOR_SECOND_QC_ESCAPE" | null {
  return effective.result === "AUTHORIZED" ? null : "PAUSED_FOR_SECOND_QC_ESCAPE";
}

export function freezeSchedulerAuthorizationProjection<T extends { publishing_hold?: unknown; execute_publish?: unknown }>(
  prior: Record<string, unknown> | undefined,
  next: T,
): T {
  const priorHold = typeof prior?.publishing_hold === "string" || prior?.publishing_hold === null
    ? prior.publishing_hold
    : next.publishing_hold;
  return {
    ...prior,
    ...next,
    publishing_hold: priorHold ?? next.publishing_hold,
    execute_publish: Object.prototype.hasOwnProperty.call(prior ?? {}, "execute_publish")
      ? prior?.execute_publish
      : false,
  } as T;
}
