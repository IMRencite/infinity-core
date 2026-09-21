import type { ObjectionClass, SalesSkillId, SimulationMode } from "./contract";
import { classifySalesStage, ensureProfile, evaluateInteractionSkills, inferObservationFlags } from "./evaluate";
import { classifyObjection, defaultFollowUpPacingHours } from "./method";
import type {
  CoachingAssignment,
  ProspectSalesContext,
  SalesCapacity,
  SalesInteractionObservation,
  SalesLearningState,
  SalesTurn,
  SimulationResult,
  SimulationScenario,
  TrainingQueueItem,
  VersionedGuidance,
} from "./types";

export const DEFAULT_AGENT_ID = "sales-outbound-runtime" as const;

export const SIMULATION_CATALOG: SimulationScenario[] = [
  { scenario_id: "price-sensitive-owner", mode: "OBJECTION_DRILL", title: "Interested but price-sensitive", industry: "commercial real estate", role: "owner", temperament: "cautious", venture_id: "occupancynpv", problem: "vacancy cost is unclear", urgency: "MEDIUM", objection: "PRICE", budget: "CONSTRAINED", authority: "DECISION_MAKER", interest: "HIGH", communication_style: "direct" },
  { scenario_id: "skeptical-owner", mode: "DISCOVERY_DRILL", title: "Skeptical owner", industry: "commercial real estate", role: "owner", temperament: "skeptical", venture_id: "occupancynpv", problem: "does not trust another tool", urgency: "LOW", objection: "TRUST", budget: "UNKNOWN", authority: "DECISION_MAKER", interest: "LOW", communication_style: "short" },
  { scenario_id: "busy-decision-maker", mode: "QUALIFICATION_DRILL", title: "Busy decision maker", industry: "property operations", role: "operator", temperament: "impatient", venture_id: "occupancynpv", problem: "no time for long pitches", urgency: "HIGH", objection: "TIMING", budget: "AVAILABLE", authority: "DECISION_MAKER", interest: "MEDIUM", communication_style: "terse" },
  { scenario_id: "wrong-decision-maker", mode: "QUALIFICATION_DRILL", title: "Wrong decision maker", industry: "brokerage", role: "analyst", temperament: "helpful", venture_id: "occupancynpv", problem: "cannot approve", urgency: "LOW", objection: "AUTHORITY", budget: "UNKNOWN", authority: "NONE", interest: "MEDIUM", communication_style: "polite" },
  { scenario_id: "happy-current-provider", mode: "OBJECTION_DRILL", title: "Happy with current provider", industry: "commercial real estate", role: "broker", temperament: "loyal", venture_id: "occupancynpv", problem: "switching cost", urgency: "LOW", objection: "CURRENT_PROVIDER", budget: "AVAILABLE", authority: "INFLUENCER", interest: "LOW", communication_style: "defensive" },
  { scenario_id: "urgent-problem", mode: "CLOSING_DRILL", title: "Urgent occupancy problem", industry: "commercial real estate", role: "owner", temperament: "urgent", venture_id: "occupancynpv", problem: "lease decision this week", urgency: "HIGH", objection: "RISK", budget: "AVAILABLE", authority: "DECISION_MAKER", interest: "HIGH", communication_style: "fast" },
  { scenario_id: "low-urgency", mode: "FOLLOW_UP_DRILL", title: "Low urgency", industry: "brokerage", role: "broker", temperament: "passive", venture_id: "occupancynpv", problem: "maybe later", urgency: "LOW", objection: "TIMING", budget: "UNKNOWN", authority: "INFLUENCER", interest: "LOW", communication_style: "vague" },
  { scenario_id: "needs-partner-approval", mode: "QUALIFICATION_DRILL", title: "Needs partner approval", industry: "brokerage", role: "partner", temperament: "careful", venture_id: "occupancynpv", problem: "shared decision", urgency: "MEDIUM", objection: "INTERNAL_APPROVAL", budget: "AVAILABLE", authority: "INFLUENCER", interest: "HIGH", communication_style: "consultative" },
  { scenario_id: "competitor-comparison", mode: "OBJECTION_DRILL", title: "Competitor comparison", industry: "commercial real estate", role: "operator", temperament: "analytical", venture_id: "occupancynpv", problem: "comparing tools", urgency: "MEDIUM", objection: "COMPETITOR", budget: "AVAILABLE", authority: "DECISION_MAKER", interest: "MEDIUM", communication_style: "detailed" },
  { scenario_id: "send-information", mode: "FOLLOW_UP_DRILL", title: "Send me information", industry: "brokerage", role: "broker", temperament: "busy", venture_id: "occupancynpv", problem: "wants a deck", urgency: "LOW", objection: "SEND_INFORMATION", budget: "UNKNOWN", authority: "INFLUENCER", interest: "MEDIUM", communication_style: "deflecting" },
  { scenario_id: "not-interested", mode: "DISCOVERY_DRILL", title: "Not interested", industry: "commercial real estate", role: "owner", temperament: "closed", venture_id: "occupancynpv", problem: "unknown", urgency: "LOW", objection: "NOT_INTERESTED", budget: "UNKNOWN", authority: "DECISION_MAKER", interest: "LOW", communication_style: "abrupt" },
];

