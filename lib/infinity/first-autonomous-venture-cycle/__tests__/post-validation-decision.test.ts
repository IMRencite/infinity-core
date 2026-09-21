import { describe, expect, it } from "vitest";
import { auditBuildGate } from "@/lib/infinity/venture-selection/decisions/build-gate-audit";
import { classifyDecision, passesBuildGate } from "@/lib/infinity/venture-selection/decisions/classify";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
} from "@/lib/infinity/venture-selection/constants";
import type { CandidateEvaluationDraft, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import { FAVC1_VALIDATION_MAX_ACQUISITION_CALLS, FAVC1_VALIDATION_MAX_ROUNDS } from "@/lib/infinity/first-autonomous-venture-cycle/bounded-validation/constants";

function baseCandidate(): LoadedCandidateBundle {
  return {
    candidateId: "c1",
    discoveryRunId: "d1",
    title: "Test Venture",
    summary: "Summary",
    problem: "Problem",
    targetCustomer: "SMBs",
    market: "B2B",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 70,
    demandEvidence: [],
    monetizationEvidence: [],
    competitionEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    researchSources: [],
    researchRunIds: [],
    monetization: {
      monetizationRunId: "m1",
      analysisId: "a1",
      primaryPlanId: "p1",
      monetizationScore: 70,
      combinedDecisionScore: 72,
      economicViability: "PROMISING",
      recommendation: {
        recommendedPrimaryModel: "subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "",
        recommendedCustomer: "SMBs",
        recommendedAcquisitionStrategy: "",
        expectedRevenueMechanism: "subscription",
        expectedTimeToRevenue: "3 months",
        estimatedStartupCapital: 120000,
        keyEconomicAssumptions: [],
        largestEconomicRisks: [],
        confidence: 0.7,
      },
      primaryPlan: {
        id: "p1",
        modelType: "subscription",
        modelName: "Subscription",
        monetizationScore: 70,
        estimatedCapitalRequired: 120000,
        estimatedPriceBase: 99,
        estimatedCustomersYear1: 150,
        estimatedMonthsToFirstRevenue: 3,
        estimatedGrossRevenueYear1: 150000,
        estimatedGrossMarginPercent: 60,
        estimatedFixedCosts: 48000,
        estimatedVariableCosts: 10000,
        estimatedCAC: 518,
        estimatedLTV: 1200,
        ltvCacRatio: 2.4,
        automationPotential: 0.7,
        technicalComplexity: 0.3,
        operationalComplexity: 0.3,
        regulatoryRisk: 0.2,
        platformDependencyRisk: 0.4,
        customerAcquisitionDifficulty: 0.4,
        keyAssumptions: [],
        risks: [],
        sourceUrls: [],
        revenueStreams: [],
      },
      allPlans: [],
      validationExperiments: [],
    },
  };
}

function baseEvaluation(overrides: Partial<CandidateEvaluationDraft> = {}): CandidateEvaluationDraft {
  const candidate = baseCandidate();
  return {
    candidate,
    assumptions: [],
    fatalAssumptionRiskScore: 0.52,
    assumptionUncertaintyScore: 0.5,
    blockingAssumptions: ["Customer acquisition cost can be kept near $518."],
    validationScore: 58,
    validationDimensions: {},
    buildability: {
      buildabilityScore: 62,
      automationScore: 70,
      operationalAutonomyScore: 65,
      externalDependencyScore: 35,
      canBuildSoftware: true,
      canAutomateAcquisition: true,
      canAutomateFulfillment: true,
      canAutomateSupport: true,
      requiresPhysicalInventory: false,
      requiresSpecializedEmployees: false,
      requiresLicensing: false,
      requiresLargeUpfrontCapital: false,
      dependsOnManualSales: false,
      dependsOnInaccessibleSystems: false,
      canDeliverDigitally: true,
      assessmentNotes: [],
      assessmentInputs: {},
    },
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 90,
      estimatedTimeToFirstRevenueDays: 120,
      estimatedTimeToBreakEvenDays: 240,
      speedToValueScore: 67,
    },
    expectedValueInputs: {
      probabilityOfSuccess: 0.5,
      estimatedCustomersYear1: 150,
      estimatedRevenuePerCustomer: 1000,
      estimatedGrossMarginPercent: 60,
      estimatedFixedCosts: 48000,
      estimatedVariableCosts: 10000,
      startupCapital: 120000,
    },
    expectedValueDerived: {
      probabilityAdjustedRevenue: 75000,
      probabilityAdjustedGrossProfit: 45000,
      expected12MonthProfit: 12000,
      expectedRoi: 1.2,
      capitalEfficiency: 0.3,
      expectedValuePerDollarDeployed: 0.2,
    },
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore: 68,
    portfolioAdjustedScore: 68,
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: null,
    decision: "VALIDATE",
    recommendedNextAction: "Validate",
    queueReason: "test",
    explanation: {
      whyThisOpportunity: "test",
      whyNow: "test",
      whyInfinityCanBuildIt: "test",
      whyCustomersWillPay: "test",
      whyThisModel: "test",
      whyItRanksAboveAlternatives: "test",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence: 0.58,
    },
    handoff: null,
    confidence: 0.58,
    ...overrides,
  };
}

describe("post-validation decision audit helpers", () => {
  it("returns exact failed BUILD gates", () => {
    const evaluation = baseEvaluation();
    const audit = auditBuildGate({ evaluation });
    expect(audit.passes).toBe(false);
    const failed = audit.rows.filter((row) => !row.pass).map((row) => row.gate);
    expect(failed).toContain("fatalAssumptionRisk");
    expect(failed).toContain("validationScore");
    expect(failed).toContain("selectionScore");
    expect(failed).toContain("expectedROI");
  });

  it("keeps VALIDATE when non-CAC blocker remains after CAC improvement", () => {
    const evaluation = baseEvaluation({
      fatalAssumptionRiskScore: 0.48,
      validationScore: 57,
      confidence: 0.54,
      blockingAssumptions: ["Can acquire ~150 paying customers in year one."],
    });
    const gate = passesBuildGate({ evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
    const classified = classifyDecision({
      evaluation,
      buildGatePassed: gate.passes,
      buildGateReasons: gate.reasons,
      hasResourceCapacity: true,
      decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
    });
    expect(gate.passes).toBe(false);
    expect(classified.decision).toBe("VALIDATE");
  });

  it("one-round terminal policy constants remain bounded", () => {
    expect(FAVC1_VALIDATION_MAX_ROUNDS).toBe(1);
    expect(FAVC1_VALIDATION_MAX_ACQUISITION_CALLS).toBe(1);
  });

  it("does not weaken thresholds", () => {
    expect(DEFAULT_BUILD_GATE_THRESHOLDS.maxFatalAssumptionRisk).toBe(0.45);
    expect(DEFAULT_RESOURCE_CONSTRAINTS.availableVentureCapital).toBe(100000);
  });
});
