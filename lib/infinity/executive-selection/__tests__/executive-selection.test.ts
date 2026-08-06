import { describe, expect, it } from "vitest";
import {
  assignExecutiveDecisions,
  applyResourceConstraintProfile,
  evaluatePortfolioConstraints,
} from "../selection-rules";
import { reproduceAggregateScore, scoreOpportunityDeterministic } from "../scoring";
import type { EligibleOpportunityRow } from "../types";

function opp(profile: string, overrides: Partial<EligibleOpportunityRow> = {}): EligibleOpportunityRow {
  return {
    id: `opp-${profile}`,
    name: profile,
    status: "approved",
    decision: "pending",
    confidence_score: 70,
    overall_score: 70,
    estimated_startup_cost_min: 0,
    estimated_startup_cost_max: 0,
    assumptions: { executive_selection_profile: profile },
    risks: [],
    ...overrides,
  };
}

describe("executive-selection scoring", () => {
  it("reproduces aggregate score from dimensions", () => {
    const scored = scoreOpportunityDeterministic(opp("strong_in_policy"));
    const reproduced = reproduceAggregateScore(scored.dimensions);
    expect(reproduced).toBeCloseTo(scored.aggregateScore, 5);
  });

  it("ranks strong_in_policy above low_value", () => {
    const strong = scoreOpportunityDeterministic(opp("strong_in_policy"));
    const low = scoreOpportunityDeterministic(opp("low_value"));
    expect(strong.aggregateScore).toBeGreaterThan(low.aggregateScore);
  });
});

describe("executive-selection autonomous rules", () => {
  it("assigns expected dispositions by profile", () => {
    const opportunities = [
      opp("strong_in_policy"),
      opp("low_confidence", { confidence_score: 40 }),
      opp("low_value", { overall_score: 20, confidence_score: 60 }),
      opp("resource_constrained"),
      opp("mandatory_escalation", { estimated_startup_cost_max: 10000 }),
    ];
    const scores = opportunities.map(scoreOpportunityDeterministic);
    let constraints = evaluatePortfolioConstraints({ scores, maxSelections: 1 });
    constraints = applyResourceConstraintProfile(opportunities, constraints);
    const outcomes = assignExecutiveDecisions({
      opportunities,
      scores,
      evidenceQuality: Object.fromEntries(opportunities.map((o) => [o.id, 0.7])),
      constraints,
      aiMode: "advisory",
      aiAdvisoryRecommendationId: "adv-1",
    });

    const byProfile = Object.fromEntries(
      opportunities.map((o) => [
        o.assumptions.executive_selection_profile as string,
        outcomes.find((x) => x.opportunityId === o.id)?.decision,
      ]),
    );

    expect(byProfile.strong_in_policy).toBe("select_for_planning");
    expect(byProfile.low_confidence).toBe("request_more_validation");
    expect(byProfile.low_value).toBe("reject");
    expect(byProfile.resource_constrained).toBe("defer_due_to_constraints");
    expect(byProfile.mandatory_escalation).toBe("escalate_for_human_review");
  });
});

describe("executive-selection AI advisory", () => {
  it("shadow mode does not change select_for_planning outcome without advisory influence", () => {
    const opportunities = [opp("strong_in_policy"), opp("low_value")];
    const scores = opportunities.map(scoreOpportunityDeterministic);
    const constraints = evaluatePortfolioConstraints({ scores, maxSelections: 1 });
    const withAdvisory = assignExecutiveDecisions({
      opportunities,
      scores,
      evidenceQuality: { [opportunities[0].id]: 0.8, [opportunities[1].id]: 0.8 },
      constraints,
      aiMode: "shadow",
      aiAdvisoryRecommendationId: "x",
    });
    const without = assignExecutiveDecisions({
      opportunities,
      scores,
      evidenceQuality: { [opportunities[0].id]: 0.8, [opportunities[1].id]: 0.8 },
      constraints,
      aiMode: "disabled",
    });
    expect(withAdvisory[0].decision).toBe(without[0].decision);
  });
});
