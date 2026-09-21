import { describe, it, expect } from "vitest";
import { CycleBudgetGovernor } from "../budget-governor";
import { deriveFavc1SelectionStopReason } from "../selection-stop-reason";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
} from "@/lib/infinity/venture-selection/decisions/classify";
import { estimateAdversarialReviewCostUsd } from "@/lib/infinity/venture-selection/cost/estimate-adversarial-cost";
import {
  applyPortfolioCorrelationPenalties,
} from "@/lib/infinity/venture-selection/portfolio/rank";
import { replaySelectionPool } from "@/lib/infinity/venture-selection/replay/replay-from-persisted";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";

function minimalEvaluation(overrides: Partial<CandidateEvaluationDraft> = {}): CandidateEvaluationDraft {
  const selectionScore = overrides.selectionScore ?? 78;
  return {
    candidate: {
      candidateId: "c1",
      discoveryRunId: "d1",
      title: "SaaS Tool",
      summary: "B2B SaaS",
      problem: "",
      targetCustomer: "",
      market: "",
      businessModelCandidates: ["saas"],
      revenueMechanismCandidates: ["subscription"],
      opportunityScore: 80,
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
        monetizationScore: 78,
        combinedDecisionScore: 80,
        economicViability: "STRONG",
        recommendation: {
          recommendedPrimaryModel: "saas_subscription",
          recommendedSecondaryModels: [],
          recommendedPricingStrategy: "",
          recommendedCustomer: "",
          recommendedAcquisitionStrategy: "",
          expectedRevenueMechanism: "",
          expectedTimeToRevenue: "",
          estimatedStartupCapital: 50000,
          keyEconomicAssumptions: [],
          largestEconomicRisks: [],
          confidence: 0.75,
        },
        primaryPlan: {
          id: "p1",
          modelType: "saas_subscription",
          modelName: "SaaS",
          monetizationScore: 78,
          estimatedCapitalRequired: 50000,
          estimatedMonthsToFirstRevenue: 2,
          estimatedGrossRevenueYear1: 120000,
          estimatedGrossMarginPercent: 75,
          estimatedFixedCosts: 10000,
          estimatedVariableCosts: 5000,
          estimatedCAC: 100,
          estimatedLTV: 600,
          ltvCacRatio: 6,
          automationPotential: 0.8,
          technicalComplexity: 0.3,
          operationalComplexity: 0.2,
          regulatoryRisk: 0.2,
          platformDependencyRisk: 0.2,
          customerAcquisitionDifficulty: 0.3,
          keyAssumptions: [],
          risks: [],
          sourceUrls: ["https://example.com"],
          revenueStreams: [],
          estimatedPriceBase: 99,
          estimatedCustomersYear1: 100,
        },
        allPlans: [],
        validationExperiments: [],
      },
    },
    assumptions: [],
    fatalAssumptionRiskScore: 0.2,
    assumptionUncertaintyScore: 0.2,
    blockingAssumptions: [],
    validationScore: 72,
    validationDimensions: {},
    buildability: {
      buildabilityScore: 80,
      automationScore: 80,
      operationalAutonomyScore: 80,
      externalDependencyScore: 50,
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
      estimatedBuildTimeDays: 30,
      estimatedValidationTimeDays: 14,
      estimatedLaunchTimeDays: 45,
      estimatedTimeToFirstVisitorDays: 50,
      estimatedTimeToFirstLeadDays: 60,
      estimatedTimeToFirstTransactionDays: 75,
      estimatedTimeToFirstRevenueDays: 60,
      estimatedTimeToBreakEvenDays: 180,
      speedToValueScore: 80,
    },
    expectedValueInputs: {
      probabilityOfSuccess: 0.6,
      estimatedCustomersYear1: 100,
      estimatedRevenuePerCustomer: 1200,
      estimatedGrossMarginPercent: 70,
      estimatedFixedCosts: 20000,
      estimatedVariableCosts: 10000,
      startupCapital: 50000,
    },
    expectedValueDerived: {
      probabilityAdjustedRevenue: 72000,
      probabilityAdjustedGrossProfit: 50400,
      expected12MonthProfit: 20400,
      expectedRoi: 2.5,
      capitalEfficiency: 0.4,
      expectedValuePerDollarDeployed: 0.4,
    },
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: ["saas", "b2b_sales"],
    correlationPenalties: [],
    experimentPriorities: [],
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
      confidence: 0.75,
    },
    handoff: null,
    confidence: 0.75,
    ...overrides,
  };
}

