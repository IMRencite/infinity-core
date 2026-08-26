import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { convertFounderIdeaToCandidate } from "../convert";
import { markDanglingCandidate, resolveFounderCandidate } from "../candidate-repair";
import { archiveHistoricalGrade } from "../grade-history";
import { reanalyzeFounderIdea, reanalyzeFounderIdeaWithCanonicalResearch } from "../reanalyze";
import { analyzeFounderIdea } from "../analyze";
import { persistFounderIdea, FOUNDER_DISCOVERY_LINEAGE_CONFLICT, FOUNDER_CANDIDATE_LINEAGE_CONFLICT } from "../persist";
import {
  founderDiscoveryIdempotencyKey,
  founderResearchAttemptKey,
  derivedFounderReanalysisAttempt,
  parseFounderReanalysisAttemptField,
} from "../idempotency";
import { founderDedupKey, founderMergeGroupKey } from "../candidate-identity";
import { loadFounderIdeaStoreForOrg } from "../hq/load";
import { buildFounderIdeaArtifacts, listFounderIdeas } from "../hq/artifacts";
import { buildFounderResearchSeed } from "../research-seed";
import { buildCanonicalResearchRequest } from "../research-request";
import { founderResearchPacketFromResult } from "../research-from-canonical";
import { evaluateEvidenceReadiness } from "../readiness";
import { coverageFromPacket, layersFromPacket } from "../research-packet";
import { monetizeFromResearchPacket } from "../monetization-from-research";
import { categorySupportedIdeaUnprovenPacket, workflowSaasIntegrityPacket } from "../integrity-fixtures";
import { founderIdeaReanalysisConstraintDrift, founderIdeaSqlV1Drift, founderIdeaStatusesMatchProposedSql } from "../status-compat";
import { FOUNDER_IDEA_STATUSES, FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1 } from "../constants";
import { isSharedConservativeFallback } from "../convert";
import { conservativeScoringInputs } from "../convert";
import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import type { FounderIdeaSubmission } from "../types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import type { ResearchResult } from "@/lib/infinity/research/types";

const CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const CMS_CANDIDATE = "6f1eb4e3-14d3-405a-b016-ad978222a36b";
const ART_ID = "50f883a9-08e9-4315-9d19-49917382d77f";
const ART_CANDIDATE = "bfe032f6-7021-4f69-983c-019ea48e448e";

function historicalSubmission(id: string, candidateId: string, title: string): FounderIdeaSubmission {
  return {
    id,
    organizationId: ORG_A,
    submittedByUserId: "user-a",
    title,
    description: `${title} historical description`,
    targetCustomer: "Historical customer",
    problem: "Historical problem",
    proposedSolution: null,
    businessModelHypothesis: "subscription",
    pricingHypothesis: "$49/mo",
    competitors: title.includes("CMS") ? "Dealerspike, Hibu" : null,
    notes: null,
    desiredMode: "GRADE_ONLY",
    status: "HELD",
    opportunityCandidateId: candidateId,
    infinityDecision: "HOLD",
    founderDecision: "HOLD",
    origin: "FOUNDER_SUBMITTED",
    failureCode: null,
    needsReanalysis: true,
    researchRunId: null,
    analyzedByUserId: null,
    approvedByUserId: null,
    idempotencyKey: `hist:${id}`,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  };
}

function seedHistoricalFallback(store: FounderIdeaStore, submission: FounderIdeaSubmission): void {
  store.submissions.set(submission.id, submission);
  const scores = calculateDeterministicScores(conservativeScoringInputs(false));
  store.grades.set(submission.id, {
    opportunityScores: scores,
    selectionScore: 48.94,
    validationScore: 50,
    monetizationScore: 0,
    fatalAssumptionRisk: 0.5,
    expectedRoi: 0,
    estimatedCapitalRequired: null,
    buildReadiness: "HOLD",
    opportunityQuality: 43.61,
    evaluation: null,
    scoreIntegrity: "FALLBACK_HISTORICAL",
    readyForDecision: false,
    researchRunId: null,
    monetizationRunId: null,
    provenance: [],
    coverage: null,
    monetizationLayers: null,
  });
}