export function recordSalesInteraction(state: SalesLearningState, input: {
  id?: string;
  agent_id?: string;
  venture_id?: string;
  prospect_id: string;
  channel?: SalesInteractionObservation["channel"];
  now: string;
  turns: SalesTurn[];
  questions?: string[];
  objections?: Array<ObjectionClass | string>;
  qualification_signals?: string[];
  commitments?: string[];
  outcome: string;
  evidence_refs?: string[];
  known_questions?: string[];
  known_objections?: string[];
  suppressed?: boolean;
  used_known_context?: boolean;
  invented_problem?: boolean;
  unsupported_claim?: boolean;
  wrong_venture?: boolean;
  guidance_version_ids?: string[];
}): SalesInteractionObservation {
  const questions = input.questions ?? input.turns.filter((row) => row.action.startsWith("ask_")).map((row) => row.text);
  const objections = (input.objections ?? input.turns.filter((row) => row.action.includes("objection") || /price|not interested|send/.test(row.text.toLowerCase())).map((row) => classifyObjection(row.text)))
    .map((row) => typeof row === "string" && row.length < 24 && row === row.toUpperCase() ? row as ObjectionClass : classifyObjection(String(row)));
  const flags = inferObservationFlags({
    turns: input.turns,
    questions,
    known_questions: input.known_questions,
    known_objections: input.known_objections,
    suppressed: input.suppressed,
    used_known_context: input.used_known_context,
    invented_problem: input.invented_problem,
    unsupported_claim: input.unsupported_claim,
    wrong_venture: input.wrong_venture,
  });
  const observation: SalesInteractionObservation = {
    id: input.id ?? `obs:${input.prospect_id}:${input.now}`,
    agent_id: input.agent_id ?? DEFAULT_AGENT_ID,
    venture_id: input.venture_id ?? "occupancynpv",
    prospect_id: input.prospect_id,
    channel: input.channel ?? "email",
    stage: "OPEN",
    started_at: input.now,
    completed_at: input.now,
    turns: input.turns,
    questions,
    objections,
    qualification_signals: input.qualification_signals ?? [],
    commitments: input.commitments ?? [],
    outcome: input.outcome,
    evidence_refs: input.evidence_refs ?? [],
    privacy_classification: "INTERNAL_ONLY",
    ...flags,
    guidance_version_ids: input.guidance_version_ids ?? activeGuidance(state).map((row) => `${row.guidance_id}:${row.version}`),
    inference_separated: true,
  };
  observation.stage = classifySalesStage(observation).stage;
  if (!state.observations.some((row) => row.id === observation.id)) {
    state.observations.push(observation);
    state.metrics.interactions_observed += 1;
    state.events.push("sales.learning.observation.created");
  }
  const profile = ensureProfile(state.profiles, observation.agent_id, input.now);
  evaluateInteractionSkills({ profile, observation, now: input.now });
  state.metrics.agents_evaluated = Object.keys(state.profiles).length;
  for (const objection of observation.objections) {
    const existing = state.objection_patterns.find((row) => row.class === objection && row.venture_id === observation.venture_id);
    if (existing) {
      existing.count += 1;
      existing.last_outcome = observation.outcome;
    } else {
      state.objection_patterns.push({ class: objection, venture_id: observation.venture_id, count: 1, last_outcome: observation.outcome });
      state.metrics.new_objection_patterns += 1;
    }
  }
  return observation;
}

