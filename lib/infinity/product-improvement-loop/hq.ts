import { inspectProductImprovementLoop } from "./store";
import { realFeedbackCount } from "./ingest";
import type { ImprovementStatus, ProductImprovementOpportunity } from "./types";

export type VentureImprovementHqBucket =
  | "new_suggestions"
  | "repeated_requests"
  | "under_evaluation"
  | "approved_for_build"
  | "building"
  | "qc"
  | "deployed"
  | "measuring"
  | "validated_improvements";

export type VentureImprovementHqCard = {
  improvement_id: string;
  problem: string;
  unique_requesters: number;
  paying_customers: number;
  workflow: string;
  priority_score: number;
  priority_factors: Record<string, number>;
  estimated_effort: string;
  estimated_cost: string;
  risk: string;
  decision: string;
  implementation_state: ImprovementStatus;
  measured_outcome: string | null;
  contact_preview: string;
  source_channels: string[];
  requested_capability: string;
};

export type VentureImprovementHqView = {
  venture_id: string;
  real_feedback_count: number;
  synthetic_counted_as_real: false;
  active_work: false;
  buckets: Record<VentureImprovementHqBucket, VentureImprovementHqCard[]>;
};

function normalizeChannel(channel: string | undefined): string {
  if (!channel) return "OTHER_CANONICAL_CHANNEL";
  if (channel === "gmail" || channel === "EMAIL") return "EMAIL";
  return channel;
}

function card(
  opportunity: ProductImprovementOpportunity,
  outcome: string | null,
  contact: string,
  sources: string[],
): VentureImprovementHqCard {
  return {
    improvement_id: opportunity.improvement_id,
    problem: opportunity.requested_capability,
    unique_requesters: opportunity.unique_customer_count,
    paying_customers: opportunity.paying_customer_count,
    workflow: opportunity.affected_workflow,
    priority_score: opportunity.priority_score,
    priority_factors: opportunity.priority_factors,
    estimated_effort: opportunity.estimated_complexity,
    estimated_cost: opportunity.estimated_cost == null ? "UNKNOWN" : `$${opportunity.estimated_cost}`,
    risk: opportunity.risk,
    decision: opportunity.status,
    implementation_state: opportunity.status,
    measured_outcome: outcome,
    contact_preview: contact,
    source_channels: [...new Set(sources.map(normalizeChannel))],
    requested_capability: opportunity.requested_capability,
  };
}

function bucketFor(status: ImprovementStatus, unique: number): VentureImprovementHqBucket | null {
  if (status === "NEW_FEEDBACK" || status === "AGGREGATING") return unique >= 2 ? "repeated_requests" : "new_suggestions";
  if (status === "UNDER_EVALUATION" || status === "NEEDS_CLARIFICATION") return "under_evaluation";
  if (status === "APPROVED_FOR_BUILD") return "approved_for_build";
  if (status === "BUILDING") return "building";
  if (status === "QC" || status === "DEPLOYMENT_READY") return "qc";
  if (status === "DEPLOYED") return "deployed";
  if (status === "MEASURING" || status === "NO_MEASURABLE_IMPROVEMENT" || status === "ROLLED_BACK") return "measuring";
  if (status === "VALIDATED_IMPROVEMENT") return "validated_improvements";
  return unique >= 2 ? "repeated_requests" : "new_suggestions";
}

export function projectVentureImprovementHq(ventureId: string): VentureImprovementHqView {
  const state = inspectProductImprovementLoop();
  const buckets: VentureImprovementHqView["buckets"] = {
    new_suggestions: [],
    repeated_requests: [],
    under_evaluation: [],
    approved_for_build: [],
    building: [],
    qc: [],
    deployed: [],
    measuring: [],
    validated_improvements: [],
  };
  for (const opportunity of state.opportunities.filter((row) => row.venture_id === ventureId && !row.synthetic)) {
    const outcome = state.outcomes.find((row) => row.improvement_id === opportunity.improvement_id)?.decision ?? null;
    const related = state.feedback.filter((row) => opportunity.supporting_feedback_ids.includes(row.feedback_id));
    const feedback = related[0];
    const key = bucketFor(opportunity.status, opportunity.unique_customer_count);
    if (!key) continue;
    buckets[key].push(card(
      opportunity,
      outcome,
      feedback?.contact_identity ?? "redacted",
      related.map((row) => row.channel),
    ));
  }
  return {
    venture_id: ventureId,
    real_feedback_count: realFeedbackCount(ventureId),
    synthetic_counted_as_real: false,
    active_work: false,
    buckets,
  };
}
