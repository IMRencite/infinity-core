import type { CustomerFeedbackRecord, ProductImprovementOpportunity } from "./types";
import { PRODUCT_IMPROVEMENT_OPPORTUNITY_CONTRACT } from "./types";
import { inspectProductImprovementLoop, mutateProductImprovementLoop } from "./store";
import { clusterKey, implementationClass } from "./classify";
import { scoreImprovement } from "./priority";

export function upsertOpportunityFromFeedback(feedback: CustomerFeedbackRecord): ProductImprovementOpportunity {
  const key = clusterKey(feedback.problem_statement);
  const now = feedback.received_at;
  let opportunity: ProductImprovementOpportunity | null = null;
  mutateProductImprovementLoop((state) => {
    const existing = state.opportunities.find((row) => row.venture_id === feedback.venture_id && row.cluster_key === key && !row.synthetic);
    const ids = existing ? [...new Set([...existing.supporting_feedback_ids, feedback.feedback_id])] : [feedback.feedback_id];
    const related = state.feedback.filter((row) => ids.includes(row.feedback_id) && !row.synthetic);
    const customers = new Set(related.map((row) => row.contact_identity));
    const paying = new Set(related.filter((row) => row.customer_value_signal === "PAYING").map((row) => row.contact_identity));
    const mentions = related.length;
    const unique = customers.size;
    const next: ProductImprovementOpportunity = {
      contract: PRODUCT_IMPROVEMENT_OPPORTUNITY_CONTRACT,
      improvement_id: existing?.improvement_id ?? `imp:${feedback.venture_id}:${key}`,
      venture_id: feedback.venture_id,
      cluster_key: key,
      problem: feedback.problem_statement,
      requested_capability: feedback.requested_capability ?? key,
      affected_workflow: feedback.affected_workflow ?? key,
      supporting_feedback_ids: ids,
      total_mentions: mentions,
      unique_customer_count: unique,
      paying_customer_count: paying.size,
      repeat_mentions: Math.max(0, mentions - unique),
      frequency: unique,
      severity: related.some((row) => row.severity === "CRITICAL") ? "CRITICAL" : related.some((row) => row.severity === "HIGH") ? "HIGH" : feedback.severity,
      customer_value: paying.size > 0 && paying.size < unique ? "MIXED" : paying.size > 0 ? "PAYING" : "UNKNOWN",
      retention_relevance: paying.size > 0 || key === "SAVED_SCENARIOS" ? "HIGH" : "MEDIUM",
      conversion_relevance: key === "RESULT_INTERPRETATION" ? "HIGH" : "MEDIUM",
      revenue_relevance: paying.size > 0 ? "HIGH" : "LOW",
      strategic_fit: feedback.strategic_fit,
      implementation_class: implementationClass(feedback.feedback_types, key),
      estimated_complexity: key === "SAVED_SCENARIOS" || key === "EXPORT" ? "MEDIUM" : feedback.risk_classification === "HIGH" ? "HIGH" : "LOW",
      estimated_cost: null,
      risk: feedback.risk_classification,
      confidence: unique >= 5 ? "HIGH" : unique >= 2 ? "MEDIUM" : related.some((row) => row.evidence_confidence === "INSUFFICIENT") ? "INSUFFICIENT" : "LOW",
      priority_score: 0,
      priority_factors: {},
      status: related.some((row) => row.status === "NEEDS_CLARIFICATION") && unique < 2 ? "NEEDS_CLARIFICATION" : unique >= 2 ? "UNDER_EVALUATION" : "AGGREGATING",
      rejection_reason: null,
      acceptance_criteria: defaultAcceptance(key),
      created_at: existing?.created_at ?? now,
      updated_at: now,
      synthetic: false,
    };
    const scored = scoreImprovement(next);
    next.priority_score = scored.score;
    next.priority_factors = scored.factors;
    if (existing) Object.assign(existing, next);
    else state.opportunities.push(next);
    opportunity = next;
  });
  return opportunity!;
}

function defaultAcceptance(key: string): string[] {
  if (key === "SAVED_SCENARIOS") {
    return [
      "user can save scenario",
      "user can name scenario",
      "user can retrieve scenario",
      "user can compare saved scenarios",
      "venture/account isolation preserved",
      "mobile UX PASS",
      "existing calculation unchanged",
      "data persistence PASS",
    ];
  }
  if (key === "EXPORT") return ["user can export one production-quality format", "mobile UX PASS", "existing calculation unchanged"];
  return ["stated problem is resolved", "no UX/accessibility/responsive regression", "existing calculation unchanged"];
}

export function opportunitiesForVenture(ventureId: string): ProductImprovementOpportunity[] {
  return inspectProductImprovementLoop().opportunities.filter((row) => row.venture_id === ventureId && !row.synthetic);
}
