import type {
  GuidancePromotionState,
  LearningScope,
  ObjectionClass,
  SalesChannel,
  SalesSkillId,
  SalesSkillState,
  SalesStageId,
  SimulationMode,
  TrainingQueueState,
} from "./contract";

export type SalesTurn = {
  actor: "AGENT" | "PROSPECT" | "SYSTEM";
  action: string;
  text: string;
  at: string;
};

export type SalesInteractionObservation = {
  id: string;
  agent_id: string;
  venture_id: string;
  prospect_id: string;
  channel: SalesChannel;
  stage: SalesStageId;
  started_at: string;
  completed_at: string | null;
  turns: SalesTurn[];
  questions: string[];
  objections: ObjectionClass[];
  qualification_signals: string[];
  commitments: string[];
  outcome: string;
  evidence_refs: string[];
  privacy_classification: "INTERNAL_ONLY";
  pitched_before_discovery: boolean;
  skipped_qualification: boolean;
  invented_problem: boolean;
  ignored_known_objection: boolean;
  repeated_known_question: boolean;
  unsupported_claim: boolean;
  wrong_venture_alignment: boolean;
  continued_after_suppression: boolean;
  used_known_context: boolean;
  guidance_version_ids: string[];
  inference_separated: true;
};

export type SkillEvidence = {
  observation: string;
  interaction_id: string | null;
  at: string;
};

export type SkillDimension = {
  skill: SalesSkillId;
  state: SalesSkillState;
  score: number | null;
  confidence: number;
  sample_size: number;
  trend: "UP" | "FLAT" | "DOWN" | "UNKNOWN";
  last_evaluated_at: string | null;
  evidence: SkillEvidence[];
};

export type SalesAgentSkillProfile = {
  agent_id: string;
  dimensions: Record<SalesSkillId, SkillDimension>;
  updated_at: string;
};

export type StageClassification = {
  stage: SalesStageId;
  confidence: number;
  evidence: string[];
};

export type CoachingAssignment = {
  assignment_id: string;
  agent_id: string;
  skill: SalesSkillId;
  reason: string;
  evidence: SkillEvidence[];
  training_objective: string;
  simulation_mode: SimulationMode;
  scenario_id: string;
  completion_criteria: string;
  scope: LearningScope;
  created_at: string;
};

export type TrainingQueueItem = {
  item_id: string;
  assignment_id: string;
  agent_id: string;
  state: TrainingQueueState;
  attempts: number;
  last_result: "FAIL" | "DEVELOPING" | "PASS" | null;
  created_at: string;
  updated_at: string;
};

export type SimulationScenario = {
  scenario_id: string;
  mode: SimulationMode;
  title: string;
  industry: string;
  role: string;
  temperament: string;
  venture_id: string;
  problem: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  objection: ObjectionClass;
  budget: "UNKNOWN" | "CONSTRAINED" | "AVAILABLE";
  authority: "NONE" | "INFLUENCER" | "DECISION_MAKER";
  interest: "LOW" | "MEDIUM" | "HIGH";
  communication_style: string;
};

export type SimulationResult = {
  simulation_id: string;
  scenario_id: string;
  agent_id: string;
  mode: SimulationMode;
  actions: string[];
  score: number;
  result: "FAIL" | "DEVELOPING" | "PASS";
  evidence: string[];
  completed_at: string;
};

export type VersionedGuidance = {
  guidance_id: string;
  title: string;
  version: string;
  scope: LearningScope;
  skill: SalesSkillId | null;
  promotion: GuidancePromotionState;
  constraints: string[];
  created_at: string;
  validated_at: string | null;
};

export type VentureSalesKnowledge = {
  venture_id: string;
  version: string;
  offers: string[];
  icp: string[];
  qualification_criteria: string[];
  differentiators: string[];
  proof: string[];
  pricing_rules: string[];
  approved_claims: string[];
  objections: Array<{ class: ObjectionClass; approach: string }>;
  disqualifiers: string[];
  next_steps: string[];
  compliance_rules: string[];
};

export type ProspectSalesContext = {
  identity: string | null;
  organization: string | null;
  role: string | null;
  business_context: string | null;
  known_signals: string[];
  venture_matches: string[];
  previous_interactions: string[];
  known_objections: ObjectionClass[];
  communication_eligibility: string[];
  suppressed: boolean;
};

export type SalesCapacity = {
  selling_capacity: number;
  monitoring_capacity: number;
  training_capacity: number;
};

export type SalesLearningMetrics = {
  interactions_observed: number;
  agents_evaluated: number;
  coaching_assignments: number;
  simulations_completed: number;
  skills_improved: number;
  skills_requiring_training: number;
  new_objection_patterns: number;
  validated_guidance_changes: number;
};

export type SalesLearningState = {
  observations: SalesInteractionObservation[];
  profiles: Record<string, SalesAgentSkillProfile>;
  assignments: CoachingAssignment[];
  queue: TrainingQueueItem[];
  simulations: SimulationResult[];
  guidance: VersionedGuidance[];
  objection_patterns: Array<{ class: ObjectionClass; venture_id: string; count: number; last_outcome: string }>;
  follow_up_patterns: Array<{ interval_hours: number; style: string; responses: number; meetings: number; complaints: number }>;
  knowledge: Record<string, VentureSalesKnowledge>;
  capacity: SalesCapacity;
  metrics: SalesLearningMetrics;
  last_tick_at: string | null;
  training_active: boolean;
  events: string[];
};

export type NamedSalesLearningGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type SalesLearningTickResult = {
  activity: "IDLE" | "MONITORING" | "ACTIVE";
  generic_activity: string;
  training_active: boolean;
  selling_continued: boolean;
  assignments_created: number;
  simulations_run: number;
  observations: number;
};
