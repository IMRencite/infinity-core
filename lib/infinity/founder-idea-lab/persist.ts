import type { FounderDecisionOverride, FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import { overrideToRow, submissionToRow } from "./persistence";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";

type LooseWriter = {
  from: (table: string) => {
    upsert: (row: unknown, opts?: { onConflict?: string }) => PromiseLike<{ data?: unknown; error: { message?: string } | null }>;
  };
};

function candidateToRow(candidate: OpportunityCandidate) {
  return {
    id: candidate.id,
    organization_id: candidate.organizationId,
    discovery_run_id: candidate.discoveryRunId,
    title: candidate.title,
    summary: candidate.summary,
    problem: candidate.problem,
    target_customer: candidate.targetCustomer,
    market: candidate.market,
    business_model_candidates: candidate.businessModelCandidates,
    revenue_mechanism_candidates: candidate.revenueMechanismCandidates,
    demand_evidence: candidate.demandEvidence,
    market_evidence: candidate.marketEvidence,
    competition_evidence: candidate.competitionEvidence,
    monetization_evidence: candidate.monetizationEvidence,
    distribution_evidence: candidate.distributionEvidence,
    buildability_evidence: candidate.buildabilityEvidence,
    risks: candidate.risks,
    unknowns: candidate.unknowns,
    research_sources: candidate.researchSources,
    research_run_ids: candidate.researchRunIds,
    discovery_strategies: candidate.discoveryStrategies.length ? candidate.discoveryStrategies : ["market_pain_discovery"],
    dedup_key: candidate.dedupKey,
    merge_group_key: candidate.mergeGroupKey,
    opportunity_score: candidate.opportunityScore,
    rank_position: candidate.rankPosition,
    updated_at: candidate.updatedAt,
  };
}

export async function persistFounderIdea(
  admin: LooseWriter,
  submission: FounderIdeaSubmission,
  grade?: FounderIdeaGrade | null,
  override?: FounderDecisionOverride | null,
  candidate?: OpportunityCandidate | null,
): Promise<{ ok: boolean; error?: string }> {
  if (candidate) {
    const discovery = await admin.from("opportunity_discovery_runs").upsert(
      {
        id: candidate.discoveryRunId,
        organization_id: candidate.organizationId,
        status: "completed",
        scanner_version: "opportunity_scanner_v1",
        scoring_version: "opportunity_scanner_scoring_v1",
        strategies: ["market_pain_discovery"],
        search_scope: { origin: "FOUNDER_SUBMITTED", founderIdeaSubmissionId: submission.id },
        constraints: { origin: "FOUNDER_SUBMITTED" },
        correlation_id: submission.id,
        idempotency_key: `founder-idea-discovery:${submission.id}`,
      },
      { onConflict: "id" },
    );
    if (discovery.error) return { ok: false, error: discovery.error.message };
    const candidateResult = await admin.from("opportunity_candidates").upsert(candidateToRow(candidate), {
      onConflict: "organization_id,dedup_key",
    });
    if (candidateResult.error) return { ok: false, error: candidateResult.error.message };
  }
  const submissionResult = await admin.from("founder_idea_submissions").upsert(submissionToRow(submission, grade), {
    onConflict: "id",
  });
  if (submissionResult.error) return { ok: false, error: submissionResult.error.message };
  if (override) {
    const overrideResult = await admin.from("founder_decision_overrides").upsert(overrideToRow(override), {
      onConflict: "id",
    });
    if (overrideResult.error) return { ok: false, error: overrideResult.error.message };
  }
  return { ok: true };
}