function memoryAdmin() {
  const rows: Record<string, Record<string, unknown>[]> = {
    opportunity_discovery_runs: [],
    opportunity_candidates: [],
    founder_idea_submissions: [],
    founder_decision_overrides: [],
  };

  function applyFilters(
    table: string,
    filters: Array<{ kind: "eq"; column: string; value: string } | { kind: "in"; column: string; values: string[] }>,
  ) {
    return (rows[table] ?? []).filter((row) =>
      filters.every((filter) => {
        if (filter.kind === "in") return filter.values.includes(String(row[filter.column] ?? ""));
        return String(row[filter.column] ?? "") === filter.value;
      }),
    );
  }

  return {
    rows,
    from(table: string) {
      return {
        select() {
          const filters: Array<
            { kind: "eq"; column: string; value: string } | { kind: "in"; column: string; values: string[] }
          > = [];
          const query = {
            eq(column: string, value: string) {
              filters.push({ kind: "eq", column, value });
              return query;
            },
            in(column: string, values: string[]) {
              filters.push({ kind: "in", column, values });
              return query;
            },
            maybeSingle() {
              return Promise.resolve({ data: applyFilters(table, filters)[0] ?? null, error: null });
            },
            then(onFulfilled: (value: { data: Record<string, unknown>[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
              return Promise.resolve({ data: applyFilters(table, filters), error: null }).then(onFulfilled, onRejected);
            },
          };
          return query;
        },
        upsert: async (row: Record<string, unknown>) => {
          rows[table] = rows[table] ?? [];
          if (table === "opportunity_discovery_runs") {
            const collision = rows[table].find(
              (item) =>
                item.organization_id === row.organization_id &&
                item.idempotency_key === row.idempotency_key &&
                item.id !== row.id,
            );
            if (collision) {
              return {
                data: null,
                error: {
                  message: `duplicate key value violates unique constraint "opportunity_discovery_runs_org_idempotency_uidx"`,
                },
              };
            }
          }
          if (table === "opportunity_candidates") {
            const collision = rows[table].find(
              (item) =>
                item.organization_id === row.organization_id &&
                item.dedup_key === row.dedup_key &&
                item.id !== row.id,
            );
            if (collision) {
              return {
                data: null,
                error: {
                  message: `duplicate key value violates unique constraint "opportunity_candidates_org_dedup_key_uidx"`,
                },
              };
            }
          }
          const idx = rows[table].findIndex((item) => item.id === row.id);
          if (idx >= 0) rows[table][idx] = { ...rows[table][idx], ...row };
          else rows[table].push(row);
          return { data: row, error: null };
        },
      };
    },
  };
}

function mockResult(submission: FounderIdeaSubmission, extra?: Partial<ResearchResult>): ResearchResult {
  return {
    researchRunId: "11111111-1111-1111-1111-111111111111",
    organizationId: submission.organizationId,
    candidateId: submission.opportunityCandidateId,
    missionId: null,
    providerId: "mock",
    modelId: "mock-model",
    researchObjective: "test",
    inputHash: "hash",
    generatedAt: new Date().toISOString(),
    summary: "Mock grounded research",
    findings: [],
    evidence: [
      {
        evidenceId: "ev-demand",
        findingId: "f-demand",
        claim: "Operators already pay for this workflow.",
        observedSignal: "search demand",
        signalType: "search_demand",
        evidenceType: "direct_grounded",
        grounded: true,
        sourceIds: ["src-1"],
        sourceUrls: ["https://example.com/pricing"],
        relevance: "positive",
        confidence: 0.7,
        sourceDate: null,
        limitations: [],
        providerConfidence: 0.7,
      },
      {
        evidenceId: "ev-price",
        findingId: "f-price",
        claim: "Comparable products publish monthly seat prices.",
        observedSignal: "pricing pages",
        signalType: "pricing_pain",
        evidenceType: "direct_grounded",
        grounded: true,
        sourceIds: ["src-1"],
        sourceUrls: ["https://example.com/pricing"],
        relevance: "positive",
        confidence: 0.65,
        sourceDate: null,
        limitations: [],
        providerConfidence: 0.65,
      },
    ],
    sources: [
      {
        sourceId: "src-1",
        url: "https://example.com/pricing",
        canonicalUrl: "https://example.com/pricing",
        title: "Pricing",
        domain: "example.com",
        retrievedAt: new Date().toISOString(),
        providerChunkIndex: 0,
      },
    ],
    limitations: [],
    requiresMoreResearch: true,
    groundedStatus: true,
    validationStatus: "validated",
    tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    groundingUsage: {
      webSearchQueries: ["test"],
      searchQueryCount: 1,
      groundingChunkCount: 1,
      groundingSupportCount: 1,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "mock",
    latencyMs: 1,
    requestId: "mock",
    retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
    status: "completed",
    provenance: {
      schemaVersion: "grounded_research_v1",
      promptVersion: "grounded_research_prompt_v1",
      rawProviderResponseStored: false,
      normalizationApplied: true,
    },
    completedAt: new Date().toISOString(),
    ...extra,
  };
}

describe("founder idea lab real reanalysis integration v1", () => {
  it("repairs Infinity CMS dangling candidate without minting a new id", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    markDanglingCandidate(store, submission.id);
    expect(store.candidates.size).toBe(0);
    const candidate = resolveFounderCandidate(store, submission);
    expect(candidate.id).toBe(CMS_CANDIDATE);
    expect(submission.opportunityCandidateId).toBe(CMS_CANDIDATE);
    expect(store.candidateRepair.get(submission.id)).toBe("repaired");
  });

  it("repairs Art Bay dangling candidate without minting a new id", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(ART_ID, ART_CANDIDATE, "Art Bay Code Name");
    store.submissions.set(submission.id, submission);
    markDanglingCandidate(store, submission.id);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    expect(candidate.id).toBe(ART_CANDIDATE);
    expect(store.candidates.get(ART_CANDIDATE)?.id).toBe(ART_CANDIDATE);
  });

  it("preserves historical 43.61 HOLD when mocked reanalysis writes a new current grade", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    expect(store.grades.get(submission.id)?.opportunityQuality).toBe(43.61);
    const { previousGrade, grade } = await reanalyzeFounderIdeaWithCanonicalResearch(
      store,
      submission,
      async () => ({
        ok: true,
        result: mockResult(submission),
      }),
    );
    expect(previousGrade?.opportunityQuality).toBe(43.61);
    expect(store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);
    expect(store.evaluationHistory.get(submission.id)?.[0]?.decision).toBe("HOLD");
    expect(store.evaluationHistory.get(submission.id)?.[0]?.scoreIntegrity).toBe("FALLBACK_HISTORICAL");
    expect(grade?.opportunityQuality).not.toBe(43.61);
    expect(isSharedConservativeFallback(grade?.opportunityScores?.scoringInputs)).toBe(false);
  });

  it("maps founder seed to canonical research request and ResearchRun to FounderResearchPacket", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    convertFounderIdeaToCandidate(store, submission);
    const seed = buildFounderResearchSeed(submission, submission.opportunityCandidateId);
    const request = buildCanonicalResearchRequest(seed);
    expect(request.candidateId).toBe(CMS_CANDIDATE);
    expect(request.organizationId).toBe(ORG_A);
    expect(request.idempotencyKey).toBe(`founder-idea-research:${CMS_ID}:${CMS_CANDIDATE}:v1`);
    expect(request.runPurpose).toBe("FOUNDER_IDEA_REANALYSIS");
    expect(request.requireSourceBackedFindings).toBe(true);
    expect(seed.founderStatementsAreHypotheses).toBe(true);
    const packet = founderResearchPacketFromResult({ result: mockResult(submission), submission });
    expect(packet.researchRunId).toBe("11111111-1111-1111-1111-111111111111");
    expect(packet.findings.some((item) => item.evidenceId === "ev-demand")).toBe(true);
    expect(packet.findings.every((item) => item.claim.length > 0)).toBe(true);
  });

  it("provider failure keeps historical grade and does not create a final score or 43.61 fallback", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(ART_ID, ART_CANDIDATE, "Art Bay Code Name");
    seedHistoricalFallback(store, submission);
    const { grade } = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, async () => ({
      ok: false,
      failure: {
        researchRunId: "22222222-2222-2222-2222-222222222222",
        organizationId: ORG_A,
        candidateId: ART_CANDIDATE,
        researchObjective: "x",
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        inputHash: "h",
        status: "failed",
        failureClassification: "unknown_provider_failure",
        message: "provider failed",
        tokenUsage: null,
        estimatedCostUsd: null,
        latencyMs: null,
        requestId: null,
        failedAt: new Date().toISOString(),
      },
    }));
    expect(store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);
    expect(grade?.opportunityQuality).toBeNull();
    expect(grade?.scoreIntegrity).toBe("INCOMPLETE");
    expect(submission.infinityDecision).toBeNull();
    expect(submission.status).toBe("RESEARCH_INCOMPLETE");
    expect(isSharedConservativeFallback(grade?.opportunityScores?.scoringInputs)).toBe(false);
  });

  it("TypeScript statuses match the proposed reanalysis SQL constraint and drift against live V1 SQL", () => {
    expect(founderIdeaSqlV1Drift().sort()).toEqual([
      "INSUFFICIENT_EVIDENCE",
      "NEEDS_REANALYSIS",
      "RESEARCH_INCOMPLETE",
    ]);
    expect(founderIdeaReanalysisConstraintDrift()).toEqual([]);
    expect(founderIdeaStatusesMatchProposedSql()).toBe(true);
    expect(FOUNDER_IDEA_STATUSES).toHaveLength(FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1.length);
    expect(FOUNDER_IDEA_STATUSES).toHaveLength(15);
  });

  it("category monetization reaches the engine without coercing missing unit economics to zero", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    const packet = categorySupportedIdeaUnprovenPacket(submission.id, candidate.id);
    const monetization = monetizeFromResearchPacket({ candidate, packet });
    expect(monetization).not.toBeNull();
    expect(monetization?.monetizationScore).not.toBe(0);
    expect(packet.monetizationLayers.ideaSpecific).toBe("UNPROVEN");
    expect(packet.monetizationLayers.unitEconomics).toBe("UNKNOWN");
  });

  it("incomplete evidence is not READY_FOR_DECISION and sufficient packet may be ready", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    convertFounderIdeaToCandidate(store, submission);
    const incomplete = categorySupportedIdeaUnprovenPacket(submission.id, submission.opportunityCandidateId!);
    const incompleteCoverage = coverageFromPacket(incomplete);
    const incompleteLayers = layersFromPacket(incomplete);
    const incompleteMonetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet: incomplete,
    });
    expect(
      evaluateEvidenceReadiness({
        packet: incomplete,
        coverage: incompleteCoverage,
        monetization: incompleteMonetization,
        layers: incompleteLayers,
      }).readyForDecision,
    ).toBe(false);

    const sufficient = workflowSaasIntegrityPacket(submission.id, submission.opportunityCandidateId!);
    const ready = evaluateEvidenceReadiness({
      packet: sufficient,
      coverage: coverageFromPacket(sufficient),
      monetization: monetizeFromResearchPacket({
        candidate: store.candidates.get(submission.opportunityCandidateId!)!,
        packet: sufficient,
      }),
      layers: layersFromPacket(sufficient),
    });
    expect(ready.readyForDecision).toBe(true);
  });

  it("HQ does not invent a research packet and shows archived historical grade separately", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    expect(buildFounderIdeaArtifacts(store, ORG_A).research_department ?? []).toEqual([]);
    await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, async () => ({
      ok: true,
      result: mockResult(submission),
    }));
    const rows = listFounderIdeas(store, ORG_A);
    expect(rows[0]?.historicalScore).toBe("43.61");
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    const research = artifacts.research_department ?? [];
    expect(research[0]?.metadata.researchRunId).toBeTruthy();
    expect(research[0]?.metadata.incomplete).toBe(true);
    expect(research[0]?.state).toBe("CREATING");
  });

  it("repeated reanalysis does not duplicate the historical archive or mint a second candidate", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    archiveHistoricalGrade(store, submission);
    archiveHistoricalGrade(store, submission);
    expect(store.evaluationHistory.get(submission.id)).toHaveLength(1);
    await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, async () => ({
      ok: true,
      result: mockResult(submission),
    }));
    await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, async () => ({
      ok: true,
      result: mockResult(submission),
    }));
    const historical = (store.evaluationHistory.get(submission.id) ?? []).filter(
      (snapshot) => snapshot.opportunityScore === 43.61 && snapshot.scoreIntegrity === "FALLBACK_HISTORICAL",
    );
    expect(historical).toHaveLength(1);
    expect(store.candidates.size).toBe(1);
    expect([...store.candidates.keys()]).toEqual([CMS_CANDIDATE]);
  });

  it("persisting a new founder idea writes the candidate row so future dangling IDs are impossible", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", null as unknown as string, "New Idea");
    submission.opportunityCandidateId = null;
    store.submissions.set(submission.id, submission);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    const admin = memoryAdmin();
    const persisted = await persistFounderIdea(admin as never, submission, null, null, candidate, []);
    expect(persisted.ok).toBe(true);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(candidate.id);
    expect(admin.rows.founder_idea_submissions[0]?.opportunity_candidate_id).toBe(candidate.id);
    const loaded = await loadFounderIdeaStoreForOrg(admin as never, ORG_A);
    expect(loaded.candidateRepair.get(submission.id)).not.toBe("dangling");
  });

  it("sync reanalyze without research still archives history and does not regenerate 43.61 as a live score", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(ART_ID, ART_CANDIDATE, "Art Bay Code Name");
    seedHistoricalFallback(store, submission);
    const { grade } = reanalyzeFounderIdea(store, submission, {});
    expect(store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);
    expect(grade?.scoreIntegrity).toBe("INCOMPLETE");
    expect(grade?.opportunityQuality).not.toBe(43.61);
  });

  it("sufficient mocked packet may become READY_FOR_DECISION", () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    convertFounderIdeaToCandidate(store, submission);
    const fromPacket = analyzeFounderIdea(store, submission, {
      researchPacket: workflowSaasIntegrityPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(fromPacket.grade?.readyForDecision).toBe(true);
    expect(fromPacket.grade?.evaluation).not.toBeNull();
  });
});

