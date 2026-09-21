import { SALES_SKILL_IDS, type SalesSkillId } from "./contract";
import { defaultOccupancyNpvKnowledge } from "./method";
import type { SalesAgentSkillProfile, SalesLearningMetrics, SalesLearningState, SkillDimension } from "./types";

export function emptySkillDimension(skill: SalesSkillId): SkillDimension {
  return {
    skill,
    state: "UNASSESSED",
    score: null,
    confidence: 0,
    sample_size: 0,
    trend: "UNKNOWN",
    last_evaluated_at: null,
    evidence: [],
  };
}

export function emptySkillProfile(agentId: string, now: string): SalesAgentSkillProfile {
  return {
    agent_id: agentId,
    updated_at: now,
    dimensions: Object.fromEntries(SALES_SKILL_IDS.map((skill) => [skill, emptySkillDimension(skill)])) as SalesAgentSkillProfile["dimensions"],
  };
}

export function emptyLearningMetrics(): SalesLearningMetrics {
  return {
    interactions_observed: 0,
    agents_evaluated: 0,
    coaching_assignments: 0,
    simulations_completed: 0,
    skills_improved: 0,
    skills_requiring_training: 0,
    new_objection_patterns: 0,
    validated_guidance_changes: 0,
  };
}

export function emptySalesLearningState(): SalesLearningState {
  return {
    observations: [],
    profiles: {},
    assignments: [],
    queue: [],
    simulations: [],
    guidance: [{
      guidance_id: "guidance:infinity-sales-method:v1.0",
      title: "Infinity Sales Method",
      version: "v1.0",
      scope: "GLOBAL",
      skill: null,
      promotion: "VERIFIED_GUIDANCE",
      constraints: [
        "discover_before_pitch",
        "qualify_before_close",
        "isolate_objection_before_respond",
        "no_unsupported_claims",
        "suppression_overrides_training",
      ],
      created_at: "2026-09-16T00:00:00.000Z",
      validated_at: "2026-09-16T00:00:00.000Z",
    }],
    objection_patterns: [],
    follow_up_patterns: [],
    knowledge: { occupancynpv: defaultOccupancyNpvKnowledge() },
    capacity: { selling_capacity: 6, monitoring_capacity: 2, training_capacity: 2 },
    metrics: emptyLearningMetrics(),
    last_tick_at: null,
    training_active: false,
    events: [],
  };
}

const defaultState = emptySalesLearningState();

export function getDefaultSalesLearningState(): SalesLearningState {
  return defaultState;
}

export function resetSalesLearningState(state: SalesLearningState = defaultState): void {
  const empty = emptySalesLearningState();
  state.observations.length = 0;
  state.assignments.length = 0;
  state.queue.length = 0;
  state.simulations.length = 0;
  state.guidance.splice(0, state.guidance.length, ...empty.guidance);
  state.objection_patterns.length = 0;
  state.follow_up_patterns.length = 0;
  state.events.length = 0;
  state.profiles = {};
  state.knowledge = { occupancynpv: defaultOccupancyNpvKnowledge() };
  state.capacity = { ...empty.capacity };
  state.metrics = emptyLearningMetrics();
  state.last_tick_at = null;
  state.training_active = false;
}

export function replaceSalesLearningState(target: SalesLearningState, source: SalesLearningState): SalesLearningState {
  resetSalesLearningState(target);
  target.observations.push(...source.observations);
  target.assignments.push(...source.assignments);
  target.queue.push(...source.queue);
  target.simulations.push(...source.simulations);
  target.guidance.splice(0, target.guidance.length, ...source.guidance);
  target.objection_patterns.push(...source.objection_patterns);
  target.follow_up_patterns.push(...source.follow_up_patterns);
  target.events.push(...source.events);
  target.profiles = { ...source.profiles };
  target.knowledge = { ...source.knowledge };
  target.capacity = { ...source.capacity };
  target.metrics = { ...source.metrics };
  target.last_tick_at = source.last_tick_at;
  target.training_active = source.training_active;
  return target;
}
