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
import {
  applyPortfolioCorrelationPenalties,
  inferDependencyTags,
} from "@/lib/infinity/venture-selection/portfolio/rank";
import { calculateSelectionScore } from "@/lib/infinity/venture-selection/scoring/selection-score";
import { calculateValidationDimensions } from "@/lib/infinity/venture-selection/scoring/validation-score";
import type {
  CandidateEvaluationDraft,
  LoadedCandidateBundle,
  LoadedMonetizationBundle,
} from "@/lib/infinity/venture-selection/types";

function buildFixture(
  overrides: Omit<Partial<LoadedCandidateBundle>, "monetization"> & {
    monetization?: Partial<LoadedMonetizationBundle> | null;
  } = {},
): LoadedCandidateBundle {
  const { monetization: monetizationOverride, ...rest } = overrides;
  return {
    candidateId: overrides.candidateId ?? "fixture-1",
    discoveryRunId: "discovery-fixture",
    title: overrides.title ?? "Simple Digital Checklist SaaS",
    summary: overrides.summary ?? "Lightweight digital checklist for freelancers",
    problem: "Freelancers lose track of client deliverables",
    targetCustomer: "Solo freelancers",
    market: "United States",
    businessModelCandidates: overrides.businessModelCandidates ?? ["saas"],
    revenueMechanismCandidates: overrides.revenueMechanismCandidates ?? ["subscription"],
    opportunityScore: overrides.opportunityScore ?? 82,
    demandEvidence: [{ claim: "Demand exists", sourceUrls: ["https://example.com"], grounded: true }],
    monetizationEvidence: [{ claim: "Pricing validated", sourceUrls: ["https://example.com/pricing"], grounded: true }],
    competitionEvidence: [{ claim: "Fragmented market", sourceUrls: ["https://example.com"], grounded: true }],
    distributionEvidence: [{ claim: "Self-serve SEO", sourceUrls: ["https://example.com"], grounded: true }],
    buildabilityEvidence: [{ claim: "CRUD app", sourceUrls: ["https://example.com"], grounded: true }],
    risks: [],
    researchSources: [],
    researchRunIds: ["research-fixture"],
    monetization: {
      monetizationRunId: "mon-fixture",
      analysisId: "analysis-fixture",
      primaryPlanId: "plan-fixture",
      monetizationScore: overrides.monetization?.monetizationScore ?? 78,
      combinedDecisionScore: 80,
      economicViability: "STRONG",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "$19/mo self-serve",
        recommendedCustomer: "Freelancers",
        recommendedAcquisitionStrategy: "Content SEO",
        expectedRevenueMechanism: "Recurring subscription",
        expectedTimeToRevenue: "2 months",
        estimatedStartupCapital: 15000,
        keyEconomicAssumptions: ["Freelancers pay for organization"],
        largestEconomicRisks: ["Low switching cost"],
        confidence: 0.75,
        ...(overrides.monetization?.recommendation ?? {}),
      },
      allPlans: [],
      validationExperiments: [],
      ...monetizationOverride,
      primaryPlan: {
        id: monetizationOverride?.primaryPlan?.id ?? "plan-fixture",
        modelType: monetizationOverride?.primaryPlan?.modelType ?? "saas_subscription",
        modelName: monetizationOverride?.primaryPlan?.modelName ?? "Checklist SaaS",
        monetizationScore: monetizationOverride?.primaryPlan?.monetizationScore ?? 78,
        estimatedCapitalRequired: monetizationOverride?.primaryPlan?.estimatedCapitalRequired ?? 15000,
        estimatedPriceBase: monetizationOverride?.primaryPlan?.estimatedPriceBase ?? 19,
        estimatedCustomersYear1: monetizationOverride?.primaryPlan?.estimatedCustomersYear1 ?? 200,
        estimatedMonthsToFirstRevenue: monetizationOverride?.primaryPlan?.estimatedMonthsToFirstRevenue ?? 2,
        estimatedGrossRevenueYear1: monetizationOverride?.primaryPlan?.estimatedGrossRevenueYear1 ?? 120000,
        estimatedGrossMarginPercent: monetizationOverride?.primaryPlan?.estimatedGrossMarginPercent ?? 80,
        estimatedFixedCosts: monetizationOverride?.primaryPlan?.estimatedFixedCosts ?? 12000,
        estimatedVariableCosts: monetizationOverride?.primaryPlan?.estimatedVariableCosts ?? 8000,
        estimatedCAC: monetizationOverride?.primaryPlan?.estimatedCAC ?? 80,
        estimatedLTV: monetizationOverride?.primaryPlan?.estimatedLTV ?? 480,
        ltvCacRatio: monetizationOverride?.primaryPlan?.ltvCacRatio ?? 6,
        automationPotential: monetizationOverride?.primaryPlan?.automationPotential ?? 0.85,
        technicalComplexity: monetizationOverride?.primaryPlan?.technicalComplexity ?? 0.25,
        operationalComplexity: monetizationOverride?.primaryPlan?.operationalComplexity ?? 0.2,
        regulatoryRisk: monetizationOverride?.primaryPlan?.regulatoryRisk ?? 0.1,
        platformDependencyRisk: monetizationOverride?.primaryPlan?.platformDependencyRisk ?? 0.15,
        customerAcquisitionDifficulty: monetizationOverride?.primaryPlan?.customerAcquisitionDifficulty ?? 0.35,
        keyAssumptions: monetizationOverride?.primaryPlan?.keyAssumptions ?? ["Freelancers adopt quickly"],
        risks: monetizationOverride?.primaryPlan?.risks ?? ["Competition from spreadsheets"],
        sourceUrls: monetizationOverride?.primaryPlan?.sourceUrls ?? ["https://example.com/pricing"],
        revenueStreams: monetizationOverride?.primaryPlan?.revenueStreams ?? [
          { streamName: "Core subscription", modelType: "saas_subscription", streamRole: "primary" },
        ],
      },
    },
    ...rest,
  };
}

