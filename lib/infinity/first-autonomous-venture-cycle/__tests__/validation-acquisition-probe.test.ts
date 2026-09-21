import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ResearchResult } from "@/lib/infinity/research/types";
import {
  buildAssumptionValidationResearchObjective,
  recordValidationResearchBudget,
} from "../bounded-validation/acquire-evidence";
import { classifySourceNovelty, extractPriorSourceUrls } from "../bounded-validation/evidence-relevance";
import { CycleBudgetGovernor } from "../budget-governor";
import { buildValidationStationState } from "@/lib/infinity/operator-console/favc1-cycle/validation-station";
import type { AssumptionRecord, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";

vi.mock("@/lib/infinity/research/run", () => ({
  runGroundedResearch: vi.fn(),
}));

import { runGroundedResearch } from "@/lib/infinity/research/run";
import { acquireValidationEvidenceViaResearch } from "../bounded-validation/acquire-evidence";

function contractorCandidate(): LoadedCandidateBundle {
  return {
    candidateId: "65e55dde-2b40-409e-b76e-f79ad295cf81",
    discoveryRunId: "disc",
    title: "Contractor calculator SaaS",
    summary: "Calculator SaaS",
    problem: "Estimates",
    targetCustomer: "Contractors",
    market: "US",
    businessModelCandidates: ["saas"],
    revenueMechanismCandidates: ["subscription"],
    opportunityScore: 80,
    demandEvidence: [
      { claim: "Contractor pain", sourceUrls: ["https://example.com/old-pain"], grounded: true },
    ],
    monetizationEvidence: [],
    competitionEvidence: [],
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
        sourceUrls: ["https://example.com/old-pricing"],
        revenueStreams: [],
      },
      allPlans: [],
      validationExperiments: [],
    },
  };
}

function cacAssumption(): AssumptionRecord {
  return {
    assumption: "Customer acquisition cost can be kept near $110.",
    category: "acquisition",
    assumptionType: "estimated",
    value: "110",
    confidence: 0.5,
    evidence: [],
    sourceUrls: ["https://example.com/old-pricing"],
    impactIfWrong: "Unit economics fail",
    validationMethod: "outbound_response_test",
    validationCostEstimate: 500,
    validationTimeEstimate: 21,
    impactScore: 0.9,
    uncertaintyScore: 0.55,
    fatalRiskContribution: 0.44,
    fallbackUsed: false,
    fallbackReason: null,
    evidenceSources: [],
  };
}

function mockResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    researchRunId: "research-run-probe-1",
    organizationId: "org",
    missionId: null,
    providerId: "gemini",
    modelId: "gemini-2.5-flash",
    researchObjective: "CAC probe",
    inputHash: "hash",
    generatedAt: new Date().toISOString(),
    summary: "Public SaaS CAC benchmarks for contractor tools range from $80-$140 via SEO-led acquisition.",
    findings: [],
    evidence: [
      {
        evidenceId: "e1",
        findingId: "f1",
        claim: "Comparable micro-SaaS tools report CAC around $95-$125 through organic SEO channels.",
        observedSignal: "Benchmark range",
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
        title: "Micro-SaaS CAC benchmarks",
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
      webSearchQueries: ["contractor saas cac benchmark"],
      searchQueryCount: 1,
      groundingChunkCount: 2,
      groundingSupportCount: 2,
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
      purpose: "probe",
    },
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("validation acquisition probe", () => {
  beforeEach(() => {
    vi.mocked(runGroundedResearch).mockReset();
  });

  it("builds assumption-specific CAC research objective", () => {
    const objective = buildAssumptionValidationResearchObjective({
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
    });
    expect(objective).toContain("$110");
    expect(objective).toContain("CAC");
    expect(objective).not.toContain("customer interview");
  });

  it("detects NEW vs reused sources against prior candidate evidence", () => {
    const prior = extractPriorSourceUrls(contractorCandidate());
    const novelty = classifySourceNovelty(
      ["https://example.com/old-pain", "https://example.com/new-cac-benchmark"],
      prior,
    );
    expect(novelty.newSourceCount).toBe(1);
    expect(novelty.reusedSourceCount).toBe(1);
  });

  it("acquires provider-backed evidence with complete lineage", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: mockResearchResult(),
    });

    const result = await acquireValidationEvidenceViaResearch({
      admin: {} as AdminSupabaseClient,
      organizationId: "org",
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
      idempotencyKey: "probe:test:1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.experiment.provider).toBe("gemini");
    expect(result.experiment.researchRunId).toBe("research-run-probe-1");
    expect(result.experiment.providerCalls).toBe(1);
    expect(result.experiment.newSourceCount).toBeGreaterThan(0);
    expect(result.experiment.synthesisOnly).toBe(false);
    expect(result.experiment.tokenUsage?.totalTokens).toBe(800);
  });

  it("gives zero credit for new irrelevant evidence", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: mockResearchResult({
        summary: "Contractors waste time on estimates.",
        evidence: [
          {
            evidenceId: "e2",
            findingId: "f2",
            claim: "Contractors waste time on manual material estimates.",
            observedSignal: "Pain",
            signalType: "customer_complaints",
            evidenceType: "direct_grounded",
            grounded: true,
            sourceIds: ["s2"],
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
            sourceId: "s2",
            url: "https://example.com/new-pain-only",
            canonicalUrl: "https://example.com/new-pain-only",
            title: "Contractor pain article",
            domain: "example.com",
            retrievedAt: new Date().toISOString(),
            providerChunkIndex: 0,
          },
        ],
      }),
    });

    const result = await acquireValidationEvidenceViaResearch({
      admin: {} as AdminSupabaseClient,
      organizationId: "org",
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
      idempotencyKey: "probe:test:2",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.experiment.newSourceCount).toBeGreaterThan(0);
    expect(result.experiment.uncertaintyReduction).toBe(0);
    expect(result.experiment.validationResult).toBe("INCONCLUSIVE");
  });

  it("gives bounded credit for new partial CAC evidence", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: true,
      result: mockResearchResult(),
    });

    const result = await acquireValidationEvidenceViaResearch({
      admin: {} as AdminSupabaseClient,
      organizationId: "org",
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
      idempotencyKey: "probe:test:3",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.experiment.uncertaintyReduction).toBeGreaterThan(0);
    expect(result.experiment.uncertaintyReduction).toBeLessThanOrEqual(0.06);
  });

  it("records provider-backed validation cost exactly once", () => {
    const budget = new CycleBudgetGovernor();
    recordValidationResearchBudget({
      budget,
      experiment: {
        candidateId: "c1",
        blockingAssumptionId: "CAC",
        experimentType: "comparable_benchmark_research",
        question: "q",
        expectedEvidence: "e",
        actualEvidence: "a",
        sourceUrls: [],
        newSourceUrls: ["https://example.com/new"],
        reusedSourceUrls: [],
        newSourceCount: 1,
        reusedSourceCount: 0,
        relevanceClass: "PARTIAL",
        costUsd: 0.002,
        executionStatus: "COMPLETED",
        validationResult: "PARTIALLY_SUPPORTED",
        newEvidenceFound: true,
        uncertaintyReduction: 0.06,
        confidenceImpact: 0.05,
        assumptionImpact: 0.06,
        providerCalls: 1,
        synthesisOnly: false,
        provider: "gemini",
        model: "gemini-2.5-flash",
        researchRunId: "run-1",
        costKnown: true,
      },
    });
    expect(budget.ledger.filter((e) => e.stage === "bounded_validation")).toHaveLength(1);
    expect(budget.knownTotalUsdValue).toBe(0.002);
  });

  it("provider-backed validation enables HQ worker state", () => {
    const state = buildValidationStationState({
      validationActive: true,
      validationCompleted: false,
      providerCalls: 1,
      costUsd: 0.002,
      costKnown: true,
      currentTask: "Running grounded CAC benchmark research",
    });
    expect(state.showWorkers).toBe(true);
    expect(state.summary).toContain("new grounded market research");
  });

  it("research failure is technical failure not business NO_GO", async () => {
    vi.mocked(runGroundedResearch).mockResolvedValue({
      ok: false,
      failure: {
        researchRunId: "failed-run",
        organizationId: "org",
        researchObjective: "test",
        providerId: "gemini",
        modelId: "gemini",
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

    const result = await acquireValidationEvidenceViaResearch({
      admin: {} as AdminSupabaseClient,
      organizationId: "org",
      candidate: contractorCandidate(),
      assumption: cacAssumption(),
      idempotencyKey: "probe:test:fail",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.technicalFailure).toBe(true);
  });
});
