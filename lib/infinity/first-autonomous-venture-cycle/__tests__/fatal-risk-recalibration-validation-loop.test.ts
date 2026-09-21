import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
  FATAL_ASSUMPTION_AGGREGATION_FORMULA,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
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
import { CycleBudgetGovernor } from "../budget-governor";
import {
  DISALLOWED_VALIDATION_EXPERIMENT_TYPES,
  FAVC1_VALIDATION_MAX_ROUNDS,
  isAllowedValidationExperimentType,
} from "../bounded-validation/constants";
import { executeAllowedValidationExperiments } from "../bounded-validation/experiments";
import { rescoreAfterValidation } from "../bounded-validation/rescore";
import { runBoundedFavc1ValidationLoop } from "../bounded-validation/run";
import { selectValidationCandidate } from "../bounded-validation/select-candidate";
import { deriveFavc1SelectionStopReason } from "../selection-stop-reason";
import { buildValidationStationState } from "@/lib/infinity/operator-console/favc1-cycle/validation-station";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";

vi.mock("@/lib/infinity/research/run", () => ({
  runGroundedResearch: vi.fn(),
}));

import { runGroundedResearch } from "@/lib/infinity/research/run";

function runFullSelectionPipeline(input: {
  candidate: LoadedCandidateBundle;
  adversarialRiskInputs?: Record<string, number>;
}) {
  const assumptions = buildAssumptionRegister(input.candidate, {
    adversarialRiskInputs: input.adversarialRiskInputs,
  });
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
    ...evaluation,
    fallbackRate: fatal.fallbackRate,
    buildGatePassed: buildGate.passes,
    buildGateFailures: buildGate.reasons,
    decision: classified.decision,
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
    demandEvidence: [{ claim: "Validated demand", sourceUrls: ["https://example.com/demand"], grounded: true }],
    monetizationEvidence: [{ claim: "Pricing benchmark", sourceUrls: ["https://example.com/pricing"], grounded: true }],
    competitionEvidence: [],
    distributionEvidence: [{ claim: "SEO channel viable", sourceUrls: ["https://example.com/seo"], grounded: true }],
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

describe("fatal assumption recalibration", () => {
  it("does not produce identical 0.47 for all standard monetization plans", () => {
    const strongEvidence = runFullSelectionPipeline({ candidate: baseCandidate() });
    const weakEvidence = runFullSelectionPipeline({
      candidate: baseCandidate({
        demandEvidence: [],
        monetizationEvidence: [],
        distributionEvidence: [],
        monetization: {
          ...baseCandidate().monetization!,
          primaryPlan: basePlan({ sourceUrls: [], keyAssumptions: [] }),
          recommendation: {
            ...baseCandidate().monetization!.recommendation,
            confidence: 0.45,
          },
        },
      }),
    });

    expect(strongEvidence.fatalAssumptionRiskScore).not.toBe(0.47);
    expect(weakEvidence.fatalAssumptionRiskScore).not.toBe(strongEvidence.fatalAssumptionRiskScore);
    expect(FATAL_ASSUMPTION_AGGREGATION_FORMULA).toContain("max");
  });

  it("tracks explicit fallback uncertainty when evidence is absent", () => {
    const result = runFullSelectionPipeline({
      candidate: baseCandidate({
        demandEvidence: [],
        monetizationEvidence: [],
        distributionEvidence: [],
        monetization: {
          ...baseCandidate().monetization!,
          primaryPlan: basePlan({ sourceUrls: [], estimatedCAC: null, estimatedCustomersYear1: null }),
          recommendation: {
            ...baseCandidate().monetization!.recommendation,
            keyEconomicAssumptions: [],
            confidence: 0.4,
          },
        },
      }),
    });
    expect(result.fallbackRate).toBeGreaterThan(0);
    expect(result.assumptions.some((item) => item.fallbackUsed)).toBe(true);
  });

  it("maps adversarial acquisition risk to acquisition assumption uncertainty", () => {
    const low = buildAssumptionRegister(baseCandidate(), {
      adversarialRiskInputs: { acquisition_risk: 0.2, demand_risk: 0.2 },
    });
    const high = buildAssumptionRegister(baseCandidate(), {
      adversarialRiskInputs: { acquisition_risk: 0.9, demand_risk: 0.85 },
    });
    const lowCac = low.find((item) => item.category === "acquisition")!;
    const highCac = high.find((item) => item.category === "acquisition")!;
    expect(highCac.uncertaintyScore).toBeGreaterThan(lowCac.uncertaintyScore);
  });

  it("excellent low-risk fixture can reach BUILD", () => {
    const result = runFullSelectionPipeline({
      candidate: baseCandidate({
        monetization: {
          ...baseCandidate().monetization!,
          primaryPlan: basePlan({ estimatedCAC: null, estimatedCustomersYear1: null }),
          recommendation: {
            ...baseCandidate().monetization!.recommendation,
            keyEconomicAssumptions: [],
            confidence: 0.85,
          },
        },
        demandEvidence: [
          { claim: "Strong grounded demand", sourceUrls: ["https://example.com/a"], grounded: true },
          { claim: "Pricing validated", sourceUrls: ["https://example.com/b"], grounded: true },
        ],
      }),
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
        acquisition_risk: 0.85,
        competition_risk: 0.8,
        execution_risk: 0.75,
        platform_risk: 0.5,
        regulatory_risk: 0.4,
        pricing_risk: 0.75,
        demand_risk: 0.8,
      },
    });
    expect(result.fatalAssumptionRiskScore).toBeGreaterThanOrEqual(0.45);
    expect(result.decision).toBe("VALIDATE");
  });

  it("unsafe regulated fixture cannot BUILD", () => {
    const result = runFullSelectionPipeline({
      candidate: baseCandidate({
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
    });
    expect(result.buildGatePassed).toBe(false);
    expect(result.decision).not.toBe("BUILD");
  });
});

describe("bounded FAVC1 validation loop", () => {
  beforeEach(() => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: {
        researchRunId: "research-loop-mock",
        organizationId: "org",
        missionId: null,
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        researchObjective: "mock",
        inputHash: "hash",
        generatedAt: new Date().toISOString(),
        summary: "Contractor pain only.",
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

  it("selects exactly one validation candidate from VALIDATE pool", () => {
    const evaluation = runFullSelectionPipeline({ candidate: baseCandidate() });
    const buildability = assessBuildability(baseCandidate());
    const draft = {
      ...evaluation,
      candidate: baseCandidate(),
      decision: "VALIDATE" as const,
      assumptions: evaluation.assumptions,
      buildability,
    };
    const selected = selectValidationCandidate([
      { ...draft, candidate: { ...baseCandidate(), candidateId: "a" }, selectionScore: 70 },
      { ...draft, candidate: { ...baseCandidate(), candidateId: "b" }, selectionScore: 74 },
    ]);
    expect(selected?.candidateId).toBe("b");
  });

  it("rejects fake interview and survey experiment types", () => {
    expect(isAllowedValidationExperimentType("customer_interview")).toBe(false);
    expect(isAllowedValidationExperimentType("fake_survey")).toBe(false);
    for (const disallowed of DISALLOWED_VALIDATION_EXPERIMENT_TYPES) {
      expect(isAllowedValidationExperimentType(disallowed)).toBe(false);
    }
  });

  it("runs at most one validation round", () => {
    expect(FAVC1_VALIDATION_MAX_ROUNDS).toBe(1);
  });

  it("can promote VALIDATE to BUILD after grounded validation evidence", () => {
    const pre = runFullSelectionPipeline({ candidate: baseCandidate() });
    const preEvaluation = {
      ...pre,
      candidate: baseCandidate(),
      decision: "VALIDATE" as const,
      assumptions: pre.assumptions,
      fatalAssumptionRiskScore: pre.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: 0.5,
      blockingAssumptions: pre.assumptions.map((item) => item.assumption).slice(0, 2),
      validationScore: 70,
      validationDimensions: {},
      buildability: assessBuildability(baseCandidate()),
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
      expectedValueInputs: deriveExpectedValueInputs(baseCandidate()),
      expectedValueDerived: calculateExpectedValue(deriveExpectedValueInputs(baseCandidate())),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 74,
      portfolioAdjustedScore: 74,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: null,
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

    const execution = executeAllowedValidationExperiments({
      candidate: baseCandidate(),
      assumptions: pre.assumptions,
    });
    expect(execution.experiments.every((item) => item.sourceUrls.length > 0)).toBe(true);
    expect(execution.experiments.every((item) => item.experimentType !== "customer_interview")).toBe(true);

    const post = rescoreAfterValidation({
      preValidationEvaluation: preEvaluation,
      validationEvidence: execution.validationEvidence,
    });
    expect(post.fatalAssumptionRiskScore).toBeLessThanOrEqual(pre.fatalAssumptionRiskScore);
  });

  it("terminates cleanly when validation cannot promote candidate", async () => {
    const noSourceCandidate = baseCandidate({
      demandEvidence: [],
      monetizationEvidence: [],
      distributionEvidence: [],
      competitionEvidence: [],
      monetization: {
        ...baseCandidate().monetization!,
        primaryPlan: basePlan({ sourceUrls: [] }),
      },
    });
    const pre = runFullSelectionPipeline({
      candidate: noSourceCandidate,
      adversarialRiskInputs: {
        acquisition_risk: 0.9,
        demand_risk: 0.9,
        competition_risk: 0.85,
        execution_risk: 0.85,
        pricing_risk: 0.85,
      },
    });
    const evaluation = {
      ...pre,
      candidate: noSourceCandidate,
      decision: "VALIDATE" as const,
      assumptions: pre.assumptions,
      fatalAssumptionRiskScore: pre.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: 0.6,
      blockingAssumptions: pre.assumptions.map((item) => item.assumption),
      validationScore: 62,
      validationDimensions: {},
      buildability: assessBuildability(noSourceCandidate),
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
      expectedValueInputs: deriveExpectedValueInputs(noSourceCandidate),
      expectedValueDerived: calculateExpectedValue(deriveExpectedValueInputs(noSourceCandidate)),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 72,
      portfolioAdjustedScore: 72,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: pre.assumptions.length
        ? {
            provider: "openai",
            model: "test",
            summary: "high risk",
            findings: [],
            riskInputs: {
              acquisition_risk: 0.9,
              demand_risk: 0.9,
            },
            confidence: 0.5,
            tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            estimatedCostUsd: 0.01,
          }
        : null,
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
        confidence: 0.6,
      },
      handoff: null,
      confidence: 0.6,
    };

    const budget = new CycleBudgetGovernor();
    const result = await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle-test",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [evaluation],
      budget,
    });

    expect(result.promotedToBuild).toBe(false);
    expect(result.technicalFailure).toBe(false);
    expect(result.costKnown).toBe(true);
    expect(result.lineage.validationRound).toBeLessThanOrEqual(1);
  });

  it("maps validation_required before safety_constraints", () => {
    const evaluation = runFullSelectionPipeline({ candidate: baseCandidate() });
    const draft = {
      ...evaluation,
      candidate: baseCandidate(),
      decision: "VALIDATE" as const,
      assumptions: evaluation.assumptions,
      fatalAssumptionRiskScore: evaluation.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: 0.5,
      blockingAssumptions: [],
      validationScore: 70,
      validationDimensions: {},
      buildability: assessBuildability(baseCandidate()),
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
      expectedValueInputs: deriveExpectedValueInputs(baseCandidate()),
      expectedValueDerived: calculateExpectedValue(deriveExpectedValueInputs(baseCandidate())),
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 74,
      portfolioAdjustedScore: 74,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: null,
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
    const reason = deriveFavc1SelectionStopReason([draft]);
    expect(reason.structured.path).toBe("validation_required");
  });

  it("validation station is ACTIVE without fake workers when only synthesis runs", () => {
    const snapshot = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 0,
      costUsd: 0,
      costKnown: true,
      currentTask: "Synthesizing verifiable validation evidence",
    });
    expect(snapshot.state).toBe("RUNNING");
    expect(snapshot.showWorkers).toBe(false);
  });

  it("validation station shows workers only for real provider activity", () => {
    const snapshot = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 2,
      costUsd: 0.02,
      costKnown: true,
      currentTask: "Grounded research",
    });
    expect(snapshot.showWorkers).toBe(true);
  });
});
