import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { countOpportunityUniverse, projectCanonicalOpportunities, projectDiscoveryRuns, realCanonicalOpportunities } from "./project";
import {
  latestRankingSnapshot,
  loadOpportunityUniverseState,
  recordScoreHistoryDelta,
  registerOpportunityRankingSnapshot,
  seedHistoricalShortlists,
  writeOpportunityAttention,
} from "./persist";
import { currentOpportunityShortlist, diffOpportunityShortlists } from "./shortlist";
import {
  evaluateHQOpportunityIntelligenceQualityGate,
  evaluateLiveOpportunityRankingGate,
  evaluateOpportunityHqVisibilityGate,
  evaluateOpportunityShortlistGovernanceGate,
  evaluateOpportunityUniverseDetailGate,
  evaluateVentureSelectionTraceabilityGate,
  hiddenSelectableCandidateState,
} from "./gates";
import { applyLiveOpportunityRanking, availableForSelection, liveTop10 } from "./live-ranking";
import { createOpportunityRankingSnapshot } from "./ranking-snapshot";
import { HISTORICAL_SCORE_DATA_UNAVAILABLE, LIVE_RANKING_MODEL, OPPORTUNITIES_ROUTE, OPPORTUNITY_COLLECTION_PAGE_SIZE, type CanonicalOpportunityRecord, type OpportunityAttentionSignal } from "./types";