describe("FAVC1 build-gate closure", () => {
  it("does not REJECT five correlated excellent SaaS candidates solely from portfolio penalty", () => {
    const drafts = Array.from({ length: 5 }, (_, index) =>
      minimalEvaluation({
        candidate: {
          ...minimalEvaluation().candidate,
          candidateId: `excellent-${index}`,
          title: `Excellent B2B SaaS ${index}`,
        },
        selectionScore: 78,
        dependencyTags: ["saas", "b2b_sales", "lead_generation"],
      }),
    );
    const adjusted = applyPortfolioCorrelationPenalties(drafts);
    for (const evaluation of adjusted) {
      const gate = passesBuildGate({ evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
      const classified = classifyDecision({
        evaluation,
        buildGatePassed: gate.passes,
        buildGateReasons: gate.reasons,
        hasResourceCapacity: true,
        decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
      });
      expect(classified.decision).not.toBe("REJECT");
      expect(evaluation.portfolioAdjustedScore).toBeLessThan(evaluation.selectionScore);
    }
    expect(adjusted.some((item) => item.portfolioAdjustedScore < item.selectionScore)).toBe(true);
  });

  it("portfolio adjustment cannot turn BUILD-qualified candidate into REJECT", () => {
    const evaluation = minimalEvaluation({ selectionScore: 78 });
    const [adjusted] = applyPortfolioCorrelationPenalties([evaluation, evaluation]);
    const gate = passesBuildGate({ evaluation: adjusted!, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
    const decision = classifyDecision({
      evaluation: adjusted!,
      buildGatePassed: gate.passes,
      buildGateReasons: gate.reasons,
      hasResourceCapacity: true,
      decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
    });
    expect(decision.decision).toBe("BUILD");
  });

  it("derives validation-only terminal reason", () => {
    const evaluation = minimalEvaluation({ selectionScore: 71, validationScore: 68 });
    const reason = deriveFavc1SelectionStopReason([
      { ...evaluation, decision: "VALIDATE" },
      { ...evaluation, candidate: { ...evaluation.candidate, candidateId: "c2" }, decision: "VALIDATE" },
    ]);
    expect(reason.message).toContain("require validation");
    expect(reason.structured.path).toBe("validation_required");
  });

  it("derives BUILD gate failure terminal reason", () => {
    const evaluation = minimalEvaluation({
      selectionScore: 71,
      candidate: {
        ...minimalEvaluation().candidate,
        monetization: {
          ...minimalEvaluation().candidate.monetization!,
          monetizationScore: 78,
        },
      },
    });
    const reason = deriveFavc1SelectionStopReason([{ ...evaluation, decision: "VALIDATE" }]);
    expect(reason.structured.path).toBe("validation_required");
  });

  it("derives individual viability rejection terminal reason", () => {
    const evaluation = minimalEvaluation({ selectionScore: 40 });
    const reason = deriveFavc1SelectionStopReason([{ ...evaluation, decision: "REJECT" }]);
    expect(reason.message).toContain("minimum venture viability");
    expect(reason.structured.path).toBe("individual_viability_rejection");
  });

  it("records selection provider cost in FAVC1 budget without treating unknown as zero", () => {
    const gov = new CycleBudgetGovernor();
    gov.record({ stage: "opportunity_scanner", costUsd: 0.00373, known: true });
    gov.record({ stage: "monetization", costUsd: 0.00187, known: true });
    const cost = estimateAdversarialReviewCostUsd({
      inputTokens: 1959,
      outputTokens: 7447,
      totalTokens: 9406,
    });
    gov.record({
      stage: "venture_selection",
      costUsd: cost.estimatedCostUsd,
      known: cost.known,
    });
    expect(gov.knownTotalUsdValue).toBeGreaterThan(0.0056);
    expect(gov.hasUnknownCosts).toBe(false);
    expect(gov.budgetWarning).toBe(false);
    expect(gov.budgetExceeded).toBe(false);

    const unknownGov = new CycleBudgetGovernor();
    unknownGov.record({ stage: "venture_selection", costUsd: null, known: false });
    expect(unknownGov.knownTotalUsdValue).toBe(0);
    expect(unknownGov.hasUnknownCosts).toBe(true);
  });

  it("replays cycle-1786920585370 fixture without mutating historical decisions", () => {
    const replayed = replaySelectionPool([
      {
        candidateId: "380daf42-a5e5-45dc-afb4-4f01d46d31f6",
        title: "COI Compliance Tracker",
        oldDecision: "REJECT",
        selectionScore: 74.05,
        portfolioAdjustedScore: 2.05,
        monetizationScore: 76.14,
        validationScore: 70.65,
        buildabilityScore: 78.75,
        confidence: 0.7133,
        fatalAssumptionRiskScore: 0.47,
        expectedRoi: 19.3381,
        blockingAssumptions: ["assumption-a"],
        primaryPlan: {
          estimatedCapitalRequired: 15000,
          platformDependencyRisk: 0.2,
          regulatoryRisk: 0.3,
          ltvCacRatio: 10,
        },
      },
      {
        candidateId: "4810fe25-cf99-4f58-bbd6-a9a827aa7fe4",
        title: "B2B ROI Calculator Builder",
        oldDecision: "REJECT",
        selectionScore: 74.92,
        portfolioAdjustedScore: 0,
        monetizationScore: 77.14,
        validationScore: 72.62,
        buildabilityScore: 81.25,
        confidence: 0.73,
        fatalAssumptionRiskScore: 0.47,
        expectedRoi: 22.9567,
        blockingAssumptions: ["assumption-b"],
        primaryPlan: {
          estimatedCapitalRequired: 15000,
          platformDependencyRisk: 0.1,
          regulatoryRisk: 0.15,
          ltvCacRatio: 9.4286,
        },
      },
      {
        candidateId: "463e0cb5-c894-4a65-b791-71189c548409",
        title: "RFQ Estimation Utility",
        oldDecision: "REJECT",
        selectionScore: 73.97,
        portfolioAdjustedScore: 0,
        monetizationScore: 74.35,
        validationScore: 71.51,
        buildabilityScore: 77.75,
        confidence: 0.7333,
        fatalAssumptionRiskScore: 0.47,
        expectedRoi: 16.2295,
        blockingAssumptions: ["assumption-c"],
        primaryPlan: {
          estimatedCapitalRequired: 15000,
          platformDependencyRisk: 0.25,
          regulatoryRisk: 0.1,
          ltvCacRatio: 8.8571,
        },
      },
      {
        candidateId: "797da4fd-766c-41eb-a4d4-e708845f9dcc",
        title: "Compliance Evidence Collector",
        oldDecision: "REJECT",
        selectionScore: 72.43,
        portfolioAdjustedScore: 0,
        monetizationScore: 76.84,
        validationScore: 68.82,
        buildabilityScore: 75.75,
        confidence: 0.7,
        fatalAssumptionRiskScore: 0.47,
        expectedRoi: 15.2552,
        blockingAssumptions: ["assumption-d"],
        primaryPlan: {
          estimatedCapitalRequired: 60000,
          platformDependencyRisk: 0.5,
          regulatoryRisk: 0.3,
          ltvCacRatio: 10.4706,
        },
      },
      {
        candidateId: "7d64b39c-f2db-4768-8d33-948d065d61c1",
        title: "GEO & LLM Visibility Monitor",
        oldDecision: "REJECT",
        selectionScore: 71.46,
        portfolioAdjustedScore: 0,
        monetizationScore: 72.1,
        validationScore: 70.03,
        buildabilityScore: 59.75,
        confidence: 0.7367,
        fatalAssumptionRiskScore: 0.47,
        expectedRoi: 7.9922,
        blockingAssumptions: ["assumption-e"],
        primaryPlan: {
          estimatedCapitalRequired: 45000,
          platformDependencyRisk: 0.85,
          regulatoryRisk: 0.3,
          ltvCacRatio: 5.094,
        },
      },
    ]);

    expect(replayed.every((row) => row.oldDecision === "REJECT")).toBe(true);
    expect(replayed.every((row) => row.recomputedDecision === "VALIDATE")).toBe(true);
    expect(replayed.every((row) => row.buildGatePassed === false)).toBe(true);
    expect(
      replayed.every((row) =>
        row.buildGateFailures.some((reason) => /Fatal assumption risk too high/i.test(reason)),
      ),
    ).toBe(true);
  });
});
