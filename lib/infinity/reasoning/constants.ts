/** AI Reasoning Foundation v1 — advisory layer between Executive and Planner. */

export const REASONING_ENGINE_NAME = "ai_reasoning_engine";

export const REASONING_SESSION_STATUSES = [
  "draft",
  "context_ready",
  "awaiting_provider",
  "executing",
  "reflecting",
  "critiquing",
  "executive_review",
  "planning_handoff",
  "completed",
  "failed",
  "cancelled",
] as const;

export const REASONING_PIPELINE_STAGES = [
  "context_assembly",
  "constraint_injection",
  "prompt_construction",
  "provider_selection",
  "execution",
  "tool_resolution",
  "reflection",
  "critique",
  "executive_review",
  "planning_handoff",
  "persistence",
] as const;

export const REASONING_EVENT_TYPES = [
  "reasoning.started",
  "reasoning.context_ready",
  "reasoning.provider_selected",
  "reasoning.completed",
  "reasoning.failed",
  "reasoning.reflection_completed",
  "reasoning.critique_completed",
  "reasoning.executive_review_requested",
] as const;

export const PROMPT_TEMPLATE_ROLES = [
  "system",
  "developer",
  "mission",
  "opportunity",
  "validation",
  "executive",
  "planner",
  "reflection",
  "critique",
] as const;

export const MEMORY_SCOPES = [
  "short_term",
  "long_term_org",
  "mission",
  "opportunity",
  "executive",
  "reflection",
  "learning",
] as const;

export const KNOWN_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "gemini",
  "local",
  "future",
] as const;

/** Actions AI must never perform without explicit Executive authorization. */
export const EXECUTIVE_GATED_ACTIONS = [
  "create_venture",
  "allocate_capital",
  "approve_planning",
  "publish_content",
  "create_website",
  "deploy_code",
  "modify_policy",
] as const;

export const ADVISORY_OUTPUT_KINDS = [
  "recommendation",
  "explanation",
  "critique",
  "brainstorm",
  "reflection",
] as const;

export const DEFAULT_REASONING_RUNTIME_VERSION = "ai_reasoning_foundation_v1";

export function isReasoningSessionStatus(
  value: string,
): value is (typeof REASONING_SESSION_STATUSES)[number] {
  return (REASONING_SESSION_STATUSES as readonly string[]).includes(value);
}

export function isReasoningPipelineStage(
  value: string,
): value is (typeof REASONING_PIPELINE_STAGES)[number] {
  return (REASONING_PIPELINE_STAGES as readonly string[]).includes(value);
}

export function isReasoningEventType(
  value: string,
): value is (typeof REASONING_EVENT_TYPES)[number] {
  return (REASONING_EVENT_TYPES as readonly string[]).includes(value);
}
