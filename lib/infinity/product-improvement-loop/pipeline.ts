import type { NamedGate, ProductImprovementLearning, ProductImprovementOpportunity, ProductImprovementOutcome } from "./types";
import { PRODUCT_IMPROVEMENT_OUTCOME_CONTRACT } from "./types";
import { inspectProductImprovementLoop, mutateProductImprovementLoop } from "./store";
import { evaluateAutonomousProductImprovementGate, evaluateProductImprovementQualityGate, qualityVersusCapital } from "./gates";
import { evaluateCrossVentureLearningGeneralizabilityGate } from "./gates";
import type { NormalizedPerformanceEvent } from "@/lib/infinity/performance-intelligence-engine/types";

export function setOpportunityEstimate(improvementId: string, estimated_cost: number): void {
  mutateProductImprovementLoop((state) => {
    const row = state.opportunities.find((item) => item.improvement_id === improvementId);
    if (row) row.estimated_cost = estimated_cost;
  });
}

export function evaluateImprovementForBuild(improvementId: string, extras?: Parameters<typeof evaluateAutonomousProductImprovementGate>[1]): {
  opportunity: ProductImprovementOpportunity | null;
  autonomous: NamedGate;
  quality: NamedGate;
  founder_approval_required: boolean;
} {
  const opportunity = inspectProductImprovementLoop().opportunities.find((row) => row.improvement_id === improvementId) ?? null;
  if (!opportunity) {
    return {
      opportunity: null,
      autonomous: { gate: "AutonomousProductImprovementGate", result: "FAIL", reasons: ["MISSING"] },
      quality: evaluateProductImprovementQualityGate({}),
      founder_approval_required: true,
    };
  }
  const quality = evaluateProductImprovementQualityGate({ low_quality_to_fit_budget: false });
  const autonomous = evaluateAutonomousProductImprovementGate(opportunity, { ...extras, quality_pass: quality.result === "PASS" });
  return {
    opportunity,
    autonomous,
    quality,
    founder_approval_required: autonomous.result !== "PASS",
  };
}

export function advanceGovernedImplementation(improvementId: string, extras?: Parameters<typeof evaluateAutonomousProductImprovementGate>[1]): {
  status: ProductImprovementOpportunity["status"];
  founder_approval_required: boolean;
  reason: string;
} {
  const evaluated = evaluateImprovementForBuild(improvementId, extras);
  if (!evaluated.opportunity) return { status: "REJECTED", founder_approval_required: true, reason: "MISSING" };
  if (evaluated.opportunity.estimated_cost != null && extras?.remaining_budget != null && evaluated.opportunity.estimated_cost > extras.remaining_budget) {
    const capital = qualityVersusCapital({
      production_quality_cost: evaluated.opportunity.estimated_cost,
      remaining_budget: extras.remaining_budget,
      reduced_scope_possible: extras.remaining_budget > 0 && evaluated.opportunity.implementation_class === "EXPORT",
    });
    mutateProductImprovementLoop((state) => {
      const row = state.opportunities.find((item) => item.improvement_id === improvementId);
      if (!row) return;
      row.status = capital.state;
      row.rejection_reason = capital.state === "DEFERRED_CAPITAL" ? "capital unavailable for production-quality implementation" : null;
      row.updated_at = new Date().toISOString();
    });
    return { status: capital.state, founder_approval_required: true, reason: capital.state };
  }
  if (evaluated.autonomous.result !== "PASS") {
    mutateProductImprovementLoop((state) => {
      const row = state.opportunities.find((item) => item.improvement_id === improvementId);
      if (!row) return;
      row.status = evaluated.autonomous.reasons.includes("HIGH_RISK_ESCALATION") || evaluated.autonomous.reasons.includes("ESCALATION_REQUIRED")
        ? "UNDER_EVALUATION"
        : evaluated.opportunity!.status === "NEEDS_CLARIFICATION"
          ? "NEEDS_CLARIFICATION"
          : "UNDER_EVALUATION";
      row.updated_at = new Date().toISOString();
    });
    return { status: "UNDER_EVALUATION", founder_approval_required: true, reason: evaluated.autonomous.reasons.join(",") };
  }
  mutateProductImprovementLoop((state) => {
    const row = state.opportunities.find((item) => item.improvement_id === improvementId);
    if (!row) return;
    row.status = "APPROVED_FOR_BUILD";
    row.updated_at = new Date().toISOString();
  });
  return { status: "APPROVED_FOR_BUILD", founder_approval_required: false, reason: "AUTONOMOUS_GOVERNED_BUILD" };
}

