export const REASONING_ENGINE_NAME = "reasoning_engine";

export const REASONING_ADVISORY_CAPABILITY_KEY = "reasoning.execute_advisory";

export const GOVERNED_REASONING_SCHEMA_VERSION = "governed_reasoning_v1";

export const GOVERNED_REASONING_PROMPT_VERSION = "governed_reasoning_prompt_v1";

export const GOVERNED_REASONING_MODES = ["mock", "shadow", "advisory", "disabled"] as const;

export type GovernedReasoningMode = (typeof GOVERNED_REASONING_MODES)[number];

export const GOVERNED_RECOMMENDATIONS = [
  "reject",
  "monitor",
  "research_more",
  "validate_again",
  "proceed_to_executive_review",
] as const;

export type GovernedRecommendation = (typeof GOVERNED_RECOMMENDATIONS)[number];

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";
