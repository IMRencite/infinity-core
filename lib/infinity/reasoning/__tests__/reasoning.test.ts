import { describe, expect, it } from "vitest";
import { compareOpportunities } from "@/lib/infinity/reasoning/deterministic/compare";
import { explainOpportunityScore } from "@/lib/infinity/reasoning/deterministic/explain";
import { prioritizeOpportunity } from "@/lib/infinity/reasoning/deterministic/prioritize";
import { rankValidatedOpportunities } from "@/lib/infinity/reasoning/deterministic/rank";
import {
  calculateOpportunityScore,
  ruleBasedScoringStrategy,
} from "@/lib/infinity/reasoning/deterministic/score";
import {
  ReasoningGateError,
  assertValidatedForReasoning,
  mergeReasoningConfig,
  type ReasoningContext,
} from "@/lib/infinity/reasoning/deterministic/types";

function baseContext(overrides: Partial<ReasoningContext> = {}): ReasoningContext {
  return {
    organizationId: "org-1",
    opportunityId: "opp-1",
    opportunityName: "Alpha SaaS",
    opportunity: {
      id: "opp-1",
      organization_id: "org-1",
      name: "Alpha SaaS",
      overall_score: 78,
      source_snapshot: { estimated_time_to_launch_days: 30 },
      industry: "software",
      category: "saas",
    } as never,
    validation: {
      validationRunId: "run-1",
      recommendation: "approved_for_planning",
      overallScore: 72,
      overallConfidence: 75,
      completedAt: "2026-08-01T00:00:00.000Z",
    },
    latestScore: {
      demand_score: 80,
      competition_score: 35,
      profitability_score: 70,
      automation_score: 65,
      operational_complexity_score: 40,
      startup_cost_score: 60,
    } as never,
    evidence: [
      {
        evidence_type: "market",
        credibility_score: 70,
        relevance_score: 68,
      },
      {
        evidence_type: "regulation",
        relevance_score: 30,
      },
    ] as never,
    evaluation: { recommendation: "approve_initiative" } as never,
    allocationAmount: 25_000,
    ...overrides,
  };
}

describe("reasoning gate", () => {
  it("rejects opportunities that have not passed validation", () => {
    expect(() =>
      assertValidatedForReasoning({
        validationRunId: "run-1",
        recommendation: "validate_again",
        overallScore: 70,
        overallConfidence: 60,
        completedAt: null,
      }),
    ).toThrow(ReasoningGateError);
  });
});

describe("calculateOpportunityScore", () => {
  it("produces a bounded 0-100 score for validated opportunities", () => {
    const config = mergeReasoningConfig();
    const result = calculateOpportunityScore(baseContext(), config);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.dimensions).toHaveLength(10);
  });

  it("uses injected scoring strategies without changing callers", () => {
    const config = mergeReasoningConfig();
    const stubStrategy = {
      score: () => ({
        organizationId: "org-1",
        opportunityId: "opp-1",
        opportunityName: "Alpha SaaS",
        overallScore: 42,
        confidence: 42,
        dimensions: [],
        unknownDimensionCount: 0,
        validation: baseContext().validation,
        scoredAt: "2026-08-01T00:00:00.000Z",
      }),
    };

    const result = calculateOpportunityScore(baseContext(), config, stubStrategy);
    expect(result.overallScore).toBe(42);
    expect(ruleBasedScoringStrategy).not.toBe(stubStrategy);
  });
});

describe("prioritize and explain", () => {
  it("returns deterministic outcomes", () => {
    const config = mergeReasoningConfig();
    const high = calculateOpportunityScore(baseContext(), config);
    const outcome = prioritizeOpportunity(high, config);
    expect(["REJECT", "RESEARCH_MORE", "QUEUE", "APPROVE_FOR_BUILD"]).toContain(outcome);

    const explanation = explainOpportunityScore(high, config);
    expect(explanation).toContain("Alpha SaaS");
    expect(explanation).toContain("rule-based");
    expect(explainOpportunityScore(high, config)).toBe(explainOpportunityScore(high, config));
  });
});

describe("rank and compare", () => {
  it("ranks validated opportunities by score descending", () => {
    const config = mergeReasoningConfig();
    const alpha = calculateOpportunityScore(baseContext(), config);
    const beta = calculateOpportunityScore(
      baseContext({
        opportunityId: "opp-2",
        opportunityName: "Beta Marketplace",
        opportunity: {
          id: "opp-2",
          organization_id: "org-1",
          name: "Beta Marketplace",
          overall_score: 55,
          source_snapshot: {},
        } as never,
        latestScore: {
          demand_score: 50,
          competition_score: 70,
          profitability_score: 45,
        } as never,
        validation: {
          validationRunId: "run-2",
          recommendation: "approved_for_planning",
          overallScore: 60,
          overallConfidence: 58,
          completedAt: null,
        },
      }),
      config,
    );

    const ranked = rankValidatedOpportunities([beta, alpha], config);
    expect(ranked[0]?.opportunityId).toBe(alpha.opportunityId);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.rank).toBe(2);
  });

  it("compares two opportunities deterministically", () => {
    const config = mergeReasoningConfig();
    const alpha = calculateOpportunityScore(baseContext(), config);
    const beta = calculateOpportunityScore(
      baseContext({
        opportunityId: "opp-2",
        opportunityName: "Beta",
        opportunity: { id: "opp-2", name: "Beta", overall_score: 40 } as never,
        latestScore: { demand_score: 40, competition_score: 80 } as never,
      }),
      config,
    );

    const comparison = compareOpportunities(alpha, beta);
    expect(comparison.recommendedOpportunityId).toBe(alpha.opportunityId);
    expect(comparison.deterministic).toBe(true);
    expect(comparison.rationale.length).toBeGreaterThan(0);
  });
});
