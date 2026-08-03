import { describe, expect, it } from "vitest";
import {
  calculateOpportunityScore,
  mergeReasoningConfig,
  rankValidatedOpportunities,
  type RankedOpportunity,
  type ReasoningContext,
} from "@/lib/infinity/reasoning";
import {
  decideExecutiveAction,
  processReasoningOutputs,
  ruleBasedExecutiveDecisionStrategy,
  validateExecutivePolicy,
  buildEnterpriseBuildQueue,
  mergeExecutivePolicy,
} from "@/lib/infinity/executive";

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
      { evidence_type: "market", credibility_score: 70, relevance_score: 68 },
      { evidence_type: "regulation", relevance_score: 30 },
    ] as never,
    evaluation: { recommendation: "approve_initiative" } as never,
    allocationAmount: 25_000,
    ...overrides,
  };
}

function rankedFromContext(ctx: ReasoningContext) {
  const config = mergeReasoningConfig();
  const scored = calculateOpportunityScore(ctx, config);
  return rankValidatedOpportunities([scored], config)[0]!;
}

function syntheticRanked(
  overrides: Partial<RankedOpportunity> & { opportunityId: string; opportunityName: string },
): RankedOpportunity {
  return {
    organizationId: "org-1",
    overallScore: 80,
    confidence: 75,
    unknownDimensionCount: 0,
    validation: {
      validationRunId: "run-1",
      recommendation: "approved_for_planning",
      overallScore: 75,
      overallConfidence: 75,
      completedAt: "2026-08-01T00:00:00.000Z",
    },
    scoredAt: "2026-08-01T00:00:00.000Z",
    rank: 1,
    outcome: "APPROVE_FOR_BUILD",
    explanation: "Synthetic ranked opportunity for executive tests.",
    dimensions: [
      { key: "revenue_potential", label: "Revenue", score: 70, status: "known", source: "test" },
      { key: "time_to_launch", label: "Time", score: 65, status: "known", source: "test" },
      { key: "strategic_fit", label: "Strategic", score: 68, status: "known", source: "test" },
      { key: "market_demand", label: "Demand", score: 72, status: "known", source: "test" },
      { key: "risk", label: "Risk", score: 40, status: "known", source: "test" },
    ],
    ...overrides,
  };
}

describe("executive policy", () => {
  it("validates policy bounds", () => {
    expect(() =>
      validateExecutivePolicy(
        mergeExecutivePolicy({ maxConcurrentBuilds: 0, maxPortfolioConcentration: 0.5 }),
      ),
    ).toThrow(/maxConcurrentBuilds/);
  });
});

describe("processReasoningOutputs", () => {
  it("returns deterministic executive decisions for reasoning outputs", () => {
    const ranked = rankedFromContext(baseContext());
    const context = {
      organizationId: "org-1",
      capital: {
        totalCapacity: 500_000,
        reservedCapacity: 50_000,
        consumedCapacity: 100_000,
      },
      workload: { activeBuilds: 1, queuedBuilds: 2 },
      opportunityMeta: {
        "opp-1": {
          industry: "software",
          category: "saas",
          requestedAmount: 20_000,
        },
      },
    };

    const first = processReasoningOutputs([ranked], context);
    const second = processReasoningOutputs([ranked], context);

    expect(first.decisions[0]?.decision).toBe(second.decisions[0]?.decision);
    expect(first.decisions[0]?.rationale).toEqual(second.decisions[0]?.rationale);
    expect(first.decisions[0]?.decision).toBeDefined();
    expect(["APPROVE", "DEFER", "REJECT", "QUEUE", "RESEARCH_MORE"]).toContain(
      first.decisions[0]?.decision,
    );
  });

  it("defers or queues when concurrent build capacity is exhausted", () => {
    const ranked = rankedFromContext(baseContext());
    const result = processReasoningOutputs([ranked], {
      organizationId: "org-1",
      capital: {
        totalCapacity: 500_000,
        reservedCapacity: 0,
        consumedCapacity: 0,
      },
      workload: { activeBuilds: 3, queuedBuilds: 0 },
      policy: { maxConcurrentBuilds: 3, deferWhenAtCapacity: true },
      opportunityMeta: {
        "opp-1": { industry: "software", category: "saas", requestedAmount: 5_000 },
      },
    });

    expect(["DEFER", "QUEUE", "RESEARCH_MORE", "REJECT"]).toContain(result.decisions[0]?.decision);
  });

  it("maintains a prioritized enterprise build queue", () => {
    const alpha = syntheticRanked({
      opportunityId: "opp-1",
      opportunityName: "Alpha SaaS",
      rank: 1,
    });
    const rankedBeta = syntheticRanked({
      opportunityId: "opp-2",
      opportunityName: "Beta Marketplace",
      rank: 2,
      overallScore: 76,
    });

    const result = processReasoningOutputs([alpha, rankedBeta], {
      organizationId: "org-1",
      policy: {
        minExpectedRoiScore: 0,
        minTimeToValueScore: 0,
        minStrategicAlignmentScore: 0,
        minEnterpriseValueScore: 0,
        maxRiskScoreForApprove: 100,
        rejectBelowReasoningScore: 0,
      },
      capital: {
        totalCapacity: 1_000_000,
        reservedCapacity: 0,
        consumedCapacity: 0,
      },
      workload: { activeBuilds: 0, queuedBuilds: 0 },
      opportunityMeta: {
        "opp-1": { industry: "software", category: "saas", requestedAmount: 10_000 },
        "opp-2": { industry: "retail", category: "marketplace", requestedAmount: 10_000 },
      },
    });

    const queueEligible = result.decisions.filter((d) =>
      ["APPROVE", "QUEUE", "DEFER"].includes(d.decision),
    );
    expect(queueEligible.length).toBeGreaterThan(0);
    expect(result.queue.length).toBe(queueEligible.length);
    expect(result.queue[0]?.queuePosition).toBe(1);
    expect(result.queue.every((item, i) => item.queuePosition === i + 1)).toBe(true);
  });
});

