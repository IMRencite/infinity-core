export const EVIDENCE_SOURCE_TYPES = [
  "webpage",
  "api",
  "dataset",
  "document",
  "social_post",
  "forum_thread",
  "news_article",
  "filing",
  "government_record",
  "academic_source",
  "internal_metric",
  "internal_event",
  "worker_output",
  "human_input",
  "experiment_result",
  "other",
] as const;

export const EVIDENCE_SOURCE_RELIABILITY_STATUSES = [
  "unknown",
  "trusted",
  "generally_reliable",
  "mixed",
  "low_reliability",
  "blocked",
  "deprecated",
] as const;

export const EVIDENCE_TYPES = [
  "market_signal",
  "customer_pain",
  "trend",
  "competitor",
  "pricing",
  "regulation",
  "technology",
  "search_demand",
  "social_discussion",
  "product_demand",
  "funding",
  "financial_result",
  "experiment_result",
  "operational_result",
  "asset_metric",
  "venture_metric",
  "decision_context",
  "other",
] as const;

export const CLAIM_TYPES = [
  "verified_fact",
  "estimate",
  "assumption",
  "ai_inference",
  "opinion",
  "hypothesis",
  "forecast",
  "unknown",
] as const;

export const CLAIM_STATUSES = [
  "unverified",
  "supported",
  "contradicted",
  "mixed",
  "superseded",
  "rejected",
  "accepted",
] as const;

export const CLAIM_EVIDENCE_RELATIONSHIPS = [
  "supports",
  "contradicts",
  "contextualizes",
  "weakens",
  "supersedes",
  "derived_from",
  "related_to",
] as const;

export const KNOWLEDGE_TYPES = [
  "market",
  "customer",
  "competitor",
  "pricing",
  "channel",
  "product",
  "operational",
  "technical",
  "legal",
  "financial",
  "asset",
  "venture",
  "portfolio",
  "worker",
  "source_reliability",
  "procedure",
  "other",
] as const;

export const KNOWLEDGE_STATUSES = [
  "draft",
  "active",
  "disputed",
  "deprecated",
  "superseded",
  "archived",
] as const;

export const MEMORY_TYPES = [
  "episodic",
  "semantic",
  "procedural",
  "portfolio",
  "venture",
  "asset",
  "worker_performance",
  "source_reliability",
  "decision_outcome",
  "experiment_outcome",
  "failure",
  "success",
  "lesson",
  "other",
] as const;

export const LESSON_TYPES = [
  "strategy",
  "market",
  "product",
  "pricing",
  "distribution",
  "growth",
  "operations",
  "technical",
  "financial",
  "risk",
  "worker",
  "portfolio",
  "other",
] as const;

export const LESSON_STATUSES = [
  "draft",
  "active",
  "disputed",
  "deprecated",
  "superseded",
  "archived",
] as const;

export const PROCEDURE_STATUSES = [
  "draft",
  "active",
  "experimental",
  "deprecated",
  "archived",
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ClaimEvidenceRelationship =
  (typeof CLAIM_EVIDENCE_RELATIONSHIPS)[number];

function includesValue<T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value);
}

export const isEvidenceSourceType = (value: string) =>
  includesValue(EVIDENCE_SOURCE_TYPES, value);
export const isEvidenceSourceReliabilityStatus = (value: string) =>
  includesValue(EVIDENCE_SOURCE_RELIABILITY_STATUSES, value);
export const isEvidenceType = (value: string) => includesValue(EVIDENCE_TYPES, value);
export const isClaimType = (value: string) => includesValue(CLAIM_TYPES, value);
export const isClaimStatus = (value: string) => includesValue(CLAIM_STATUSES, value);
export const isClaimEvidenceRelationship = (value: string) =>
  includesValue(CLAIM_EVIDENCE_RELATIONSHIPS, value);
export const isKnowledgeType = (value: string) => includesValue(KNOWLEDGE_TYPES, value);
export const isKnowledgeStatus = (value: string) =>
  includesValue(KNOWLEDGE_STATUSES, value);
export const isMemoryType = (value: string) => includesValue(MEMORY_TYPES, value);
export const isLessonType = (value: string) => includesValue(LESSON_TYPES, value);
export const isLessonStatus = (value: string) => includesValue(LESSON_STATUSES, value);
export const isProcedureStatus = (value: string) =>
  includesValue(PROCEDURE_STATUSES, value);
