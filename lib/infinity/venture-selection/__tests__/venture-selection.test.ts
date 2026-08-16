import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
  prioritizeValidationExperiments,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_SELECTION_WEIGHTS,
  DEFAULT_VALIDATION_WEIGHTS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "@/lib/infinity/venture-selection/decisions/classify";
import {
  calculateExpectedValue,
  deriveExpectedValueInputs,
} from "@/lib/infinity/venture-selection/economics/expected-value";
import {
  applyPortfolioCorrelationPenalties,
  inferDependencyTags,
} from "@/lib/infinity/venture-selection/portfolio/rank";
import { calculateSelectionScore } from "@/lib/infinity/venture-selection/scoring/selection-score";
import { calculateValidationDimensions } from "@/lib/infinity/venture-selection/scoring/validation-score";
import type { CandidateEvaluationDraft, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import { redactSecrets } from "@/lib/infinity/research/redaction";

function buildMockCandidate(overrides: Partial<LoadedCandidateBundle> = {}): LoadedCandidateBundle {
  return {
    candidateId: "candidate-1",
    discoveryRunId: "discovery-1",
    title: "GEO Analytics SaaS",
    summary: "Analytics platform for AI search visibility",
    problem: "Brands cannot measure AI search visibility",
    targetCustomer: "Marketing teams",
    market: "United States",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 80,
    demandEvidence: [{ claim: "Growing GEO demand", sourceUrls: ["https://example.com"], grounded: true }],
    monetizationEvidence: [],
    competitionEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    researchSources: [],
    researchRunIds: ["research-1"],
    monetization: {
      monetizationRunId: "mon-run-1",
      analysisId: "analysis-1",
      primaryPlanId: "plan-1",
      monetizationScore: 70,
      combinedDecisionScore: 74,
      economicViability: "PROMISING",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: ["data_products"],
        recommendedPricingStrategy: "Tiered monthly subscription",
        recommendedCustomer: "Marketing teams",
        recommendedAcquisitionStrategy: "SEO + content",
        expectedRevenueMechanism: "Recurring subscription",
        expectedTimeToRevenue: "3 months",
        estimatedStartupCapital: 50000,
        keyEconomicAssumptions: ["Teams will pay for GEO analytics"],
        largestEconomicRisks: ["Platform dependency on AI search providers"],
        confidence: 0.7,
      },
      primaryPlan: {
        id: "plan-1",
        modelType: "saas_subscription",
        modelName: "GEO Analytics SaaS",
        monetizationScore: 70,
        estimatedCapitalRequired: 50000,
        estimatedMonthsToFirstRevenue: 3,
        estimatedGrossRevenueYear1: 240000,
        estimatedGrossMarginPercent: 75,
        estimatedFixedCosts: 40000,
        estimatedVariableCosts: 30000,
        estimatedCAC: 300,
        estimatedLTV: 1800,
        ltvCacRatio: 6,
        automationPotential: 0.8,
        technicalComplexity: 0.45,
        operationalComplexity: 0.35,
        regulatoryRisk: 0.2,
        platformDependencyRisk: 0.4,
        customerAcquisitionDifficulty: 0.45,
        keyAssumptions: ["Marketing teams will pay $99/month"],
        risks: ["Competition from incumbents"],
        sourceUrls: ["https://example.com/pricing"],
        revenueStreams: [
          { streamName: "Core subscription", modelType: "saas_subscription", streamRole: "primary" },
        ],
      },
      allPlans: [],
      validationExperiments: [
        {
          id: "exp-1",
          experimentType: "landing_page_demand_test",
          title: "Landing page demand test",
          description: "Test CTA conversion",
          estimatedCostUsd: 150,
          priority: 1,
        },
      ],
    },
    ...overrides,
  };
}

function buildMockEvaluation(candidate: LoadedCandidateBundle): CandidateEvaluationDraft {
  const assumptions = buildAssumptionRegister(candidate);
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(candidate);
  const expectedValueInputs = deriveExpectedValueInputs(candidate);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const { validationScore, dimensions } = calculateValidationDimensions({
    candidate,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
  });
  const { selectionScore, selectionScoreInputs } = calculateSelectionScore({
    candidate,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 72,
      estimatedTimeToFirstRevenueDays: 90,
      estimatedTimeToBreakEvenDays: 225,
      speedToValueScore: 75,
    },
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
  });

  return {
    candidate,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: dimensions,
    buildability,
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 72,
      estimatedTimeToFirstRevenueDays: 90,
      estimatedTimeToBreakEvenDays: 225,
      speedToValueScore: 75,
    },
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics: {},
    selectionScoreInputs,
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: inferDependencyTags(candidate),
    correlationPenalties: [],
    experimentPriorities: prioritizeValidationExperiments({ candidate, assumptions }),
    adversarialReview: null,
    decision: "HOLD",
    recommendedNextAction: "",
    queueReason: "",
    explanation: {
      whyThisOpportunity: "",
      whyNow: "",
      whyInfinityCanBuildIt: "",
      whyCustomersWillPay: "",
      whyThisModel: "",
      whyItRanksAboveAlternatives: "",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence: 0.7,
    },
    handoff: null,
    confidence: 0.7,
  };
}

