import { describe, it, expect } from "vitest";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "@/lib/infinity/venture-selection/decisions/classify";
import { calculateExpectedValue, deriveExpectedValueInputs } from "@/lib/infinity/venture-selection/economics/expected-value";
import { calculateSelectionScore } from "@/lib/infinity/venture-selection/scoring/selection-score";
import { calculateValidationDimensions } from "@/lib/infinity/venture-selection/scoring/validation-score";
import type { LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import { deriveFavc1SelectionStopReason } from "../selection-stop-reason";
import { finalizeMonetizationCostSummary, emptyCostSummary } from "@/lib/infinity/monetization-engine/cost-governance";

function runFullSelectionPipeline(input: {
  candidate: LoadedCandidateBundle;
  adversarialRiskInputs?: Record<string, number>;
}) {
  const assumptions = buildAssumptionRegister(input.candidate);
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(input.candidate);
  const expectedValueInputs = deriveExpectedValueInputs(input.candidate);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const { validationScore, dimensions } = calculateValidationDimensions({
    candidate: input.candidate,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: input.adversarialRiskInputs,
  });
  const { selectionScore } = calculateSelectionScore({
    candidate: input.candidate,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue: {
      estimatedBuildTimeDays: 30,
      estimatedValidationTimeDays: 14,
      estimatedLaunchTimeDays: 45,
      estimatedTimeToFirstVisitorDays: 50,
      estimatedTimeToFirstLeadDays: 60,
      estimatedTimeToFirstTransactionDays: 75,
      estimatedTimeToFirstRevenueDays: 60,
      estimatedTimeToBreakEvenDays: 180,
      speedToValueScore: 82,
    },
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: input.adversarialRiskInputs,
  });

  const evaluation = {
    candidate: input.candidate,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: dimensions,
    buildability,
    speedToValue: {
      estimatedBuildTimeDays: 30,
      estimatedValidationTimeDays: 14,
      estimatedLaunchTimeDays: 45,
      estimatedTimeToFirstVisitorDays: 50,
      estimatedTimeToFirstLeadDays: 60,
      estimatedTimeToFirstTransactionDays: 75,
      estimatedTimeToFirstRevenueDays: 60,
      estimatedTimeToBreakEvenDays: 180,
      speedToValueScore: 82,
    },
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: input.adversarialRiskInputs
      ? {
          provider: "openai",
          model: "test",
          summary: "test",
          findings: [],
          riskInputs: input.adversarialRiskInputs,
          confidence: 0.8,
          tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          estimatedCostUsd: 0.001,
        }
      : null,
    decision: "HOLD" as const,
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
      confidence: 0.75,
    },
    handoff: null,
    confidence: 0.75,
  };

  const buildGate = passesBuildGate({ evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
  const classified = classifyDecision({
    evaluation,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity: true,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });

  return {
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    blockingAssumptions: fatal.blockingAssumptions,
    buildGatePassed: buildGate.passes,
    buildGateFailures: buildGate.reasons,
    decision: classified.decision,
    topAssumptionContributions: [...assumptions]
      .sort((a, b) => b.fatalRiskContribution - a.fatalRiskContribution)
      .slice(0, 3)
      .map((item) => item.fatalRiskContribution),
  };
}

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    modelType: "saas_subscription",
    modelName: "Test SaaS",
    monetizationScore: 78,
    estimatedCapitalRequired: 15000,
    estimatedPriceBase: 29,
    estimatedCustomersYear1: 120,
    estimatedMonthsToFirstRevenue: 2,
    estimatedGrossRevenueYear1: 120000,
    estimatedGrossMarginPercent: 75,
    estimatedFixedCosts: 12000,
    estimatedVariableCosts: 8000,
    estimatedCAC: 350,
    estimatedLTV: 1800,
    ltvCacRatio: 5,
    automationPotential: 0.85,
    technicalComplexity: 0.25,
    operationalComplexity: 0.2,
    regulatoryRisk: 0.15,
    platformDependencyRisk: 0.15,
    customerAcquisitionDifficulty: 0.35,
    keyAssumptions: ["Customers adopt quickly"],
    risks: [],
    sourceUrls: ["https://example.com/pricing"],
    revenueStreams: [],
    ...overrides,
  };
}

