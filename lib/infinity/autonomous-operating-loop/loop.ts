import { CANONICAL_WORK_EXECUTION_CONTRACT } from "@/lib/infinity/canonical-work/types";
import { completeCanonicalWork, listCanonicalWork, upsertCanonicalWork } from "@/lib/infinity/canonical-work/store";
import { publishHqRuntimeEvent } from "@/lib/infinity/operator-console/hq-live-events";
import { explainAutonomousDecision } from "./explanation";
import {
  evaluateAutonomousLoopRunawayGate,
  evaluateAutonomousLoopSafetyBundle,
  evaluateWaitingForEvidenceValidityGate,
} from "./gates";
import { classifyCustomerReply, observeAutonomousPortfolio, projectDailyReviews } from "./observe";
import type { AutonomousObservation, ObserveOverrides } from "./observe";
import { dailyReviewDue, loadAutonomousLoopState, nextDailyReviewAt, saveAutonomousLoopState } from "./persist";
import { resolveAutonomousNextMission } from "./resolver";
import { AUTONOMOUS_DAILY_OPERATING_LOOP } from "./types";
import type {
  AutonomousDecision,
  AutonomousLoopEvent,
  AutonomousLoopPersistedState,
  AutonomousLoopState,
} from "./types";

export type AutonomousLoopRun = {
  contract: typeof AUTONOMOUS_DAILY_OPERATING_LOOP;
  observation: AutonomousObservation;
  decision: AutonomousDecision;
  explanation: ReturnType<typeof explainAutonomousDecision>;
  portfolio_state: AutonomousLoopState;
  venture_state: AutonomousLoopState;
  mission_created: boolean;
  mission_id: string | null;
  action_executed: boolean;
  action_result: string | null;
  money_moved: false;
  commitment_created: false;
  paid_acquisition_attempted: false;
  daily_review_ran: boolean;
  gates: ReturnType<typeof evaluateAutonomousLoopSafetyBundle>;
  state: AutonomousLoopPersistedState;
};

function transitionFromDecision(decision: AutonomousDecision, missionCreated: boolean): AutonomousLoopState {
  if (decision.outcome === "WAIT_FOR_EVIDENCE") return "WAITING_FOR_EVIDENCE";
  if (decision.outcome === "BLOCKED_BY_POLICY" || decision.outcome === "BLOCKED_BY_CAPITAL" || decision.outcome === "BLOCKED_BY_QC") {
    return "BLOCKED";
  }
  if (decision.outcome === "BLOCKED_BY_PROVIDER") return "DEGRADED";
  if (decision.outcome === "NO_ACTION_JUSTIFIED") return "IDLE_NO_ACTION";
  if (missionCreated || decision.outcome === "EXECUTE_ACTION" || decision.outcome === "REPAIR_REQUIRED") {
    return missionCreated ? "MISSION_ACTIVE" : decision.fallback;
  }
  if (decision.outcome === "CONTINUE_EXISTING_ACTION" && decision.selected_mission) return "MISSION_ACTIVE";
  return decision.fallback;
}

function missionWorkId(decision: AutonomousDecision, now: string): string {
  const slug = (decision.selected_mission ?? decision.outcome).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const day = now.slice(0, 10);
  return `work:autonomous:${decision.venture_id ?? "portfolio"}:${slug}:${day}`;
}

function alreadyEquivalent(observation: AutonomousObservation, workId: string, selected: string | null): boolean {
  const hay = [...observation.active_missions, ...observation.recent_completed];
  return hay.some((row) => row.work_id === workId || row.title === selected || row.work_id.endsWith(selected ?? "\0"));
}

