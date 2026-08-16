import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { DiscoveryRunStatus } from "./constants";
import type {
  NormalizedCandidateScores,
  OpportunityCandidate,
  OpportunityCandidateDraft,
  ScannerCostSummary,
  ScannerReport,
} from "./types";

export async function findDiscoveryRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("opportunity_discovery_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertDiscoveryRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    idempotencyKey: string;
    strategies: string[];
    searchScope: Record<string, unknown>;
    constraints: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("opportunity_discovery_runs")
    .insert({
      organization_id: input.organizationId,
      status: "requested",
      scanner_version: "opportunity_scanner_v1",
      scoring_version: "opportunity_scanner_scoring_v1",
      strategies: input.strategies,
      search_scope: input.searchScope as never,
      constraints: input.constraints as never,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateDiscoveryRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["opportunity_discovery_runs"]["Update"],
) {
  const { error } = await admin
    .from("opportunity_discovery_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);

  if (error) throw error;
}

export async function persistCandidateWithEvidence(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    discoveryRunId: string;
    candidate: OpportunityCandidateDraft;
    scores: NormalizedCandidateScores;
    rankPosition: number;
  },
): Promise<OpportunityCandidate> {
  const now = new Date().toISOString();
  const { data: candidateRow, error: candidateError } = await admin
    .from("opportunity_candidates")
    .upsert(
      {
        organization_id: input.organizationId,
        discovery_run_id: input.discoveryRunId,
        title: input.candidate.title,
        summary: input.candidate.summary,
        problem: input.candidate.problem,
        target_customer: input.candidate.targetCustomer,
        market: input.candidate.market,
        business_model_candidates: input.candidate.businessModelCandidates,
        revenue_mechanism_candidates: input.candidate.revenueMechanismCandidates,
        demand_evidence: input.candidate.demandEvidence as never,
        market_evidence: input.candidate.marketEvidence as never,
        competition_evidence: input.candidate.competitionEvidence as never,
        monetization_evidence: input.candidate.monetizationEvidence as never,
        distribution_evidence: input.candidate.distributionEvidence as never,
        buildability_evidence: input.candidate.buildabilityEvidence as never,
        risks: input.candidate.risks as never,
        unknowns: input.candidate.unknowns as never,
        research_sources: input.candidate.researchSources as never,
        research_run_ids: input.candidate.researchRunIds as never,
        discovery_strategies: input.candidate.discoveryStrategies as never,
        dedup_key: input.candidate.dedupKey,
        merge_group_key: input.candidate.mergeGroupKey,
        opportunity_score: input.scores.opportunityScore,
        rank_position: input.rankPosition,
        updated_at: now,
      },
      { onConflict: "organization_id,dedup_key" },
    )
    .select("*")
    .single();

  if (candidateError) throw candidateError;

  const evidenceRows = buildEvidenceRows(input.candidate, {
    organizationId: input.organizationId,
    discoveryRunId: input.discoveryRunId,
    candidateId: candidateRow.id,
  });

  if (evidenceRows.length > 0) {
    const { error: evidenceError } = await admin
      .from("opportunity_candidate_evidence")
      .insert(evidenceRows);
    if (evidenceError) throw evidenceError;
  }

  const { error: scoreError } = await admin.from("opportunity_candidate_scores").upsert(
    {
      organization_id: input.organizationId,
      candidate_id: candidateRow.id,
      discovery_run_id: input.discoveryRunId,
      scoring_version: input.scores.scoringVersion,
      demand_score: input.scores.demandScore,
      market_growth_score: input.scores.marketGrowthScore,
      competition_opportunity_score: input.scores.competitionOpportunityScore,
      monetization_potential_score: input.scores.monetizationPotentialScore,
      buildability_score: input.scores.buildabilityScore,
      automation_score: input.scores.automationScore,
      distribution_score: input.scores.distributionScore,
      capital_efficiency_score: input.scores.capitalEfficiencyScore,
      speed_to_revenue_score: input.scores.speedToRevenueScore,
      evidence_confidence_score: input.scores.evidenceConfidenceScore,
      opportunity_score: input.scores.opportunityScore,
      weighted_breakdown: input.scores.weightedBreakdown as never,
      scoring_inputs: input.scores.scoringInputs as never,
    },
    { onConflict: "candidate_id,scoring_version" },
  );

  if (scoreError) throw scoreError;

  return {
    id: candidateRow.id,
    organizationId: input.organizationId,
    discoveryRunId: input.discoveryRunId,
    title: input.candidate.title,
    summary: input.candidate.summary,
    problem: input.candidate.problem,
    targetCustomer: input.candidate.targetCustomer,
    market: input.candidate.market,
    businessModelCandidates: input.candidate.businessModelCandidates,
    revenueMechanismCandidates: input.candidate.revenueMechanismCandidates,
    demandEvidence: input.candidate.demandEvidence,
    marketEvidence: input.candidate.marketEvidence,
    competitionEvidence: input.candidate.competitionEvidence,
    monetizationEvidence: input.candidate.monetizationEvidence,
    distributionEvidence: input.candidate.distributionEvidence,
    buildabilityEvidence: input.candidate.buildabilityEvidence,
    risks: input.candidate.risks,
    unknowns: input.candidate.unknowns,
    researchSources: input.candidate.researchSources,
    researchRunIds: input.candidate.researchRunIds,
    discoveryStrategies: input.candidate.discoveryStrategies,
    dedupKey: input.candidate.dedupKey,
    mergeGroupKey: input.candidate.mergeGroupKey,
    opportunityScore: input.scores.opportunityScore,
    rankPosition: input.rankPosition,
    scores: input.scores,
    createdAt: candidateRow.created_at,
    updatedAt: candidateRow.updated_at,
  };
}

function buildEvidenceRows(
  candidate: OpportunityCandidateDraft,
  ctx: { organizationId: string; discoveryRunId: string; candidateId: string },
) {
  const categories: Array<[string, typeof candidate.demandEvidence]> = [
    ["demand", candidate.demandEvidence],
    ["market_change", candidate.marketEvidence],
    ["competition", candidate.competitionEvidence],
    ["monetization", candidate.monetizationEvidence],
    ["distribution", candidate.distributionEvidence],
    ["buildability", candidate.buildabilityEvidence],
  ];

  const rows = [];
  for (const [category, bundle] of categories) {
    for (const item of bundle) {
      rows.push({
        organization_id: ctx.organizationId,
        candidate_id: ctx.candidateId,
        discovery_run_id: ctx.discoveryRunId,
        research_run_id: candidate.researchRunIds[0] ?? null,
        signal_category: category,
        signal_type: item.signalType,
        title: item.claim.slice(0, 240),
        summary: item.observedSignal,
        claim: item.claim,
        source_url: item.sourceUrls[0] ?? null,
        source_title: null,
        source_domain: null,
        grounded: item.grounded,
        extracted_data: {
          relevance: item.relevance,
          limitations: item.limitations,
          sourceUrls: item.sourceUrls,
        },
        metadata: {},
      });
    }
  }
  return rows;
}

export function buildScannerReport(input: {
  strategiesExecuted: string[];
  researchRunIds: string[];
  candidatesDiscovered: number;
  candidatesMerged: number;
  candidates: OpportunityCandidate[];
  costSummary: ScannerCostSummary;
}): ScannerReport {
  return {
    scannerVersion: "opportunity_scanner_v1",
    scoringVersion: "opportunity_scanner_scoring_v1",
    strategiesExecuted: input.strategiesExecuted as never,
    researchRunIds: input.researchRunIds,
    candidatesDiscovered: input.candidatesDiscovered,
    candidatesMerged: input.candidatesMerged,
    candidatesPersisted: input.candidates.length,
    topCandidates: input.candidates.slice(0, 5).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      opportunityScore: candidate.opportunityScore ?? 0,
      rankPosition: candidate.rankPosition ?? 0,
    })),
    costSummary: input.costSummary,
    completedAt: new Date().toISOString(),
  };
}

export async function markDiscoveryRunFailed(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  input: { classification: string; message: string; status?: DiscoveryRunStatus },
) {
  await updateDiscoveryRun(admin, organizationId, runId, {
    status: input.status ?? "failed",
    failure_classification: input.classification,
    error_message: input.message,
    failed_at: new Date().toISOString(),
  });
}