function baseCandidate(overrides: Partial<LoadedCandidateBundle> = {}): LoadedCandidateBundle {
  return {
    candidateId: "cand-1",
    discoveryRunId: "disc-1",
    title: "Micro SaaS",
    summary: "Simple workflow SaaS",
    problem: "Manual workflow pain",
    targetCustomer: "SMBs",
    market: "US",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 80,
    demandEvidence: [{ claim: "Validated demand", sourceUrls: ["https://example.com"], grounded: true }],
    monetizationEvidence: [],
    competitionEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [{ claim: "CRUD app", sourceUrls: ["https://example.com"], grounded: true }],
    risks: [],
    researchSources: [],
    researchRunIds: ["research-1"],
    monetization: {
      monetizationRunId: "mon-1",
      analysisId: "analysis-1",
      primaryPlanId: "plan-1",
      monetizationScore: 78,
      combinedDecisionScore: 80,
      economicViability: "STRONG",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "$29/mo",
        recommendedCustomer: "SMBs",
        recommendedAcquisitionStrategy: "SEO",
        expectedRevenueMechanism: "subscription",
        expectedTimeToRevenue: "2 months",
        estimatedStartupCapital: 15000,
        keyEconomicAssumptions: ["SMBs pay for workflow automation"],
        largestEconomicRisks: ["Spreadsheet substitution"],
        confidence: 0.75,
      },
      primaryPlan: basePlan(),
      allPlans: [],
      validationExperiments: [
        {
          id: "exp-1",
          experimentType: "landing_page_demand_test",
          title: "Landing page demand test",
          description: "Measure signup intent",
          estimatedCostUsd: 150,
          priority: 1,
        },
      ],
    },
    ...overrides,
  };
}

