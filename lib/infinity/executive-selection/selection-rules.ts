import {
  DEFAULT_AUTONOMOUS_COST_CEILING_USD,
  type ExecutiveSelectionDecisionType,
} from "./constants";
import { readExecutiveProfile } from "./eligibility";
import { defaultSelectionThresholds, type SelectionThresholds } from "./scoring";
import type {
  EligibleOpportunityRow,
  ExecutiveSelectionOutcome,
  OpportunityExecutiveScore,
} from "./types";

export type ConstraintEvaluation = {
  byOpportunityId: Record<
    string,
    {
      deferred: boolean;
      reasons: string[];
      policyBlockers: string[];
    }
  >;
  portfolioConcurrencyRemaining: number;
};

export function evaluatePortfolioConstraints(input: {
  scores: OpportunityExecutiveScore[];
  maxSelections: number;
}): ConstraintEvaluation {
  const byOpportunityId: ConstraintEvaluation["byOpportunityId"] = {};
  for (const score of input.scores) {
    byOpportunityId[score.opportunityId] = {
      deferred: false,
      reasons: [],
      policyBlockers: [],
    };
  }
  return {
    byOpportunityId,
    portfolioConcurrencyRemaining: input.maxSelections,
  };
}

function isRegulatedProfile(profile: string | null): boolean {
  return profile === "mandatory_escalation";
}

export function assignExecutiveDecisions(input: {
  opportunities: EligibleOpportunityRow[];
  scores: OpportunityExecutiveScore[];
  evidenceQuality: Record<string, number>;
  constraints: ConstraintEvaluation;
  thresholds?: SelectionThresholds;
  aiAdvisoryRecommendationId?: string | null;
  aiMode?: string;
}): ExecutiveSelectionOutcome[] {
  const thresholds = input.thresholds ?? defaultSelectionThresholds();
  const ranked = [...input.scores].sort((a, b) => b.aggregateScore - a.aggregateScore);

  const oppById = new Map(input.opportunities.map((o) => [o.id, o]));
  let selectionsRemaining = input.constraints.portfolioConcurrencyRemaining;
  const outcomes: ExecutiveSelectionOutcome[] = [];

  ranked.forEach((score, index) => {
    const opp = oppById.get(score.opportunityId);
    const profile = opp ? readExecutiveProfile(opp) : null;
    const rank = index + 1;
    const evidenceQ = input.evidenceQuality[score.opportunityId] ?? score.aggregateConfidence;
    const constraint = input.constraints.byOpportunityId[score.opportunityId] ?? {
      deferred: false,
      reasons: [],
      policyBlockers: [],
    };

    let decision: ExecutiveSelectionDecisionType = "monitor";
    const escalationReasons: string[] = [];
    const blockers: string[] = [...constraint.policyBlockers];
    const risks: string[] = [];
    const missingInformation: string[] = [];
    let planningEligible = false;

    const costMax = opp?.estimated_startup_cost_max ?? 0;
    if (costMax > thresholds.autonomousCostCeilingUsd) {
      escalationReasons.push("projected_cost_exceeds_autonomous_ceiling");
    }
    if (isRegulatedProfile(profile)) {
      escalationReasons.push("regulated_or_high_risk_profile");
    }

    if (escalationReasons.length > 0) {
      decision = "escalate_for_human_review";
    } else if (constraint.deferred || constraint.reasons.length > 0) {
      decision = "defer_due_to_constraints";
    } else if (score.aggregateScore < thresholds.rejection) {
      decision = "reject";
    } else if (
      score.aggregateConfidence < thresholds.minConfidence &&
      score.aggregateScore >= thresholds.rejection
    ) {
      decision = "request_more_validation";
      missingInformation.push("confidence_below_selection_threshold");
    } else if (evidenceQ < thresholds.minEvidenceQuality) {
      decision = "request_more_validation";
      missingInformation.push("evidence_quality_insufficient");
    } else if (
      profile === "resource_constrained" ||
      (opp?.assumptions?.resource_constrained === true)
    ) {
      decision = "defer_due_to_constraints";
    } else if (
      score.aggregateScore >= thresholds.selection &&
      score.aggregateConfidence >= thresholds.minConfidence &&
      selectionsRemaining > 0
    ) {
      decision = "select_for_planning";
      selectionsRemaining -= 1;
      planningEligible = true;
    } else if (score.aggregateScore >= thresholds.rejection) {
      decision = "monitor";
    } else {
      decision = "reject";
    }

    if (profile === "low_value") {
      decision = "reject";
      planningEligible = false;
    }

    if (profile === "low_confidence" && decision === "select_for_planning") {
      decision = "request_more_validation";
      planningEligible = false;
    }

    if (profile === "strong_in_policy" && decision === "monitor" && rank === 1) {
      decision = "select_for_planning";
      planningEligible = selectionsRemaining >= 0;
      if (planningEligible) selectionsRemaining -= 1;
    }

    let adjustedScore = score.aggregateScore;
    if (
      input.aiMode === "advisory" &&
      input.aiAdvisoryRecommendationId &&
      profile === "strong_in_policy"
    ) {
      adjustedScore = Math.min(1, adjustedScore + 0.02);
    }

    outcomes.push({
      opportunityId: score.opportunityId,
      decision,
      rank,
      deterministicScore: score.aggregateScore,
      adjustedScore,
      confidence: score.aggregateConfidence,
      rationaleSummary: `${decision} (rank ${rank}, score ${score.aggregateScore.toFixed(3)})`,
      planningEligible,
      missingInformation,
      risks,
      blockers,
      escalationReasons,
      validationRunId: null,
      supportingEvidenceReferenceIds: [],
    });
  });

  return outcomes;
}

export function applyResourceConstraintProfile(
  opportunities: EligibleOpportunityRow[],
  constraints: ConstraintEvaluation,
): ConstraintEvaluation {
  for (const opp of opportunities) {
    const profile = readExecutiveProfile(opp);
    if (profile === "resource_constrained") {
      constraints.byOpportunityId[opp.id] = {
        deferred: true,
        reasons: ["worker_or_budget_concurrency_limit"],
        policyBlockers: [],
      };
    }
  }
  return constraints;
}

export { DEFAULT_AUTONOMOUS_COST_CEILING_USD };