const CMS_DISCOVERY = "9142bf7d-c9c8-4087-b231-59626a5530f6";
const ART_DISCOVERY = "28b647a5-8f5e-44bc-930f-9d66c3bdff99";
const CMS_EXISTING = "091f50e7-feb7-4dae-aba7-0e478a736ba4";
const ART_EXISTING = "b8e298e5-aa14-4c57-afa8-0fcd3641ba40";

function seedExistingDiscovery(
  admin: ReturnType<typeof memoryAdmin>,
  submissionId: string,
  discoveryId: string,
  lineageId = submissionId,
) {
  admin.rows.opportunity_discovery_runs.push({
    id: discoveryId,
    organization_id: ORG_A,
    status: "completed",
    idempotency_key: founderDiscoveryIdempotencyKey(submissionId),
    correlation_id: lineageId,
    search_scope: { origin: "FOUNDER_SUBMITTED", founderIdeaSubmissionId: lineageId },
  });
}

function seedExistingCandidate(
  admin: ReturnType<typeof memoryAdmin>,
  submission: FounderIdeaSubmission,
  candidateId: string,
  discoveryId: string,
  overrides: Record<string, unknown> = {},
) {
  admin.rows.opportunity_candidates.push({
    id: candidateId,
    organization_id: submission.organizationId,
    discovery_run_id: discoveryId,
    title: submission.title,
    summary: submission.description,
    problem: submission.problem,
    target_customer: submission.targetCustomer,
    market: "UNSPECIFIED",
    business_model_candidates: [],
    revenue_mechanism_candidates: [],
    demand_evidence: [],
    market_evidence: [],
    competition_evidence: [],
    monetization_evidence: [],
    distribution_evidence: [],
    buildability_evidence: [],
    risks: [],
    unknowns: [],
    research_sources: [],
    research_run_ids: [],
    discovery_strategies: ["market_pain_discovery"],
    dedup_key: founderDedupKey(submission.organizationId, submission.title, submission.description),
    merge_group_key: founderMergeGroupKey(submission.id),
    opportunity_score: null,
    rank_position: 1,
    created_at: "2026-08-25T04:46:28.933Z",
    updated_at: "2026-08-25T04:46:28.933Z",
    ...overrides,
  });
}

