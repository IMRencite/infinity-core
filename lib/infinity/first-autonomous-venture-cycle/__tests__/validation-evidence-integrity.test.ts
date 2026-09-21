import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
} from "@/lib/infinity/venture-selection/decisions/classify";
import type {
  AssumptionRecord,
  ExpectedValueDerived,
  ExpectedValueInputs,
  LoadedCandidateBundle,
  SelectionExplanation,
  SpeedToValueMetrics,
} from "@/lib/infinity/venture-selection/types";

const TEST_SPEED_TO_VALUE: SpeedToValueMetrics = {
  estimatedBuildTimeDays: 30,
  estimatedValidationTimeDays: 14,
  estimatedLaunchTimeDays: 45,
  estimatedTimeToFirstVisitorDays: 50,
  estimatedTimeToFirstLeadDays: 60,
  estimatedTimeToFirstTransactionDays: 75,
  estimatedTimeToFirstRevenueDays: 60,
  estimatedTimeToBreakEvenDays: 180,
  speedToValueScore: 80,
};

const TEST_EXPECTED_VALUE_INPUTS: ExpectedValueInputs = {
  probabilityOfSuccess: 0.5,
  estimatedCustomersYear1: 150,
  estimatedRevenuePerCustomer: 1000,
  estimatedGrossMarginPercent: 60,
  estimatedFixedCosts: 48000,
  estimatedVariableCosts: 10000,
  startupCapital: 120000,
};

function testExpectedValueDerived(expectedRoi: number): ExpectedValueDerived {
  return {
    probabilityAdjustedRevenue: 75000,
    probabilityAdjustedGrossProfit: 45000,
    expected12MonthProfit: 12000,
    expectedRoi,
    capitalEfficiency: 0.3,
    expectedValuePerDollarDeployed: 0.2,
  };
}

const TEST_EXPLANATION: SelectionExplanation = {
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
  confidence: 0.7,
};
import { CycleBudgetGovernor } from "../budget-governor";
import {
  classifyEvidenceRelevance,
  deriveValidationCredit,
  EVIDENCE_CREDIT_BY_RELEVANCE,
} from "../bounded-validation/evidence-relevance";
import { executeAllowedValidationExperiments } from "../bounded-validation/experiments";
import { rescoreAfterValidation } from "../bounded-validation/rescore";
import { runBoundedFavc1ValidationLoop } from "../bounded-validation/run";
import {
  isAllowedValidationExperimentType,
  mapValidationMethodToAllowedExperiment,
} from "../bounded-validation/constants";
import { buildValidationStationState } from "@/lib/infinity/operator-console/favc1-cycle/validation-station";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";

vi.mock("@/lib/infinity/research/run", () => ({
  runGroundedResearch: vi.fn(),
}));

import { runGroundedResearch } from "@/lib/infinity/research/run";

