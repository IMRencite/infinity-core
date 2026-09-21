import { describe, it, expect } from "vitest";
import { classifyResearchFailure, ResearchError } from "@/lib/infinity/research/failures";
import { buildGroundingMetadataFromInteractionSteps } from "@/lib/infinity/research/normalization/interaction-grounding";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import { buildMockProviderResearchOutput, buildMockGroundingMetadata } from "@/lib/infinity/research/mock-output";
import { canonicalizeSourceUrl } from "@/lib/infinity/research/normalization/dedupe";
import {
  assessCandidatePoolAdequacy,
  isEvidenceValidationFailure,
  isTechnicalStrategyFailure,
  shouldAttemptPoolRecovery,
} from "@/lib/infinity/opportunity-scanner/pool-adequacy";
import { classifyScannerFailure } from "@/lib/infinity/opportunity-scanner/failures";
import { mapScannerFailureToCycleLevel } from "@/lib/infinity/first-autonomous-venture-cycle/result-semantics";

describe("grounding recovery foundation", () => {
  it("classifies missing provenance as evidence_validation_failure not unknown_provider_failure", () => {
    const classified = classifyResearchFailure(
      new ResearchError(
        "Grounded finding finding_1 lacks validated source URLs.",
        "evidence_validation_failure",
      ),
    );
    expect(classified.classification).toBe("evidence_validation_failure");
    expect(classified.classification).not.toBe("unknown_provider_failure");
  });

  it("extracts vertexaisearch redirect URLs from interaction steps", () => {
    const redirect =
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABC123";
    const metadata = buildGroundingMetadataFromInteractionSteps(
      [
        {
          type: "google_search_call",
          arguments: { queries: ["workflow automation pain"] },
        },
        {
          type: "model_output",
          content: [{ type: "text", text: `See ${redirect} for evidence.` }],
        },
      ],
      { output_text: "{}" },
    );

    expect(metadata?.webSearchQueries).toEqual(["workflow automation pain"]);
    expect(metadata?.groundingChunks?.length).toBeGreaterThan(0);
    expect(metadata?.groundingChunks?.[0]?.web?.uri).toBe(redirect);
  });

  it("accepts grounded findings when provider redirect URLs normalize successfully", () => {
    const redirect =
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABC123?utm_source=x";
    const structured = buildMockProviderResearchOutput();
    structured.findings = [structured.findings[0]!];
    structured.findings[0]!.grounded = true;
    structured.findings[0]!.inference = false;
    structured.findings[0]!.sourceUrls = [redirect];

    const result = normalizeGroundedResearch({
      researchRunId: "run-1",
      organizationId: "org-1",
      missionId: null,
      providerId: "gemini",
      modelId: "gemini-3.5-flash",
      researchObjective: "test",
      inputHash: "hash",
      structured,
      groundingMetadata: {
        webSearchQueries: ["test"],
        groundingChunks: [{ web: { uri: redirect, title: "example.com" } }],
      },
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      groundingUsage: {
        webSearchQueries: ["test"],
        searchQueryCount: 1,
        groundingChunkCount: 1,
        groundingSupportCount: 0,
        groundingInvoked: true,
        searchCostKnown: false,
      },
      estimatedCostUsd: 0.01,
      costUncertainty: "mock",
      latencyMs: 10,
      requestId: "req",
      retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
      rawProviderResponseStored: true,
    });

    expect(result.evidence[0]?.grounded).toBe(true);
    expect(result.evidence[0]?.sourceUrls[0]).toContain("vertexaisearch.cloud.google.com");
    expect(canonicalizeSourceUrl(redirect)).toContain("vertexaisearch.cloud.google.com");
  });

  it("rejects grounded findings with no provenance at all", () => {
    const structured = buildMockProviderResearchOutput();
    structured.findings[0]!.grounded = true;
    structured.findings[0]!.inference = false;
    structured.findings[0]!.sourceUrls = [];

    expect(() =>
      normalizeGroundedResearch({
        researchRunId: "run-1",
        organizationId: "org-1",
        missionId: null,
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        researchObjective: "test",
        inputHash: "hash",
        structured,
        groundingMetadata: { groundingChunks: [], webSearchQueries: ["mock query"] },
        tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        groundingUsage: {
          webSearchQueries: ["mock query"],
          searchQueryCount: 1,
          groundingChunkCount: 0,
          groundingSupportCount: 0,
          groundingInvoked: true,
          searchCostKnown: false,
        },
        estimatedCostUsd: 0.01,
        costUncertainty: "mock",
        latencyMs: 10,
        requestId: "req",
        retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
        rawProviderResponseStored: true,
      }),
    ).toThrow(/validated source URLs/);
  });

  it("rejects model-only URLs when interactions search omits grounding chunks", () => {
    const structured = buildMockProviderResearchOutput();
    structured.findings = [structured.findings[0]!];
    structured.findings[0]!.grounded = true;
    structured.findings[0]!.inference = false;
    structured.findings[0]!.sourceUrls = ["https://firstpagesage.com/reports/saas-cac-report/"];

    expect(() =>
      normalizeGroundedResearch({
        researchRunId: "run-1",
        organizationId: "org-1",
        missionId: null,
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        researchObjective: "test",
        inputHash: "hash",
        structured,
        groundingMetadata: { groundingChunks: [], webSearchQueries: ["saas cac benchmark"] },
        tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        groundingUsage: {
          webSearchQueries: ["saas cac benchmark"],
          searchQueryCount: 1,
          groundingChunkCount: 0,
          groundingSupportCount: 0,
          groundingInvoked: true,
          searchCostKnown: false,
        },
        estimatedCostUsd: 0.01,
        costUncertainty: "mock",
        latencyMs: 10,
        requestId: "req",
        retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
        rawProviderResponseStored: true,
      }),
    ).toThrow(/references URL not present in grounding metadata/);
  });

  it("assesses pool adequacy thresholds", () => {
    expect(assessCandidatePoolAdequacy(10)).toBe("ADEQUATE");
    expect(assessCandidatePoolAdequacy(6)).toBe("LIMITED");
    expect(assessCandidatePoolAdequacy(3)).toBe("THIN");
  });

  it("triggers bounded pool recovery only for technical thinness", () => {
    expect(
      shouldAttemptPoolRecovery({
        candidateCount: 3,
        technicalStrategyFailures: ["market_pain_discovery: lacks validated source URLs"],
        researchCallsRemaining: 2,
        poolRecoveryAttempted: false,
      }),
    ).toBe(true);

    expect(
      shouldAttemptPoolRecovery({
        candidateCount: 3,
        technicalStrategyFailures: [],
        researchCallsRemaining: 2,
        poolRecoveryAttempted: false,
      }),
    ).toBe(false);

    expect(isTechnicalStrategyFailure("market_pain_discovery: lacks validated source URLs")).toBe(true);
    expect(isEvidenceValidationFailure("Grounded finding x lacks validated source URLs.")).toBe(true);
  });

  it("maps scanner evidence validation without weakening LEVEL_4 verification semantics", () => {
    const scannerFailure = classifyScannerFailure(
      new Error("Grounded finding finding_1 lacks validated source URLs."),
    );
    expect(scannerFailure.classification).toBe("evidence_validation_failure");
    expect(mapScannerFailureToCycleLevel("evidence_validation_failure")).toBe("LEVEL_0_SYSTEM_FAILURE");
    expect(mapScannerFailureToCycleLevel("NO_GO_MARKET_DECISION" as never)).toBe("LEVEL_0_SYSTEM_FAILURE");
  });
});
