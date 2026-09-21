import { LIVE_RANKING_MODEL, OPPORTUNITY_TOP_N, type CanonicalOpportunityRecord, type OpportunityRankingSnapshot } from "./types";
import { eligibleLiveUniverse } from "./live-ranking";

export function snapshotIdFor(timestamp: string, source: OpportunityRankingSnapshot["source"]): string {
  return `ors_${source.toLowerCase()}_${timestamp.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

export function createOpportunityRankingSnapshot(input: {
  records: CanonicalOpportunityRecord[];
  timestamp?: string;
  source?: OpportunityRankingSnapshot["source"];
}): OpportunityRankingSnapshot {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const eligible = eligibleLiveUniverse(input.records);
  return {
    snapshotId: snapshotIdFor(timestamp, input.source ?? "LIVE_RECONCILE"),
    timestamp,
    rankingModelVersion: LIVE_RANKING_MODEL,
    source: input.source ?? "LIVE_RECONCILE",
    eligibleCount: eligible.length,
    universeCount: input.records.filter((row) => row.hqVisible).length,
    members: eligible.map((row) => ({
      candidateId: row.candidateId,
      name: row.name,
      rank: row.liveRank ?? row.rank ?? 0,
      opportunityScore: row.opportunityScore,
      monetizationScore: row.monetizationScore,
      rankingScore: row.rankingScore,
      lifecycle: row.lifecycle,
      eligible: true,
      currentDecision: row.currentDecision,
    })),
  };
}

export function isMaterialRankingChange(
  previous: OpportunityRankingSnapshot | null,
  next: OpportunityRankingSnapshot,
): boolean {
  if (!previous) return true;
  const prevTop = previous.members.filter((row) => row.rank <= OPPORTUNITY_TOP_N);
  const nextTop = next.members.filter((row) => row.rank <= OPPORTUNITY_TOP_N);
  if (prevTop.length !== nextTop.length) return true;
  for (let index = 0; index < nextTop.length; index += 1) {
    const a = prevTop[index];
    const b = nextTop[index];
    if (!a || !b) return true;
    if (a.candidateId !== b.candidateId) return true;
    if (a.rank !== b.rank) return true;
    if (a.opportunityScore !== b.opportunityScore) return true;
    if (a.monetizationScore !== b.monetizationScore) return true;
    if (a.rankingScore !== b.rankingScore) return true;
    if (a.eligible !== b.eligible) return true;
  }
  return false;
}

export function appendOpportunityRankingSnapshot(
  existing: OpportunityRankingSnapshot[],
  next: OpportunityRankingSnapshot,
): OpportunityRankingSnapshot[] {
  const previous = existing.at(-1) ?? null;
  if (!isMaterialRankingChange(previous, next)) return existing;
  if (existing.some((row) => row.snapshotId === next.snapshotId && row.timestamp === next.timestamp)) {
    return existing;
  }
  return [...existing, next];
}