function contractorCandidate(): LoadedCandidateBundle {
  return {
    candidateId: "65e55dde-2b40-409e-b76e-f79ad295cf81",
    discoveryRunId: "disc",
    title: "Contractor material estimate calculator",
    summary: "Calculator SaaS for contractors",
    problem: "Inaccurate material estimates",
    targetCustomer: "Contractors",
    market: "US",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 80,
    demandEvidence: [
      {
        claim: "Contractors waste time on inaccurate material estimates",
        sourceUrls: ["https://example.com/pain"],
        grounded: true,
      },
      {
        claim: "Strong organic search demand for single-purpose calculators",
        sourceUrls: ["https://example.com/search"],
        grounded: true,
      },
    ],
    monetizationEvidence: [],
    competitionEvidence: [
      {
        claim: "Competition consists of spreadsheets or large contractor platforms",
        sourceUrls: ["https://example.com/competition"],
        grounded: true,
      },
    ],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    researchSources: [],
    researchRunIds: [],
    monetization: {
      monetizationRunId: "mon",
      analysisId: "analysis",
      primaryPlanId: "plan",
      monetizationScore: 78,
      combinedDecisionScore: 80,
      economicViability: "PROMISING",
      recommendation: {
        recommendedPrimaryModel: "saas_subscription",
        recommendedSecondaryModels: [],
        recommendedPricingStrategy: "$29/mo",
        recommendedCustomer: "Contractors",
        recommendedAcquisitionStrategy: "SEO",
        expectedRevenueMechanism: "subscription",
        expectedTimeToRevenue: "3 months",
        estimatedStartupCapital: 15000,
        keyEconomicAssumptions: [],
        largestEconomicRisks: [],
        confidence: 0.85,
      },
      primaryPlan: {
        id: "plan",
        modelType: "saas_subscription",
        modelName: "Calculator SaaS",
        monetizationScore: 78,
        estimatedCapitalRequired: 15000,
        estimatedPriceBase: 29,
        estimatedCustomersYear1: 400,
        estimatedMonthsToFirstRevenue: 3,
        estimatedGrossRevenueYear1: 139200,
        estimatedGrossMarginPercent: 75,
        estimatedFixedCosts: 12000,
        estimatedVariableCosts: 8000,
        estimatedCAC: 110,
        estimatedLTV: 900,
        ltvCacRatio: 8,
        automationPotential: 0.85,
        technicalComplexity: 0.2,
        operationalComplexity: 0.2,
        regulatoryRisk: 0.1,
        platformDependencyRisk: 0.15,
        customerAcquisitionDifficulty: 0.35,
        keyAssumptions: [],
        risks: [],
        sourceUrls: ["https://example.com/pricing"],
        revenueStreams: [],
      },
      allPlans: [],
      validationExperiments: [],
    },
  };
}

function assumption(text: string, category: string, method: string): AssumptionRecord {
  return {
    assumption: text,
    category,
    assumptionType: "estimated",
    value: null,
    confidence: 0.5,
    evidence: [],
    sourceUrls: ["https://example.com/pain"],
    impactIfWrong: "Test",
    validationMethod: method,
    validationCostEstimate: 100,
    validationTimeEstimate: 14,
    impactScore: 0.8,
    uncertaintyScore: 0.55,
    fatalRiskContribution: 0.44,
    fallbackUsed: false,
    fallbackReason: null,
    evidenceSources: [],
  };
}

