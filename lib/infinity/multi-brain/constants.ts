export const MULTI_BRAIN_VERSION = "multi_brain_v1";

export const EXECUTION_STRATEGIES = [
  "SIMPLE",
  "STANDARD",
  "COMPLEX",
  "HIGH_VALUE",
  "CRITICAL",
] as const;

export type ExecutionStrategy = (typeof EXECUTION_STRATEGIES)[number];

export const BRAIN_ROLES = [
  "primary",
  "specialist",
  "critic",
  "reviewer",
  "synthesizer",
] as const;

export type BrainRole = (typeof BRAIN_ROLES)[number];

export const TASK_COMPLEXITY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type TaskComplexityLevel = (typeof TASK_COMPLEXITY_LEVELS)[number];

export const MODEL_CAPABILITIES = [
  "reasoning",
  "coding",
  "architecture",
  "research_grounding",
  "long_context",
  "creative_generation",
  "structured_output",
  "review_criticism",
  "debugging",
] as const;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

export const DEFAULT_COST_LIMITS = {
  maxTaskCostUsd: 5,
  maxSessionCostUsd: 25,
  maxRepairCostUsd: 10,
} as const;