describe("FAVC1 safety / fatal-assumption calibration", () => {
  it("recalibrated register no longer hardcodes 0.47 for standard bundles", () => {
    const result = runFullSelectionPipeline({ candidate: baseCandidate() });
    expect(result.fatalAssumptionRiskScore).not.toBe(0.47);
    expect(result.topAssumptionContributions.some((value) => value !== 0.54)).toBe(true);
  });

  it("excellent low-risk fixture with grounded facts can reach BUILD through full pipeline", () => {
    const candidate = baseCandidate({
      monetization: {
        ...baseCandidate().monetization!,
        primaryPlan: basePlan({
          estimatedCAC: null,
          estimatedCustomersYear1: null,
          estimatedPriceBase: 29,
          keyAssumptions: [],
        }),
        recommendation: {
          ...baseCandidate().monetization!.recommendation,
          keyEconomicAssumptions: [],
        },
        validationExperiments: baseCandidate().monetization!.validationExperiments,
      },
      demandEvidence: [
        { claim: "Strong grounded demand", sourceUrls: ["https://example.com/a"], grounded: true },
        { claim: "Pricing validated", sourceUrls: ["https://example.com/b"], grounded: true },
      ],
    });
    const result = runFullSelectionPipeline({
      candidate,
      adversarialRiskInputs: {
        acquisition_risk: 0.2,
        competition_risk: 0.25,
        execution_risk: 0.2,
        platform_risk: 0.15,
        regulatory_risk: 0.1,
        pricing_risk: 0.2,
        demand_risk: 0.2,
      },
    });
    expect(result.fatalAssumptionRiskScore).toBeLessThan(0.45);
    expect(result.decision).toBe("BUILD");
  });

  it("uncertain SaaS with high adversarial risk stays VALIDATE", () => {
    const result = runFullSelectionPipeline({
      candidate: baseCandidate(),
      adversarialRiskInputs: {
        acquisition_risk: 0.75,
        competition_risk: 0.8,
        execution_risk: 0.7,
        platform_risk: 0.5,
        regulatory_risk: 0.4,
        pricing_risk: 0.7,
        demand_risk: 0.75,
      },
    });
    expect(result.fatalAssumptionRiskScore).toBeGreaterThanOrEqual(0.45);
    expect(result.decision).toBe("VALIDATE");
    expect(result.blockingAssumptions.length).toBeGreaterThan(0);
  });

  it("unsafe regulated fixture cannot BUILD through full pipeline", () => {
    const result = runFullSelectionPipeline({
      candidate: baseCandidate({
        title: "Regulated health marketplace",
        monetization: {
          ...baseCandidate().monetization!,
          primaryPlan: basePlan({
            estimatedCapitalRequired: 500000,
            regulatoryRisk: 0.95,
            platformDependencyRisk: 0.9,
            ltvCacRatio: 0.8,
          }),
        },
      }),
      adversarialRiskInputs: {
        acquisition_risk: 0.9,
        competition_risk: 0.9,
        execution_risk: 0.9,
        platform_risk: 0.95,
        regulatory_risk: 0.95,
        pricing_risk: 0.85,
        demand_risk: 0.85,
      },
    });
    expect(result.buildGatePassed).toBe(false);
    expect(result.decision).not.toBe("BUILD");
    expect(
      result.buildGateFailures.some((reason) =>
        /Platform dependency|Regulatory risk|Startup capital|LTV\/CAC/i.test(reason),
      ),
    ).toBe(true);
  });

  it("maps ordinary VALIDATE pool to validation_required, not safety_constraints", () => {
    const candidate = baseCandidate();
    const pipeline = runFullSelectionPipeline({ candidate });
    const evaluation = {
      ...runFullSelectionPipeline({ candidate }),
      candidate,
      assumptions: buildAssumptionRegister(candidate),
      fatalAssumptionRiskScore: pipeline.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: 0.5,
      blockingAssumptions: pipeline.blockingAssumptions,
      validationScore: 70,
      validationDimensions: {},
      buildability: assessBuildability(candidate),
      speedToValue: {
        estimatedBuildTimeDays: 30,
        estimatedValidationTimeDays: 14,
        estimatedLaunchTimeDays: 45,
        estimatedTimeToFirstVisitorDays: 50,
        estimatedTimeToFirstLeadDays: 60,
        estimatedTimeToFirstTransactionDays: 75,
        estimatedTimeToFirstRevenueDays: 60,
        estimatedTimeToBreakEvenDays: 180,
        speedToValueScore: 70,
      },
      expectedValueInputs: deriveExpectedValueInputs(candidate),
      expectedValueDerived: calculateExpectedValue(deriveExpectedValueInputs(candidate)),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 74,
      portfolioAdjustedScore: 74,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: null,
      decision: "VALIDATE" as const,
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
    const reason = deriveFavc1SelectionStopReason([evaluation]);
    expect(reason.structured.path).toBe("validation_required");
    expect(reason.message).toContain("require validation");
  });

  it("maps true safety-only pool to safety_constraints", () => {
    const candidate = baseCandidate({
      monetization: {
        ...baseCandidate().monetization!,
        primaryPlan: basePlan({
          platformDependencyRisk: 0.95,
          regulatoryRisk: 0.9,
          estimatedCapitalRequired: 500000,
        }),
      },
    });
    const fatal = analyzeFatalAssumptions(buildAssumptionRegister(candidate));
    const evaluation = {
      candidate,
      assumptions: buildAssumptionRegister(candidate),
      fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
      blockingAssumptions: fatal.blockingAssumptions,
      validationScore: 60,
      validationDimensions: {},
      buildability: assessBuildability(candidate),
      speedToValue: {
        estimatedBuildTimeDays: 30,
        estimatedValidationTimeDays: 14,
        estimatedLaunchTimeDays: 45,
        estimatedTimeToFirstVisitorDays: 50,
        estimatedTimeToFirstLeadDays: 60,
        estimatedTimeToFirstTransactionDays: 75,
        estimatedTimeToFirstRevenueDays: 60,
        estimatedTimeToBreakEvenDays: 180,
        speedToValueScore: 60,
      },
      expectedValueInputs: deriveExpectedValueInputs(candidate),
      expectedValueDerived: calculateExpectedValue(deriveExpectedValueInputs(candidate)),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 50,
      portfolioAdjustedScore: 50,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: null,
      decision: "REJECT" as const,
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
        confidence: 0.5,
      },
      handoff: null,
      confidence: 0.5,
    };
    const reason = deriveFavc1SelectionStopReason([evaluation, evaluation]);
    expect(reason.structured.path).toBe("safety_constraints");
  });

  it("treats zero monetization provider calls as known $0 incremental cost", () => {
    const finalized = finalizeMonetizationCostSummary(emptyCostSummary());
    expect(finalized.estimatedCostUsd).toBe(0);
    expect(finalized.costKnown).toBe(true);
  });

  it("keeps unpriced billable monetization call as unknown", () => {
    const finalized = finalizeMonetizationCostSummary({
      ...emptyCostSummary(),
      researchCallCount: 2,
      estimatedCostUsd: null,
    });
    expect(finalized.costKnown).toBe(false);
  });
});
