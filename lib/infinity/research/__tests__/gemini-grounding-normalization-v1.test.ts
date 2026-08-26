import { describe, expect, it } from "vitest";
import { classifyResearchFailure, ResearchError } from "@/lib/infinity/research/failures";
import {
  isResearchProviderTransportFailure,
  isResearchValidationFailure,
} from "@/lib/infinity/research/constants";
import { canonicalizeSourceUrl, sourceIdentityKey } from "@/lib/infinity/research/normalization/dedupe";
import {
  extractGroundingMetadata,
  normalizeGroundedResearch,
} from "@/lib/infinity/research/normalization/evidence";
import {
  buildGroundingMetadataFromInteractionSteps,
} from "@/lib/infinity/research/normalization/interaction-grounding";
import { buildMockProviderResearchOutput } from "@/lib/infinity/research/mock-output";
import { founderResearchPacketFromFailure } from "@/lib/infinity/founder-idea-lab/research-from-canonical";
import type { FailedResearchResult } from "@/lib/infinity/research/types";
import type { FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import type { ProviderResearchStructuredOutput } from "@/lib/infinity/research/types";

const VERTEX_A =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-finding01";
const VERTEX_B =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-finding02";
const VERTEX_A_UTM = `${VERTEX_A}?utm_source=gemini`;
const YOUTUBE_UNSUPPORTED = "https://www.youtube.com/watch?v=QijCqLZSBtw";

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
    summary: "Grounded research summary for fixture.",
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
    researchRunId: "run-fixture",
    organizationId: "org-1",
    missionId: null,
    providerId: "gemini" as const,
    modelId: "gemini-3.5-flash",
    researchObjective: "test",
    inputHash: "hash",
    structured: payload,
    groundingMetadata,
    tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    groundingUsage: {
      webSearchQueries: (groundingMetadata?.webSearchQueries as string[] | undefined) ?? [],
      searchQueryCount: ((groundingMetadata?.webSearchQueries as string[] | undefined) ?? []).length,
      groundingChunkCount: ((groundingMetadata?.groundingChunks as unknown[] | undefined) ?? []).length,
      groundingSupportCount: ((groundingMetadata?.groundingSupports as unknown[] | undefined) ?? []).length,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "fixture",
    latencyMs: 10,
    requestId: "req",
    retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
    rawProviderResponseStored: true,
  };
}

function currentFinding01Interaction(sourceUrls: string[]) {
  const output = JSON.stringify({
    schemaVersion: "grounded_research_v1",
    summary: "Live finding-01 shape.",
    findings: [
      {
        findingId: "finding-01",
        claim: "CMS operators pay for automated SEO page generation.",
        signalType: "search_demand",
        observedSignal: "Search and competitor pricing.",
        relevance: "positive",
        confidence: 0.5,
        grounded: true,
        inference: false,
        sourceUrls,
        limitations: [],
      },
    ],
    limitations: [],
    requiresMoreResearch: true,
  });

  return {
    steps: [
      {
        type: "google_search_call",
        arguments: { queries: ["Infinity CMS AEO automated page creation"] },
      },
      {
        type: "google_search_result",
        result: [
          {
            search_suggestions:
              '<style>@import url("https://www.w3.org/2000/svg")</style><a href="https://www.google.com/search?q=cms">search</a>',
          },
        ],
      },
      {
        type: "model_output",
        content: [{ type: "text", text: output }],
      },
    ],
    output_text: output,
    usage: { grounding_tool_count: [{ type: "google_search", count: 1 }] },
  };
}

function failedResearch(
  classification: FailedResearchResult["failureClassification"],
  message: string,
): FailedResearchResult {
  return {
    researchRunId: "5d3e616a-4321-4b06-b7c4-fd9a846b9aed",
    organizationId: "org-1",
    candidateId: "091f50e7-feb7-4dae-aba7-0e478a736ba4",
    researchObjective: "x",
    providerId: "gemini",
    modelId: "gemini-3.5-flash",
    inputHash: "h",
    status: classification === "evidence_validation_failure" ? "validation_failed" : "failed",
    failureClassification: classification,
    message,
    tokenUsage: null,
    estimatedCostUsd: null,
    latencyMs: null,
    requestId: null,
    failedAt: new Date().toISOString(),
  };
}

const submission = {
  id: "69d45f14-ca07-4a30-b601-54af6d05953f",
  opportunityCandidateId: "091f50e7-feb7-4dae-aba7-0e478a736ba4",
  competitors: "",
} as FounderIdeaSubmission;