function applyEvents(observation: AutonomousObservation, events: AutonomousLoopEvent[]): AutonomousObservation {
  let next = observation;
  for (const event of events) {
    if (!next.occupancy) continue;
    if (event.type === "CUSTOMER_REPLY") {
      const replyClass = classifyCustomerReply(event.reason);
      next = {
        ...next,
        occupancy: {
          ...next.occupancy,
          replies: next.occupancy.replies + 1,
          replies_pending: false,
          reply_class: replyClass,
          unsubscribe: replyClass === "UNSUBSCRIBE" ? true : next.occupancy.unsubscribe,
        },
      };
    }
    if (event.type === "PROVIDER_RECOVERY" && next.occupancy) {
      next = {
        ...next,
        occupancy: { ...next.occupancy, provider_health: "HEALTHY", provider_failure_class: "NONE" },
      };
    }
    if (event.type === "PROVIDER_FAILURE" && next.occupancy) {
      next = {
        ...next,
        occupancy: { ...next.occupancy, provider_health: "FAILED", provider_failure_class: "PROVIDER_FAILURE" },
      };
    }
    if (event.type === "MISSION_COMPLETED") {
      next = {
        ...next,
        occupancy: next.occupancy
          ? { ...next.occupancy, active_mission_id: null, active_mission_title: null }
          : next.occupancy,
        active_missions: next.active_missions.filter((row) => row.work_id !== event.reason),
      };
    }
  }
  return next;
}

export function wakeAutonomousLoop(event: AutonomousLoopEvent, input?: { cwd?: string; persist?: boolean }): AutonomousLoopPersistedState {
  const state = loadAutonomousLoopState({ now: event.at, cwd: input?.cwd });
  const next: AutonomousLoopPersistedState = {
    ...state,
    pending_events: [...state.pending_events, event],
    updated_at: event.at,
  };
  return input?.persist === false ? next : saveAutonomousLoopState(next, { cwd: input?.cwd });
}

export function notifyAutonomousLoopMissionCompleted(input: {
  workId: string;
  now?: string;
  cwd?: string;
  persist?: boolean;
  createMission?: boolean;
  overrides?: ObserveOverrides;
}): AutonomousLoopRun {
  const now = input.now ?? new Date().toISOString();
  wakeAutonomousLoop(
    { type: "MISSION_COMPLETED", at: now, venture_id: null, reason: input.workId },
    { cwd: input.cwd, persist: input.persist },
  );
  const state = loadAutonomousLoopState({ now, cwd: input.cwd });
  saveAutonomousLoopState(
    { ...state, last_completed_mission_id: input.workId, last_mission_id: state.last_mission_id === input.workId ? null : state.last_mission_id, mission_history: [...state.mission_history, input.workId] },
    { cwd: input.cwd },
  );
  return executeAutonomousDailyOperatingLoop({
    now,
    cwd: input.cwd,
    persist: input.persist,
    createMission: input.createMission,
    overrides: input.overrides,
  });
}