function buildEvaluation(
  candidate: LoadedCandidateBundle,
  adversarialRiskInputs?: Record<string, number>,
): CandidateEvaluationDraft {
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
    adversarialRiskInputs,
  });
  const { selectionScore, selectionScoreInputs } = calculateSelectionScore({
    candidate,
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
    adversarialRiskInputs,
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
    selectionScoreInputs,
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: inferDependencyTags(candidate),
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
  };
}

function classifyWithGate(evaluation: CandidateEvaluationDraft) {
  const buildGate = passesBuildGate({ evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
  const allocationPreview = simulateResourceAllocation({
    rankedEvaluations: [{ ...evaluation, decision: buildGate.passes ? "BUILD" : "VALIDATE" }],
    constraints: DEFAULT_RESOURCE_CONSTRAINTS,
  });
  const hasResourceCapacity =
    allocationPreview.allocations.some((item) => item.candidateId === evaluation.candidate.candidateId) ||
    buildGate.passes;
  return classifyDecision({
    evaluation,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });
}

describe("BUILD gate reachability", () => {
  it("A — excellent low-risk digital venture can reach BUILD", () => {
    const evaluation = buildEvaluation(buildFixture());
    const [adjusted] = applyPortfolioCorrelationPenalties([evaluation]);
    const result = classifyWithGate(adjusted!);
    expect(result.decision).toBe("BUILD");
  });

  it("B — mediocre venture does not reach BUILD", () => {
    const evaluation = buildEvaluation(
      buildFixture({
        candidateId: "mediocre-1",
        title: "Generic B2B workflow tool",
        opportunityScore: 58,
        monetization: {
          monetizationScore: 55,
          recommendation: {
            recommendedPrimaryModel: "saas_subscription",
            recommendedSecondaryModels: [],
            recommendedPricingStrategy: "Low tier",
            recommendedCustomer: "SMBs",
            recommendedAcquisitionStrategy: "Outbound sales",
            expectedRevenueMechanism: "Subscription",
            expectedTimeToRevenue: "9 months",
            estimatedStartupCapital: 120000,
            keyEconomicAssumptions: ["SMBs adopt"],
            largestEconomicRisks: ["Long sales cycles"],
            confidence: 0.45,
          },
          primaryPlan: {
            id: "plan-mediocre",
            modelType: "saas_subscription",
            modelName: "Workflow tool",
            monetizationScore: 55,
            estimatedCapitalRequired: 120000,
            estimatedPriceBase: 49,
            estimatedCustomersYear1: 80,
            estimatedMonthsToFirstRevenue: 9,
            estimatedGrossRevenueYear1: 60000,
            estimatedGrossMarginPercent: 45,
            estimatedFixedCosts: 50000,
            estimatedVariableCosts: 20000,
            estimatedCAC: 900,
            estimatedLTV: 1200,
            ltvCacRatio: 1.4,
            automationPotential: 0.4,
            technicalComplexity: 0.7,
            operationalComplexity: 0.65,
            regulatoryRisk: 0.55,
            platformDependencyRisk: 0.6,
            customerAcquisitionDifficulty: 0.75,
            keyAssumptions: ["SMBs pay monthly"],
            risks: ["Incumbent bundling"],
            sourceUrls: [],
            revenueStreams: [],
          },
        },
      }),
    );
    evaluation.confidence = 0.45;
    const [adjusted] = applyPortfolioCorrelationPenalties([evaluation]);
    expect(["VALIDATE", "HOLD", "REJECT"]).toContain(classifyWithGate(adjusted!).decision);
    expect(classifyWithGate(adjusted!).decision).not.toBe("BUILD");
  });

  it("C — unsafe/high-risk venture is REJECTed", () => {
    const evaluation = buildEvaluation(
      buildFixture({
        candidateId: "unsafe-1",
        title: "Regulated healthcare data marketplace with paid ads",
        summary: "Healthcare marketplace requiring paid ads and heavy compliance",
        businessModelCandidates: ["marketplace"],
        revenueMechanismCandidates: ["paid ads", "commission"],
        monetization: {
          monetizationScore: 40,
          recommendation: {
            recommendedPrimaryModel: "marketplace",
            recommendedSecondaryModels: ["paid ads"],
            recommendedPricingStrategy: "Commission",
            recommendedCustomer: "Hospitals",
            recommendedAcquisitionStrategy: "Paid ads",
            expectedRevenueMechanism: "Commission",
            expectedTimeToRevenue: "12 months",
            estimatedStartupCapital: 500000,
            keyEconomicAssumptions: ["Providers join"],
            largestEconomicRisks: ["Regulatory enforcement"],
            confidence: 0.35,
          },
          primaryPlan: {
            id: "plan-unsafe",
            modelType: "marketplace",
            modelName: "Healthcare marketplace",
            monetizationScore: 40,
            estimatedCapitalRequired: 500000,
            estimatedPriceBase: 199,
            estimatedCustomersYear1: 40,
            estimatedMonthsToFirstRevenue: 12,
            estimatedGrossRevenueYear1: 100000,
            estimatedGrossMarginPercent: 30,
            estimatedFixedCosts: 200000,
            estimatedVariableCosts: 50000,
            estimatedCAC: 5000,
            estimatedLTV: 3000,
            ltvCacRatio: 0.8,
            automationPotential: 0.2,
            technicalComplexity: 0.9,
            operationalComplexity: 0.9,
            regulatoryRisk: 0.95,
            platformDependencyRisk: 0.9,
            customerAcquisitionDifficulty: 0.9,
            keyAssumptions: ["Regulatory approval"],
            risks: ["HIPAA exposure"],
            sourceUrls: [],
            revenueStreams: [],
          },
        },
      }),
      {
        acquisition_risk: 0.9,
        competition_risk: 0.9,
        execution_risk: 0.9,
        platform_risk: 0.95,
        regulatory_risk: 0.95,
        pricing_risk: 0.85,
        demand_risk: 0.85,
      },
    );
    evaluation.confidence = 0.35;
    evaluation.fatalAssumptionRiskScore = 0.72;
    const [adjusted] = applyPortfolioCorrelationPenalties([evaluation]);
    expect(classifyWithGate(adjusted!).decision).toBe("REJECT");
  });

  it("homogeneous FAVC1 pool must not crush all scores below REJECT threshold", () => {
    const titles = [
      "B2B SaaS compliance tracker",
      "B2B SaaS ROI calculator",
      "B2B SaaS RFQ utility",
      "B2B SaaS evidence collector",
      "B2B SaaS GEO monitor",
    ];
    const drafts = titles.map((title, index) =>
      buildEvaluation(
        buildFixture({
          candidateId: `homogeneous-${index}`,
          title,
          summary: "B2B SaaS subscription for regulated lead generation sales teams",
          businessModelCandidates: ["saas", "b2b"],
          revenueMechanismCandidates: ["subscription", "lead generation"],
        }),
        {
          acquisition_risk: 0.75,
          competition_risk: 0.82,
          execution_risk: 0.8,
          platform_risk: 0.6,
          regulatory_risk: 0.65,
          pricing_risk: 0.7,
          demand_risk: 0.78,
        },
      ),
    );
    const adjusted = applyPortfolioCorrelationPenalties(drafts);
    const best = adjusted.reduce((top, item) =>
      item.portfolioAdjustedScore > top.portfolioAdjustedScore ? item : top,
    );
    expect(best.portfolioAdjustedScore).toBeGreaterThan(DEFAULT_DECISION_THRESHOLDS.rejectSelectionScore);
    expect(best.selectionScore).toBeGreaterThan(65);
  });

  it("missing evidence is neutral-not-negative in validation scoring", () => {
    const withEvidence = buildEvaluation(buildFixture({ candidateId: "with-evidence" }));
    const withoutEvidence = buildEvaluation(
      buildFixture({
        candidateId: "without-evidence",
        demandEvidence: [],
        monetizationEvidence: [],
        competitionEvidence: [],
        distributionEvidence: [],
        buildabilityEvidence: [],
        monetization: {
          ...buildFixture().monetization!,
          primaryPlan: {
            ...buildFixture().monetization!.primaryPlan!,
            sourceUrls: [],
          },
        },
      }),
    );
    expect(withoutEvidence.validationScore).toBeGreaterThan(0);
    expect(withoutEvidence.validationScore).toBeLessThanOrEqual(withEvidence.validationScore);
  });
});