export function activeGuidance(state: SalesLearningState, skill?: SalesSkillId): VersionedGuidance[] {
  const verified = state.guidance.filter((row) => row.promotion === "VERIFIED_GUIDANCE");
  if (skill) {
    const specific = verified.filter((row) => row.skill === skill);
    if (specific.length) return specific;
  }
  return verified.filter((row) => !skill || row.skill == null);
}

export function planCoaching(state: SalesLearningState, now: string, agentId = DEFAULT_AGENT_ID): CoachingAssignment[] {
  const profile = ensureProfile(state.profiles, agentId, now);
  const created: CoachingAssignment[] = [];
  const weak = Object.values(profile.dimensions)
    .filter((row) => row.sample_size > 0 && (row.state === "DEVELOPING" || (row.score ?? 1) < 0.5))
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  for (const dimension of weak.slice(0, 3)) {
    if (state.assignments.some((row) => row.agent_id === agentId && row.skill === dimension.skill && state.queue.some((item) => item.assignment_id === row.assignment_id && item.state !== "VALIDATED"))) {
      continue;
    }
    const scenario = scenarioForSkill(dimension.skill);
    const assignment: CoachingAssignment = {
      assignment_id: `coach:${agentId}:${dimension.skill}:${now}`,
      agent_id: agentId,
      skill: dimension.skill,
      reason: `${dimension.skill} is ${dimension.state} after ${dimension.sample_size} interactions`,
      evidence: dimension.evidence.slice(-4),
      training_objective: objectiveForSkill(dimension.skill),
      simulation_mode: scenario.mode,
      scenario_id: scenario.scenario_id,
      completion_criteria: "three-run validation with at least one PASS after a FAIL or DEVELOPING attempt",
      scope: "AGENT",
      created_at: now,
    };
    state.assignments.push(assignment);
    const item: TrainingQueueItem = {
      item_id: `train:${assignment.assignment_id}`,
      assignment_id: assignment.assignment_id,
      agent_id: agentId,
      state: "QUEUED",
      attempts: 0,
      last_result: null,
      created_at: now,
      updated_at: now,
    };
    state.queue.push(item);
    state.metrics.coaching_assignments += 1;
    state.events.push("sales.learning.coaching.assigned");
    created.push(assignment);
  }
  state.metrics.skills_requiring_training = weak.length;
  return created;
}

export function scenarioForSkill(skill: SalesSkillId): SimulationScenario {
  if (skill === "OBJECTION_RESOLUTION" || skill === "OBJECTION_CLARIFICATION") return SIMULATION_CATALOG[0]!;
  if (skill === "DISCOVERY" || skill === "QUESTION_QUALITY" || skill === "LISTENING") return SIMULATION_CATALOG[1]!;
  if (skill === "FOLLOW_UP" || skill === "PERSISTENCE") return SIMULATION_CATALOG[9]!;
  if (skill === "CLOSING") return SIMULATION_CATALOG[5]!;
  if (skill === "QUALIFICATION") return SIMULATION_CATALOG[2]!;
  return SIMULATION_CATALOG[10]!;
}