function inMemoryCanonicalCandidate(
  submission: FounderIdeaSubmission,
  candidateId: string,
  discoveryId: string,
): OpportunityCandidate {
  return {
    id: candidateId,
    organizationId: submission.organizationId,
    discoveryRunId: discoveryId,
    title: submission.title,
    summary: submission.description,
    problem: submission.problem ?? "",
    targetCustomer: submission.targetCustomer ?? "UNSPECIFIED",
    market: "UNSPECIFIED",
    businessModelCandidates: [],
    revenueMechanismCandidates: [],
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
    discoveryStrategies: ["market_pain_discovery"],
    dedupKey: founderDedupKey(submission.organizationId, submission.title, submission.description),
    mergeGroupKey: founderMergeGroupKey(submission.id),
    opportunityScore: null,
    rankPosition: 1,
    scores: null,
    createdAt: "2026-08-25T04:46:28.933Z",
    updatedAt: "2026-08-25T04:46:28.933Z",
  };
}

function canonicalReplayExecutor(submission: FounderIdeaSubmission) {
  const completed = new Map<string, { ok: true; result: ResearchResult }>();
  let providerCalls = 0;
  const keys: string[] = [];
  return {
    keys,
    get providerCalls() {
      return providerCalls;
    },
    async run(input: { idempotencyKey: string }) {
      keys.push(input.idempotencyKey);
      const existing = completed.get(input.idempotencyKey);
      if (existing) return existing;
      providerCalls += 1;
      const output = {
        ok: true as const,
        result: mockResult(submission, {
          researchRunId: `11111111-1111-1111-1111-11111111111${providerCalls}`,
        }),
      };
      completed.set(input.idempotencyKey, output);
      return output;
    },
  };
}

