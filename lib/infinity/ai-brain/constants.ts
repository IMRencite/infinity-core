export const AI_BRAIN_SCHEMA_VERSION = "ai_brain_reasoning_v1";

export const AI_BRAIN_PROMPT_VERSION = "ai_brain_prompt_v1";

export const AI_BRAIN_PROVIDER_IDS = ["mock", "openai", "anthropic", "google"] as const;

export type AiBrainProviderId = (typeof AI_BRAIN_PROVIDER_IDS)[number];

export const AI_BRAIN_OBJECTIVE_TYPES = [
  "market_research",
  "opportunity_identification",
  "strategic_analysis",
  "mission_planning",
  "general",
] as const;

export type AiBrainObjectiveType = (typeof AI_BRAIN_OBJECTIVE_TYPES)[number];

export const AI_BRAIN_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

export type AiBrainRiskLevel = (typeof AI_BRAIN_RISK_LEVELS)[number];

export const AI_BRAIN_ACTION_TYPES = [
  "investigate_opportunity",
  "research_market",
  "validate_hypothesis",
  "monitor_signal",
  "defer_decision",
  "request_more_information",
  "propose_mission",
  "analyze_constraint",
] as const;

export type AiBrainActionType = (typeof AI_BRAIN_ACTION_TYPES)[number];

/** Capabilities the AI Brain may reference — read/analysis only; never external mutation. */
export const AI_BRAIN_ALLOWED_CAPABILITIES = [
  "reasoning.read",
  "reasoning.execute_advisory",
  "research.summarize_internal_evidence",
  "discovery.read",
  "validation.read",
  "executive.read",
  "planning.read",
  "mission.read",
] as const;

export type AiBrainAllowedCapability = (typeof AI_BRAIN_ALLOWED_CAPABILITIES)[number];

export const AI_BRAIN_MISSION_TYPES = [
  "discover_opportunities",
  "market_research",
  "opportunity_validation",
  "strategic_exploration",
  "general_investigation",
] as const;

export type AiBrainMissionType = (typeof AI_BRAIN_MISSION_TYPES)[number];

export const AI_BRAIN_MISSION_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type AiBrainMissionPriority = (typeof AI_BRAIN_MISSION_PRIORITIES)[number];

export const AI_BRAIN_RUN_STATUSES = [
  "requested",
  "provider_called",
  "validated",
  "completed",
  "failed",
  "policy_blocked",
  "validation_failed",
] as const;

export type AiBrainRunStatus = (typeof AI_BRAIN_RUN_STATUSES)[number];

export const AI_BRAIN_FAILURE_CLASSIFICATIONS = [
  "provider_disabled",
  "provider_unavailable",
  "authentication_failure",
  "unsupported_model",
  "timeout",
  "rate_limit",
  "malformed_response",
  "schema_validation_failure",
  "budget_rejection",
  "unsupported_action_type",
  "unsupported_capability",
  "oversized_output",
  "prompt_injection_blocked",
  "configuration_error",
] as const;

export type AiBrainFailureClassification = (typeof AI_BRAIN_FAILURE_CLASSIFICATIONS)[number];

export const AI_BRAIN_LIMITS = {
  maxObservations: 24,
  maxAssumptions: 16,
  maxUnknowns: 16,
  maxCandidateActions: 12,
  maxAlternativeActions: 8,
  maxProposedSteps: 16,
  maxSuccessCriteria: 12,
  maxConstraints: 12,
  maxSummaryLength: 4_000,
  maxDescriptionLength: 2_000,
  maxDependencies: 8,
} as const;

export const DEFAULT_AI_REASONING_MODEL = "gpt-5.6-terra";

export const FIRST_INTELLIGENCE_TEST_OBJECTIVE =
  "Identify three plausible online business opportunities that a small autonomous software company could investigate with an initial operating budget below $500.";