describe("ExecutiveDecisionStrategy", () => {
  it("allows swapping decision logic without changing callers", () => {
    const ranked = rankedFromContext(baseContext());
    const stubStrategy = {
      decide: () => ({
        organizationId: ranked.organizationId,
        opportunityId: ranked.opportunityId,
        opportunityName: ranked.opportunityName,
        decision: "QUEUE" as const,
        reasoningOutcome: ranked.outcome,
        reasoningScore: ranked.overallScore,
        reasoningRank: ranked.rank,
        signals: {
          expectedRoiScore: null,
          timeToValueScore: null,
          riskScore: null,
          strategicAlignmentScore: null,
          enterpriseValueScore: null,
          portfolioConcentration: 0,
          capitalSufficient: true,
          capacityAvailable: true,
          workloadWithinLimits: true,
        },
        rationale: ["stub"],
        decidedAt: "2026-08-02T00:00:00.000Z",
      }),
    };

    const result = processReasoningOutputs([ranked], {
      organizationId: "org-1",
      capital: { totalCapacity: 100_000, reservedCapacity: 0, consumedCapacity: 0 },
      workload: { activeBuilds: 0, queuedBuilds: 0 },
      strategy: stubStrategy,
    });

    expect(result.decisions[0]?.decision).toBe("QUEUE");
    expect(ruleBasedExecutiveDecisionStrategy).not.toBe(stubStrategy);
  });
});

describe("buildEnterpriseBuildQueue", () => {
  it("orders APPROVE ahead of QUEUE at equal reasoning scores", () => {
    const base = {
      organizationId: "org-1",
      opportunityName: "Test",
      reasoningOutcome: "APPROVE_FOR_BUILD",
      reasoningScore: 80,
      reasoningRank: 1,
      signals: {
        expectedRoiScore: 70,
        timeToValueScore: 60,
        riskScore: 40,
        strategicAlignmentScore: 65,
        enterpriseValueScore: 68,
        portfolioConcentration: 0.1,
        capitalSufficient: true,
        capacityAvailable: true,
        workloadWithinLimits: true,
      },
      rationale: [],
      decidedAt: "2026-08-02T00:00:00.000Z",
    };

    const queue = buildEnterpriseBuildQueue([
      { ...base, opportunityId: "a", decision: "QUEUE" },
      { ...base, opportunityId: "b", decision: "APPROVE" },
    ]);

    expect(queue[0]?.opportunityId).toBe("b");
    expect(queue[0]?.queuePriority).toBeGreaterThan(queue[1]?.queuePriority ?? 0);
  });
});

describe("decideExecutiveAction", () => {
  it("maps reasoning REJECT to executive REJECT", () => {
    const ranked = rankedFromContext(
      baseContext({
        latestScore: { demand_score: 10, competition_score: 90, profitability_score: 10 } as never,
        validation: {
          validationRunId: "run-x",
          recommendation: "approved_for_planning",
          overallScore: 20,
          overallConfidence: 30,
          completedAt: null,
        },
      }),
    );

    if (ranked.outcome !== "REJECT") {
      ranked.outcome = "REJECT";
    }

    const record = decideExecutiveAction(
      {
        reasoning: ranked,
        portfolio: { entries: [], industryCounts: {}, categoryCounts: {} },
        capital: {
          totalCapacity: 100_000,
          reservedCapacity: 0,
          consumedCapacity: 0,
          availableCapacity: 100_000,
          requestedAmount: 1_000,
        },
        workload: { activeBuilds: 0, queuedBuilds: 0, totalTracked: 0 },
        industry: "software",
        category: "saas",
      },
      mergeExecutivePolicy(),
    );

    expect(record.decision).toBe("REJECT");
  });
});
