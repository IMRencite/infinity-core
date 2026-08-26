import { describe, expect, it } from "vitest";
import { EVIDENCE_SIGNAL_TYPES } from "@/lib/infinity/research/constants";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import { buildResearchSystemInstructions, buildResearchUserPrompt } from "@/lib/infinity/research/prompts";
import type { ProviderResearchStructuredOutput, ResearchResult } from "@/lib/infinity/research/types";
import {
  DIMENSION_RESEARCH_CLASS,
  DIMENSION_SIGNAL_TYPES,
  assessGroundedResearchCoverage,
  buildResearchCoveragePlan,
  competitorLeadsAsSeeds,
  evaluateGapFillEligibility,
  isRedundantQuery,
  loadResearchCoveragePolicy,
  mergeNormalizedResearch,
  runCoverageDirectedPhases,
} from "@/lib/infinity/research/coverage";
import { founderResearchPacketFromResult } from "@/lib/infinity/founder-idea-lab/research-from-canonical";
import { coverageFromPacket } from "@/lib/infinity/founder-idea-lab/research-packet";
import type { FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";

const REDIRECTS = Array.from(
  { length: 11 },
  (_, index) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-plan-${index + 1}`,
);
const YOUTUBE = "https://www.youtube.com/watch?v=QijCqLZSBtw";

const CMS_SEED = {
  ideaTitle: "Infinity CMS",
  ideaDescription: "CMS that builds pages from a knowledge base",
  targetCustomer: "local businesses",
  problem: "thin AI websites do not rank",
  businessModelHypothesis: "subscription",
  pricingHypothesis: "monthly credits",
  competitorLeads: ["Dealerspike", "Hibu"],
};

function policy(overrides: Partial<ReturnType<typeof loadResearchCoveragePolicy>> = {}) {
  return {
    ...loadResearchCoveragePolicy({
      RESEARCH_COVERAGE_MAX_INITIAL_QUERIES: "8",
      RESEARCH_COVERAGE_MAX_GAP_FILL_QUERIES: "4",
    }),
    ...overrides,
  };
}

function finding(
  overrides: Partial<ProviderResearchStructuredOutput["findings"][number]> & { findingId: string },
): ProviderResearchStructuredOutput["findings"][number] {
  return {
    claim: "Observed signal.",
    signalType: "search_demand",
    observedSignal: "Search results.",
    relevance: "positive",
    confidence: 0.6,
    grounded: true,
    inference: false,
    sourceUrls: [],
    limitations: [],
    ...overrides,
  };
}

function structured(findings: ProviderResearchStructuredOutput["findings"]): ProviderResearchStructuredOutput {
  return {
    schemaVersion: "grounded_research_v1",
    summary: "Coverage fixture.",
    findings,
    limitations: ["fixture"],
    requiresMoreResearch: true,
  };
}

function normalize(findings: ProviderResearchStructuredOutput["findings"], urls = REDIRECTS): ResearchResult {
  return normalizeGroundedResearch({
    researchRunId: "run-coverage",
    organizationId: "org-1",
    missionId: null,
    providerId: "gemini",
    modelId: "gemini-3.5-flash",
    researchObjective: "Infinity CMS",
    inputHash: "hash",
    structured: structured(findings),
    groundingMetadata: {
      webSearchQueries: ["cms"],
      groundingChunks: urls.map((uri) => ({ web: { uri } })),
    },
    tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    groundingUsage: {
      webSearchQueries: ["cms"],
      searchQueryCount: 1,
      groundingChunkCount: urls.length,
      groundingSupportCount: 0,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "fixture",
    latencyMs: 12,
    requestId: "req",
    retryMetadata: { attemptCount: 1, maxAttempts: 2, retried: false },
    rawProviderResponseStored: true,
  });
}

function liveInferenceFindings() {
  return [
    finding({
      findingId: "aeo_market_shift",
      signalType: "technological_shift",
      inference: true,
      sourceUrls: [],
    }),
    finding({
      findingId: "thin_ai_content_penalty",
      signalType: "recurring_problem",
      inference: true,
      sourceUrls: [],
    }),
    finding({
      findingId: "pricing_models_disruption",
      signalType: "pricing_pain",
      inference: true,
      sourceUrls: [],
    }),
  ];
}

describe("Grounded research coverage planning + bounded gap-fill v1", () => {
  it("builds a provider-neutral bounded initial coverage plan from founder seeds", () => {
    const plan = buildResearchCoveragePlan({
      seed: CMS_SEED,
      objective: "Investigate Infinity CMS",
      policy: policy(),
      requireSourceBackedFindings: true,
    });
    expect(plan.maxLogicalPhases).toBe(2);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.phase).toBe("initial");
    expect(plan.steps[0]?.queries.length).toBeLessThanOrEqual(8);
    expect(plan.steps[0]?.queries.length).toBeGreaterThan(0);
    expect(plan.steps[0]?.groundingRequired).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/gemini/i);
    expect(plan.steps[0]?.queries.some((query) => /Dealerspike|Hibu/i.test(query.query))).toBe(true);
    expect(plan.steps[0]?.queries.some((query) => query.targetDimensions.includes("demand"))).toBe(true);
    expect(plan.steps[0]?.queries.some((query) => query.targetDimensions.includes("monetization"))).toBe(true);
  });

  it("maps every research dimension to existing signal types", () => {
    for (const [dimension, signals] of Object.entries(DIMENSION_SIGNAL_TYPES)) {
      expect(signals.length).toBeGreaterThan(0);
      for (const signal of signals) {
        expect(EVIDENCE_SIGNAL_TYPES).toContain(signal);
      }
      expect(DIMENSION_RESEARCH_CLASS[dimension as keyof typeof DIMENSION_RESEARCH_CLASS]).toBeTruthy();
    }
  });

  it("treats founder competitors and pricing as seeds only", () => {
    expect(competitorLeadsAsSeeds(CMS_SEED)).toEqual(["Dealerspike", "Hibu"]);
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    expect(plan.steps[0]?.queries.some((query) => query.query.includes("monthly credits"))).toBe(false);
    const live = normalize(liveInferenceFindings());
    const packet = founderResearchPacketFromResult({
      result: live,
      submission: { competitors: "Dealerspike, Hibu" } as FounderIdeaSubmission,
    });
    expect(packet.verifiedCompetitors).toEqual([]);
  });

  it("caps the initial query plan", () => {
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy({ maxInitialQueries: 5 }) });
    expect(plan.steps[0]?.queries).toHaveLength(5);
    expect(plan.maxFindings).toBe(12);
  });

  it("assesses live-v2 inference-only coverage as insufficient and identifies researchable gaps", () => {
    const result = normalize(liveInferenceFindings());
    const coverage = assessGroundedResearchCoverage(result);
    expect(coverage.directEvidenceCount).toBe(0);
    expect(coverage.derivedEvidenceCount).toBe(3);
    expect(coverage.sourceCount).toBe(11);
    expect(coverage.partialDimensions).toEqual(expect.arrayContaining(["demand", "market", "pricing"]));
    expect(coverage.researchableGaps).toEqual(expect.arrayContaining(["demand", "market", "competition", "monetization"]));
    expect(coverage.materialCoverageSufficient).toBe(false);
    expect(coverageFromPacket(founderResearchPacketFromResult({
      result,
      submission: { competitors: "Dealerspike, Hibu" } as FounderIdeaSubmission,
    })).materialCoverageSufficient).toBe(false);
  });

  it("allows gap-fill only for unresolved material dimensions with non-redundant queries", () => {
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    const coverage = assessGroundedResearchCoverage(normalize(liveInferenceFindings()));
    const decision = evaluateGapFillEligibility({
      assessment: coverage,
      plan,
      policy: policy(),
      seed: CMS_SEED,
      issuedQueries: plan.steps[0]!.queries,
      gapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(decision.eligible).toBe(true);
    if (decision.eligible) {
      expect(decision.queries.every((query) =>
        query.targetDimensions.some((dimension) => ["demand", "market", "competition", "monetization"].includes(dimension)),
      )).toBe(true);
      expect(decision.queries.some((query) => /Hibu pricing/i.test(query.query))).toBe(false);
    }
  });

  it("stops after one gap-fill phase even if gaps remain", async () => {
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    const phases: string[] = [];
    const directed = await runCoverageDirectedPhases({
      plan,
      policy: policy(),
      seed: CMS_SEED,
      modelId: "gemini-3.5-flash",
      executePhase: async ({ phase }) => {
        phases.push(phase);
        return {
          result: normalize(liveInferenceFindings()),
          attemptCount: 1,
        };
      },
    });
    expect(phases).toEqual(["initial", "gap_fill"]);
    expect(directed.telemetry.gapFillCallCount).toBe(1);
    expect(directed.telemetry.initialResearchCallCount).toBe(1);
    expect(directed.stopReason).toBe("max_gap_fill_reached");
    expect(directed.coverage.materialCoverageSufficient).toBe(false);
  });

  it("merges phases without inflating duplicate sources or findings", () => {
    const first = normalize([
      finding({ findingId: "demand-1", signalType: "search_demand", sourceUrls: [REDIRECTS[0]!] }),
    ]);
    const second = normalize([
      finding({ findingId: "demand-1", signalType: "search_demand", sourceUrls: [REDIRECTS[0]!] }),
      finding({ findingId: "competition-1", signalType: "competitor_presence", sourceUrls: [REDIRECTS[1]!] }),
    ]);
    const merged = mergeNormalizedResearch(first, second);
    expect(merged.sources).toHaveLength(11);
    expect(merged.evidence.map((item) => item.findingId)).toEqual(["demand-1", "competition-1"]);
  });

  it("suppresses semantically duplicate Hibu pricing queries", () => {
    expect(isRedundantQuery("Hibu pricing model services", ["Hibu pricing"])).toBe(true);
    expect(isRedundantQuery("Dealerspike product category", ["Hibu pricing"])).toBe(false);
  });

  it("does not gap-fill when the research budget is exhausted", () => {
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    const decision = evaluateGapFillEligibility({
      assessment: assessGroundedResearchCoverage(normalize(liveInferenceFindings())),
      plan,
      policy: policy({ maxEstimatedCostUsd: 0.02 }),
      seed: CMS_SEED,
      issuedQueries: plan.steps[0]!.queries,
      gapFillPhasesUsed: 0,
      recordedCostUsd: 0.03,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(decision).toEqual({ eligible: false, reason: "budget_exhausted", queries: [] });
  });

  it("counts transport retries separately from logical phases", async () => {
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    const directed = await runCoverageDirectedPhases({
      plan,
      policy: policy({ maxEstimatedCostUsd: 0.000001 }),
      seed: CMS_SEED,
      modelId: "gemini-3.5-flash",
      executePhase: async () => ({
        result: {
          ...normalize([
            finding({ findingId: "demand-1", signalType: "search_demand", sourceUrls: [REDIRECTS[0]!] }),
            finding({ findingId: "market-1", signalType: "growing_market", sourceUrls: [REDIRECTS[1]!] }),
            finding({ findingId: "competition-1", signalType: "competitor_presence", sourceUrls: [REDIRECTS[2]!] }),
            finding({ findingId: "monetization-1", signalType: "monetization_precedent", sourceUrls: [REDIRECTS[3]!] }),
          ]),
          estimatedCostUsd: 0.05,
        },
        attemptCount: 2,
      }),
    });
    expect(directed.telemetry).toEqual({
      initialResearchCallCount: 1,
      transportRetryCount: 1,
      gapFillCallCount: 0,
      totalProviderCalls: 2,
    });
  });

  it("counts an initial phase plus one gap-fill as two logical provider phases", async () => {
    let calls = 0;
    const plan = buildResearchCoveragePlan({ seed: CMS_SEED, policy: policy() });
    const directed = await runCoverageDirectedPhases({
      plan,
      policy: policy(),
      seed: CMS_SEED,
      modelId: "gemini-3.5-flash",
      executePhase: async ({ phase }) => {
        calls += 1;
        if (phase === "initial") {
          return { result: normalize(liveInferenceFindings()), attemptCount: 1 };
        }
        return {
          result: normalize([
            finding({ findingId: "competition-1", signalType: "competitor_presence", sourceUrls: [REDIRECTS[2]!] }),
          ]),
          attemptCount: 1,
        };
      },
    });
    expect(calls).toBe(2);
    expect(directed.telemetry.initialResearchCallCount).toBe(1);
    expect(directed.telemetry.gapFillCallCount).toBe(1);
    expect(directed.telemetry.transportRetryCount).toBe(0);
    expect(directed.telemetry.totalProviderCalls).toBe(2);
  });

  it("supports competition and category monetization without fabricating unit economics", () => {
    const result = normalize([
      finding({
        findingId: "competition-1",
        signalType: "competitor_presence",
        claim: "Dealerspike sells dealer website CMS platforms.",
        sourceUrls: [REDIRECTS[0]!],
      }),
      finding({
        findingId: "monetization-1",
        signalType: "monetization_precedent",
        claim: "Website CMS vendors sell monthly subscriptions.",
        sourceUrls: [REDIRECTS[1]!],
      }),
    ]);
    const packet = founderResearchPacketFromResult({
      result,
      submission: { competitors: "Dealerspike, Hibu" } as FounderIdeaSubmission,
    });
    expect(packet.verifiedCompetitors).toEqual(["Dealerspike"]);
    expect(packet.monetizationLayers.category).toBe("SUPPORTED");
    expect(packet.monetizationLayers.ideaSpecific).toBe("UNKNOWN");
    expect(packet.monetizationLayers.unitEconomics).toBe("UNKNOWN");
  });

  it("leaves secondary dimensions unknown unless source-backed or explicitly derived", () => {
    const coverage = assessGroundedResearchCoverage(
      normalize([
        finding({ findingId: "demand", signalType: "search_demand", sourceUrls: [REDIRECTS[0]!] }),
        finding({ findingId: "market", signalType: "growing_market", sourceUrls: [REDIRECTS[1]!] }),
        finding({ findingId: "competition", signalType: "competitor_presence", sourceUrls: [REDIRECTS[2]!] }),
        finding({ findingId: "pricing", signalType: "pricing_pain", sourceUrls: [REDIRECTS[3]!] }),
        finding({ findingId: "monetization", signalType: "monetization_precedent", sourceUrls: [REDIRECTS[4]!] }),
        finding({
          findingId: "build-derived",
          signalType: "workflow_inefficiency",
          inference: true,
          sourceUrls: [REDIRECTS[0]!],
        }),
      ]),
    );
    expect(coverage.materialCoverageSufficient).toBe(true);
    expect(coverage.coveredDimensions).toEqual(
      expect.arrayContaining(["demand", "market", "competition", "pricing", "monetization"]),
    );
    expect(coverage.partialDimensions).toContain("buildability");
    expect(coverage.unknownDimensions).toEqual(
      expect.arrayContaining(["distribution", "capital_efficiency", "speed_to_revenue"]),
    );
  });

  it("keeps Gemini attribution regressions", () => {
    expect(() =>
      normalize([finding({ findingId: "bad", sourceUrls: ["https://example.com/not-grounded"] })]),
    ).toThrow(/not present in grounding metadata/);
    expect(() =>
      normalize([finding({ findingId: "yt", sourceUrls: [YOUTUBE, REDIRECTS[0]!] })]),
    ).toThrow(/youtube\.com/);
    const accepted = normalize([finding({ findingId: "ok", sourceUrls: [REDIRECTS[0]!] })]);
    expect(accepted.evidence[0]?.grounded).toBe(true);
    const inferred = normalize([
      finding({
        findingId: "derived",
        inference: true,
        sourceUrls: [REDIRECTS[0]!],
      }),
    ]);
    expect(inferred.evidence[0]?.evidenceType).toBe("inference_from_evidence");
    expect(inferred.evidence[0]?.grounded).toBe(false);
  });

  it("preserves the attribution prompt contract while adding planned searches", () => {
    const user = buildResearchUserPrompt("Investigate Infinity CMS", {
      modelProvidedSources: true,
      requireSourceUrls: true,
      plannedQueries: ["CMS market growth adoption"],
      targetDimensions: ["market"],
      maxFindings: 12,
      phase: "initial",
    });
    const system = buildResearchSystemInstructions({ modelProvidedSources: true, requireSourceUrls: true });
    expect(system).toContain("grounding-api-redirect");
    expect(system).not.toMatch(/Return exactly three findings/);
    expect(user).toContain("CMS market growth adoption");
    expect(user).toContain("at most 12 distinct findings");
  });
});