export function objectiveForSkill(skill: SalesSkillId): string {
  if (skill === "DISCOVERY") return "improve discovery depth and ask before any offer";
  if (skill === "OBJECTION_RESOLUTION") return "improve price objection isolation before any response";
  if (skill === "QUALIFICATION") return "stop pitching or closing before qualification";
  if (skill === "CONSEQUENCE_DEVELOPMENT") return "improve consequence questions";
  if (skill === "CLOSING") return "improve clear close asks after qualification";
  if (skill === "FOLLOW_UP") return "improve concise, paced follow-up";
  if (skill === "VENTURE_ALIGNMENT") return "improve venture selection against known ICP";
  if (skill === "LISTENING") return "improve listening and stop repeating known facts";
  return `improve ${skill.toLowerCase().replace(/_/g, " ")}`;
}

export function resolveCapacity(input: {
  ready_inventory: number;
  qualified_pipeline: number;
  weak_skills: number;
}): SalesCapacity {
  const demand = input.ready_inventory + input.qualified_pipeline;
  if (demand >= 8) return { selling_capacity: 8, monitoring_capacity: 2, training_capacity: 1 };
  if (input.weak_skills >= 2 && demand <= 2) return { selling_capacity: 2, monitoring_capacity: 2, training_capacity: 4 };
  return { selling_capacity: 5, monitoring_capacity: 2, training_capacity: 2 };
}

export function scoreSimulation(mode: SimulationMode, actions: string[]): { score: number; result: "FAIL" | "DEVELOPING" | "PASS"; evidence: string[] } {
  const evidence: string[] = [];
  let score = 0.35;
  const asked = actions.filter((row) => row.startsWith("ask_")).length;
  const pitchedEarly = actions.findIndex((row) => row === "present_offer" || row === "pitch") >= 0
    && actions.findIndex((row) => row.startsWith("ask_")) > actions.findIndex((row) => row === "present_offer" || row === "pitch");
  if (mode === "DISCOVERY_DRILL" || mode === "FULL_SALES_CONVERSATION") {
    if (asked >= 2 && !actions.includes("pitch") && !pitchedEarly) {
      score = 0.88;
      evidence.push("asked before offer");
    } else if (asked >= 1) {
      score = 0.55;
      evidence.push("partial discovery");
    } else {
      evidence.push("no discovery questions");
    }
  }
  if (mode === "OBJECTION_DRILL") {
    const isolated = actions.includes("clarify_objection") && actions.includes("isolate_objection");
    const discounted = actions.includes("discount");
    if (isolated && actions.includes("respond_objection") && !discounted) {
      score = 0.9;
      evidence.push("listened, clarified, isolated, then responded");
    } else if (actions.includes("clarify_objection") || actions.includes("isolate_objection")) {
      score = 0.58;
      evidence.push("started objection loop but did not complete it");
    } else {
      evidence.push("responded or discounted before clarification");
    }
  }
  if (mode === "QUALIFICATION_DRILL") {
    score = actions.includes("qualify") && !actions.includes("ask_close") ? 0.86 : actions.includes("qualify") ? 0.6 : 0.3;
    evidence.push(actions.includes("qualify") ? "qualification present" : "closed or pitched without qualification");
  }
  if (mode === "CLOSING_DRILL") {
    score = actions.includes("qualify") && actions.includes("ask_close") ? 0.84 : 0.32;
    evidence.push("close requires prior qualification");
  }
  if (mode === "FOLLOW_UP_DRILL") {
    score = actions.includes("follow_up") && actions.includes("schedule_next") && !actions.includes("instant_reply") ? 0.85 : 0.34;
    evidence.push(actions.includes("instant_reply") ? "instant bot-like reply" : "paced follow-up");
  }
  const result = score >= 0.8 ? "PASS" : score >= 0.5 ? "DEVELOPING" : "FAIL";
  return { score, result, evidence };
}

