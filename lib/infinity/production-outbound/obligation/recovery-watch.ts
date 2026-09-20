export const RECOVERY_WATCH_TICKS_REQUIRED = 3 as const;

export type RecoveryWatchTick = {
  tick: number;
  at: string;
  deployment: string | null;
  epoch: string;
  obligation_state: string | null;
  owner: string | null;
  due_at: string | null;
  next_action: string | null;
  attempt: number;
  retry_budget: number;
  provider_call_state: string;
  ownership_state: string | null;
  last_error: string | null;
  outcome: "SUCCESS" | "RETRYABLE" | "SEMANTIC_FAILURE" | "OWNERSHIP_CONFLICT" | "UNKNOWN" | "EXHAUSTED";
};

export type RecoveryWatchState = {
  started: boolean;
  ticks: RecoveryWatchTick[];
};

const watch: RecoveryWatchState = { started: false, ticks: [] };

export function resetRecoveryWatch(): void {
  watch.started = false;
  watch.ticks = [];
}

export function startRecoveryWatch(): RecoveryWatchState {
  watch.started = true;
  watch.ticks = [];
  return watch;
}

export function recordRecoveryWatchTick(tick: RecoveryWatchTick): RecoveryWatchState {
  watch.started = true;
  watch.ticks = [...watch.ticks.filter((row) => row.tick !== tick.tick), tick].sort((a, b) => a.tick - b.tick);
  return watch;
}

export function getRecoveryWatch(): RecoveryWatchState {
  return watch;
}

export function classifyRecoveryWatchOutcome(input: {
  provider_confirmed: boolean;
  ownership_conflict: boolean;
  retryable: boolean;
  retry_budget: number;
  semantic_failure: boolean;
  invariant_violation: boolean;
}): RecoveryWatchTick["outcome"] {
  if (input.ownership_conflict || input.invariant_violation) return input.ownership_conflict ? "OWNERSHIP_CONFLICT" : "UNKNOWN";
  if (input.provider_confirmed) return "SUCCESS";
  if (input.semantic_failure) return "SEMANTIC_FAILURE";
  if (input.retryable && input.retry_budget > 0) return "RETRYABLE";
  if (input.retryable && input.retry_budget <= 0) return "EXHAUSTED";
  return "UNKNOWN";
}
