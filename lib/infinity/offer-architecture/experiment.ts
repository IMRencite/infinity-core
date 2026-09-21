import { EXPERIMENT_SCHEMA } from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateCrossVentureLearningGeneralizabilityGate } from "@/lib/infinity/product-improvement-loop/gates";
import type { NormalizedPerformanceEvent } from "@/lib/infinity/performance-intelligence-engine/types";
import type { OfferDecision, OfferExperimentContract } from "./types";
import { OFFER_EXPERIMENT_CONTRACT, UNKNOWN } from "./types";

export const OFFER_METRIC_CATALOG = [
  "visitor_to_offer_view",
  "offer_view_to_signup_start",
  "signup_to_activation",
  "trial_free_use_to_meaningful_use",
  "meaningful_use_to_checkout",
  "checkout_to_paid",
  "paid_to_retained",
  "refund_rate",
  "cancel_rate",
  "revenue_per_customer",
  "contribution_per_customer",
  "support_burden",
  "time_to_value",
  "cac",
  "payback",
] as const;

export function applicableOfferMetrics(input: {
  has_trial?: boolean;
  paid?: boolean;
  acquisition_known?: boolean;
}): string[] {
  const metrics = [
    "visitor_to_offer_view",
    "offer_view_to_signup_start",
    "signup_to_activation",
    "meaningful_use_to_checkout",
    "checkout_to_paid",
    "paid_to_retained",
    "refund_rate",
    "cancel_rate",
    "revenue_per_customer",
    "contribution_per_customer",
    "support_burden",
    "time_to_value",
  ];
  if (input.has_trial) metrics.push("trial_free_use_to_meaningful_use");
  if (input.acquisition_known) metrics.push("cac", "payback");
  return input.paid === false ? metrics.filter((row) => row !== "checkout_to_paid" && row !== "paid_to_retained") : metrics;
}

export function buildOfferExperiment(input: {
  venture_id: string;
  experiment_id: string;
  offer_variants: string[];
  hypothesis: string;
  existing_experiment_id?: string;
}): OfferExperimentContract {
  return {
    contract: OFFER_EXPERIMENT_CONTRACT,
    experiment_schema: EXPERIMENT_SCHEMA,
    experiment_id: input.existing_experiment_id ?? input.experiment_id,
    venture_id: input.venture_id,
    offer_variants: input.offer_variants,
    hypothesis: input.hypothesis,
    primary_metric: "checkout_to_paid",
    secondary_metrics: ["refund_rate", "contribution_per_customer", "support_burden"],
    guardrails: ["NO_TREASURY_BYPASS", "NO_PAYMENT_BYPASS", "NO_FULFILLMENT_BYPASS", "NO_PRICE_CHANGE_WITHOUT_GATES"],
    sample_requirement: UNKNOWN,
    allocation: UNKNOWN,
    start_time: UNKNOWN,
    end_condition: "decision-grade paid conversion or capital/quality stop",
    status: "DRAFT",
    results: UNKNOWN,
    decision: UNKNOWN,
    confidence: "INSUFFICIENT",
  };
}

export function offerPerformanceEvents(input: {
  venture_id: string;
  offer_id: string;
  metric: string;
  value: number;
}): NormalizedPerformanceEvent {
  return {
    id: `offer-metric:${input.offer_id}:${input.metric}`,
    ventureId: input.venture_id,
    eventType: "offer_performance",
    metric: input.metric,
    value: input.value,
    unit: "ratio",
    occurredAt: new Date().toISOString(),
    observedAt: new Date().toISOString(),
    sourceId: "offer-architecture",
    sourceReference: input.offer_id,
    provenance: { contract: OFFER_EXPERIMENT_CONTRACT, untrusted: false },
  };
}

export function evaluateOfferCrossVentureConfidence(input: {
  sample_size: number;
  venture_count: number;
  archetype_compatible: boolean;
}): ReturnType<typeof evaluateCrossVentureLearningGeneralizabilityGate> {
  return evaluateCrossVentureLearningGeneralizabilityGate({
    sample_size: input.sample_size,
    venture_count: input.venture_count,
    workflow_similarity: input.archetype_compatible ? "HIGH" : "LOW",
    customer_type_similarity: input.archetype_compatible ? "HIGH" : "LOW",
    outcome_strength: input.sample_size >= 3 ? "MEDIUM" : "LOW",
    venture_specific_feature: !input.archetype_compatible,
  });
}

export function offerLearningClaim(decision: OfferDecision, hypothesis: string): string {
  return `${hypothesis} Decision ${decision}. Customer feedback informed evidence and did not automatically change price.`;
}