describe("founder idea reanalysis idempotency v1", () => {
  it("same-attempt retry reuses one discovery row and the same research key", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    const executor = canonicalReplayExecutor(submission);
    const first = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    const mintedId = store.candidates.get(CMS_CANDIDATE)!.discoveryRunId;
    const firstPersist = await persistFounderIdea(
      admin as never,
      first.submission,
      first.grade,
      null,
      store.candidates.get(first.submission.opportunityCandidateId ?? "") ?? null,
      store.evaluationHistory.get(submission.id) ?? [],
    );
    const second = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    const secondPersist = await persistFounderIdea(
      admin as never,
      second.submission,
      second.grade,
      null,
      store.candidates.get(second.submission.opportunityCandidateId ?? "") ?? null,
      store.evaluationHistory.get(submission.id) ?? [],
    );
    expect(firstPersist.ok).toBe(true);
    expect(secondPersist.ok).toBe(true);
    expect(admin.rows.opportunity_discovery_runs).toHaveLength(1);
    expect(admin.rows.opportunity_discovery_runs[0]?.id).toBe(CMS_DISCOVERY);
    expect(store.candidates.get(CMS_CANDIDATE)?.discoveryRunId).toBe(CMS_DISCOVERY);
    expect(mintedId).not.toBe(CMS_DISCOVERY);
    expect(executor.keys).toEqual([
      founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 1 }),
      founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 1 }),
    ]);
    expect(executor.providerCalls).toBe(1);
    expect(store.evaluationHistory.get(submission.id)?.filter((row) => row.opportunityScore === 43.61)).toHaveLength(1);
    expect(parseFounderReanalysisAttemptField("1")).toEqual({ ok: true, attempt: 1 });
  });

  it("new explicit reanalysis creates a new research attempt without colliding discovery", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    const admin = memoryAdmin();
    const executor = canonicalReplayExecutor(submission);
    await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    await persistFounderIdea(
      admin as never,
      submission,
      store.grades.get(submission.id) ?? null,
      null,
      store.candidates.get(CMS_CANDIDATE) ?? null,
      store.evaluationHistory.get(submission.id) ?? [],
    );
    const second = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 2,
    });
    const persisted = await persistFounderIdea(
      admin as never,
      second.submission,
      second.grade,
      null,
      store.candidates.get(CMS_CANDIDATE) ?? null,
      store.evaluationHistory.get(submission.id) ?? [],
    );
    expect(persisted.ok).toBe(true);
    expect(admin.rows.opportunity_discovery_runs).toHaveLength(1);
    expect(executor.keys).toEqual([
      founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 1 }),
      founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 2 }),
    ]);
    expect(executor.providerCalls).toBe(2);
    expect(store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);
    expect(store.evaluationHistory.get(submission.id)?.[0]?.decision).toBe("HOLD");
    expect(listFounderIdeas(store, ORG_A)[0]?.reanalysisAttempt).toBe(3);
  });

  it("Infinity CMS and Art Bay never share discovery or research keys", () => {
    expect(founderDiscoveryIdempotencyKey(CMS_ID)).toBe(`founder-idea-discovery:${CMS_ID}`);
    expect(founderDiscoveryIdempotencyKey(ART_ID)).toBe(`founder-idea-discovery:${ART_ID}`);
    expect(founderDiscoveryIdempotencyKey(CMS_ID)).not.toBe(founderDiscoveryIdempotencyKey(ART_ID));
    const cmsResearch = founderResearchAttemptKey({
      submissionId: CMS_ID,
      candidateId: CMS_CANDIDATE,
      attempt: 1,
    });
    const artResearch = founderResearchAttemptKey({
      submissionId: ART_ID,
      candidateId: ART_CANDIDATE,
      attempt: 1,
    });
    expect(cmsResearch).toBe(`founder-idea-research:${CMS_ID}:${CMS_CANDIDATE}:v1`);
    expect(artResearch).toBe(`founder-idea-research:${ART_ID}:${ART_CANDIDATE}:v1`);
    expect(cmsResearch).not.toBe(artResearch);
    const cmsSeed = buildFounderResearchSeed(historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS"), CMS_CANDIDATE, 1);
    const artSeed = buildFounderResearchSeed(historicalSubmission(ART_ID, ART_CANDIDATE, "Art Bay Code Name"), ART_CANDIDATE, 1);
    expect(buildCanonicalResearchRequest(cmsSeed).idempotencyKey).not.toBe(
      buildCanonicalResearchRequest(artSeed).idempotencyKey,
    );
  });

  it("conflicting existing discovery lineage fails closed", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    store.submissions.set(submission.id, submission);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY, ART_ID);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, candidate, []);
    expect(persisted.ok).toBe(false);
    expect(persisted.error).toBe(FOUNDER_DISCOVERY_LINEAGE_CONFLICT);
    expect(admin.rows.opportunity_discovery_runs).toHaveLength(1);
    expect(admin.rows.opportunity_discovery_runs[0]?.id).toBe(CMS_DISCOVERY);
    expect(admin.rows.opportunity_candidates).toHaveLength(0);
    expect(admin.rows.founder_idea_submissions).toHaveLength(0);
  });

  it("partial retry after discovery creation remaps a new candidate discovery UUID onto the existing row", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    const firstStore = new FounderIdeaStore();
    firstStore.submissions.set(submission.id, { ...submission });
    markDanglingCandidate(firstStore, submission.id);
    const firstCandidate = convertFounderIdeaToCandidate(firstStore, firstStore.submissions.get(submission.id)!);
    expect(firstCandidate.discoveryRunId).not.toBe(CMS_DISCOVERY);
    const firstPersist = await persistFounderIdea(
      admin as never,
      firstStore.submissions.get(submission.id)!,
      null,
      null,
      firstCandidate,
      [],
    );
    expect(firstPersist.ok).toBe(true);
    expect(firstCandidate.discoveryRunId).toBe(CMS_DISCOVERY);
    expect(admin.rows.opportunity_discovery_runs).toHaveLength(1);

    const retryStore = new FounderIdeaStore();
    const retrySubmission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    retryStore.submissions.set(retrySubmission.id, retrySubmission);
    markDanglingCandidate(retryStore, retrySubmission.id);
    const retryCandidate = convertFounderIdeaToCandidate(retryStore, retrySubmission);
    expect(retryCandidate.discoveryRunId).not.toBe(CMS_DISCOVERY);
    const retryPersist = await persistFounderIdea(admin as never, retrySubmission, null, null, retryCandidate, []);
    expect(retryPersist.ok).toBe(true);
    expect(retryCandidate.discoveryRunId).toBe(CMS_DISCOVERY);
    expect(admin.rows.opportunity_discovery_runs).toHaveLength(1);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.discovery_run_id).toBe(CMS_DISCOVERY);
  });

  it("Reanalyze UI posts a durable analysisAttempt so framework retries keep the same identity", () => {
    const page = readFileSync(join(process.cwd(), "components/dashboard/founder-ideas/founder-idea-lab.tsx"), "utf8");
    const action = readFileSync(join(process.cwd(), "app/dashboard/founder-ideas/actions.ts"), "utf8");
    expect(page).toContain('name="analysisAttempt"');
    expect(page).toContain("selectedRow?.reanalysisAttempt");
    expect(action).toContain("parseFounderReanalysisAttemptField");
    expect(action).toContain("analysisAttempt: parsedAttempt.attempt");
    expect(action).toMatch(/FOUNDER_IDEA_NOT_FOUND[\s\S]*reanalyzeFounderIdeaWithCanonicalResearch/);
    expect(action).not.toMatch(/convertFounderIdeaToCandidate\(store, existing\);\s*const result = await reanalyzeFounderIdeaWithCanonicalResearch/);
    expect(page).not.toMatch(/Date\.now\(\)/);
    expect(action).not.toMatch(/Date\.now\(\)/);
    expect(ART_DISCOVERY).not.toBe(CMS_DISCOVERY);
  });
});

