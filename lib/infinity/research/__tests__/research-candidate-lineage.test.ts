import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalizeResearchCandidateId, readCandidateIdFromStructuredResult } from "../candidate-lineage";
import { buildMockGroundingMetadata, buildMockProviderResearchOutput } from "../mock-output";
import { normalizeGroundedResearch } from "../normalization/evidence";
import { mapCompletedResearchRunToResult, mapFailedResearchRunToResult } from "../persistence";
import type { ResearchRunRow } from "../persistence";

const CANDIDATE_A = "11111111-1111-4111-8111-111111111111";

function normalizeWithCandidate(candidateId: string | null | undefined) {
  return normalizeGroundedResearch({
    researchRunId: "run-a",
    organizationId: "org-1",
    missionId: null,
    providerId: "mock",
    modelId: "mock-model",
    researchObjective: "candidate-scoped research",
    inputHash: "hash",
    structured: buildMockProviderResearchOutput(),
    groundingMetadata: buildMockGroundingMetadata(),
    tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    groundingUsage: {
      webSearchQueries: ["mock query"],
      searchQueryCount: 1,
      groundingChunkCount: 3,
      groundingSupportCount: 1,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "mock",
    latencyMs: 10,
    requestId: "mock_req",
    retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
    rawProviderResponseStored: true,
    candidateId,
  });
}

function runRow(overrides: Partial<ResearchRunRow> = {}): ResearchRunRow {
  return {
    id: "run-a",
    organization_id: "org-1",
    mission_id: null,
    provider: "mock",
    model: "mock-model",
    prompt_version: "v1",
    schema_version: "v1",
    research_objective: "objective",
    input_hash: "hash",
    structured_result: { candidateId: CANDIDATE_A },
    raw_provider_response: {},
    grounding_metadata: {},
    normalized_evidence: {},
    normalized_sources: {},
    token_usage: {},
    grounding_usage: {},
    estimated_cost: null,
    cost_uncertainty: null,
    latency_ms: null,
    request_id: null,
    retry_count: 0,
    status: "completed",
    validation_status: "validated",
    failure_classification: null,
    error_message: null,
    correlation_id: null,
    idempotency_key: "key",
    started_at: null,
    completed_at: null,
    failed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("research candidate lineage", () => {
  it("propagates OpportunityCandidate.id from input through packet result", () => {
    const result = normalizeWithCandidate(CANDIDATE_A);
    expect(result.candidateId).toBe(CANDIDATE_A);
    expect(result.researchRunId).toBe("run-a");
    expect(result.organizationId).toBe("org-1");
  });

  it("keeps independent research untagged", () => {
    expect(normalizeWithCandidate(undefined).candidateId).toBeNull();
    expect(canonicalizeResearchCandidateId(undefined)).toBeNull();
  });

  it("rejects cycle harness identifiers as candidate lineage", () => {
    expect(canonicalizeResearchCandidateId("Autonomous Venture Cycle")).toBeNull();
    expect(canonicalizeResearchCandidateId("favc1-cycle:cycle-1")).toBeNull();
    expect(canonicalizeResearchCandidateId(CANDIDATE_A)).toBe(CANDIDATE_A);
  });

  it("reads candidate lineage from persisted structured_result", () => {
    const completed = mapCompletedResearchRunToResult(
      runRow({
        structured_result: {
          researchRunId: "run-a",
          organizationId: "org-1",
          candidateId: CANDIDATE_A,
          summary: "packet",
        } as never,
      }),
    );
    expect(completed.candidateId).toBe(CANDIDATE_A);
    const failed = mapFailedResearchRunToResult(runRow(), "unknown_provider_failure", "failed");
    expect(failed.candidateId).toBe(CANDIDATE_A);
    expect(readCandidateIdFromStructuredResult({ candidateId: CANDIDATE_A })).toBe(CANDIDATE_A);
  });

  it("passes the exact OpportunityCandidate id through monetization handoff", () => {
    const monetization = readFileSync(join(process.cwd(), "lib/infinity/monetization-engine/run.ts"), "utf8");
    expect(monetization).toMatch(/candidateId:\s*candidate\.id/);
    expect(monetization).not.toContain("Autonomous Venture Cycle");
    expect(monetization).not.toContain("favc1-cycle:");
  });
});
