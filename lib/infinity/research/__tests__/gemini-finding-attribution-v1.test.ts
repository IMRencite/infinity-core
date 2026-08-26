import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { researchProviderCallCount } from "@/lib/infinity/research/constants";
import { canonicalizeSourceUrl, sourceIdentityKey } from "@/lib/infinity/research/normalization/dedupe";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import {
  buildResearchSystemInstructions,
  buildResearchUserPrompt,
} from "@/lib/infinity/research/prompts";
import { parseProviderResearchJson } from "@/lib/infinity/research/schema";
import type { ProviderResearchStructuredOutput } from "@/lib/infinity/research/types";
import { founderResearchPacketFromResult } from "@/lib/infinity/founder-idea-lab/research-from-canonical";
import { coverageFromPacket } from "@/lib/infinity/founder-idea-lab/research-packet";
import { evaluateEvidenceReadiness } from "@/lib/infinity/founder-idea-lab/readiness";
import { monetizeFromResearchPacket } from "@/lib/infinity/founder-idea-lab/monetization-from-research";
import type { FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";

const YOUTUBE_UNSUPPORTED = "https://www.youtube.com/watch?v=QijCqLZSBtw";
const LIVE_REDIRECTS = Array.from(
  { length: 11 },
  (_, index) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-live-v2-${index + 1}`,
);

function finding(
  overrides: Partial<ProviderResearchStructuredOutput["findings"][number]> & { findingId: string },
): ProviderResearchStructuredOutput["findings"][number] {
  return {
    claim: "Observed demand signal for the idea.",
    signalType: "search_demand",
    observedSignal: "Search interest and competitor pricing pages.",
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
    summary: "Attribution fixture.",
    findings,
    limitations: ["fixture"],
    requiresMoreResearch: true,
  };
}

function normalizeInput(
  payload: ProviderResearchStructuredOutput,
  groundingMetadata: Record<string, unknown> | null,
) {
  return {
    researchRunId: "b01cb7a7-5959-425d-874d-244130d2fb84",
    organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
    missionId: null,
    providerId: "gemini" as const,
    modelId: "gemini-3.5-flash",
    researchObjective: "Infinity CMS live-shaped fixture",
    inputHash: "hash",
    structured: payload,
    groundingMetadata,
    tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    groundingUsage: {
      webSearchQueries: (groundingMetadata?.webSearchQueries as string[] | undefined) ?? ["cms"],
      searchQueryCount: ((groundingMetadata?.webSearchQueries as string[] | undefined) ?? ["cms"]).length,
      groundingChunkCount: ((groundingMetadata?.groundingChunks as unknown[] | undefined) ?? []).length,
      groundingSupportCount: ((groundingMetadata?.groundingSupports as unknown[] | undefined) ?? []).length,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.000813,
    costUncertainty: "fixture",
    latencyMs: 10,
    requestId: "req",
    retryMetadata: { attemptCount: 2, maxAttempts: 3, retried: true },
    rawProviderResponseStored: true,
  };
}

function liveV2Grounding() {
  return {
    webSearchQueries: [
      "AI website builder dynamic SEO page generation pricing",
      "Hibu pricing model services reviews",
    ],
    groundingChunks: LIVE_REDIRECTS.map((uri, index) => ({
      web: { uri, title: `source-${index + 1}` },
    })),
    groundingSupports: [],
  };
}

function liveV2InferenceFindings(): ProviderResearchStructuredOutput["findings"] {
  return [
    finding({
      findingId: "aeo_market_shift",
      signalType: "technological_shift",
      claim: "CMS platforms are natively integrating AEO.",
      grounded: true,
      inference: true,
      sourceUrls: [],
    }),
    finding({
      findingId: "thin_ai_content_penalty",
      signalType: "recurring_problem",
      claim: "Thin AI content faces de-indexation.",
      grounded: true,
      inference: true,
      sourceUrls: [],
    }),
    finding({
      findingId: "pricing_models_disruption",
      signalType: "pricing_pain",
      claim: "AI web builders charge tiered monthly rates.",
      grounded: true,
      inference: true,
      sourceUrls: [],
    }),
  ];
}

const submission = {
  id: "69d45f14-ca07-4a30-b601-54af6d05953f",
  opportunityCandidateId: "091f50e7-feb7-4dae-aba7-0e478a736ba4",
  competitors: "Dealerspike, Hibu",
} as FounderIdeaSubmission;

function candidate(): OpportunityCandidate {
  return {
    id: "091f50e7-feb7-4dae-aba7-0e478a736ba4",
    organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
    discoveryRunId: "9142bf7d-c9c8-4087-b231-59626a5530f6",
    title: "Infinity CMS",
    summary: "CMS",
    problem: "thin sites",
    targetCustomer: "SMBs",
    market: "CMS",
    businessModelCandidates: ["subscription"],
    revenueMechanismCandidates: ["subscription"],
    demandEvidence: [],
    marketEvidence: [],
    competitionEvidence: [],
    monetizationEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: [],
    unknowns: [],
    researchSources: [],
    researchRunIds: [],
    discoveryStrategies: [],
    dedupKey: "founder:cms",
    mergeGroupKey: "founder-idea:69d45f14-ca07-4a30-b601-54af6d05953f",
    opportunityScore: null,
    rankPosition: null,
    scores: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Gemini finding attribution + evidence coverage v1", () => {
  it("live-v2-shaped 11-source fixture stays insufficient without finding-level source relationships", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(structured(liveV2InferenceFindings()), liveV2Grounding()),
    );
    expect(result.sources).toHaveLength(11);
    expect(result.evidence).toHaveLength(3);
    expect(result.evidence.every((item) => item.evidenceType === "inference_from_evidence")).toBe(true);
    expect(result.evidence.every((item) => item.grounded === false && item.sourceUrls.length === 0)).toBe(true);
    expect(result.sources.filter((source) => result.evidence.some((item) => item.sourceIds.includes(source.sourceId)))).toHaveLength(0);

    const packet = founderResearchPacketFromResult({ result, submission });
    const coverage = coverageFromPacket(packet);
    expect(coverage.materialCoverageSufficient).toBe(false);
    expect(coverage.dimensions.demand.coverage).toBe("partial");
    expect(coverage.dimensions.market.coverage).toBe("partial");
    expect(coverage.dimensions.pricing.coverage).toBe("partial");
    expect(coverage.dimensions.competition.coverage).toBe("none");
    expect(coverage.dimensions.monetization.coverage).toBe("none");
    expect(packet.monetizationLayers.category).toBe("UNKNOWN");
    expect(packet.monetizationLayers.ideaSpecific).toBe("UNKNOWN");
    expect(packet.monetizationLayers.unitEconomics).toBe("UNKNOWN");
    expect(
      evaluateEvidenceReadiness({
        packet,
        coverage,
        monetization: monetizeFromResearchPacket({ candidate: candidate(), packet }),
        layers: packet.monetizationLayers,
      }).readyForDecision,
    ).toBe(false);
  });

  it("accepts a source-backed finding when sourceUrls match a provider-grounded redirect", () => {
    const uri = LIVE_REDIRECTS[0]!;
    const result = normalizeGroundedResearch(
      normalizeInput(
        structured([finding({ findingId: "demand-1", sourceUrls: [`${uri}?utm_source=gemini`] })]),
        liveV2Grounding(),
      ),
    );
    expect(result.evidence[0]?.evidenceType).toBe("direct_grounded");
    expect(result.evidence[0]?.grounded).toBe(true);
    expect(result.evidence[0]?.sourceIds).toEqual(["src_1"]);
    expect(sourceIdentityKey(result.evidence[0]!.sourceUrls[0]!)).toBe(sourceIdentityKey(uri));
    expect(canonicalizeSourceUrl(result.evidence[0]!.sourceUrls[0]!)).toContain("vertexaisearch.cloud.google.com");
  });

  it("rejects an arbitrary model-written URL that is not in provider grounding", () => {
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(
          structured([
            finding({
              findingId: "demand-1",
              sourceUrls: ["https://firstpagesage.com/reports/saas-cac-report/"],
            }),
          ]),
          liveV2Grounding(),
        ),
      ),
    ).toThrow(/references URL not present in grounding metadata/);
  });

  it("keeps derived conclusions as inference with lineage to validated sources", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(
        structured([
          finding({
            findingId: "direct-demand",
            signalType: "search_demand",
            sourceUrls: [LIVE_REDIRECTS[0]!],
          }),
          finding({
            findingId: "direct-market",
            signalType: "growing_market",
            sourceUrls: [LIVE_REDIRECTS[1]!],
          }),
          finding({
            findingId: "derived-speed",
            signalType: "time_to_revenue",
            claim: "Category pricing implies faster payback than high-ticket agencies.",
            grounded: true,
            inference: true,
            sourceUrls: [LIVE_REDIRECTS[0]!, LIVE_REDIRECTS[1]!],
          }),
        ]),
        liveV2Grounding(),
      ),
    );
    const derived = result.evidence.find((item) => item.findingId === "derived-speed");
    expect(derived?.evidenceType).toBe("inference_from_evidence");
    expect(derived?.grounded).toBe(false);
    expect(derived?.sourceIds).toEqual(["src_1", "src_2"]);
    expect(result.evidence.filter((item) => item.evidenceType === "direct_grounded")).toHaveLength(2);
  });

  it("maps signal types onto founder dimensions including competition and monetization", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(
        structured([
          finding({ findingId: "d", signalType: "search_demand", sourceUrls: [LIVE_REDIRECTS[0]!] }),
          finding({ findingId: "m", signalType: "growing_market", sourceUrls: [LIVE_REDIRECTS[1]!] }),
          finding({
            findingId: "c",
            signalType: "competitor_presence",
            claim: "Dealerspike sells dealer website CMS platforms.",
            sourceUrls: [LIVE_REDIRECTS[2]!],
          }),
          finding({ findingId: "p", signalType: "pricing_pain", sourceUrls: [LIVE_REDIRECTS[3]!] }),
          finding({
            findingId: "z",
            signalType: "monetization_precedent",
            claim: "AI website builders sell monthly subscriptions.",
            sourceUrls: [LIVE_REDIRECTS[4]!],
          }),
        ]),
        liveV2Grounding(),
      ),
    );
    const packet = founderResearchPacketFromResult({ result, submission });
    expect(packet.findings.map((item) => item.dimension).sort()).toEqual([
      "competition",
      "demand",
      "market",
      "monetization",
      "pricing",
    ]);
    expect(packet.verifiedCompetitors).toEqual(["Dealerspike"]);
    expect(packet.competitorLeads).toEqual(["Dealerspike", "Hibu"]);
    expect(packet.monetizationLayers.category).toBe("SUPPORTED");
    expect(packet.monetizationLayers.ideaSpecific).toBe("UNKNOWN");
    expect(packet.monetizationLayers.unitEconomics).toBe("UNKNOWN");
  });

  it("does not treat founder-supplied competitors as verified without grounded competition evidence", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(structured(liveV2InferenceFindings()), liveV2Grounding()),
    );
    const packet = founderResearchPacketFromResult({ result, submission });
    expect(packet.competitorLeads).toEqual(["Dealerspike", "Hibu"]);
    expect(packet.verifiedCompetitors).toEqual([]);
  });

  it("does not fabricate unit economics when only category monetization is grounded", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(
        structured([
          finding({
            findingId: "monetization",
            signalType: "monetization_precedent",
            claim: "Website CMS vendors sell subscription plans.",
            sourceUrls: [LIVE_REDIRECTS[0]!],
          }),
        ]),
        liveV2Grounding(),
      ),
    );
    const packet = founderResearchPacketFromResult({ result, submission });
    const monetization = monetizeFromResearchPacket({ candidate: candidate(), packet });
    expect(packet.monetizationLayers.unitEconomics).toBe("UNKNOWN");
    expect(monetization?.primaryPlan?.ltvCacRatio ?? null).toBeNull();
    expect(monetization?.primaryPlan?.estimatedCAC ?? null).toBeNull();
  });

  it("marks representative CMS research as material-sufficient only when those dimensions are grounded", () => {
    const result = normalizeGroundedResearch(
      normalizeInput(
        structured([
          finding({ findingId: "demand", signalType: "search_demand", sourceUrls: [LIVE_REDIRECTS[0]!] }),
          finding({ findingId: "market", signalType: "growing_market", sourceUrls: [LIVE_REDIRECTS[1]!] }),
          finding({
            findingId: "competition",
            signalType: "competitor_presence",
            sourceUrls: [LIVE_REDIRECTS[2]!],
          }),
          finding({ findingId: "pricing", signalType: "pricing_pain", sourceUrls: [LIVE_REDIRECTS[3]!] }),
          finding({
            findingId: "monetization",
            signalType: "monetization_precedent",
            sourceUrls: [LIVE_REDIRECTS[4]!],
          }),
          finding({
            findingId: "build-derived",
            signalType: "workflow_inefficiency",
            inference: true,
            grounded: true,
            sourceUrls: [LIVE_REDIRECTS[0]!],
          }),
        ]),
        liveV2Grounding(),
      ),
    );
    const packet = founderResearchPacketFromResult({ result, submission });
    const coverage = coverageFromPacket(packet);
    expect(coverage.materialCoverageSufficient).toBe(true);
    expect(coverage.dimensions.buildability.coverage).toBe("partial");
    expect(coverage.dimensions.distribution.coverage).toBe("none");
    expect(coverage.dimensions.capital_efficiency.coverage).toBe("none");
    expect(coverage.dimensions.speed_to_revenue.coverage).toBe("none");
    expect(
      evaluateEvidenceReadiness({
        packet,
        coverage,
        monetization: monetizeFromResearchPacket({ candidate: candidate(), packet }),
        layers: packet.monetizationLayers,
      }).readyForDecision,
    ).toBe(false);
  });

  it("records provider-call count as retry_count + 1", () => {
    expect(researchProviderCallCount(0)).toBe(1);
    expect(researchProviderCallCount(1)).toBe(2);
    expect(researchProviderCallCount(2)).toBe(3);
  });

  it("still rejects the prior YouTube URL absent from Gemini grounding", () => {
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(
          structured([finding({ findingId: "finding_2", sourceUrls: [YOUTUBE_UNSUPPORTED, LIVE_REDIRECTS[0]!] })]),
          liveV2Grounding(),
        ),
      ),
    ).toThrow(/youtube\.com/);
  });

  it("treats Gemini grounding-api-redirect URIs as provider identities", () => {
    const uri = LIVE_REDIRECTS[7]!;
    const result = normalizeGroundedResearch(
      normalizeInput(structured([finding({ findingId: "redirect", sourceUrls: [uri] })]), liveV2Grounding()),
    );
    expect(result.evidence[0]?.grounded).toBe(true);
    expect(result.evidence[0]?.sourceUrls[0]).toBe(uri);
  });

  it("does not tell Gemini 3 to invent public URLs or collapse to exactly three findings", () => {
    const system = buildResearchSystemInstructions({ modelProvidedSources: true, requireSourceUrls: true });
    const user = buildResearchUserPrompt("Investigate Infinity CMS", {
      modelProvidedSources: true,
      requireSourceUrls: true,
    });
    expect(system).toContain("grounding-api-redirect");
    expect(system).not.toMatch(/Return exactly three findings/);
    expect(system).not.toMatch(/public HTTPS URLs you retrieved from search/);
    expect(system).toContain("Never mark inference=true merely to avoid citing sources");
    expect(user).toContain("grounding-api-redirect");
    expect(user).toContain("Never use google.com/search links");
  });

  it("coerces prose relevance to unknown instead of inventing polarity", () => {
    const parsed = parseProviderResearchJson(
      JSON.stringify(
        structured([
          finding({
            findingId: "prose",
            relevance: "Proves high market demand but introduces formidable competition.",
            sourceUrls: [LIVE_REDIRECTS[0]!],
          }),
        ]),
      ),
    );
    expect(parsed.findings[0]?.relevance).toBe("unknown");
  });

  it("persists safe grounding diagnostics on validation failure in committed run.ts", () => {
    const run = readFileSync(join(process.cwd(), "lib/infinity/research/run.ts"), "utf8");
    expect(run).toMatch(/grounding_metadata: \(input\.groundingMetadata/);
    expect(run).toMatch(/raw_provider_response: \(input\.rawProviderResponse/);
    expect(run).toMatch(/grounding_usage: \(input\.groundingUsage/);
    expect(run).toMatch(/evidence_validation_failure/);
    expect(run).toMatch(/validation_failed/);
  });
});