export function executeAutonomousDailyOperatingLoop(input?: {
  now?: string;
  cwd?: string;
  persist?: boolean;
  createMission?: boolean;
  executeExternal?: boolean;
  overrides?: ObserveOverrides;
}): AutonomousLoopRun {
  const now = input?.now ?? new Date().toISOString();
  const persist = input?.persist !== false;
  let state = input?.overrides?.loop ?? loadAutonomousLoopState({ now, cwd: input?.cwd });
  const events = state.pending_events;
  let observation = observeAutonomousPortfolio({
    now,
    cwd: input?.cwd,
    overrides: { ...input?.overrides, loop: state },
  });
  observation = applyEvents(observation, events);

  const dailyDue = dailyReviewDue(state, now);
  const reviews = dailyDue ? projectDailyReviews(observation) : state.daily_reviews;

  const runaway = evaluateAutonomousLoopRunawayGate({
    consecutiveFailures: state.consecutive_failures,
    sameDecisionStreak: state.same_decision_streak,
    paused: state.portfolio_state === "PAUSED",
  });
  if (state.consecutive_failures >= 5 || state.same_decision_streak >= 8) {
    state = {
      ...state,
      portfolio_state: "PAUSED",
      pending_events: [],
      daily_reviews: reviews,
      last_daily_review_at: dailyDue ? now : state.last_daily_review_at,
      next_daily_review_at: dailyDue ? nextDailyReviewAt(now) : state.next_daily_review_at,
      updated_at: now,
    };
    if (persist) saveAutonomousLoopState(state, { cwd: input?.cwd });
    const pausedDecision = resolveAutonomousNextMission(observation);
    return {
      contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
      observation,
      decision: { ...pausedDecision, outcome: "BLOCKED_BY_POLICY", reason: "RUNAWAY_LOOP_PAUSED", fallback: "PAUSED" },
      explanation: explainAutonomousDecision(pausedDecision),
      portfolio_state: "PAUSED",
      venture_state: "PAUSED",
      mission_created: false,
      mission_id: null,
      action_executed: false,
      action_result: "PAUSED_BY_RUNAWAY_GATE",
      money_moved: false,
      commitment_created: false,
      paid_acquisition_attempted: false,
      daily_review_ran: dailyDue,
      gates: evaluateAutonomousLoopSafetyBundle({
        observation,
        decision: pausedDecision,
        state,
        missionCreated: false,
        moneyMoved: false,
        commitmentCreated: false,
        paidAcquisitionAttempted: false,
      }),
      state,
    };
  }

  const decision = resolveAutonomousNextMission(observation);
  const explanation = explainAutonomousDecision(decision);
  const waitGate = evaluateWaitingForEvidenceValidityGate({
    outcome: decision.outcome,
    lastActionKind: decision.outcome === "WAIT_FOR_EVIDENCE" ? "SEND_EXECUTED" : state.last_action_kind,
    dependencyKind: decision.outcome === "WAIT_FOR_EVIDENCE" ? "CUSTOMER_REPLY" : state.waiting_dependency?.kind ?? null,
  });

  const workId = decision.selected_mission && (decision.outcome === "EXECUTE_ACTION" || decision.outcome === "REPAIR_REQUIRED")
    ? missionWorkId(decision, now)
    : null;
  const shouldCreate =
    Boolean(input?.createMission)
    && Boolean(workId)
    && !alreadyEquivalent(observation, workId!, decision.selected_mission)
    && decision.outcome !== "NO_ACTION_JUSTIFIED"
    && decision.outcome !== "WAIT_FOR_EVIDENCE"
    && decision.outcome !== "CONTINUE_EXISTING_ACTION";

  const idempotencyKey = `${decision.outcome}:${decision.selected_mission ?? "none"}:${decision.venture_id ?? "none"}`;
  const duplicateExternal = Boolean(input?.executeExternal) && state.last_external_action_key === idempotencyKey;
  let missionCreated = false;
  let missionId: string | null = null;
  if (shouldCreate && workId && !duplicateExternal) {
    upsertCanonicalWork({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: workId,
      mission_id: `mission:autonomous:${workId}`,
      venture_id: decision.venture_id,
      work_type: decision.outcome === "REPAIR_REQUIRED" ? "INCIDENT_REPAIR" : "OPERATING",
      title: decision.selected_mission ?? decision.outcome,
      description: decision.reason,
      stage: "AUTONOMOUS OPERATING LOOP",
      status: "ACTIVE",
      assigned_rooms: ["operations", "growth_department", "intelligence_center", "quality_control"],
      assigned_workers: ["Venture Operator", "Growth Runtime", "Performance Intelligence", "Validation Station"],
      source: "SCHEDULED_RUNTIME",
      started_at: now,
      updated_at: now,
      completed_at: null,
      blocked_reason: null,
      authorization_state: null,
      progress: decision.expected_outcome,
      latest_output: decision.reason,
      artifact_refs: [],
      evidence_refs: decision.evidence,
      parent_work_id: null,
      traceability_links: [],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
    }, persist && !process.env.VITEST);
    missionCreated = true;
    missionId = workId;
  }

  const actionExecuted = Boolean(input?.executeExternal) && !duplicateExternal && decision.outcome === "EXECUTE_ACTION";
  const sameStreak = state.last_decision?.outcome === decision.outcome ? state.same_decision_streak + 1 : 1;
  const nextStateName = transitionFromDecision(decision, missionCreated);
  const waiting =
    decision.outcome === "WAIT_FOR_EVIDENCE" && waitGate.result === "PASS"
      ? { kind: "CUSTOMER_REPLY", since: now, reason: decision.reason }
      : null;

  const learningEntry =
    decision.outcome === "BLOCKED_BY_PROVIDER"
      ? {
          at: now,
          class: "PROVIDER_FAILURE",
          changes_business_inference: false,
          next_behavior: "SKIP_OUTREACH_AFTER_PROVIDER_FAILURE",
        }
      : decision.learning_applied.length
        ? {
            at: now,
            class: "ACTION_EXECUTED",
            changes_business_inference: true,
            next_behavior: decision.learning_applied[decision.learning_applied.length - 1] ?? "NONE",
          }
        : null;

  state = {
    ...state,
    contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
    portfolio_state: nextStateName,
    venture_states: {
      ...state.venture_states,
      ...(decision.venture_id ? { [decision.venture_id]: nextStateName } : {}),
    },
    last_decision: decision,
    last_explanation: explanation,
    last_mission_id: missionId ?? state.last_mission_id,
    last_action_idempotency_key: idempotencyKey,
    last_external_action_key: actionExecuted ? idempotencyKey : state.last_external_action_key,
    last_action_at: actionExecuted || missionCreated ? now : state.last_action_at,
    last_action_kind: actionExecuted ? "EXTERNAL_ACTION" : missionCreated ? "MISSION_CREATED" : state.last_action_kind,
    waiting_dependency: waiting,
    last_daily_review_at: dailyDue ? now : state.last_daily_review_at,
    next_daily_review_at: dailyDue ? nextDailyReviewAt(now) : state.next_daily_review_at ?? nextDailyReviewAt(now),
    next_run_at: nextDailyReviewAt(now),
    daily_reviews: reviews,
    pending_events: [],
    consecutive_failures: 0,
    same_decision_streak: sameStreak,
    learning: learningEntry ? [...state.learning.slice(-19), learningEntry] : state.learning,
    decision_history: [...state.decision_history.slice(-49), decision],
    action_history: missionCreated || actionExecuted
      ? [...state.action_history.slice(-49), { at: now, kind: missionCreated ? "MISSION_CREATED" : "EXTERNAL_ACTION", idempotency_key: idempotencyKey, result: "RECORDED" }]
      : state.action_history,
    mission_history: missionId ? [...state.mission_history, missionId] : state.mission_history,
    updated_at: now,
  };

  if (persist) saveAutonomousLoopState(state, { cwd: input?.cwd });
  if (!process.env.VITEST) {
    publishHqRuntimeEvent({
      type: "HQ_SNAPSHOT_INVALIDATED",
      at: now,
      ventureId: decision.venture_id,
      missionId: missionId,
      reason: "AUTONOMOUS_LOOP",
    });
  }

  return {
    contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
    observation,
    decision,
    explanation,
    portfolio_state: nextStateName,
    venture_state: decision.venture_id ? state.venture_states[decision.venture_id] ?? nextStateName : nextStateName,
    mission_created: missionCreated,
    mission_id: missionId,
    action_executed: actionExecuted,
    action_result: actionExecuted ? "EXECUTED_IDEMPOTENT" : duplicateExternal ? "SKIPPED_IDEMPOTENT_DUPLICATE" : null,
    money_moved: false,
    commitment_created: false,
    paid_acquisition_attempted: false,
    daily_review_ran: dailyDue,
    gates: evaluateAutonomousLoopSafetyBundle({
      observation,
      decision,
      state,
      missionCreated,
      moneyMoved: false,
      commitmentCreated: false,
      paidAcquisitionAttempted: false,
    }),
    state,
  };
}

export function completeAutonomousMissionAndContinue(input: {
  workId: string;
  output: string;
  now?: string;
  cwd?: string;
  persist?: boolean;
  createMission?: boolean;
  overrides?: ObserveOverrides;
}): AutonomousLoopRun {
  const now = input.now ?? new Date().toISOString();
  completeCanonicalWork(input.workId, input.output, now);
  return notifyAutonomousLoopMissionCompleted({
    workId: input.workId,
    now,
    cwd: input.cwd,
    persist: input.persist,
    createMission: input.createMission,
    overrides: input.overrides,
  });
}

export function currentCanonicalWorkIdle(): boolean {
  return listCanonicalWork().every((row) => row.status !== "ACTIVE");
}
