import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ResearchResult } from "@/lib/infinity/research/types";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability } from "@/lib/infinity/venture-selection/buildability/assess";
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

const TEST_EXPECTED_VALUE_DERIVED: ExpectedValueDerived = {
  probabilityAdjustedRevenue: 75000,
  probabilityAdjustedGrossProfit: 45000,
  expected12MonthProfit: 12000,
  expectedRoi: 2.5,
  capitalEfficiency: 0.3,
  expectedValuePerDollarDeployed: 0.2,
};

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
  buildAssumptionValidationResearchObjective,
} from "../bounded-validation/acquire-evidence";
import {
  FAVC1_VALIDATION_MAX_ACQUISITION_CALLS,
  FAVC1_VALIDATION_MAX_ROUNDS,
} from "../bounded-validation/constants";
import {
  evaluateAcquisitionVoi,
  humanizeBlockingAssumption,
  isSynthesisSufficient,
  selectEscalationBlocker,
  shouldEscalateAfterSynthesis,
  shouldEscalateRoundAfterSynthesis,
} from "../bounded-validation/escalation-policy";
import { executeAllowedValidationExperiments } from "../bounded-validation/experiments";
import { classifyAssumptionKind } from "../bounded-validation/evidence-relevance";
import { runBoundedFavc1ValidationLoop } from "../bounded-validation/run";
import { buildValidationStationState } from "@/lib/infinity/operator-console/favc1-cycle/validation-station";

vi.mock("@/lib/infinity/research/run", () => ({
  runGroundedResearch: vi.fn(),
}));

import { runGroundedResearch } from "@/lib/infinity/research/run";