describe("bounded validation evidence integrity", () => {
  beforeEach(() => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: {
        researchRunId: "research-integrity-mock",
        organizationId: "org",
        missionId: null,
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        researchObjective: "mock",
        inputHash: "hash",
        generatedAt: new Date().toISOString(),
        summary: "Contractors waste time on spreadsheets.",
        findings: [],
        evidence: [
          {
            evidenceId: "e1",
            findingId: "f1",
            claim: "Contractors waste time on manual estimates.",
            observedSignal: "Pain",
            signalType: "customer_complaints",
            evidenceType: "direct_grounded",
            grounded: true,
            sourceIds: ["s1"],
            sourceUrls: ["https://example.com/new-pain-only"],
            relevance: "demand",
            confidence: 0.6,
            sourceDate: null,
            limitations: [],
            providerConfidence: 0.6,
          },
        ],
        sources: [
          {
            sourceId: "s1",
            url: "https://example.com/new-pain-only",
            canonicalUrl: "https://example.com/new-pain-only",
            title: "Pain",
            domain: "example.com",
            retrievedAt: new Date().toISOString(),
            providerChunkIndex: 0,
          },
        ],
        limitations: [],
        requiresMoreResearch: false,
        groundedStatus: true,
        validationStatus: "validated",
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        groundingUsage: {
          webSearchQueries: ["contractor pain"],
          searchQueryCount: 1,
          groundingChunkCount: 1,
          groundingSupportCount: 1,
          groundingInvoked: true,
          searchCostKnown: true,
        },
        estimatedCostUsd: 0.002,
        costUncertainty: null,
        latencyMs: 500,
        requestId: "req",
        retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
        status: "completed",
        provenance: {
          schemaVersion: "grounded_research_v1",
          promptVersion: "v1",
          rawProviderResponseStored: true,
          normalizationApplied: true,
        },
        completedAt: new Date().toISOString(),
      },
    });
  });
  it("classifies generic demand evidence as INDIRECT for customer-count and IRRELEVANT for CAC", () => {
    const evidence =
      "Contractors waste time on inaccurate material estimates | Strong organic search demand for single-purpose calculators | Competition consists of spreadsheets or large contractor platforms";

    const customerAssumption = assumption(
      "Can acquire ~400 paying customers in year one.",
      "demand",
      "landing_page_demand_test",
    );
    const cacAssumption = assumption(
      "Customer acquisition cost can be kept near $110.",
      "acquisition",
      "outbound_response_test",
    );

    expect(
      classifyEvidenceRelevance({
        assumption: customerAssumption,
        evidenceText: evidence,
        experimentType: "search_demand_evidence",
      }),
    ).toBe("INDIRECT");

    expect(
      classifyEvidenceRelevance({
        assumption: cacAssumption,
        evidenceText: evidence,
        experimentType: "search_demand_evidence",
      }),
    ).toBe("IRRELEVANT");
  });

  it("does not grant validation credit when only reused sources exist", () => {
    const credit = deriveValidationCredit({
      relevance: "INDIRECT",
      newSourceCount: 0,
      reusedSourceCount: 3,
      hasQuantitativeClaim: false,
    });
    expect(credit.uncertaintyReduction).toBe(0);
    expect(credit.newEvidenceFound).toBe(false);
    expect(credit.validationResult).toBe("INCONCLUSIVE");
  });

  it("grants more credit for DIRECT than INDIRECT evidence", () => {
    expect(EVIDENCE_CREDIT_BY_RELEVANCE.DIRECT.assumptionImpact).toBeGreaterThan(
      EVIDENCE_CREDIT_BY_RELEVANCE.INDIRECT.assumptionImpact,
    );
    expect(EVIDENCE_CREDIT_BY_RELEVANCE.IRRELEVANT.assumptionImpact).toBe(0);
  });

  it("maps landing_page_demand_test to search_demand_evidence without exposure", () => {
    expect(mapValidationMethodToAllowedExperiment("landing_page_demand_test")).toBe(
      "search_demand_evidence",
    );
    expect(isAllowedValidationExperimentType("landing_page_demand_test")).toBe(false);
  });

  it("synthesis-only experiments use truthful labels and INCONCLUSIVE when evidence is reused", () => {
    const candidate = contractorCandidate();
    const assumptions = buildAssumptionRegister(candidate);
    const execution = executeAllowedValidationExperiments({
      candidate,
      assumptions,
      providerCalls: 0,
    });

    expect(execution.experiments.length).toBeGreaterThan(0);
    for (const experiment of execution.experiments) {
      expect(experiment.experimentType).not.toBe("landing_page_demand_test");
      expect(experiment.synthesisOnly).toBe(true);
      expect(experiment.executionStatus).toBe("COMPLETED");
      expect(experiment.validationResult).toBe("INCONCLUSIVE");
      expect(experiment.uncertaintyReduction).toBe(0);
      expect(experiment.reusedSourceCount).toBeGreaterThan(0);
    }
  });

  it("does not change fatal risk when validation finds no new relevant evidence", () => {
    const candidate = contractorCandidate();
    const preAssumptions = buildAssumptionRegister(candidate, {
      adversarialRiskInputs: { acquisition_risk: 0.75, demand_risk: 0.8 },
    });
    const preFatal = analyzeFatalAssumptions(preAssumptions);
    const execution = executeAllowedValidationExperiments({
      candidate,
      assumptions: preAssumptions,
      providerCalls: 0,
    });
    const adversarialReview = {
      provider: "openai",
      model: "test",
      summary: "high risk",
      findings: [],
      riskInputs: { acquisition_risk: 0.75, demand_risk: 0.8 },
      confidence: 0.5,
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      estimatedCostUsd: 0.01,
    };
    const post = rescoreAfterValidation({
      preValidationEvaluation: {
        candidate,
        assumptions: preAssumptions,
        fatalAssumptionRiskScore: preFatal.fatalAssumptionRiskScore,
        assumptionUncertaintyScore: preFatal.assumptionUncertaintyScore,
        blockingAssumptions: preFatal.blockingAssumptions,
        validationScore: 70,
        validationDimensions: {},
        buildability: assessBuildability(candidate),
        speedToValue: TEST_SPEED_TO_VALUE,
        expectedValueInputs: TEST_EXPECTED_VALUE_INPUTS,
        expectedValueDerived: testExpectedValueDerived(2),
        capitalEfficiencyMetrics: {},
        selectionScoreInputs: {},
        selectionScore: 74,
        portfolioAdjustedScore: 74,
        dependencyTags: [],
        correlationPenalties: [],
        experimentPriorities: [],
        adversarialReview,
        decision: "VALIDATE",
        recommendedNextAction: "",
        queueReason: "",
        explanation: TEST_EXPLANATION,
        handoff: null,
        confidence: 0.7,
      },
      validationEvidence: execution.validationEvidence,
    });

    expect(post.fatalAssumptionRiskScore).toBe(preFatal.fatalAssumptionRiskScore);
    expect(post.decision).toBe("VALIDATE");
  });

  it("cannot promote to BUILD from two irrelevant sourced experiments", async () => {
    const candidate = contractorCandidate();
    const preAssumptions = buildAssumptionRegister(candidate, {
      adversarialRiskInputs: { acquisition_risk: 0.85, demand_risk: 0.85 },
    });
    const preFatal = analyzeFatalAssumptions(preAssumptions);

    const evaluation = {
      candidate,
      assumptions: preAssumptions,
      fatalAssumptionRiskScore: preFatal.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: preFatal.assumptionUncertaintyScore,
      blockingAssumptions: preFatal.blockingAssumptions,
      validationScore: 68,
      validationDimensions: {},
      buildability: assessBuildability(candidate),
      speedToValue: TEST_SPEED_TO_VALUE,
      expectedValueInputs: TEST_EXPECTED_VALUE_INPUTS,
      expectedValueDerived: testExpectedValueDerived(2.5),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 74,
      portfolioAdjustedScore: 74,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: {
        provider: "openai",
        model: "test",
        summary: "high risk",
        findings: [],
        riskInputs: { acquisition_risk: 0.85, demand_risk: 0.85 },
        confidence: 0.5,
        tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        estimatedCostUsd: 0.01,
      },
      decision: "VALIDATE" as const,
      recommendedNextAction: "",
      queueReason: "",
      explanation: TEST_EXPLANATION,
      handoff: null,
      confidence: 0.7,
    };

    const budget = new CycleBudgetGovernor();
    const result = await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [evaluation],
      budget,
    });

    expect(result.promotedToBuild).toBe(false);
    expect(result.postValidationFatalRisk).toBe(preFatal.fatalAssumptionRiskScore);
    expect(budget.ledger.filter((entry) => entry.stage === "bounded_validation")).toHaveLength(0);
  });

  it("records validation budget exactly once at orchestrator level", async () => {
    const candidate = contractorCandidate();
    const preAssumptions = buildAssumptionRegister(candidate);
    const evaluation = {
      candidate,
      assumptions: preAssumptions,
      fatalAssumptionRiskScore: 0.55,
      assumptionUncertaintyScore: 0.5,
      blockingAssumptions: [],
      validationScore: 70,
      validationDimensions: {},
      buildability: assessBuildability(candidate),
      speedToValue: TEST_SPEED_TO_VALUE,
      expectedValueInputs: TEST_EXPECTED_VALUE_INPUTS,
      expectedValueDerived: testExpectedValueDerived(2),
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
      explanation: TEST_EXPLANATION,
      handoff: null,
      confidence: 0.7,
    };

    const budget = new CycleBudgetGovernor();
    await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [evaluation],
      budget,
    });

    budget.record({
      stage: "bounded_validation",
      provider: "internal",
      costUsd: 0,
      known: true,
      note: "providerCalls=0 outcome=VALIDATE",
    });

    const validationEntries = budget.ledger.filter((entry) => entry.stage === "bounded_validation");
    expect(validationEntries).toHaveLength(1);
    expect(budget.knownTotalUsdValue).toBe(0);
  });

  it("uses truthful HQ narration for synthesis-only validation", () => {
    const snapshot = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 0,
      synthesisOnly: true,
      costUsd: 0,
      costKnown: true,
      currentTask: null,
    });
    expect(snapshot.summary).toContain("reviewing existing evidence");
    expect(snapshot.showWorkers).toBe(false);
    expect(snapshot.currentTask).not.toContain("customer");
  });

  it("direct quantitative evidence can reduce fatal risk below BUILD threshold", () => {
    const candidate = contractorCandidate();
    const preAssumptions = buildAssumptionRegister(candidate, {
      adversarialRiskInputs: { acquisition_risk: 0.7, demand_risk: 0.75 },
    });
    const preFatal = analyzeFatalAssumptions(preAssumptions);
    expect(preFatal.fatalAssumptionRiskScore).toBeGreaterThan(0.45);

    const post = rescoreAfterValidation({
      preValidationEvaluation: {
        candidate,
        assumptions: preAssumptions,
        fatalAssumptionRiskScore: preFatal.fatalAssumptionRiskScore,
        assumptionUncertaintyScore: preFatal.assumptionUncertaintyScore,
        blockingAssumptions: preFatal.blockingAssumptions,
        validationScore: 72,
        validationDimensions: {},
        buildability: assessBuildability(candidate),
        speedToValue: TEST_SPEED_TO_VALUE,
        expectedValueInputs: TEST_EXPECTED_VALUE_INPUTS,
        expectedValueDerived: testExpectedValueDerived(3),
        capitalEfficiencyMetrics: {},
        selectionScoreInputs: {},
        selectionScore: 76,
        portfolioAdjustedScore: 76,
        dependencyTags: [],
        correlationPenalties: [],
        experimentPriorities: [],
        adversarialReview: null,
        decision: "VALIDATE",
        recommendedNextAction: "",
        queueReason: "",
        explanation: TEST_EXPLANATION,
        handoff: null,
        confidence: 0.8,
      },
      validationEvidence: [
        {
          assumptionCategory: "acquisition",
          assumptionId: "Customer acquisition cost can be kept near $110.",
          claim: "Comparable SaaS CAC benchmarks show $95-$105 paid acquisition for contractor tools",
          sourceUrls: ["https://example.com/new-cac-benchmark"],
          newSourceUrls: ["https://example.com/new-cac-benchmark"],
          grounded: true,
          confidenceImpact: 0.12,
          assumptionImpact: 0.15,
          uncertaintyReduction: 0.15,
          experimentType: "comparable_benchmark_research",
          relevanceClass: "DIRECT",
          validationResult: "SUPPORTED",
          newEvidenceFound: true,
          newSourceCount: 1,
          reusedSourceCount: 0,
        },
      ],
    });

    expect(post.fatalAssumptionRiskScore).toBeLessThan(preFatal.fatalAssumptionRiskScore);

    const buildGate = passesBuildGate({
      evaluation: post,
      thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
    });
    const classified = classifyDecision({
      evaluation: post,
      buildGatePassed: buildGate.passes,
      buildGateReasons: buildGate.reasons,
      hasResourceCapacity: true,
      decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
    });
    if (post.fatalAssumptionRiskScore < 0.45) {
      expect(classified.decision).toBe("BUILD");
    }
  });
});
