import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { analyzeFounderIdea } from "../analyze";
import { convertFounderIdeaToCandidate, conservativeScoringInputs, isSharedConservativeFallback } from "../convert";
import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { persistFounderIdea } from "../persist";
import { reanalyzeFounderIdea, markNeedsReanalysis } from "../reanalyze";
import { buildFounderResearchSeed } from "../research-seed";
import { buildFounderIdeaArtifacts, listFounderIdeas } from "../hq/artifacts";
import {
  artMarketplaceIntegrityPacket,
  categorySupportedIdeaUnprovenPacket,
  competitorSeedOnlyPacket,
  failedProviderPacket,
  negativeEconomicsPacket,
  workflowSaasIntegrityPacket,
} from "../integrity-fixtures";
import { ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import type { FounderIdeaSubmissionInput } from "../types";

const USER_A = "user-a";

function input(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: "Generic idea",
    description: "Generic description",
    idempotencyKey: "idea",
    ...overrides,
  };
}

function memoryAdmin() {
  const rows: Record<string, unknown[]> = {
    opportunity_discovery_runs: [],
    opportunity_candidates: [],
    founder_idea_submissions: [],
    founder_decision_overrides: [],
  };
  return {
    rows,
    from(table: string) {
      return {
        upsert: async (row: unknown) => {
          rows[table] = rows[table] ?? [];
          rows[table].push(row);
          return { data: row, error: null };
        },
      };
    },
  };
}