describe("Venture Selection v1", () => {
  it("builds an assumption register with fatal risk scoring", () => {
    const candidate = buildMockCandidate();
    const assumptions = buildAssumptionRegister(candidate);
    const fatal = analyzeFatalAssumptions(assumptions);
    expect(assumptions.length).toBeGreaterThan(0);
    expect(fatal.fatalAssumptionRiskScore).toBeGreaterThanOrEqual(0);
    expect(fatal.fatalAssumptionRiskScore).toBeLessThanOrEqual(1);
  });

  it("calculates expected value deterministically", () => {
    const derived = calculateExpectedValue({
      probabilityOfSuccess: 0.6,
      estimatedCustomersYear1: 100,
      estimatedRevenuePerCustomer: 1200,
      estimatedGrossMarginPercent: 70,
      estimatedFixedCosts: 20000,
      estimatedVariableCosts: 25000,
      startupCapital: 50000,
    });
    expect(derived.probabilityAdjustedRevenue).toBe(72000);
    expect(derived.expected12MonthProfit).toBeGreaterThan(0);
    expect(derived.expectedRoi).toBeGreaterThan(0);
  });

  it("calculates validation and selection scores deterministically", () => {
    const candidate = buildMockCandidate();
    const evaluation = buildMockEvaluation(candidate);
    const repeat = buildMockEvaluation(candidate);
    expect(evaluation.validationScore).toBe(repeat.validationScore);
    expect(evaluation.selectionScore).toBe(repeat.selectionScore);
  });

  it("uses configurable weights that sum to 1", () => {
    expect(Object.values(DEFAULT_VALIDATION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(Object.values(DEFAULT_SELECTION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("applies portfolio correlation penalties", () => {
    const evalA = buildMockEvaluation(buildMockCandidate({ candidateId: "a" }));
    const evalB = buildMockEvaluation(
      buildMockCandidate({ candidateId: "b", title: "Another GEO SaaS SEO platform" }),
    );
    evalA.dependencyTags = ["seo", "saas"];
    evalB.dependencyTags = ["seo", "saas"];
    const adjusted = applyPortfolioCorrelationPenalties([evalA, evalB]);
    expect(adjusted[1]?.portfolioAdjustedScore).toBeLessThan(adjusted[1]?.selectionScore ?? 0);
  });

  it("classifies decisions without LLM authority", () => {
    const evaluation = buildMockEvaluation(buildMockCandidate());
    evaluation.portfolioAdjustedScore = 40;
    const result = classifyDecision({
      evaluation,
      buildGatePassed: false,
      buildGateReasons: ["Selection score below minimum."],
      hasResourceCapacity: false,
      decisionThresholds: { rejectSelectionScore: 45, validateSelectionScore: 58, holdSelectionScore: 65 },
    });
    expect(result.decision).toBe("REJECT");
  });

  it("evaluates build gate deterministically", () => {
    const evaluation = buildMockEvaluation(buildMockCandidate());
    const gate = passesBuildGate({
      evaluation,
      thresholds: {
        minSelectionScore: 50,
        minMonetizationScore: 50,
        minValidationScore: 50,
        minBuildabilityScore: 50,
        minEvidenceConfidence: 0.4,
        maxFatalAssumptionRisk: 0.8,
        maxStartupCapital: 200000,
        maxPlatformDependency: 0.9,
        maxRegulatoryRisk: 0.9,
        minExpectedRoi: 0.5,
        minLtvCacRatio: 2,
      },
    });
    expect(typeof gate.passes).toBe("boolean");
  });

  it("simulates resource allocation without spending", () => {
    const evaluation = buildMockEvaluation(buildMockCandidate());
    evaluation.decision = "BUILD";
    const allocation = simulateResourceAllocation({
      rankedEvaluations: [evaluation],
      constraints: {
        availableVentureCapital: 100000,
        monthlyOperatingBudget: 15000,
        aiApiBudget: 500,
        buildCapacity: 2,
        maxSimultaneousBuilds: 1,
        maxSimultaneousValidations: 3,
        riskTolerance: 0.6,
      },
    });
    expect(allocation.allocations.length).toBeLessThanOrEqual(1);
  });

  it("redacts secrets from selection payloads", () => {
    const redacted = redactSecrets("OPENAI_API_KEY=super-secret-key-value");
    expect(redacted).not.toContain("super-secret-key-value");
  });

  it("does not import launch-gateway execution modules", () => {
    const root = join(process.cwd(), "lib/infinity/venture-selection");
    const files = readdirSync(root, { recursive: true }).filter(
      (file): file is string => typeof file === "string" && file.endsWith(".ts"),
    );
    for (const file of files) {
      const content = readFileSync(join(root, file), "utf8");
      expect(content).not.toMatch(/launch-gateway\/execute-live/);
    }
  });
});
