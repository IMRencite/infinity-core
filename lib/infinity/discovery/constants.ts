export const DISCOVERY_PROVIDER_STATUSES = [
  "draft",
  "active",
  "deprecated",
  "disabled",
] as const;

export const DISCOVERY_PROVIDER_TYPES = [
  "deterministic_stub",
  "internal_catalog",
  "api_adapter",
  "web_observer",
  "dataset_feed",
  "human_curated",
  "other",
] as const;

export const DISCOVERY_SIGNAL_TYPES = [
  "market_signal",
  "customer_pain",
  "search_demand",
  "competitor",
  "trend",
  "pricing",
  "regulation",
  "technology",
  "social_discussion",
  "product_demand",
  "funding",
  "operational",
  "other",
] as const;

export const OPPORTUNITY_REVIEW_TYPES = [
  "automated",
  "human",
  "policy",
  "scoring",
  "validation",
] as const;

export const OPPORTUNITY_REVIEWER_TYPES = [
  "system",
  "worker",
  "human",
  "policy_engine",
] as const;

export const OPPORTUNITY_REVIEW_VERDICTS = [
  "pass",
  "fail",
  "needs_review",
  "hold",
  "approve",
  "reject",
] as const;

export const OPPORTUNITY_DECISION_ACTOR_TYPES = [
  "system",
  "worker",
  "human",
  "policy_engine",
] as const;

export const DETERMINISTIC_DISCOVERY_PROVIDER_KEY = "discovery.deterministic_stub";
export const DETERMINISTIC_DISCOVERY_IMPLEMENTATION_KEY =
  "discovery.deterministic_stub.v1";
export const DISCOVERY_SCORING_VERSION = "discovery.foundation.v1";
export const DISCOVERY_RULE_SCORING_VERSION = "discovery.rule_scoring_v1";

export function isDiscoverySignalType(value: string): boolean {
  return (DISCOVERY_SIGNAL_TYPES as readonly string[]).includes(value);
}

export function isOpportunityReviewType(value: string): boolean {
  return (OPPORTUNITY_REVIEW_TYPES as readonly string[]).includes(value);
}

export function isOpportunityReviewerType(value: string): boolean {
  return (OPPORTUNITY_REVIEWER_TYPES as readonly string[]).includes(value);
}

export function isOpportunityReviewVerdict(value: string): boolean {
  return (OPPORTUNITY_REVIEW_VERDICTS as readonly string[]).includes(value);
}

export function isOpportunityDecisionActorType(value: string): boolean {
  return (OPPORTUNITY_DECISION_ACTOR_TYPES as readonly string[]).includes(value);
}
