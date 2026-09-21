import { evaluateActionSpendAuthorizationGate } from "@/lib/infinity/venture-financial-governance/gates";
import type { NamedGate, ProductImprovementOpportunity } from "./types";
import {
  AUTONOMOUS_PRODUCT_IMPROVEMENT_GATE,
  CROSS_VENTURE_LEARNING_GENERALIZABILITY_GATE,
  PRODUCT_IMPROVEMENT_QUALITY_GATE,
} from "./types";

const HIGH_RISK_CLASSES = new Set(["SECURITY", "LEGAL", "PRICING"]);
const ESCALATION_KEYS = /pricing|billing|refund|legal|terms|regulated|security architecture|deletion policy|auth change|paid provider|pivot|unsafe/;

export function evaluateProductImprovementQualityGate(input: {
  would_degrade_ux?: boolean;
  would_degrade_visual?: boolean;
  would_break_responsive?: boolean;
  would_break_accessibility?: boolean;
  confusing_navigation?: boolean;
  inconsistent_design?: boolean;
  weakens_trust?: boolean;
  low_quality_to_fit_budget?: boolean;
}): NamedGate {
  const reasons: string[] = [];
  if (input.would_degrade_ux) reasons.push("UX_REGRESSION");
  if (input.would_degrade_visual) reasons.push("VISUAL_REGRESSION");
  if (input.would_break_responsive) reasons.push("RESPONSIVE_REGRESSION");
  if (input.would_break_accessibility) reasons.push("ACCESSIBILITY_REGRESSION");
  if (input.confusing_navigation) reasons.push("NAVIGATION_REGRESSION");
  if (input.inconsistent_design) reasons.push("INCONSISTENT_DESIGN");
  if (input.weakens_trust) reasons.push("TRUST_REGRESSION");
  if (input.low_quality_to_fit_budget) reasons.push("QUALITY_NOT_A_BUDGET_VARIABLE");
  return { gate: PRODUCT_IMPROVEMENT_QUALITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateAutonomousProductImprovementGate(opportunity: ProductImprovementOpportunity, extras?: {
  capital_pass?: boolean;
  quality_pass?: boolean;
  security_pass?: boolean;
  architecture_pass?: boolean;
  deployment_authority_pass?: boolean;
  remaining_budget?: number | null;
}): NamedGate {
  const reasons: string[] = [];
  if (opportunity.risk === "HIGH" || HIGH_RISK_CLASSES.has(opportunity.implementation_class)) reasons.push("HIGH_RISK_ESCALATION");
  if (ESCALATION_KEYS.test(`${opportunity.requested_capability} ${opportunity.problem}`.toLowerCase())) reasons.push("ESCALATION_REQUIRED");
  if (opportunity.implementation_class === "PRICING") reasons.push("PRICING_CHANGE");
  if (opportunity.confidence === "INSUFFICIENT" || opportunity.status === "NEEDS_CLARIFICATION") reasons.push("INSUFFICIENT_EVIDENCE");
  if (opportunity.unique_customer_count < 1) reasons.push("NO_CUSTOMER_EVIDENCE");
  if (opportunity.estimated_cost == null && extras?.capital_pass !== true) reasons.push("EXPECTED_COST_UNKNOWN");
  if (extras?.capital_pass === false) reasons.push("CAPITAL_GATE_FAIL");
  if (extras?.quality_pass === false) reasons.push("QUALITY_GATE_FAIL");
  if (extras?.security_pass === false) reasons.push("SECURITY_GATE_FAIL");
  if (extras?.architecture_pass === false) reasons.push("ARCHITECTURE_GATE_FAIL");
  if (extras?.deployment_authority_pass === false) reasons.push("DEPLOYMENT_AUTHORITY_FAIL");
  if (
    opportunity.estimated_cost != null &&
    extras?.remaining_budget != null &&
    opportunity.estimated_cost > extras.remaining_budget
  ) {
    reasons.push("CAPITAL_INSUFFICIENT_FOR_PRODUCTION_QUALITY");
  }
  const capital = evaluateActionSpendAuthorizationGate({
    venture_id: opportunity.venture_id,
    amount: opportunity.estimated_cost,
    envelope: "BUILD",
    kind: "DISCRETIONARY",
  });
  if (capital.result === "FAIL" && extras?.capital_pass !== true) {
    reasons.push(...capital.reasons.map((reason) => `CAPITAL:${reason}`));
  }
  const lowRisk = opportunity.risk === "LOW" || opportunity.risk === "MEDIUM";
  if (!lowRisk) reasons.push("NOT_LOW_MEDIUM_RISK");
  return {
    gate: AUTONOMOUS_PRODUCT_IMPROVEMENT_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function qualityVersusCapital(input: {
  production_quality_cost: number;
  remaining_budget: number;
  reduced_scope_possible: boolean;
}): { state: "DEFERRED_CAPITAL" | "REDUCED_SCOPE_PRODUCTION_QUALITY" | "CAPITAL_REALLOCATION_REQUIRED"; quality_compromised: false } {
  if (input.remaining_budget >= input.production_quality_cost) {
    return { state: "REDUCED_SCOPE_PRODUCTION_QUALITY", quality_compromised: false };
  }
  if (input.reduced_scope_possible) return { state: "REDUCED_SCOPE_PRODUCTION_QUALITY", quality_compromised: false };
  return { state: "DEFERRED_CAPITAL", quality_compromised: false };
}

export function evaluateCrossVentureLearningGeneralizabilityGate(input: {
  sample_size: number;
  venture_count: number;
  workflow_similarity: "HIGH" | "MEDIUM" | "LOW";
  customer_type_similarity: "HIGH" | "MEDIUM" | "LOW";
  outcome_strength: "HIGH" | "MEDIUM" | "LOW";
  venture_specific_feature?: boolean;
}): NamedGate {
  const reasons: string[] = [];
  if (input.venture_specific_feature) reasons.push("VENTURE_SPECIFIC_FEATURE");
  if (input.sample_size < 3) reasons.push("SAMPLE_TOO_SMALL");
  if (input.venture_count < 2) reasons.push("SINGLE_VENTURE");
  if (input.workflow_similarity === "LOW") reasons.push("WORKFLOW_DISSIMILAR");
  if (input.outcome_strength === "LOW") reasons.push("WEAK_OUTCOME");
  return {
    gate: CROSS_VENTURE_LEARNING_GENERALIZABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
