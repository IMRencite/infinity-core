import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { isOpportunitySelectable, realCanonicalOpportunities } from "./project";
import { currentOpportunityShortlist, diffOpportunityShortlists } from "./shortlist";
import { applyLiveOpportunityRanking, rankingIsDeterministic } from "./live-ranking";
import { OPPORTUNITY_COLLECTION_PAGE_SIZE } from "./types";
import type {
  CanonicalOpportunityRecord,
  NamedGateResult,
  OpportunityRankingSnapshot,
  OpportunityShortlist,
} from "./types";
import {
  HQ_OPPORTUNITY_INTELLIGENCE_QUALITY_GATE,
  LIVE_OPPORTUNITY_RANKING_GATE,
  OPPORTUNITIES_ROUTE,
  OPPORTUNITY_HQ_VISIBILITY_GATE,
  OPPORTUNITY_SHORTLIST_GOVERNANCE_GATE,
  OPPORTUNITY_UNIVERSE_DETAIL_GATE,
  VENTURE_SELECTION_TRACEABILITY_GATE,
} from "./types";

export function evaluateOpportunityHqVisibilityGate(input: {
  records: CanonicalOpportunityRecord[];
  selectableHiddenIds?: string[];
}): NamedGateResult {
  const reasons: string[] = [];
  const real = realCanonicalOpportunities(input.records);
  if (real.some((row) => !row.hqVisible)) reasons.push("REAL_CANDIDATE_NOT_HQ_VISIBLE");
  if (real.some((row) => !row.candidateId)) reasons.push("CANDIDATE_ID_MISSING");
  if (real.some((row) => row.opportunityScore === undefined)) reasons.push("SCORE_MISSING");
  if (real.some((row) => !row.lifecycle)) reasons.push("STATUS_MISSING");
  if ((input.selectableHiddenIds ?? []).length > 0) reasons.push("HIDDEN_SELECTABLE_CANDIDATE");
  const hiddenSelectable = input.records.filter((row) => !row.hqVisible && row.selectable);
  if (hiddenSelectable.length > 0) reasons.push("HIDDEN_SELECTABLE_CANDIDATE");
  return {
    gate: OPPORTUNITY_HQ_VISIBILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateOpportunityShortlistGovernanceGate(input: {
  shortlists: OpportunityShortlist[];
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.shortlists.length === 0) reasons.push("SHORTLIST_MISSING");
  const versions = new Set(input.shortlists.map((row) => `${row.shortlistId}:${row.version}`));
  if (versions.size !== input.shortlists.length) reasons.push("SILENT_SHORTLIST_REPLACEMENT");
  if (input.shortlists.some((row) => !row.createdAt)) reasons.push("SHORTLIST_TIMESTAMP_MISSING");
  if (input.shortlists.some((row) => row.members.length === 0)) reasons.push("SHORTLIST_MEMBERSHIP_EMPTY");
  if (input.shortlists.some((row) => row.members.some((member) => !member.rank))) reasons.push("SHORTLIST_RANK_MISSING");
  const current = currentOpportunityShortlist(input.shortlists);
  const previous = input.shortlists.find((row) => row.shortlistId !== current?.shortlistId) ?? null;
  if (current && previous) diffOpportunityShortlists(previous, current);
  return {
    gate: OPPORTUNITY_SHORTLIST_GOVERNANCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateVentureSelectionTraceabilityGate(input: {
  selectedCandidateId: string | null;
  records: CanonicalOpportunityRecord[];
  shortlists: OpportunityShortlist[];
  discoveryRunId?: string | null;
}): NamedGateResult {
  const reasons: string[] = [];
  if (!input.selectedCandidateId) reasons.push("SELECTION_CANDIDATE_MISSING");
  const record = input.records.find((row) => row.candidateId === input.selectedCandidateId);
  if (!record) reasons.push("SELECTION_NOT_IN_UNIVERSE");
  if (record && !isOpportunitySelectable(record)) reasons.push("SELECTION_NOT_HQ_VISIBLE");
  if (record && !record.discoveryRunId && !input.discoveryRunId) reasons.push("DISCOVERY_RUN_MISSING");
  const listed = input.shortlists.some((list) => list.members.some((member) => member.candidateId === input.selectedCandidateId));
  if (!listed) reasons.push("SHORTLIST_LINEAGE_MISSING");
  if (input.selectedCandidateId === ASKREVIEW_CANDIDATE_ID && !record) reasons.push("ASKREVIEW_LINEAGE_MISSING");
  return {
    gate: VENTURE_SELECTION_TRACEABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function hiddenSelectableCandidateState(records: CanonicalOpportunityRecord[]): "BLOCKED" | "ALLOWED" {
  return records.some((row) => !row.hqVisible && row.selectable) ? "ALLOWED" : "BLOCKED";
}

export function evaluateLiveOpportunityRankingGate(input: {
  records: CanonicalOpportunityRecord[];
  historicalShortlist?: OpportunityShortlist | null;
  previousSnapshot?: OpportunityRankingSnapshot | null;
}): NamedGateResult {
  const reasons: string[] = [];
  const ranked = applyLiveOpportunityRanking({
    records: input.records,
    previousSnapshot: input.previousSnapshot,
  });
  const eligible = ranked.filter((row) => row.eligibleForLiveRanking);
  const top10 = ranked.filter((row) => row.inLiveTop10);
  if (eligible.length === 0) reasons.push("ELIGIBLE_UNIVERSE_EMPTY");
  if (!rankingIsDeterministic(input.records)) reasons.push("RANKING_NOT_DETERMINISTIC");
  if (ranked.some((row) => row.classification !== "REAL_CANONICAL" && row.inLiveTop10)) {
    reasons.push("TEST_FIXTURE_IN_LIVE_TOP_10");
  }
  if (ranked.some((row) => row.monetizationScore === 0 && row.unknownEconomics && row.viability === "UNKNOWN")) {
    reasons.push("UNKNOWN_MONETIZATION_SHOWN_AS_ZERO");
  }
  const historicalIds = (input.historicalShortlist?.members ?? []).slice(0, 10).map((row) => row.candidateId);
  const liveIds = top10.map((row) => row.candidateId);
  if (historicalIds.length === 10 && liveIds.join("|") === historicalIds.join("|") && eligible.length > 10) {
    const strongerOutside = eligible.some((row) => {
      const hist = input.historicalShortlist?.members.find((member) => member.candidateId === row.candidateId);
      if (hist) return false;
      const weakest = historicalIds[9];
      const weak = eligible.find((item) => item.candidateId === weakest);
      if (!weak) return false;
      const rs = typeof row.rankingScore === "number" ? row.rankingScore : -1;
      const ws = typeof weak.rankingScore === "number" ? weak.rankingScore : -1;
      return rs > ws;
    });
    if (strongerOutside) reasons.push("LIVE_TOP_10_FROZEN_TO_HISTORICAL_SHORTLIST");
  }
  if (top10.some((row) => row.liveRank == null)) reasons.push("LIVE_RANK_MISSING");
  return {
    gate: LIVE_OPPORTUNITY_RANKING_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQOpportunityIntelligenceQualityGate(input: {
  records: CanonicalOpportunityRecord[];
  liveTop10: CanonicalOpportunityRecord[];
  historicalShortlist?: OpportunityShortlist | null;
  universeCardHref?: string | null;
  pageSize: number;
}): NamedGateResult {
  const reasons: string[] = [];
  const real = realCanonicalOpportunities(input.records);
  if (real.some((row) => !row.name || row.opportunityScore == null)) reasons.push("SCORES_MISSING");
  if (real.some((row) => row.monetizationScore !== "UNKNOWN" && typeof row.monetizationScore !== "number")) {
    reasons.push("MONETIZATION_MISSING");
  }
  if (real.some((row) => row.eligibleForLiveRanking && row.liveRank == null)) reasons.push("RANK_MISSING");
  if (real.some((row) => !row.lifecycle)) reasons.push("STATUS_MISSING");
  if (real.some((row) => !row.currentDecision)) reasons.push("DECISION_MISSING");
  if (real.every((row) => !row.opportunityScore && !row.monetizationScore && !row.lifecycle)) {
    reasons.push("FULL_UNIVERSE_NAMES_ONLY");
  }
  if (!input.universeCardHref || input.universeCardHref !== OPPORTUNITIES_ROUTE) {
    reasons.push("CANONICAL_COUNT_CARD_DEAD");
  }
  if (real.some((row) => !row.detailRoute?.includes(row.candidateId))) reasons.push("CANDIDATE_DETAIL_INACCESSIBLE");
  if (input.pageSize < 1 || input.pageSize > 50 || real.length > input.pageSize && input.pageSize > 50) {
    reasons.push("UNBOUNDED_UNIVERSE_LIST");
  }
  if (input.pageSize !== OPPORTUNITY_COLLECTION_PAGE_SIZE && input.pageSize > 50) {
    reasons.push("UNBOUNDED_UNIVERSE_LIST");
  }
  const historicalIds = (input.historicalShortlist?.members ?? []).slice(0, 10).map((row) => row.candidateId);
  const liveIds = input.liveTop10.map((row) => row.candidateId);
  if (
    historicalIds.length === 10 &&
    liveIds.join("|") === historicalIds.join("|") &&
    real.filter((row) => row.eligibleForLiveRanking).length > 10
  ) {
    const liveStronger = input.records.filter((row) => row.eligibleForLiveRanking && !historicalIds.includes(row.candidateId));
    const weakestHist = input.historicalShortlist?.members[9];
    if (weakestHist && liveStronger.some((row) => {
      const rs = typeof row.rankingScore === "number" ? row.rankingScore : -1;
      const ws = typeof weakestHist.opportunityScore === "number" ? weakestHist.opportunityScore : -1;
      return rs > ws;
    })) {
      reasons.push("TOP_10_FROZEN_HISTORICAL_LIST");
    }
  }
  return {
    gate: HQ_OPPORTUNITY_INTELLIGENCE_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateOpportunityUniverseDetailGate(input: {
  records: CanonicalOpportunityRecord[];
}): NamedGateResult {
  const reasons: string[] = [];
  for (const row of realCanonicalOpportunities(input.records)) {
    if (!row.candidateId) reasons.push("ID_MISSING");
    if (!row.name) reasons.push("NAME_MISSING");
    if (row.eligibleForLiveRanking && row.liveRank == null) reasons.push("RANK_MISSING");
    if (row.opportunityScore !== "UNKNOWN" && typeof row.opportunityScore !== "number") reasons.push("OPPORTUNITY_SCORE_MISSING");
    if (row.monetizationScore !== "UNKNOWN" && typeof row.monetizationScore !== "number") reasons.push("MONETIZATION_SCORE_MISSING");
    if (!row.lifecycle) reasons.push("STATUS_MISSING");
    if (!row.currentDecision) reasons.push("DECISION_MISSING");
    if (!row.detailRoute) reasons.push("DETAIL_ROUTE_MISSING");
    if (!row.discoveryRunId && row.shortlistIds.length === 0 && !row.candidateId) reasons.push("TRACEABILITY_MISSING");
  }
  return {
    gate: OPPORTUNITY_UNIVERSE_DETAIL_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
  };
}