function contractorCandidate(overrides: Partial<LoadedCandidateBundle> = {}): LoadedCandidateBundle {
  return {
    candidateId: "96d65096-6390-4e2c-822d-cdcdd0d6fe17",
    discoveryRunId: "disc",
    title: "Contractor SaaS",
    summary: "Tooling",
    problem: "Estimates",
    targetCustomer: "Contractors",
    market: "US",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 80,
    demandEvidence: [
      { claim: "Contractors waste time on spreadsheets", sourceUrls: ["https://example.com/pain"], grounded: true },
    ],
    monetizationEvidence: [],
    competitionEvidence: [
      { claim: "Crowded market", sourceUrls: ["https://example.com/competition"], grounded: true },
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
        recommendedPricingStrategy: "$49/mo",
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
        modelName: "Contractor SaaS",
        monetizationScore: 78,
        estimatedCapitalRequired: 15000,
        estimatedPriceBase: 49,
        estimatedCustomersYear1: 150,
        estimatedMonthsToFirstRevenue: 3,
        estimatedGrossRevenueYear1: 88200,
        estimatedGrossMarginPercent: 75,
        estimatedFixedCosts: 12000,
        estimatedVariableCosts: 8000,
        estimatedCAC: 350,
        estimatedLTV: 900,
        ltvCacRatio: 2.5,
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
    ...overrides,
  };
}

function cacAssumption(): AssumptionRecord {
  return {
    assumption: "Customer acquisition cost can be kept near $350.",
    category: "acquisition",
    assumptionType: "estimated",
    value: "350",
    confidence: 0.5,
    evidence: [],
    sourceUrls: ["https://example.com/pricing"],
    impactIfWrong: "Unit economics fail",
    validationMethod: "outbound_response_test",
    validationCostEstimate: 500,
    validationTimeEstimate: 21,
    impactScore: 0.9,
    uncertaintyScore: 0.69,
    fatalRiskContribution: 0.44,
    fallbackUsed: false,
    fallbackReason: null,
    evidenceSources: [],
  };
}

function customerCountAssumption(): AssumptionRecord {
  return {
    assumption: "Can acquire ~150 paying customers in year one.",
    category: "demand",
    assumptionType: "estimated",
    value: "150",
    confidence: 0.5,
    evidence: [],
    sourceUrls: ["https://example.com/pain"],
    impactIfWrong: "Revenue miss",
    validationMethod: "landing_page_demand_test",
    validationCostEstimate: 400,
    validationTimeEstimate: 14,
    impactScore: 0.85,
    uncertaintyScore: 0.65,
    fatalRiskContribution: 0.4,
    fallbackUsed: false,
    fallbackReason: null,
    evidenceSources: [],
  };
}

function mockResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    researchRunId: "research-run-escalation-1",
    organizationId: "org",
    missionId: null,
    providerId: "gemini",
    modelId: "gemini-3.5-flash",
    researchObjective: "CAC probe",
    inputHash: "hash",
    generatedAt: new Date().toISOString(),
    summary: "SMB construction SaaS blended CAC averages $610.",
    findings: [],
    evidence: [
      {
        evidenceId: "e1",
        findingId: "f1",
        claim: "SMB construction SaaS blended CAC averages $610 versus a $350 target.",
        observedSignal: "Benchmark",
        signalType: "search_demand",
        evidenceType: "direct_grounded",
        grounded: true,
        sourceIds: ["s1"],
        sourceUrls: ["https://example.com/new-cac-benchmark"],
        relevance: "acquisition economics",
        confidence: 0.7,
        sourceDate: null,
        limitations: [],
        providerConfidence: 0.7,
      },
    ],
    sources: [
      {
        sourceId: "s1",
        url: "https://example.com/new-cac-benchmark",
        canonicalUrl: "https://example.com/new-cac-benchmark",
        title: "CAC benchmarks",
        domain: "example.com",
        retrievedAt: new Date().toISOString(),
        providerChunkIndex: 0,
      },
    ],
    limitations: [],
    requiresMoreResearch: false,
    groundedStatus: true,
    validationStatus: "validated",
    tokenUsage: { inputTokens: 500, outputTokens: 300, totalTokens: 800 },
    groundingUsage: {
      webSearchQueries: ["contractor saas cac"],
      searchQueryCount: 1,
      groundingChunkCount: 1,
      groundingSupportCount: 1,
      groundingInvoked: true,
      searchCostKnown: true,
    },
    estimatedCostUsd: 0.002,
    costUncertainty: null,
    latencyMs: 1200,
    requestId: "req-1",
    retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
    status: "completed",
    provenance: {
      schemaVersion: "grounded_research_v1",
      promptVersion: "v1",
      rawProviderResponseStored: true,
      normalizationApplied: true,
    },
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildValidateEvaluation(candidate: LoadedCandidateBundle) {
  const assumptions = buildAssumptionRegister(candidate, {
    adversarialRiskInputs: { acquisition_risk: 0.85, demand_risk: 0.85 },
  });
  const fatal = analyzeFatalAssumptions(assumptions);
  return {
    candidate,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore: 68,
    validationDimensions: {},
    buildability: assessBuildability(candidate),
    speedToValue: TEST_SPEED_TO_VALUE,
    expectedValueInputs: TEST_EXPECTED_VALUE_INPUTS,
    expectedValueDerived: TEST_EXPECTED_VALUE_DERIVED,
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
}

describe("validation synthesis → acquisition escalation", () => {
  beforeEach(() => {
    vi.mocked(runGroundedResearch).mockReset();
  });

  it("reused-only irrelevant synthesis triggers acquisition escalation", () => {
    const candidate = contractorCandidate();
    const assumptions = buildAssumptionRegister(candidate, {
      adversarialRiskInputs: { acquisition_risk: 0.85, demand_risk: 0.85 },
    });
    const synthesis = executeAllowedValidationExperiments({
      candidate,
      assumptions,
      maxExperiments: 2,
      providerCalls: 0,
    });

    expect(synthesis.experiments.length).toBeGreaterThan(0);
    expect(synthesis.experiments.every((e) => e.synthesisOnly)).toBe(true);
    expect(synthesis.experiments.every((e) => e.newSourceCount === 0)).toBe(true);
    expect(synthesis.experiments.some((e) => e.relevanceClass === "IRRELEVANT")).toBe(true);

    expect(
      shouldEscalateRoundAfterSynthesis({
        assumptions,
        synthesisExperiments: synthesis.experiments,
        preFatalRisk: 0.64,
      }),
    ).toBe(true);
  });

  it("direct sufficient existing evidence does not trigger provider call", () => {
    const experiment = {
      candidateId: "c1",
      blockingAssumptionId: "Customer acquisition cost can be kept near $350.",
      experimentType: "comparable_benchmark_research",
      question: "q",
      expectedEvidence: "e",
      actualEvidence: "CAC near $350 is supported by channel benchmarks at $340 CAC.",
      sourceUrls: ["https://example.com/new-cac"],
      newSourceUrls: ["https://example.com/new-cac"],
      reusedSourceUrls: [],
      newSourceCount: 1,
      reusedSourceCount: 0,
      relevanceClass: "DIRECT" as const,
      costUsd: 0,
      executionStatus: "COMPLETED" as const,
      validationResult: "SUPPORTED" as const,
      newEvidenceFound: true,
      uncertaintyReduction: 0.15,
      confidenceImpact: 0.12,
      assumptionImpact: 0.15,
      providerCalls: 0,
      synthesisOnly: true,
      validationStep: "synthesis" as const,
    };

    expect(isSynthesisSufficient(experiment)).toBe(true);
    expect(
      shouldEscalateAfterSynthesis({
        experiment,
        assumption: cacAssumption(),
      }),
    ).toBe(false);
  });

  it("one round may contain synthesis + acquisition without counting as second round", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: mockResearchResult(),
    });

    const candidate = contractorCandidate();
    const evaluation = buildValidateEvaluation(candidate);
    const budget = new CycleBudgetGovernor();

    const result = await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle-escalation",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [evaluation],
      budget,
    });

    expect(result.lineage.validationRound).toBe(1);
    expect(result.lineage.validationRound).toBeLessThanOrEqual(FAVC1_VALIDATION_MAX_ROUNDS);
    expect(result.synthesisStepCount).toBe(1);
    expect(result.acquisitionStepCount).toBe(1);
    expect(result.providerCalls).toBe(1);
    expect(result.experiments.some((e) => e.validationStep === "synthesis")).toBe(true);
    expect(result.experiments.some((e) => e.validationStep === "acquisition")).toBe(true);
    expect(result.acquisitionDecision).toBe("RUN");
  });

  it("generates CAC-specific research objective for quantitative CAC blocker", () => {
    const objective = buildAssumptionValidationResearchObjective({
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
    });
    expect(objective).toContain("$350");
    expect(objective).toContain("CAC");
    expect(objective).toContain("CPC");
    expect(classifyAssumptionKind(cacAssumption())).toBe("quantitative_cac");
  });

  it("generates customer-count-specific research objective", () => {
    const objective = buildAssumptionValidationResearchObjective({
      candidate: contractorCandidate(),
      assumption: customerCountAssumption(),
    });
    expect(objective).toContain("150");
    expect(objective).toContain("customer");
    expect(objective).toMatch(/adoption|conversion|addressable/i);
    expect(classifyAssumptionKind(customerCountAssumption())).toBe("quantitative_customer_count");
  });

  it("new irrelevant provider evidence gets zero credit after escalation", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: mockResearchResult({
        summary: "Contractors dislike spreadsheets.",
        evidence: [
          {
            evidenceId: "e2",
            findingId: "f2",
            claim: "Contractors waste time on manual estimates.",
            observedSignal: "Pain",
            signalType: "customer_complaints",
            evidenceType: "direct_grounded",
            grounded: true,
            sourceIds: ["s2"],
            sourceUrls: ["https://example.com/new-pain"],
            relevance: "demand",
            confidence: 0.6,
            sourceDate: null,
            limitations: [],
            providerConfidence: 0.6,
          },
        ],
        sources: [
          {
            sourceId: "s2",
            url: "https://example.com/new-pain",
            canonicalUrl: "https://example.com/new-pain",
            title: "Pain",
            domain: "example.com",
            retrievedAt: new Date().toISOString(),
            providerChunkIndex: 0,
          },
        ],
      }),
    });

    const result = await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle-irrelevant-acq",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [buildValidateEvaluation(contractorCandidate())],
      budget: new CycleBudgetGovernor(),
    });

    const acquisition = result.experiments.find((e) => e.validationStep === "acquisition");
    expect(acquisition?.newSourceCount).toBeGreaterThan(0);
    expect(acquisition?.uncertaintyReduction).toBe(0);
    expect(result.postValidationFatalRisk).toBe(result.preValidationFatalRisk);
  });

  it("provider research technical failure remains technical failure", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: false,
      failure: {
        researchRunId: "failed-run",
        organizationId: "org",
        researchObjective: "test",
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        inputHash: "h",
        status: "failed",
        failureClassification: "unknown_provider_failure",
        message: "Provider unavailable",
        tokenUsage: null,
        estimatedCostUsd: null,
        latencyMs: 100,
        requestId: null,
        failedAt: new Date().toISOString(),
      },
    });

    const result = await runBoundedFavc1ValidationLoop({} as AdminSupabaseClient, {
      organizationId: "org",
      cycleKey: "cycle-tech-fail",
      discoveryRunId: "disc",
      monetizationRunId: "mon",
      ventureSelectionRunId: "sel",
      evaluations: [buildValidateEvaluation(contractorCandidate())],
      budget: new CycleBudgetGovernor(),
    });

    expect(result.technicalFailure).toBe(true);
    expect(result.outcome).toBe("TECHNICAL_FAILURE");
    expect(result.outcome).not.toBe("VALIDATE");
  });

  it("VOI skip avoids unnecessary provider call when decision cannot move", () => {
    const voi = evaluateAcquisitionVoi({
      assumption: cacAssumption(),
      preFatalRisk: 0.44,
    });
    expect(voi.decision).toBe("SKIP");
  });

  it("enforces provider call limit of one per round", () => {
    expect(FAVC1_VALIDATION_MAX_ACQUISITION_CALLS).toBe(1);
  });

  it("HQ changes from synthesis narration to provider-research worker state", () => {
    const synthesisState = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 0,
      synthesisOnly: true,
      costUsd: 0,
      costKnown: true,
      currentTask: null,
    });
    expect(synthesisState.showWorkers).toBe(false);
    expect(synthesisState.currentTask).toContain("Reviewing existing evidence");

    const acquisitionState = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 1,
      costUsd: 0.002,
      costKnown: true,
      humanizedBlocker: humanizeBlockingAssumption(cacAssumption()),
      currentTask: null,
    });
    expect(acquisitionState.showWorkers).toBe(true);
    expect(acquisitionState.currentTask).toContain("customer acquisition cost");
  });

  it("prioritizes highest fatal-risk blocker for acquisition", () => {
    const candidate = contractorCandidate();
    const assumptions = buildAssumptionRegister(candidate, {
      adversarialRiskInputs: { acquisition_risk: 0.85, demand_risk: 0.85 },
    });
    const synthesis = executeAllowedValidationExperiments({
      candidate,
      assumptions,
      maxExperiments: 2,
    });

    const selected = selectEscalationBlocker({
      assumptions,
      synthesisExperiments: synthesis.experiments,
      preFatalRisk: 0.64,
    });

    expect(selected?.decision).toBe("RUN");
    expect(selected?.assumption.assumption).toContain("acquisition cost");
  });
});