export function runSimulation(state: SalesLearningState, input: {
  agent_id?: string;
  scenario_id: string;
  actions: string[];
  now: string;
  assignment_id?: string;
}): SimulationResult {
  const scenario = SIMULATION_CATALOG.find((row) => row.scenario_id === input.scenario_id) ?? SIMULATION_CATALOG[0]!;
  const scored = scoreSimulation(scenario.mode, input.actions);
  const result: SimulationResult = {
    simulation_id: `sim:${input.scenario_id}:${input.now}`,
    scenario_id: scenario.scenario_id,
    agent_id: input.agent_id ?? DEFAULT_AGENT_ID,
    mode: scenario.mode,
    actions: input.actions,
    score: scored.score,
    result: scored.result,
    evidence: scored.evidence,
    completed_at: input.now,
  };
  state.simulations.push(result);
  state.metrics.simulations_completed += 1;
  state.events.push("sales.learning.simulation.completed");
  const item = state.queue.find((row) => row.assignment_id === input.assignment_id) ?? state.queue.find((row) => row.agent_id === result.agent_id && (row.state === "QUEUED" || row.state === "ACTIVE" || row.state === "RETRY"));
  if (item) {
    item.attempts += 1;
    item.last_result = result.result;
    item.updated_at = input.now;
    item.state = result.result === "PASS" && item.attempts >= 2 ? "COMPLETED" : result.result === "FAIL" ? "RETRY" : "ACTIVE";
  }
  return result;
}

export function validateTraining(state: SalesLearningState, input: { assignment_id: string; now: string }): VersionedGuidance | null {
  const assignment = state.assignments.find((row) => row.assignment_id === input.assignment_id);
  const item = state.queue.find((row) => row.assignment_id === input.assignment_id);
  if (!assignment || !item) return null;
  const related = state.simulations.filter((row) => row.agent_id === assignment.agent_id && row.scenario_id === assignment.scenario_id);
  const passed = related.some((row) => row.result === "PASS");
  const struggled = related.some((row) => row.result === "FAIL" || row.result === "DEVELOPING");
  if (!passed || !struggled || related.length < 2) {
    item.state = "RETRY";
    return null;
  }
  item.state = "VALIDATED";
  item.updated_at = input.now;
  const profile = ensureProfile(state.profiles, assignment.agent_id, input.now);
  const dim = profile.dimensions[assignment.skill];
  const previous = dim.state;
  dim.score = Number(Math.min(0.92, (dim.score ?? 0.4) + 0.25).toFixed(3));
  dim.state = dim.score >= 0.88 ? "STRONG" : "COMPETENT";
  dim.confidence = Number(Math.min(0.9, dim.confidence + 0.2).toFixed(3));
  dim.trend = "UP";
  dim.last_evaluated_at = input.now;
  dim.evidence.push({ observation: `validated ${assignment.skill} after ${related.length} simulations`, interaction_id: related.at(-1)?.simulation_id ?? null, at: input.now });
  if (previous !== dim.state && (dim.state === "COMPETENT" || dim.state === "STRONG" || dim.state === "EXPERT")) {
    state.metrics.skills_improved += 1;
  }
  const guidance: VersionedGuidance = {
    guidance_id: `guidance:${assignment.skill}:${assignment.agent_id}`,
    title: `${assignment.skill} Guidance`,
    version: `v${state.guidance.filter((row) => row.guidance_id === `guidance:${assignment.skill}:${assignment.agent_id}`).length + 1}`,
    scope: "AGENT",
    skill: assignment.skill,
    promotion: "VERIFIED_GUIDANCE",
    constraints: constraintsForSkill(assignment.skill),
    created_at: input.now,
    validated_at: input.now,
  };
  state.guidance.push(guidance);
  state.metrics.validated_guidance_changes += 1;
  state.events.push("sales.learning.guidance.validated");
  return guidance;
}

