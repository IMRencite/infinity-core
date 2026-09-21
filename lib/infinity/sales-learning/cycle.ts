import { PUBLIC_SALES_LEARNING_ACTIVITY } from "./contract";
import {
  DEFAULT_AGENT_ID,
  planCoaching,
  recordFollowUpPattern,
  recordSalesInteraction,
  resolveCapacity,
  runSimulation,
  scenarioForSkill,
  validateTraining,
} from "./engine";
import { followUpLearningFromPerformance } from "./performance";
import { getDefaultSalesLearningState } from "./store";
import type { SalesLearningState, SalesLearningTickResult, SalesTurn } from "./types";

export function executeSalesLearningTick(input: {
  now?: string;
  state?: SalesLearningState;
  ready_inventory?: number;
  qualified_pipeline?: number;
  observe?: Array<{
    prospect_id: string;
    turns: SalesTurn[];
    outcome: string;
    questions?: string[];
    objections?: string[];
    qualification_signals?: string[];
    suppressed?: boolean;
    used_known_context?: boolean;
    invented_problem?: boolean;
    unsupported_claim?: boolean;
    follow_up?: { interval_hours: number; style: string; response?: boolean; meeting?: boolean; complaint?: boolean };
  }>;
  simulation_actions?: Record<string, string[]>;
  run_simulations?: boolean;
} = {}): SalesLearningTickResult {
  const now = input.now ?? new Date().toISOString();
  const state = input.state ?? getDefaultSalesLearningState();
  for (const row of input.observe ?? []) {
    recordSalesInteraction(state, {
      prospect_id: row.prospect_id,
      now,
      turns: row.turns,
      questions: row.questions,
      objections: row.objections,
      qualification_signals: row.qualification_signals,
      outcome: row.outcome,
      suppressed: row.suppressed,
      used_known_context: row.used_known_context,
      invented_problem: row.invented_problem,
      unsupported_claim: row.unsupported_claim,
    });
    if (row.follow_up) {
      recordFollowUpPattern(state, {
        interval_hours: row.follow_up.interval_hours,
        style: row.follow_up.style,
        response: Boolean(row.follow_up.response),
        meeting: Boolean(row.follow_up.meeting),
        complaint: Boolean(row.follow_up.complaint),
      });
    }
  }
  const followUp = followUpLearningFromPerformance({
    stage: "FOLLOW_UP",
    meeting_rate: state.follow_up_patterns.reduce((sum, row) => sum + row.meetings, 0) / Math.max(1, state.follow_up_patterns.reduce((sum, row) => sum + row.responses + row.meetings, 0)),
    unsubscribe_rate: state.follow_up_patterns.reduce((sum, row) => sum + row.complaints, 0),
  });
  if (followUp.needs_coaching && state.follow_up_patterns.length) {
    const profile = state.profiles[DEFAULT_AGENT_ID];
    if (profile && (profile.dimensions.FOLLOW_UP.sample_size === 0 || (profile.dimensions.FOLLOW_UP.score ?? 1) > 0.7)) {
      profile.dimensions.FOLLOW_UP.score = 0.3;
      profile.dimensions.FOLLOW_UP.state = "DEVELOPING";
      profile.dimensions.FOLLOW_UP.sample_size = Math.max(1, profile.dimensions.FOLLOW_UP.sample_size);
      profile.dimensions.FOLLOW_UP.evidence.push({ observation: followUp.reason, interaction_id: null, at: now });
    }
  }
  const assignments = planCoaching(state, now);
  const weak = Object.values(state.profiles[DEFAULT_AGENT_ID]?.dimensions ?? {}).filter((row) => row.state === "DEVELOPING").length;
  state.capacity = resolveCapacity({
    ready_inventory: input.ready_inventory ?? 0,
    qualified_pipeline: input.qualified_pipeline ?? 0,
    weak_skills: weak,
  });
  let simulations = 0;
  if (input.run_simulations !== false) {
    const due = state.queue.filter((row) => row.state === "QUEUED" || row.state === "RETRY" || row.state === "ACTIVE").slice(0, state.capacity.training_capacity);
    for (const item of due) {
      const assignment = state.assignments.find((row) => row.assignment_id === item.assignment_id);
      const scenario = assignment ? scenarioForSkill(assignment.skill) : scenarioForSkill("DISCOVERY");
      const actions = input.simulation_actions?.[item.assignment_id]
        ?? input.simulation_actions?.[assignment?.skill ?? ""]
        ?? defaultPracticeActions(item.attempts);
      runSimulation(state, {
        scenario_id: assignment?.scenario_id ?? scenario.scenario_id,
        actions,
        now,
        assignment_id: item.assignment_id,
      });
      simulations += 1;
      if (item.attempts >= 2) validateTraining(state, { assignment_id: item.assignment_id, now });
    }
  }
  state.training_active = simulations > 0;
  state.last_tick_at = now;
  const selling = (input.qualified_pipeline ?? 0) > 0 || (input.ready_inventory ?? 0) > 0;
  const activity = state.training_active ? "ACTIVE" : selling ? "MONITORING" : state.observations.length ? "MONITORING" : "IDLE";
  const generic = activity === "ACTIVE"
    ? PUBLIC_SALES_LEARNING_ACTIVITY[0]
    : activity === "MONITORING"
      ? PUBLIC_SALES_LEARNING_ACTIVITY[4]
      : "Monitoring sales activity";
  return {
    activity,
    generic_activity: generic,
    training_active: state.training_active,
    selling_continued: selling || state.capacity.selling_capacity > 0,
    assignments_created: assignments.length,
    simulations_run: simulations,
    observations: state.observations.length,
  };
}

function defaultPracticeActions(attempts: number): string[] {
  if (attempts <= 0) return ["pitch", "discount"];
  if (attempts === 1) return ["ask_discovery", "present_offer"];
  return ["ask_discovery", "ask_problem", "clarify_objection", "isolate_objection", "respond_objection", "qualify", "ask_close", "follow_up", "schedule_next"];
}
