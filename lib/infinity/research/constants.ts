export const GROUNDED_RESEARCH_SCHEMA_VERSION = "grounded_research_v1";

export const GROUNDED_RESEARCH_PROMPT_VERSION = "grounded_research_prompt_v3";

export const RESEARCH_PROVIDER_IDS = ["mock", "gemini"] as const;

export type ResearchProviderId = (typeof RESEARCH_PROVIDER_IDS)[number];

export const RESEARCH_RUN_STATUSES = [
  "requested",
  "provider_called",
  "validated",
  "completed",
  "failed",
  "policy_blocked",
  "validation_failed",
] as const;

export type ResearchRunStatus = (typeof RESEARCH_RUN_STATUSES)[number];

export const RESEARCH_FAILURE_CLASSIFICATIONS = [
  "provider_disabled",
  "provider_unavailable",
  "authentication_failure",
  "quota_exhausted",
  "rate_limit",
  "timeout",
  "malformed_response",
  "schema_validation_failure",
  "evidence_validation_failure",
  "grounding_unavailable",
  "budget_exceeded",
  "unsupported_model",
  "configuration_error",
  "unknown_provider_failure",
] as const;

export type ResearchFailureClassification = (typeof RESEARCH_FAILURE_CLASSIFICATIONS)[number];

/** Transport / API failures. Distinct from response grounding/evidence validation. */
export const RESEARCH_PROVIDER_TRANSPORT_FAILURES = [
  "provider_disabled",
  "provider_unavailable",
  "authentication_failure",
  "quota_exhausted",
  "rate_limit",
  "timeout",
  "unsupported_model",
  "unknown_provider_failure",
] as const;

export const RESEARCH_VALIDATION_FAILURES = [
  "malformed_response",
  "schema_validation_failure",
  "evidence_validation_failure",
  "grounding_unavailable",
] as const;

export function isResearchProviderTransportFailure(
  classification: string,
): boolean {
  return (RESEARCH_PROVIDER_TRANSPORT_FAILURES as readonly string[]).includes(classification);
}

export function isResearchValidationFailure(classification: string): boolean {
  return (RESEARCH_VALIDATION_FAILURES as readonly string[]).includes(classification);
}

export const EVIDENCE_SIGNAL_TYPES = [
  "search_demand",
  "customer_complaints",
  "pricing_pain",
  "workflow_inefficiency",
  "competitor_weakness",
  "competitor_presence",
  "growing_market",
  "underserved_niche",
  "purchase_intent",
  "recurring_problem",
  "regulatory_change",
  "technological_shift",
  "distribution_opportunity",
  "monetization_precedent",
  "capital_requirement",
  "time_to_revenue",
  "unknown",
] as const;

export type EvidenceSignalType = (typeof EVIDENCE_SIGNAL_TYPES)[number];

export const EVIDENCE_TYPES = ["direct_grounded", "inference_from_evidence", "ungrounded"] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_RELEVANCE_VALUES = ["positive", "negative", "mixed", "unknown"] as const;

export type EvidenceRelevance = (typeof EVIDENCE_RELEVANCE_VALUES)[number];

/** Persisted retry_count is attemptCount - 1. Provider calls = retry_count + 1. */
export function researchProviderCallCount(retryCount: number): number {
  if (!Number.isFinite(retryCount) || retryCount < 0) return 0;
  return Math.trunc(retryCount) + 1;
}

export const RESEARCH_LIMITS = {
  maxFindings: 12,
  maxEvidenceItems: 24,
  maxSources: 32,
  maxSummaryLength: 6_000,
  maxClaimLength: 2_000,
  maxLimitations: 12,
} as const;

export const DEFAULT_GEMINI_RESEARCH_MODEL = "gemini-3.5-flash";

export const GEMINI_GROUNDED_RESEARCH_TEST_OBJECTIVE =
  "Find current evidence of three recurring business/customer problems where people or companies appear to pay significant money, use inefficient/manual workflows, complain about existing solutions, or lack a strong solution. Return evidence and sources. Do not propose businesses yet.";