describe("founder idea candidate identity reconciliation v1", () => {
  it("reuses a compatible existing candidate and does not insert the dangling UUID", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const store = new FounderIdeaStore();
    store.submissions.set(submission.id, submission);
    markDanglingCandidate(store, submission.id);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    seedExistingCandidate(admin, submission, CMS_EXISTING, CMS_DISCOVERY);
    const minted = convertFounderIdeaToCandidate(store, submission);
    expect(minted.id).toBe(CMS_CANDIDATE);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, minted, []);
    expect(persisted.ok).toBe(true);
    expect(persisted.error).toBeUndefined();
    expect(submission.opportunityCandidateId).toBe(CMS_EXISTING);
    expect(minted.id).toBe(CMS_EXISTING);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(CMS_EXISTING);
    expect(admin.rows.founder_idea_submissions[0]?.opportunity_candidate_id).toBe(CMS_EXISTING);
  });

  it("reuses an in-memory compatible candidate during convert without inserting A", () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const store = new FounderIdeaStore();
    store.submissions.set(submission.id, submission);
    store.candidates.set(CMS_EXISTING, inMemoryCanonicalCandidate(submission, CMS_EXISTING, CMS_DISCOVERY));
    markDanglingCandidate(store, submission.id);
    const reused = convertFounderIdeaToCandidate(store, submission);
    expect(reused.id).toBe(CMS_EXISTING);
    expect(submission.opportunityCandidateId).toBe(CMS_EXISTING);
    expect(store.candidateRepair.get(submission.id)).toBe("reconciled");
    expect(store.candidates.has(CMS_CANDIDATE)).toBe(false);
  });

  it("materializes the historical UUID when no canonical candidate exists", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const store = new FounderIdeaStore();
    store.submissions.set(submission.id, submission);
    markDanglingCandidate(store, submission.id);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    expect(candidate.id).toBe(CMS_CANDIDATE);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, candidate, []);
    expect(persisted.ok).toBe(true);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(CMS_CANDIDATE);
    expect(admin.rows.founder_idea_submissions[0]?.opportunity_candidate_id).toBe(CMS_CANDIDATE);
  });

  it("fails closed when org+dedup match but discovery or founder provenance does not", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const store = new FounderIdeaStore();
    store.submissions.set(submission.id, submission);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    seedExistingCandidate(admin, submission, CMS_EXISTING, ART_DISCOVERY, {
      merge_group_key: founderMergeGroupKey(ART_ID),
    });
    const candidate = convertFounderIdeaToCandidate(store, submission);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, candidate, []);
    expect(persisted.ok).toBe(false);
    expect(persisted.error).toBe(FOUNDER_CANDIDATE_LINEAGE_CONFLICT);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(CMS_EXISTING);
    expect(admin.rows.founder_idea_submissions).toHaveLength(0);
    expect(store.submissions.get(CMS_ID)?.opportunityCandidateId).toBe(CMS_CANDIDATE);
  });

  it("archives the dangling historical pointer while reconciling the current canonical candidate", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    store.candidates.set(CMS_EXISTING, inMemoryCanonicalCandidate(submission, CMS_EXISTING, CMS_DISCOVERY));
    const { previousGrade } = await reanalyzeFounderIdeaWithCanonicalResearch(
      store,
      submission,
      async () => ({ ok: true, result: mockResult(submission) }),
      { analysisAttempt: 1 },
    );
    expect(previousGrade?.opportunityQuality).toBe(43.61);
    expect(store.evaluationHistory.get(CMS_ID)?.[0]?.candidateId).toBe(CMS_CANDIDATE);
    expect(store.evaluationHistory.get(CMS_ID)?.[0]?.decision).toBe("HOLD");
    expect(store.evaluationHistory.get(CMS_ID)?.[0]?.opportunityScore).toBe(43.61);
    expect(submission.opportunityCandidateId).toBe(CMS_EXISTING);
    expect(store.evaluationHistory.get(CMS_ID)?.[0]?.candidateId).not.toBe(submission.opportunityCandidateId);
  });

  it("keeps old research identity on candidate A and uses B for the next explicit attempt key", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const store = new FounderIdeaStore();
    seedHistoricalFallback(store, submission);
    store.candidates.set(CMS_EXISTING, inMemoryCanonicalCandidate(submission, CMS_EXISTING, CMS_DISCOVERY));
    const historicalKey = founderResearchAttemptKey({
      submissionId: CMS_ID,
      candidateId: CMS_CANDIDATE,
      attempt: 1,
    });
    const executor = canonicalReplayExecutor(submission);
    await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    const canonicalKey = founderResearchAttemptKey({
      submissionId: CMS_ID,
      candidateId: CMS_EXISTING,
      attempt: 1,
    });
    expect(historicalKey).toBe(`founder-idea-research:${CMS_ID}:${CMS_CANDIDATE}:v1`);
    expect(canonicalKey).toBe(`founder-idea-research:${CMS_ID}:${CMS_EXISTING}:v1`);
    expect(historicalKey).not.toBe(canonicalKey);
    expect(executor.keys).toEqual([canonicalKey]);
    expect(derivedFounderReanalysisAttempt(store.evaluationHistory.get(CMS_ID)?.length ?? 0)).toBe(2);
  });

  it("same-attempt replay after reconciliation does not duplicate candidate, archive, or provider calls", async () => {
    const store = new FounderIdeaStore();
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    seedHistoricalFallback(store, submission);
    store.candidates.set(CMS_EXISTING, inMemoryCanonicalCandidate(submission, CMS_EXISTING, CMS_DISCOVERY));
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    seedExistingCandidate(admin, submission, CMS_EXISTING, CMS_DISCOVERY);
    const executor = canonicalReplayExecutor(submission);
    const first = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    const firstPersist = await persistFounderIdea(
      admin as never,
      first.submission,
      first.grade,
      null,
      store.candidates.get(first.submission.opportunityCandidateId ?? "") ?? null,
      store.evaluationHistory.get(CMS_ID) ?? [],
    );
    const second = await reanalyzeFounderIdeaWithCanonicalResearch(store, submission, (input) => executor.run(input), {
      analysisAttempt: 1,
    });
    const secondPersist = await persistFounderIdea(
      admin as never,
      second.submission,
      second.grade,
      null,
      store.candidates.get(second.submission.opportunityCandidateId ?? "") ?? null,
      store.evaluationHistory.get(CMS_ID) ?? [],
    );
    expect(firstPersist.ok).toBe(true);
    expect(secondPersist.ok).toBe(true);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(CMS_EXISTING);
    expect(store.evaluationHistory.get(CMS_ID)?.filter((row) => row.opportunityScore === 43.61)).toHaveLength(1);
    expect(executor.providerCalls).toBe(1);
    expect(submission.opportunityCandidateId).toBe(CMS_EXISTING);
  });

  it("read-only load hydrates the canonical candidate without rewriting the dangling pointer", async () => {
    const submission = historicalSubmission(CMS_ID, CMS_CANDIDATE, "Infinity CMS");
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, CMS_ID, CMS_DISCOVERY);
    seedExistingCandidate(admin, submission, CMS_EXISTING, CMS_DISCOVERY);
    const persistStore = new FounderIdeaStore();
    persistStore.submissions.set(submission.id, submission);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, null, []);
    expect(persisted.ok).toBe(true);
    const loaded = await loadFounderIdeaStoreForOrg(admin as never, ORG_A);
    expect(loaded.submissions.get(CMS_ID)?.opportunityCandidateId).toBe(CMS_CANDIDATE);
    expect(loaded.candidates.has(CMS_EXISTING)).toBe(true);
    expect(loaded.candidates.has(CMS_CANDIDATE)).toBe(false);
    expect(loaded.candidateRepair.get(CMS_ID)).toBe("dangling");
  });

  it("Art Bay live shape reuses a compatible existing candidate rather than the dangling UUID", async () => {
    const submission = historicalSubmission(ART_ID, ART_CANDIDATE, "Art Bay Code Name");
    const store = new FounderIdeaStore();
    store.submissions.set(submission.id, submission);
    const admin = memoryAdmin();
    seedExistingDiscovery(admin, ART_ID, ART_DISCOVERY);
    seedExistingCandidate(admin, submission, ART_EXISTING, ART_DISCOVERY);
    const candidate = convertFounderIdeaToCandidate(store, submission);
    const persisted = await persistFounderIdea(admin as never, submission, null, null, candidate, []);
    expect(persisted.ok).toBe(true);
    expect(submission.opportunityCandidateId).toBe(ART_EXISTING);
    expect(admin.rows.opportunity_candidates).toHaveLength(1);
    expect(admin.rows.opportunity_candidates[0]?.id).toBe(ART_EXISTING);
  });
});