describe("Gemini grounded research normalization + validation v1", () => {
  it("accepts a valid Gemini grounded response", () => {
    const payload = structured([
      finding({ findingId: "finding-01", sourceUrls: [VERTEX_A] }),
      finding({ findingId: "finding-02", sourceUrls: [VERTEX_B] }),
    ]);
    const result = normalizeGroundedResearch(
      normalizeInput(payload, {
        webSearchQueries: ["cms aeo"],
        groundingChunks: [{ web: { uri: VERTEX_A } }, { web: { uri: VERTEX_B } }],
        groundingSupports: [{ groundingChunkIndices: [0] }, { groundingChunkIndices: [1] }],
      }),
    );
    expect(result.evidence).toHaveLength(2);
    expect(result.sources).toHaveLength(2);
    expect(result.evidence.every((item) => item.grounded && item.sourceUrls.length > 0)).toBe(true);
    expect(result.groundedStatus).toBe(true);
  });

  it("accepts valid grounding with URL normalization variance", () => {
    const payload = structured([
      finding({
        findingId: "finding-01",
        sourceUrls: ["http://www.example.com/report/?utm_source=gemini"],
      }),
    ]);
    const result = normalizeGroundedResearch(
      normalizeInput(payload, {
        webSearchQueries: ["report"],
        groundingChunks: [{ web: { uri: "https://example.com/report" } }],
      }),
    );
    expect(result.evidence[0]?.sourceUrls).toEqual(["https://example.com/report"]);
    expect(sourceIdentityKey("HTTP://WWW.EXAMPLE.COM/report/")).toBe(
      canonicalizeSourceUrl("https://example.com/report"),
    );
  });

  it("maps support index 0 to chunk 0 and preserves support relationships", () => {
    const payload = structured([
      finding({ findingId: "finding-01", sourceUrls: [] }),
    ]);
    const result = normalizeGroundedResearch(
      normalizeInput(payload, {
        webSearchQueries: ["q"],
        groundingChunks: [{ web: { uri: VERTEX_A } }, { web: { uri: VERTEX_B } }],
        groundingSupports: [{ groundingChunkIndices: [0] }],
      }),
    );
    expect(result.evidence[0]?.sourceUrls).toEqual([VERTEX_A]);
    expect(result.evidence[0]?.sourceIds).toEqual(["src_1"]);
    expect(result.sources).toHaveLength(2);
  });

  it("rejects unsupported structured URLs that are not in provider grounding", () => {
    const payload = structured([
      finding({
        findingId: "finding-01",
        sourceUrls: ["https://firstpagesage.com/reports/saas-cac-report/"],
      }),
    ]);
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["saas cac"],
          groundingChunks: [{ web: { uri: VERTEX_A } }],
        }),
      ),
    ).toThrow(/references URL not present in grounding metadata/);
  });

  it("rejects missing grounding metadata for grounded findings", () => {
    const payload = structured([finding({ findingId: "finding-01", sourceUrls: [] })]);
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["q"],
          groundingChunks: [],
          groundingSupports: [],
        }),
      ),
    ).toThrow(/lacks validated source URLs/);
  });

  it("fails closed on out-of-bounds grounding chunk index", () => {
    const payload = structured([finding({ findingId: "finding-01", sourceUrls: [] })]);
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["q"],
          groundingChunks: [{ web: { uri: VERTEX_A } }],
          groundingSupports: [{ groundingChunkIndices: [1] }],
        }),
      ),
    ).toThrow(/out-of-bounds chunk index: 1/);
  });

  it("rejects the prior YouTube URL that was absent from Gemini grounding", () => {
    const payload = structured([
      finding({
        findingId: "finding_2",
        sourceUrls: [YOUTUBE_UNSUPPORTED, VERTEX_A],
      }),
    ]);
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["cms"],
          groundingChunks: [{ web: { uri: VERTEX_A } }],
        }),
      ),
    ).toThrow(new RegExp(YOUTUBE_UNSUPPORTED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("current finding-01 fixture still fails when Interactions metadata has no grounding URIs", () => {
    const interaction = currentFinding01Interaction([]);
    const extracted = buildGroundingMetadataFromInteractionSteps(interaction.steps, interaction);
    expect(extracted?.webSearchQueries?.length).toBeGreaterThan(0);
    expect(extracted?.groundingChunks ?? []).toHaveLength(0);

    const payload = structured([finding({ findingId: "finding-01", sourceUrls: [] })]);
    expect(() => normalizeGroundedResearch(normalizeInput(payload, extracted))).toThrow(
      /Grounded finding finding-01 lacks validated source URLs/,
    );
  });

  it("current finding-01 fixture passes when model echoes Gemini grounding redirect URIs", () => {
    const interaction = currentFinding01Interaction([VERTEX_A_UTM]);
    const extracted = buildGroundingMetadataFromInteractionSteps(interaction.steps, interaction);
    expect(extracted?.groundingChunks?.some((chunk) => chunk.web?.uri?.includes("vertexaisearch"))).toBe(
      true,
    );

    const payload = structured([finding({ findingId: "finding-01", sourceUrls: [VERTEX_A_UTM] })]);
    const result = normalizeGroundedResearch(normalizeInput(payload, extracted));
    expect(result.evidence[0]?.grounded).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.evidence[0]?.sourceUrls[0]).toContain("vertexaisearch.cloud.google.com");
  });

  it("does not inflate duplicate normalized sources and preserves support aliases", () => {
    const payload = structured([finding({ findingId: "finding-01", sourceUrls: [] })]);
    const result = normalizeGroundedResearch(
      normalizeInput(payload, {
        webSearchQueries: ["q"],
        groundingChunks: [
          { web: { uri: "https://www.example.com/article/" } },
          { web: { uri: "http://example.com/article?utm_campaign=x" } },
        ],
        groundingSupports: [{ groundingChunkIndices: [1] }],
      }),
    );
    expect(result.sources).toHaveLength(1);
    expect(result.evidence[0]?.sourceIds).toEqual(["src_1"]);
    expect(result.evidence[0]?.sourceUrls).toHaveLength(1);
  });

  it("fails the packet on mixed validity so unsupported evidence never persists", () => {
    const payload = structured([
      finding({ findingId: "finding-01", sourceUrls: [VERTEX_A] }),
      finding({ findingId: "finding-02", sourceUrls: [VERTEX_B] }),
      finding({ findingId: "finding-03", sourceUrls: [YOUTUBE_UNSUPPORTED] }),
    ]);
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["q"],
          groundingChunks: [{ web: { uri: VERTEX_A } }, { web: { uri: VERTEX_B } }],
        }),
      ),
    ).toThrow(/finding-03 references URL not present/);
  });

  it("never treats zero validated sources as successful evidence-complete research", () => {
    const payload = buildMockProviderResearchOutput();
    payload.findings = payload.findings.map((item) => ({ ...item, sourceUrls: [], grounded: true, inference: false }));
    expect(() =>
      normalizeGroundedResearch(
        normalizeInput(payload, {
          webSearchQueries: ["mock query"],
          groundingChunks: [],
        }),
      ),
    ).toThrow(/lacks validated source URLs/);
  });

  it("classifies provider API failure distinctly from grounding validation failure", () => {
    const transport = classifyResearchFailure(new Error("429 rate limit from Gemini"));
    const validation = classifyResearchFailure(
      new Error("Grounded finding finding-01 lacks validated source URLs."),
    );
    expect(transport.classification).toBe("rate_limit");
    expect(isResearchProviderTransportFailure(transport.classification)).toBe(true);
    expect(validation.classification).toBe("evidence_validation_failure");
    expect(isResearchValidationFailure(validation.classification)).toBe(true);
    expect(validation.retryable).toBe(false);
    expect(transport.classification).not.toBe(validation.classification);
  });

  it("maps Founder packet failure from canonical research classification", () => {
    const providerPacket = founderResearchPacketFromFailure({
      failure: failedResearch("provider_unavailable", "Gemini request failed."),
      submission,
    });
    const validationPacket = founderResearchPacketFromFailure({
      failure: failedResearch(
        "evidence_validation_failure",
        "Grounded finding finding-01 lacks validated source URLs.",
      ),
      submission,
    });
    expect(providerPacket.failureCode).toBe("PROVIDER_FAILED");
    expect(validationPacket.failureCode).toBe("RESEARCH_FAILED");
  });

  it("extracts generateContent candidate groundingMetadata including retrievedContext", () => {
    const extracted = extractGroundingMetadata({
      candidates: [
        {
          groundingMetadata: {
            webSearchQueries: ["q"],
            groundingChunks: [{ retrievedContext: { uri: "https://example.com/retrieved" } }],
          },
        },
      ],
    });
    expect(extracted?.groundingChunks?.[0]?.retrievedContext?.uri).toBe("https://example.com/retrieved");
  });

  it("does not treat search_suggestions widget URLs as grounding sources", () => {
    const metadata = buildGroundingMetadataFromInteractionSteps(
      currentFinding01Interaction([]).steps,
      currentFinding01Interaction([]),
    );
    const hosts = (metadata?.groundingChunks ?? []).map((chunk) => {
      try {
        return new URL(chunk.web?.uri ?? "").hostname;
      } catch {
        return "";
      }
    });
    expect(hosts.some((host) => host.includes("w3.org") || host.includes("google.com"))).toBe(false);
  });

  it("preserves ResearchError evidence_validation_failure through classifyResearchFailure", () => {
    const classified = classifyResearchFailure(
      new ResearchError(
        "Grounded finding finding-01 lacks validated source URLs.",
        "evidence_validation_failure",
      ),
    );
    expect(classified.classification).toBe("evidence_validation_failure");
    expect(classified.classification).not.toBe("unknown_provider_failure");
  });
});
