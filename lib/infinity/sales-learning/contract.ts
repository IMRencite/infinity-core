export const SALES_LEARNING_CONTRACT = "SalesLearningCoachingEngineV1" as const;
export const INFINITY_SALES_METHOD_ID = "infinity-sales-method" as const;
export const INFINITY_SALES_METHOD_VERSION = "v1.0" as const;
export const SALES_LEARNING_SCOPE = "sales-learning-coaching-state" as const;
export const SALES_LEARNING_OWNER = "INFINITY_OS" as const;

export const INFINITY_SALES_IDENTITY = "IMR's autonomous venture operating system" as const;

export const INFINITY_SALES_PROCESS = [
  "OPEN",
  "DISCOVER",
  "IDENTIFY_PROBLEM",
  "DEVELOP_CONSEQUENCE",
  "DEFINE_DESIRED_STATE",
  "QUALIFY",
  "ALIGN_VENTURE",
  "BUILD_CERTAINTY",
  "RESOLVE_OBJECTIONS",
  "COMMIT_CLOSE",
  "FOLLOW_UP",
  "LEARN",
] as const;
export type InfinitySalesProcessStep = (typeof INFINITY_SALES_PROCESS)[number];

export const SALES_STAGE_IDS = [
  "OPEN",
  "DISCOVERY",
  "PROBLEM",
  "CONSEQUENCE",
  "DESIRED_STATE",
  "QUALIFICATION",
  "VENTURE_ALIGNMENT",
  "PRESENTATION",
  "OBJECTION",
  "CLOSE",
  "FOLLOW_UP",
  "COMPLETE",
] as const;
export type SalesStageId = (typeof SALES_STAGE_IDS)[number];

export const SALES_SKILL_IDS = [
  "OPENING",
  "RAPPORT",
  "DISCOVERY",
  "QUESTION_QUALITY",
  "LISTENING",
  "PROBLEM_IDENTIFICATION",
  "CONSEQUENCE_DEVELOPMENT",
  "DESIRED_STATE_DISCOVERY",
  "QUALIFICATION",
  "VENTURE_ALIGNMENT",
  "VALUE_COMMUNICATION",
  "CERTAINTY_BUILDING",
  "OBJECTION_CLARIFICATION",
  "OBJECTION_RESOLUTION",
  "CONVERSATION_CONTROL",
  "COMMUNICATION_STYLE",
  "CLOSING",
  "FOLLOW_UP",
  "PERSISTENCE",
  "CONCISENESS",
  "PERSONALIZATION",
  "COMPLIANCE",
  "ACCURACY",
] as const;
export type SalesSkillId = (typeof SALES_SKILL_IDS)[number];

export const SALES_SKILL_STATES = ["UNASSESSED", "DEVELOPING", "COMPETENT", "STRONG", "EXPERT"] as const;
export type SalesSkillState = (typeof SALES_SKILL_STATES)[number];

export const SALES_CHANNELS = [
  "email",
  "chat",
  "sms",
  "voice",
  "meeting",
  "follow_up",
  "proposal",
  "simulation",
] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const OBJECTION_CLASSES = [
  "PRICE",
  "TIMING",
  "TRUST",
  "NEED",
  "AUTHORITY",
  "COMPETITOR",
  "CURRENT_PROVIDER",
  "IMPLEMENTATION",
  "RISK",
  "ROI",
  "NOT_INTERESTED",
  "SEND_INFORMATION",
  "NEED_TO_THINK",
  "INTERNAL_APPROVAL",
  "OTHER",
] as const;
export type ObjectionClass = (typeof OBJECTION_CLASSES)[number];

export const OBJECTION_LOOP = ["LISTEN", "CLARIFY", "ISOLATE", "UNDERSTAND", "RESPOND", "CONFIRM", "RETURN_TO_DECISION"] as const;
export type ObjectionLoopStep = (typeof OBJECTION_LOOP)[number];

export const TRAINING_QUEUE_STATES = ["QUEUED", "ACTIVE", "COMPLETED", "VALIDATED", "FAILED", "RETRY"] as const;
export type TrainingQueueState = (typeof TRAINING_QUEUE_STATES)[number];

export const SIMULATION_MODES = [
  "DISCOVERY_DRILL",
  "QUALIFICATION_DRILL",
  "OBJECTION_DRILL",
  "CLOSING_DRILL",
  "FOLLOW_UP_DRILL",
  "FULL_SALES_CONVERSATION",
] as const;
export type SimulationMode = (typeof SIMULATION_MODES)[number];

export const GUIDANCE_PROMOTION_STATES = ["OBSERVATION", "HYPOTHESIS", "SIMULATION", "CONTROLLED_VALIDATION", "VERIFIED_GUIDANCE"] as const;
export type GuidancePromotionState = (typeof GUIDANCE_PROMOTION_STATES)[number];

export const LEARNING_SCOPES = ["AGENT", "VENTURE", "GLOBAL"] as const;
export type LearningScope = (typeof LEARNING_SCOPES)[number];

export const SALES_CONTINUOUS_LEARNING_GATE = "SalesContinuousLearningGate" as const;
export const INFINITY_SALES_METHOD_ADHERENCE_GATE = "InfinitySalesMethodAdherenceGate" as const;
export const SALES_COACHING_EVIDENCE_GATE = "SalesCoachingEvidenceGate" as const;
export const SALES_TRAINING_PRIVACY_GATE = "SalesTrainingPrivacyGate" as const;

export const HQ_SALES_LEARNING_ROLES = ["Outbound", "Inbound", "Expansion", "Partnerships", "Closing", "Coaching"] as const;

export const PUBLIC_SALES_LEARNING_ACTIVITY = [
  "Running sales training",
  "Reviewing sales outcomes",
  "Improving objection handling",
  "Executing qualified outreach",
  "Monitoring sales activity",
] as const;