export function constraintsForSkill(skill: SalesSkillId): string[] {
  if (skill === "DISCOVERY") return ["discover_before_pitch", "minimum_two_questions"];
  if (skill === "OBJECTION_RESOLUTION" || skill === "OBJECTION_CLARIFICATION") return ["isolate_objection_before_respond", "no_early_discount"];
  if (skill === "FOLLOW_UP") return ["paced_follow_up", "schedule_next_step"];
  if (skill === "QUALIFICATION") return ["qualify_before_close"];
  if (skill === "CLOSING") return ["clear_ask_after_qualification"];
  return ["infinity_sales_method_v1"];
}

export function planGuidedActions(state: SalesLearningState, input: {
  agent_id?: string;
  skill?: SalesSkillId;
  suppressed?: boolean;
  known_context?: string[];
}): string[] {
  if (input.suppressed) return ["stop_outreach"];
  const guidance = activeGuidance(state, input.skill);
  const actions: string[] = [];
  if (input.known_context?.length) actions.push("use_known_context");
  if (guidance.some((row) => row.constraints.includes("discover_before_pitch") || row.constraints.includes("minimum_two_questions"))) {
    actions.push("ask_discovery", "ask_problem");
  }
  if (guidance.some((row) => row.constraints.includes("isolate_objection_before_respond"))) {
    actions.push("clarify_objection", "isolate_objection", "respond_objection");
  }
  if (guidance.some((row) => row.constraints.includes("qualify_before_close") || row.constraints.includes("clear_ask_after_qualification"))) {
    actions.push("qualify", "ask_close");
  }
  if (guidance.some((row) => row.constraints.includes("paced_follow_up"))) {
    actions.push("follow_up", "schedule_next");
  }
  if (!actions.length) actions.push("ask_discovery", "qualify");
  return actions;
}

export function consumeProspectContext(context: ProspectSalesContext): { used: string[]; skip_questions: string[] } {
  const used: string[] = [];
  const skip: string[] = [];
  if (context.identity) {
    used.push(`known identity: ${context.identity}`);
    skip.push("what is your name");
  }
  if (context.organization) {
    used.push(`known organization: ${context.organization}`);
    skip.push("what company are you with");
  }
  if (context.role) used.push(`known role: ${context.role}`);
  if (context.known_objections.length) used.push(`known objections: ${context.known_objections.join(",")}`);
  if (context.venture_matches.length) used.push(`venture matches: ${context.venture_matches.join(",")}`);
  return { used, skip_questions: skip };
}

export function recordFollowUpPattern(state: SalesLearningState, input: {
  interval_hours: number;
  style: string;
  response: boolean;
  meeting: boolean;
  complaint: boolean;
}): void {
  const row = state.follow_up_patterns.find((item) => item.interval_hours === input.interval_hours && item.style === input.style)
    ?? (state.follow_up_patterns[state.follow_up_patterns.push({ interval_hours: input.interval_hours, style: input.style, responses: 0, meetings: 0, complaints: 0 }) - 1]!);
  if (input.response) row.responses += 1;
  if (input.meeting) row.meetings += 1;
  if (input.complaint) row.complaints += 1;
}

export function recommendedFollowUpHours(state: SalesLearningState, stage: string, urgency: "LOW" | "MEDIUM" | "HIGH"): number {
  const best = [...state.follow_up_patterns].filter((row) => row.complaints === 0 && row.responses > 0).sort((a, b) => b.meetings - a.meetings)[0];
  return best?.interval_hours ?? defaultFollowUpPacingHours(stage, urgency);
}

export function suppressionOverridesTraining(input: { suppressed: boolean; planned_actions: string[] }): string[] {
  if (!input.suppressed) return input.planned_actions;
  return ["stop_outreach"];
}