describe("founder-idea-lab research + scoring integrity v1", () => {
  it("does not use the shared conservative vector as a live final score", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "no-research" }));
    const { grade } = analyzeFounderIdea(store, submission);
    const fallback = calculateDeterministicScores(conservativeScoringInputs(false));
    expect(fallback.opportunityScore).toBe(43.61);
    expect(grade?.opportunityQuality).not.toBe(43.61);
    expect(isSharedConservativeFallback(grade?.opportunityScores?.scoringInputs)).toBe(false);
    expect(submission.status).not.toBe("READY_FOR_DECISION");
    expect(submission.infinityDecision).toBeNull();
  });

  it("scores two materially different ideas with different evidence vectors", () => {
    const store = new FounderIdeaStore();
    const saas = submitFounderIdea(
      store,
      input({
        idempotencyKey: "saas",
        title: "Operator workflow SaaS",
        description: "Software that automates a specific operator workflow with a monthly seat.",
        targetCustomer: "Field operators",
        problem: "Scheduling is manual",
        businessModelHypothesis: "saas subscription",
        pricingHypothesis: "$49/mo",
        competitors: "Acme Suite",
      }),
    );
    const market = submitFounderIdea(
      store,
      input({
        idempotencyKey: "market",
        title: "Independent artist marketplace",
        description: "A marketplace for independent artists to sell original work with a take rate.",
        targetCustomer: "Independent artists",
        problem: "Discovery is dominated by incumbents",
        businessModelHypothesis: "marketplace commissions",
        pricingHypothesis: "15% take rate",
        competitors: "Etsy",
      }),
    );
    convertFounderIdeaToCandidate(store, saas);
    convertFounderIdeaToCandidate(store, market);
    const saasResult = analyzeFounderIdea(store, saas, {
      researchPacket: workflowSaasIntegrityPacket(saas.id, saas.opportunityCandidateId!),
    });
    const marketResult = analyzeFounderIdea(store, market, {
      researchPacket: artMarketplaceIntegrityPacket(market.id, market.opportunityCandidateId!),
    });
    expect(saasResult.grade?.scoreIntegrity).toBe("EVIDENCE_GROUNDED");
    expect(marketResult.grade?.readyForDecision).toBe(false);
    expect(marketResult.submission.infinityDecision).toBeNull();
    expect(marketResult.grade?.evaluation).toBeNull();
    expect(marketResult.grade?.opportunityScores?.scoringInputs).not.toEqual(
      saasResult.grade?.opportunityScores?.scoringInputs,
    );
    expect(saasResult.grade?.opportunityQuality).not.toBe(43.61);
    expect(marketResult.grade?.opportunityQuality).not.toBe(43.61);
    expect(saasResult.grade?.provenance.some((row) => row.dimension === "demandStrength")).toBe(true);
    expect(marketResult.grade?.provenance.find((row) => row.dimension === "competitionWeakness")?.evidenceState).toBe(
      "negative",
    );
  });

  it("missing research does not coerce monetization or ROI to zero or HOLD", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "missing" }));
    const { grade } = analyzeFounderIdea(store, submission);
    expect(grade?.monetizationScore).toBeNull();
    expect(grade?.expectedRoi).toBeNull();
    expect(grade?.buildReadiness).toBeNull();
    expect(submission.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(submission.infinityDecision).toBeNull();
  });

  it("category support with unproven idea and unknown unit economics does not become monetization 0", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "category" }));
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: categorySupportedIdeaUnprovenPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.monetizationLayers?.category).toBe("SUPPORTED");
    expect(grade?.monetizationLayers?.ideaSpecific).toBe("UNPROVEN");
    expect(grade?.monetizationLayers?.unitEconomics).toBe("UNKNOWN");
    expect(grade?.monetizationScore).not.toBe(0);
    expect(grade?.monetizationScore).toBeGreaterThan(0);
    expect(grade?.expectedRoi).toBeNull();
    expect(grade?.readyForDecision).toBe(false);
    expect(grade?.evaluation).toBeNull();
    expect(submission.status).not.toBe("READY_FOR_DECISION");
    expect(submission.infinityDecision).not.toBe("HOLD");
    const row = listFounderIdeas(store, ORG_A)[0];
    expect(row?.score).not.toMatch(/^\d+\.\d{2}$/);
    expect(row?.score).not.toBe("0");
    expect(grade?.provenance.some((item) => item.evidenceState === "unknown" && item.rawInput === null)).toBe(true);
    expect(grade?.opportunityScores?.scoringInputs.capitalEfficiency).toBe(0);
    expect(grade?.provenance.find((item) => item.dimension === "capitalEfficiency")?.weightedContribution).toBeNull();
  });

  it("credible negative evidence can produce legitimately low scores", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "negative" }));
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: negativeEconomicsPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.monetizationLayers?.category).toBe("UNSUPPORTED");
    expect(grade?.opportunityQuality).not.toBeNull();
    expect(grade!.opportunityQuality!).toBeLessThan(30);
    expect(grade?.provenance.find((row) => row.dimension === "monetizationPotential")?.evidenceState).toBe("negative");
  });

  it("founder competitors seed research and are not auto-verified", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      input({ idempotencyKey: "competitor", competitors: "Northwind Analytics", title: "B2B tool", description: "B2B analytics" }),
    );
    const seed = buildFounderResearchSeed(submission);
    expect(seed.knownCompetitors).toEqual(["Northwind Analytics"]);
    expect(seed.founderStatementsAreHypotheses).toBe(true);
    expect(seed.researchObjective).toContain("Northwind Analytics");
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: competitorSeedOnlyPacket(submission.id, submission.opportunityCandidateId!, "Northwind Analytics"),
    });
    const packet = store.researchPackets.get(submission.id)!;
    expect(packet.competitorLeads).toContain("Northwind Analytics");
    expect(packet.verifiedCompetitors).toEqual([]);
    const candidate = store.candidates.get(submission.opportunityCandidateId!)!;
    expect(candidate.competitionEvidence.some((item) => item.grounded === false)).toBe(true);
    expect(grade?.readyForDecision).toBe(false);
  });

  it("provider failure is not READY_FOR_DECISION", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "provider" }));
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: failedProviderPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.scoreIntegrity).toBe("INCOMPLETE");
    expect(grade?.opportunityQuality).toBeNull();
    expect(submission.status).toBe("RESEARCH_INCOMPLETE");
    expect(submission.failureCode).toBe("PROVIDER_FAILED");
    expect(submission.infinityDecision).toBeNull();
  });

  it("persists FounderIdea → OpportunityCandidate → ResearchRun → packet → monetization → score lineage", async () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      input({
        idempotencyKey: "lineage",
        title: "Operator workflow SaaS",
        description: "Software that automates a specific operator workflow with a monthly seat.",
        targetCustomer: "Operators",
        problem: "Manual scheduling",
        businessModelHypothesis: "saas",
        pricingHypothesis: "$49/mo",
        competitors: "Acme Suite",
      }),
    );
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: workflowSaasIntegrityPacket(submission.id, submission.opportunityCandidateId!),
    });
    const candidate = store.candidates.get(submission.opportunityCandidateId!)!;
    const packet = store.researchPackets.get(submission.id)!;
    const monetization = store.monetizationBySubmission.get(submission.id)!;
    expect(submission.opportunityCandidateId).toBe(candidate.id);
    expect(packet.candidateId).toBe(candidate.id);
    expect(candidate.researchRunIds).toEqual([packet.researchRunId]);
    expect(monetization.monetizationRunId).toContain(packet.researchRunId);
    expect(grade?.researchRunId).toBe(packet.researchRunId);
    expect(grade?.monetizationRunId).toBe(monetization.monetizationRunId);
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).toBeTruthy();

    const admin = memoryAdmin();
    const persisted = await persistFounderIdea(
      admin,
      submission,
      grade,
      null,
      candidate,
    );
    expect(persisted.ok).toBe(true);
    const candidateRow = admin.rows.opportunity_candidates[0] as { id: string; organization_id: string };
    expect(candidateRow.id).toBe(candidate.id);
    expect(candidateRow.organization_id).toBe(ORG_A);
    const submissionRow = admin.rows.founder_idea_submissions[0] as { opportunity_candidate_id: string };
    expect(submissionRow.opportunity_candidate_id).toBe(candidate.id);
  });

  it("HQ does not synthesize research or monetization artifacts without real results", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "hq-truth" }));
    analyzeFounderIdea(store, submission);
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    expect(artifacts.research_department ?? []).toEqual([]);
    expect(artifacts.strategy_finance ?? []).toEqual([]);
    expect(listFounderIdeas(store, ORG_A)[0]?.score).toBe("UNKNOWN");
  });

  it("historical fallback submissions can be marked NEEDS_REANALYSIS and reanalyzed without dropping the old grade", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "history" }));
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    const previous = store.grades.get(submission.id)!;
    markNeedsReanalysis(store, submission);
    expect(submission.needsReanalysis).toBe(true);
    const { previousGrade, grade } = reanalyzeFounderIdea(store, submission, {});
    expect(previousGrade?.opportunityQuality).toBe(previous.opportunityQuality);
    expect(store.gradeHistory.get(submission.id)?.[0]?.opportunityQuality).toBe(previous.opportunityQuality);
    expect(grade?.readyForDecision).toBe(false);
    expect(submission.opportunityCandidateId).toBeTruthy();
  });

  it("uses founder description, customer, problem, model, pricing, and competitor seeds in the research objective", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      input({
        idempotencyKey: "seed",
        title: "Named Idea",
        description: "A precise description of the concept",
        targetCustomer: "Dentists",
        problem: "Recall campaigns are manual",
        businessModelHypothesis: "subscription",
        pricingHypothesis: "$99/mo",
        competitors: "DentalSoft",
        notes: "Start in Ohio",
      }),
    );
    const seed = buildFounderResearchSeed(submission);
    expect(seed.ideaDescription).toContain("precise description");
    expect(seed.targetCustomer).toBe("Dentists");
    expect(seed.problem).toBe("Recall campaigns are manual");
    expect(seed.businessModelHypothesis).toBe("subscription");
    expect(seed.pricingHypothesis).toBe("$99/mo");
    expect(seed.knownCompetitors).toEqual(["DentalSoft"]);
    expect(seed.researchObjective).toContain("category monetization precedent");
  });
});