export async function loadCanonicalOpportunityUniverse(
  admin: AdminSupabaseClient,
  organizationId: string,
) {
  const state = loadOpportunityUniverseState();
  const [candidates, monetization, plans, runs] = await Promise.all([
    admin
      .from("opportunity_candidates")
      .select("id,title,summary,problem,target_customer,market,opportunity_score,rank_position,discovery_run_id,created_at,updated_at,unknowns,risks,research_run_ids,business_model_candidates")
      .eq("organization_id", organizationId)
      .order("opportunity_score", { ascending: false, nullsFirst: false }),
    admin
      .from("monetization_candidate_analyses")
      .select("opportunity_candidate_id,monetization_score,economic_viability,created_at"),
    admin
      .from("monetization_plans")
      .select("opportunity_candidate_id,model_type,model_name,estimated_price_base"),
    admin
      .from("opportunity_discovery_runs")
      .select("id,status,candidates_discovered,candidates_persisted,created_at,scanner_version")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);
  const planRows = plans.error ? [] : (plans.data ?? []);
  let shortlists = state.shortlists;
  const projectedForSeed = projectCanonicalOpportunities({
    rows: (candidates.data ?? []) as never,
    monetization: (monetization.data ?? []) as never,
    plans: planRows as never,
    shortlists: [],
  });
  if (shortlists.length === 0 && projectedForSeed.length > 0) {
    const originalTen = projectedForSeed
      .filter((row) => row.discoveryRunId === "3fd82037-0f03-425a-9212-f683d7cbd41a")
      .sort((a, b) => {
        const as = typeof a.opportunityScore === "number" ? a.opportunityScore : -1;
        const bs = typeof b.opportunityScore === "number" ? b.opportunityScore : -1;
        return bs - as;
      })
      .slice(0, 10)
      .map((row, index) => ({
        candidateId: row.candidateId,
        name: row.name,
        rank: index + 1,
        opportunityScore: row.opportunityScore,
        monetizationScore: row.monetizationScore,
      }));
    const selectionForty = [...projectedForSeed]
      .sort((a, b) => {
        const as = typeof a.opportunityScore === "number" ? a.opportunityScore : -1;
        const bs = typeof b.opportunityScore === "number" ? b.opportunityScore : -1;
        return bs - as;
      })
      .slice(0, 40)
      .map((row, index) => ({
        candidateId: row.candidateId,
        name: row.name,
        rank: index + 1,
        opportunityScore: row.opportunityScore,
        monetizationScore: row.monetizationScore,
      }));
    shortlists = seedHistoricalShortlists({ originalTen, selectionForty });
    state.shortlists = shortlists;
  }
  const previousSnapshot = latestRankingSnapshot(state.rankingSnapshots);
  const projected = projectCanonicalOpportunities({
    rows: (candidates.data ?? []) as never,
    monetization: (monetization.data ?? []) as never,
    plans: planRows as never,
    shortlists,
  });
  const records = attachScoreHistory(
    applyLiveOpportunityRanking({
      records: projected,
      previousSnapshot,
    }),
    state.scoreHistory,
  );
  reconcileScoreHistory(records, previousSnapshot);
  const nextSnapshot = createOpportunityRankingSnapshot({
    records,
    source: "LIVE_RECONCILE",
  });
  const snapshots = registerOpportunityRankingSnapshot(nextSnapshot);
  const currentSnapshot = latestRankingSnapshot(snapshots);
  const real = realCanonicalOpportunities(records);
  const discoveryRuns = projectDiscoveryRuns((runs.data ?? []) as never);
  const previousVisible = state.previousVisibleCount;
  const newSinceLastDiscovery = Math.max(0, real.length - previousVisible);
  const attention = buildAttentionSignal({
    previousVisible,
    currentVisible: real.length,
    shortlists: state.shortlists.length,
    movement: real.some((row) => row.movement),
  });
  if (attention.kind !== "NONE") writeOpportunityAttention(attention);
  const top = liveTop10(records);
  const historicalCurrent = currentOpportunityShortlist(state.shortlists);
  return {
    records,
    real,
    counts: countOpportunityUniverse(records, newSinceLastDiscovery),
    shortlists: state.shortlists,
    currentShortlist: historicalCurrent,
    previousShortlist: state.shortlists.find((row) => row.status === "SUPERSEDED") ?? null,
    shortlistDiff: historicalCurrent
      ? diffOpportunityShortlists(
        state.shortlists.find((row) => row.shortlistId !== historicalCurrent.shortlistId) ?? null,
        historicalCurrent,
      )
      : null,
    liveRanking: {
      model: LIVE_RANKING_MODEL,
      source: "CURRENT_CANONICAL_OPPORTUNITY_RECORDS" as const,
      eligible: records.filter((row) => row.eligibleForLiveRanking),
      top10: top,
      availableForSelection: availableForSelection(records),
      previousSnapshot,
      currentSnapshot,
    },
    rankingSnapshots: snapshots,
    discoveryRuns,
    attention,
    decisions: state.decisions,
    previousVisibleCount: previousVisible,
    gates: {
      visibility: evaluateOpportunityHqVisibilityGate({ records }),
      shortlist: evaluateOpportunityShortlistGovernanceGate({ shortlists: state.shortlists }),
      selection: evaluateVentureSelectionTraceabilityGate({
        selectedCandidateId: ASKREVIEW_CANDIDATE_ID,
        records,
        shortlists: state.shortlists,
      }),
      liveRanking: evaluateLiveOpportunityRankingGate({
        records,
        historicalShortlist: historicalCurrent,
        previousSnapshot,
      }),
      intelligence: evaluateHQOpportunityIntelligenceQualityGate({
        records,
        liveTop10: top,
        historicalShortlist: historicalCurrent,
        universeCardHref: OPPORTUNITIES_ROUTE,
        pageSize: OPPORTUNITY_COLLECTION_PAGE_SIZE,
      }),
      universeDetail: evaluateOpportunityUniverseDetailGate({ records }),
      hiddenSelectable: hiddenSelectableCandidateState(records),
    },
  };
}

function attachScoreHistory(
  records: CanonicalOpportunityRecord[],
  history: Record<string, CanonicalOpportunityRecord["scoreHistory"]>,
): CanonicalOpportunityRecord[] {
  return records.map((row) => {
    const entries = history[row.candidateId] ?? [];
    return {
      ...row,
      scoreHistory: entries,
      scoreHistoryStatus: entries.length > 0 ? "AVAILABLE" : HISTORICAL_SCORE_DATA_UNAVAILABLE,
    };
  });
}

function reconcileScoreHistory(
  records: CanonicalOpportunityRecord[],
  previousSnapshot: ReturnType<typeof latestRankingSnapshot>,
): void {
  if (!previousSnapshot) return;
  const prior = new Map(previousSnapshot.members.map((row) => [row.candidateId, row]));
  const timestamp = new Date().toISOString();
  for (const row of records) {
    const previous = prior.get(row.candidateId);
    if (!previous) continue;
    if (previous.opportunityScore !== row.opportunityScore) {
      recordScoreHistoryDelta({
        candidateId: row.candidateId,
        field: "opportunityScore",
        previous: previous.opportunityScore,
        current: row.opportunityScore,
        timestamp,
        reason: "Canonical opportunity_score changed versus prior live ranking snapshot.",
        scoringVersion: row.scoringModel,
      });
    }
    if (previous.monetizationScore !== row.monetizationScore) {
      recordScoreHistoryDelta({
        candidateId: row.candidateId,
        field: "monetizationScore",
        previous: previous.monetizationScore,
        current: row.monetizationScore,
        timestamp,
        reason: "Canonical monetization_score changed versus prior live ranking snapshot.",
        scoringVersion: row.scoringModel,
      });
    }
  }
}

export function buildAttentionSignal(input: {
  previousVisible: number;
  currentVisible: number;
  shortlists: number;
  movement?: boolean;
}): OpportunityAttentionSignal {
  const added = input.currentVisible - input.previousVisible;
  if (added > 0) {
    return {
      kind: "NEW_OPPORTUNITIES",
      message: `${added} new opportunities discovered. Previous HQ-visible set: ${input.previousVisible}. Current canonical universe: ${input.currentVisible}.`,
    };
  }
  if (input.movement) {
    return {
      kind: "RANK_MOVEMENT",
      message: "Live Top 10 changed versus the previous ranking snapshot.",
    };
  }
  if (input.shortlists > 1) {
    return {
      kind: "NEW_SHORTLIST",
      message: "Historical shortlist snapshots are preserved. Live Top 10 is computed from current canonical evidence.",
    };
  }
  return { kind: "NONE", message: "" };
}

export function findOpportunityRecord(
  records: CanonicalOpportunityRecord[],
  candidateId: string,
): CanonicalOpportunityRecord | null {
  return records.find((row) => row.candidateId === candidateId) ?? null;
}
