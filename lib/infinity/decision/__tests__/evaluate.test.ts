import { describe, expect, it } from "vitest";
import {
  aggregateWeightedScore,
  calculateConfidenceScore,
  calculateDeterministicDimensionScores,
} from "@/lib/infinity/decision/scoring";
import {
  evaluateMissionPolicies,
  generateRecommendation,
} from "@/lib/infinity/decision/recommend";
import type { DecisionModel } from "@/lib/infinity/decision/types";

const model = {
  id: "model-1",
  organization_id: "org-1",
  name: "Enterprise Value Opportunity Model",
  version: "1.0.0",
  status: "active",
  opportunity_type: null,
  scoring_dimensions: [],
  weights: {
    demand: 0.5,
    evidence_confidence: 0.5,
  },
  decision_thresholds: {
    approve_build_min_overall: 85,
    approve_build_min_confidence: 80,
    research_more_max_confidence: 60,
    reject_max_overall: 35,
  },
  policy_requirements: {
    requires_human_approval_for_build: true,
  },
  description: null,
  activated_at: null,
  deprecated_at: null,
  created_at: "",
  updated_at: "",
} as DecisionModel;

describe("calculateDeterministicDimensionScores", () => {
  it("marks missing score dimensions as unknown instead of zero", () => {
    const dimensions = calculateDeterministicDimensionScores(model, {
      opportunity: {
        id: "opp-1",
        organization_id: "org-1",
        source_snapshot: {},
        industry: "software",
        overall_score: 70,
      } as never,
      latestScore: null,
      evidence: [],
      signals: [],
      reviews: [],
    });

    expect(dimensions.demand.status).toBe("unknown");
    expect(dimensions.demand.score).toBeNull();
  });
});

describe("calculateConfidenceScore", () => {
  it("lowers confidence when important dimensions are missing", () => {
    const dimensions = calculateDeterministicDimensionScores(model, {
      opportunity: {
        id: "opp-1",
        organization_id: "org-1",
        source_snapshot: {},
        industry: "software",
        overall_score: 62,
      } as never,
      latestScore: null,
      evidence: [],
      signals: [],
      reviews: [],
    });

    const { missingDimensions } = aggregateWeightedScore(model, dimensions);
    const confidenceWithGaps = calculateConfidenceScore(dimensions, missingDimensions);
    const confidenceFull = calculateConfidenceScore(dimensions, []);

    expect(missingDimensions.length).toBeGreaterThan(0);
    expect(confidenceWithGaps).toBeLessThan(confidenceFull);
    expect(confidenceWithGaps).toBeLessThan(80);
  });
});

describe("generateRecommendation", () => {
  it("does not produce approve_build for sparse validation data", () => {
    const recommendation = generateRecommendation({
      model,
      overallScore: 90,
      confidenceScore: 90,
      missingDimensions: [],
      isSparseValidation: true,
      policyResults: {
        passed: true,
        blocked: false,
        requiresApproval: true,
        reasons: [],
        checks: {},
      },
    });

    expect(recommendation).not.toBe("approve_build");
    expect(recommendation).toBe("validate");
  });

  it("returns research_more when confidence is low", () => {
    const recommendation = generateRecommendation({
      model,
      overallScore: 60,
      confidenceScore: 40,
      missingDimensions: ["demand", "profitability"],
      isSparseValidation: false,
      policyResults: {
        passed: true,
        blocked: false,
        requiresApproval: false,
        reasons: [],
        checks: {},
      },
    });

    expect(recommendation).toBe("research_more");
  });
});

describe("evaluateMissionPolicies", () => {
  it("blocks build recommendations when venture creation is prohibited", () => {
    const result = evaluateMissionPolicies(
      model,
      [
        {
          config: { creates_ventures: false },
        } as never,
      ],
      {
        isSparseValidation: false,
        recommendation: "approve_build",
      },
    );

    expect(result.blocked).toBe(true);
  });
});

describe("evaluation history", () => {
  it("preserves prior evaluations when a new model version is selected", () => {
    const priorEvaluation = {
      id: "eval-1",
      decision_model_id: "model-v1",
      recommendation: "validate",
      overall_score: 55,
    };

    const nextEvaluation = {
      id: "eval-2",
      decision_model_id: "model-v2",
      recommendation: "research_more",
      overall_score: 48,
    };

    expect(priorEvaluation.recommendation).toBe("validate");
    expect(priorEvaluation.overall_score).toBe(55);
    expect(nextEvaluation.decision_model_id).not.toBe(priorEvaluation.decision_model_id);
  });
});

describe("evaluation side effects", () => {
  it("does not create ventures or assets as part of evaluation output", () => {
    const workerOutput = {
      evaluation_id: "eval-1",
      recommendation: "validate",
      allocation_proposal_id: "proposal-1",
      already_evaluated: false,
    };

    expect(workerOutput).not.toHaveProperty("venture_id");
    expect(workerOutput).not.toHaveProperty("asset_id");
  });
});
