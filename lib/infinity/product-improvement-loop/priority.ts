import type { NamedGate, ProductImprovementOpportunity } from "./types";
import { PRODUCT_IMPROVEMENT_PRIORITY_ENGINE } from "./types";

export function scoreImprovement(opportunity: ProductImprovementOpportunity): { score: number; factors: Record<string, number> } {
  const factors: Record<string, number> = {
    customer_value: opportunity.customer_value === "PAYING" ? 18 : opportunity.customer_value === "MIXED" ? 12 : 6,
    frequency: Math.min(24, opportunity.unique_customer_count * 4),
    severity: opportunity.severity === "CRITICAL" ? 20 : opportunity.severity === "HIGH" ? 14 : opportunity.severity === "MEDIUM" ? 8 : 3,
    strategic_fit: opportunity.strategic_fit === "STRONG" ? 16 : opportunity.strategic_fit === "PLAUSIBLE" ? 8 : 0,
    retention_relevance: opportunity.retention_relevance === "HIGH" ? 10 : 4,
    revenue_relevance: opportunity.revenue_relevance === "HIGH" ? 10 : 3,
    conversion_relevance: opportunity.conversion_relevance === "HIGH" ? 8 : 3,
    implementation_complexity: opportunity.estimated_complexity === "LOW" ? 8 : opportunity.estimated_complexity === "MEDIUM" ? 4 : 0,
    expected_cost: opportunity.estimated_cost == null ? 0 : opportunity.estimated_cost <= 40 ? 6 : 0,
    risk: opportunity.risk === "LOW" ? 8 : opportunity.risk === "MEDIUM" ? 3 : -20,
    evidence_confidence: opportunity.confidence === "HIGH" ? 10 : opportunity.confidence === "MEDIUM" ? 6 : 2,
    affected_customer_count: Math.min(10, opportunity.unique_customer_count * 2),
    product_quality_impact: opportunity.implementation_class === "UX_REPAIR" || opportunity.implementation_class === "BUGFIX" ? 10 : 4,
  };
  const score = Object.values(factors).reduce((sum, value) => sum + value, 0);
  return { score, factors };
}

export function evaluateProductImprovementPriorityEngine(opportunity: ProductImprovementOpportunity): NamedGate {
  const scored = scoreImprovement(opportunity);
  return {
    gate: PRODUCT_IMPROVEMENT_PRIORITY_ENGINE,
    result: Object.keys(scored.factors).length >= 8 ? "PASS" : "FAIL",
    reasons: Object.entries(scored.factors).map(([name, value]) => `${name}:${value}`),
  };
}
