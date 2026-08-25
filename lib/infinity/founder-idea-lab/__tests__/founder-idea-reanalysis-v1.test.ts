import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { convertFounderIdeaToCandidate } from "../convert";
import { markDanglingCandidate, resolveFounderCandidate } from "../candidate-repair";
import { archiveHistoricalGrade } from "../grade-history";
import { reanalyzeFounderIdea, reanalyzeFounderIdeaWithCanonicalResearch } from "../reanalyze";
import { analyzeFounderIdea } from "../analyze";
import { persistFounderIdea } from "../persist";
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
  return {
    rows,
    from(table: string) {
      return {
        select() {
          return {
            eq(_column: string, value: string) {
              return Promise.resolve({
                data: (rows[table] ?? []).filter((row) => Object.values(row).includes(value)),
                error: null,
              });
            },
            in(column: string, values: string[]) {
              return Promise.resolve({
                data: (rows[table] ?? []).filter((row) => values.includes(String(row[column]))),
                error: null,
              });
            },
          };
        },
        upsert: async (row: Record<string, unknown>) => {
          rows[table] = rows[table] ?? [];
          const idx = rows[table].findIndex((item) => item.id === row.id);
          if (idx >= 0) rows[table][idx] = row;
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
    expect(request.idempotencyKey).toContain(CMS_ID);
    expect(request.runPurpose).toBe("FOUNDER_IDEA_REANALYSIS");
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
