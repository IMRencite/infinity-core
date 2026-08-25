import { FounderIdeaStore } from "../store";
import { hydrateFounderStore, type FounderDecisionOverrideRow, type FounderIdeaSubmissionRow } from "../persistence";
import { markDanglingCandidate } from "../candidate-repair";
import { buildFounderIdeaArtifacts } from "./artifacts";
import type { HqRoomArtifactMap } from "@/lib/infinity/operator-console/artifacts/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";

type LooseQuery = {
  eq?: (column: string, value: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  in?: (column: string, values: string[]) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

type LooseAdmin = {
  from: (table: string) => {
    select: (columns: string) => LooseQuery;
    upsert?: (row: unknown, opts?: unknown) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

function candidateFromRow(row: Record<string, unknown>): OpportunityCandidate {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    discoveryRunId: String(row.discovery_run_id),
    title: String(row.title),
    summary: String(row.summary),
    problem: String(row.problem ?? ""),
    targetCustomer: String(row.target_customer ?? "UNSPECIFIED"),
    market: String(row.market ?? "UNSPECIFIED"),
    businessModelCandidates: (row.business_model_candidates as OpportunityCandidate["businessModelCandidates"]) ?? [],
    revenueMechanismCandidates: (row.revenue_mechanism_candidates as string[]) ?? [],
    demandEvidence: (row.demand_evidence as OpportunityCandidate["demandEvidence"]) ?? [],
    marketEvidence: (row.market_evidence as OpportunityCandidate["marketEvidence"]) ?? [],
    competitionEvidence: (row.competition_evidence as OpportunityCandidate["competitionEvidence"]) ?? [],
    monetizationEvidence: (row.monetization_evidence as OpportunityCandidate["monetizationEvidence"]) ?? [],
    distributionEvidence: (row.distribution_evidence as OpportunityCandidate["distributionEvidence"]) ?? [],
    buildabilityEvidence: (row.buildability_evidence as OpportunityCandidate["buildabilityEvidence"]) ?? [],
    risks: (row.risks as string[]) ?? [],
    unknowns: (row.unknowns as string[]) ?? [],
    researchSources: (row.research_sources as OpportunityCandidate["researchSources"]) ?? [],
    researchRunIds: (row.research_run_ids as string[]) ?? [],
    discoveryStrategies: (row.discovery_strategies as OpportunityCandidate["discoveryStrategies"]) ?? [],
    dedupKey: String(row.dedup_key),
    mergeGroupKey: row.merge_group_key ? String(row.merge_group_key) : null,
    opportunityScore: row.opportunity_score == null ? null : Number(row.opportunity_score),
    rankPosition: row.rank_position == null ? null : Number(row.rank_position),
    scores: null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function loadFounderIdeaHqArtifacts(
  admin: LooseAdmin,
  organizationId: string,
): Promise<HqRoomArtifactMap> {
  const store = await loadFounderIdeaStoreForOrg(admin, organizationId);
  return buildFounderIdeaArtifacts(store, organizationId);
}

export async function loadFounderIdeaStoreForOrg(
  admin: LooseAdmin,
  organizationId: string,
): Promise<FounderIdeaStore> {
  const store = new FounderIdeaStore();
  try {
    const submissions = await admin.from("founder_idea_submissions").select("*").eq!("organization_id", organizationId);
    if (submissions.error) return store;
    const overrides = await admin.from("founder_decision_overrides").select("*").eq!("organization_id", organizationId);
    hydrateFounderStore(
      store,
      (submissions.data as FounderIdeaSubmissionRow[] | null) ?? [],
      (overrides.data as FounderDecisionOverrideRow[] | null) ?? [],
    );

    const candidateIds = [...new Set(
      store.scoped(organizationId)
        .map((row) => row.opportunityCandidateId)
        .filter((id): id is string => Boolean(id)),
    )];
    const found = new Set<string>();
    if (candidateIds.length > 0) {
      const query = admin.from("opportunity_candidates").select("*");
      const result = query.in
        ? await query.in("id", candidateIds)
        : { data: [], error: null };
      const rows = (result.data as Record<string, unknown>[] | null) ?? [];
      for (const row of rows) {
        const candidate = candidateFromRow(row);
        store.candidates.set(candidate.id, candidate);
        found.add(candidate.id);
      }
    }
    for (const submission of store.scoped(organizationId)) {
      if (submission.opportunityCandidateId && found.has(submission.opportunityCandidateId)) {
        store.candidateRepair.set(submission.id, "hydrated");
      } else if (submission.opportunityCandidateId) {
        markDanglingCandidate(store, submission.id);
      }
    }
    return store;
  } catch {
    return store;
  }
}