export function runGovernedBuildPath(improvementId: string): ProductImprovementOpportunity["status"][] {
  const path: ProductImprovementOpportunity["status"][] = [];
  for (const status of ["BUILDING", "QC", "DEPLOYMENT_READY", "DEPLOYED", "MEASURING"] as const) {
    mutateProductImprovementLoop((state) => {
      const row = state.opportunities.find((item) => item.improvement_id === improvementId);
      if (!row || row.status === "REJECTED" || row.status === "DEFERRED_CAPITAL") return;
      row.status = status;
      row.updated_at = new Date().toISOString();
    });
    path.push(status);
  }
  return path;
}

export function recordImprovementOutcome(input: {
  improvement_id: string;
  expected_outcome: string;
  primary_metrics: string[];
  baseline: Record<string, number | null>;
  actual: Record<string, number | null>;
  improved?: boolean;
}): ProductImprovementOutcome {
  const improved = input.improved ?? Object.entries(input.actual).some(([metric, value]) => {
    const base = input.baseline[metric];
    return value != null && base != null && value > base;
  });
  const decision = improved ? "VALIDATED_IMPROVEMENT" : "NO_MEASURABLE_IMPROVEMENT";
  const outcome: ProductImprovementOutcome = {
    contract: PRODUCT_IMPROVEMENT_OUTCOME_CONTRACT,
    outcome_id: `out:${input.improvement_id}`,
    improvement_id: input.improvement_id,
    expected_outcome: input.expected_outcome,
    measurement_window: "14d",
    primary_metrics: input.primary_metrics,
    secondary_metrics: ["support_volume", "error_rate"],
    baseline: input.baseline,
    actual: input.actual,
    confidence: improved ? "MEDIUM" : "LOW",
    decision,
  };
  mutateProductImprovementLoop((state) => {
    state.outcomes = state.outcomes.filter((row) => row.improvement_id !== input.improvement_id);
    state.outcomes.push(outcome);
    const row = state.opportunities.find((item) => item.improvement_id === input.improvement_id);
    if (row) {
      row.status = decision;
      row.updated_at = new Date().toISOString();
    }
  });
  return outcome;
}

export function outcomesToPerformanceEvents(ventureId: string): NormalizedPerformanceEvent[] {
  const now = new Date().toISOString();
  return inspectProductImprovementLoop().outcomes
    .filter((row) => inspectProductImprovementLoop().opportunities.some((item) => item.improvement_id === row.improvement_id && item.venture_id === ventureId))
    .map((row) => ({
      id: `pi:${row.outcome_id}`,
      sourceId: "product_improvement_loop_v1",
      sourceReference: row.improvement_id,
      eventType: "product_improvement_outcome",
      metric: row.decision,
      value: row.decision === "VALIDATED_IMPROVEMENT" ? 1 : 0,
      unit: "count",
      ventureId,
      occurredAt: now,
      observedAt: now,
      provenance: { contract: row.contract, layer: "ACTUAL" },
    }));
}

export function persistLearning(input: Omit<ProductImprovementLearning, "learning_id" | "aesthetic_sameness">): ProductImprovementLearning | null {
  const general = evaluateCrossVentureLearningGeneralizabilityGate({
    sample_size: input.sample_size,
    venture_count: input.venture_ids.length,
    workflow_similarity: input.scope === "VENTURE_SPECIFIC_LEARNING" ? "LOW" : "HIGH",
    customer_type_similarity: "HIGH",
    outcome_strength: input.confidence === "HIGH" ? "HIGH" : "MEDIUM",
    venture_specific_feature: input.scope === "VENTURE_SPECIFIC_LEARNING",
  });
  if (input.scope.startsWith("CROSS_VENTURE") && general.result === "FAIL") return null;
  const learning: ProductImprovementLearning = {
    ...input,
    learning_id: `learn:${input.scope}:${input.claim.slice(0, 24)}`,
    aesthetic_sameness: false,
  };
  mutateProductImprovementLoop((state) => {
    state.learnings = state.learnings.filter((row) => row.learning_id !== learning.learning_id);
    state.learnings.push(learning);
  });
  return learning;
}

export function customerAcknowledgement(status: ProductImprovementOpportunity["status"]): string {
  if (status === "DEPLOYED" || status === "MEASURING" || status === "VALIDATED_IMPROVEMENT") {
    return "This change has shipped. We are measuring whether it actually helps.";
  }
  if (status === "APPROVED_FOR_BUILD" || status === "BUILDING" || status === "QC") {
    return "Feedback was received and is being implemented.";
  }
  return "Feedback was received and is being evaluated. This is not a promise that it will be built.";
}
