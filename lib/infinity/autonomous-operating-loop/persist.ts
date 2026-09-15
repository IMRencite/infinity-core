import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AUTONOMOUS_DAILY_OPERATING_LOOP, AUTONOMOUS_LOOP_STATE_PATH } from "./types";
import type { AutonomousLoopPersistedState } from "./types";

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST !== "1") return false;
  return true;
}

function emptyState(now: string): AutonomousLoopPersistedState {
  return {
    contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
    portfolio_state: "BOOTSTRAPPING",
    venture_states: {},
    last_decision: null,
    last_explanation: null,
    last_mission_id: null,
    last_completed_mission_id: null,
    last_action_idempotency_key: null,
    last_external_action_key: null,
    last_action_at: null,
    last_action_kind: null,
    waiting_dependency: null,
    last_daily_review_at: null,
    next_daily_review_at: null,
    next_run_at: null,
    daily_reviews: [],
    pending_events: [],
    consecutive_failures: 0,
    same_decision_streak: 0,
    learning: [],
    decision_history: [],
    action_history: [],
    mission_history: [],
    updated_at: now,
  };
}

let memory: AutonomousLoopPersistedState | null = null;

export function autonomousLoopStatePath(cwd = process.cwd()): string {
  return join(cwd, AUTONOMOUS_LOOP_STATE_PATH);
}

export function resetAutonomousLoopMemoryForTests(): void {
  memory = null;
}

export function loadAutonomousLoopState(input?: { now?: string; cwd?: string }): AutonomousLoopPersistedState {
  const now = input?.now ?? new Date().toISOString();
  if (!persistEnabled()) {
    return memory ?? emptyState(now);
  }
  const path = autonomousLoopStatePath(input?.cwd);
  if (!existsSync(path)) return emptyState(now);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as AutonomousLoopPersistedState;
    if (parsed?.contract !== AUTONOMOUS_DAILY_OPERATING_LOOP) return emptyState(now);
    return parsed;
  } catch {
    return emptyState(now);
  }
}

export function saveAutonomousLoopState(
  state: AutonomousLoopPersistedState,
  input?: { cwd?: string },
): AutonomousLoopPersistedState {
  memory = state;
  if (!persistEnabled()) return state;
  const path = autonomousLoopStatePath(input?.cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export function nextDailyReviewAt(fromIso: string): string {
  const from = new Date(fromIso);
  const next = new Date(from);
  next.setUTCHours(16, 0, 0, 0);
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export function dailyReviewDue(state: AutonomousLoopPersistedState, nowIso: string): boolean {
  if (!state.last_daily_review_at) return true;
  if (state.next_daily_review_at) return Date.parse(state.next_daily_review_at) <= Date.parse(nowIso);
  const last = new Date(state.last_daily_review_at);
  const now = new Date(nowIso);
  return last.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}
