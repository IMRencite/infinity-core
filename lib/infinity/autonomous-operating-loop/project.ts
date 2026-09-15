import { AUTONOMOUS_DAILY_OPERATING_LOOP } from "./types";
import type { AutonomousOperationsProjection } from "./types";
import { loadAutonomousLoopState } from "./persist";

export function projectAutonomousOperations(input?: { now?: string; cwd?: string }): AutonomousOperationsProjection {
  const state = loadAutonomousLoopState({ now: input?.now, cwd: input?.cwd });
  const decision = state.last_decision;
  const idle = state.portfolio_state === "IDLE_NO_ACTION" || state.portfolio_state === "WAITING_FOR_EVIDENCE" || !decision?.selected_mission;
  return {
    contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
    loop_state: state.portfolio_state,
    current_venture: decision?.venture_id ?? null,
    current_mission: idle && state.portfolio_state !== "MISSION_ACTIVE" ? null : decision?.selected_mission ?? null,
    why_this_mission: decision?.reason ?? "NO_ACTIVE_CANONICAL_WORK",
    priority: decision?.priority ?? "NONE",
    expected_outcome: decision?.expected_outcome ?? "IDLE — no active canonical work",
    current_step: state.portfolio_state,
    rooms: state.portfolio_state === "MISSION_ACTIVE"
      ? ["Operations", "Growth", "Intelligence", "Validation"]
      : [],
    agents: state.portfolio_state === "MISSION_ACTIVE"
      ? ["Venture Operator", "Growth Runtime", "Performance Intelligence"]
      : ["PRESENT_IDLE"],
    financial_exposure: decision?.financial_exposure ?? 0,
    spend_required: decision?.spend_required ?? 0,
    commitment_required: decision?.commitment_required ?? 0,
    last_completed_mission: state.last_completed_mission_id,
    next_review: state.next_daily_review_at,
    waiting_condition: state.waiting_dependency
      ? `${state.waiting_dependency.kind}:${state.waiting_dependency.reason}`
      : null,
    explanation: state.last_explanation,
    money_movement_enabled: false,
    autonomous_commitment_creation: false,
  };
}
