import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID, OCCUPANCYNPV_CANDIDATE_ID, OCCUPANCYNPV_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { classifyOpportunityCandidate, isRealCanonicalOpportunity } from "./classify";
import { compositeRankingScore, currentDecisionFor } from "./live-ranking";
import {
  HISTORICAL_SCORE_DATA_UNAVAILABLE,
  OPPORTUNITIES_ROUTE,
  type CanonicalOpportunityRecord,
  type OpportunityClassification,
  type OpportunityDiscoveryRunProjection,
  type OpportunityHqCounts,
  type OpportunityLifecycle,
  type OpportunityShortlist,
} from "./types";

export type RawOpportunityRow = {
  id: string;
  title?: string | null;
  summary?: string | null;
  problem?: string | null;
  target_customer?: string | null;
  market?: string | null;
  opportunity_score?: number | null;
  rank_position?: number | null;
  discovery_run_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  unknowns?: string[] | null;
  risks?: string[] | null;
  research_run_ids?: unknown;
  business_model_candidates?: unknown;
};

export type RawMonetizationRow = {
  opportunity_candidate_id: string;
  monetization_score?: number | null;
  economic_viability?: string | null;
  created_at?: string | null;
  model_type?: string | null;
  hypothesized_price?: string | number | null;
  estimated_price_base?: number | null;
  estimated_cost?: number | null;
};

export type RawPlanRow = {
  opportunity_candidate_id: string;
  model_type?: string | null;
  model_name?: string | null;
  estimated_price_base?: number | null;
  estimated_cost?: number | null;
};

export function numericOrUnknown(value: number | null | undefined): number | "UNKNOWN" {
  return typeof value === "number" && Number.isFinite(value) ? value : "UNKNOWN";
}

export function lifecycleForCandidate(input: {
  candidateId: string;
  classification: OpportunityClassification;
  status?: string | null;
}): OpportunityLifecycle {
  if (input.classification === "ARCHIVED" || input.status === "ARCHIVED") return "ARCHIVED";
  if (input.status === "REJECTED") return "REJECTED";
  if (input.status === "DEFERRED") return "DEFERRED";
  if (input.status === "VALIDATING") return "VALIDATING";
  if (input.candidateId === ASKREVIEW_CANDIDATE_ID) return "SELECTED";
  if (input.candidateId === OCCUPANCYNPV_CANDIDATE_ID) return "SELECTED";
  if (input.status === "SELECTED") return "SELECTED";
  if (typeof input.status === "string" && Number.isFinite(Number(input.status))) return "SCORED";
  return "DISCOVERED";
}

function selectionStateFor(candidateId: string, lifecycle: OpportunityLifecycle): string {
  if (candidateId === ASKREVIEW_CANDIDATE_ID) return "SELECTION_UNDER_REVIEW";
  if (candidateId === OCCUPANCYNPV_CANDIDATE_ID) {
    return occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : "SELECTED";
  }
  return lifecycle === "SELECTED" ? "SELECTED" : "NOT_SELECTED";
}

function relatedVentureFor(candidateId: string): string | null {
  if (candidateId === ASKREVIEW_CANDIDATE_ID) return ASKREVIEW_VENTURE_ID;
  if (candidateId === OCCUPANCYNPV_CANDIDATE_ID) return OCCUPANCYNPV_VENTURE_ID;
  return null;
}

function priceLabel(value: string | number | null | undefined): string {
  if (value == null || value === "") return "UNKNOWN";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "UNKNOWN";
    return value === 0 ? "$0" : `$${value}`;
  }
  return value;
}

export function projectCanonicalOpportunities(input: {
  rows: RawOpportunityRow[];
  monetization?: RawMonetizationRow[];
  plans?: RawPlanRow[];
  shortlists?: OpportunityShortlist[];
}): CanonicalOpportunityRecord[] {
  const mon = new Map((input.monetization ?? []).map((row) => [row.opportunity_candidate_id, row]));
  const plans = new Map((input.plans ?? []).map((row) => [row.opportunity_candidate_id, row]));
  const membership = new Map<string, string[]>();
  for (const list of input.shortlists ?? []) {
    for (const member of list.members) {
      const existing = membership.get(member.candidateId) ?? [];
      existing.push(list.shortlistId);
      membership.set(member.candidateId, existing);
    }
  }
  const projected = input.rows.map((row) => {
    const classification = classifyOpportunityCandidate({
      id: row.id,
      title: row.title,
      summary: row.summary,
      status: row.status,
    });
    const shortlistIds = membership.get(row.id) ?? [];
    const lifecycle = lifecycleForCandidate({
      candidateId: row.id,
      classification,
      status: row.status,
    });
    const real = isRealCanonicalOpportunity(classification);
    const score = numericOrUnknown(row.opportunity_score);
    const monetization = mon.get(row.id);
    const plan = plans.get(row.id);
    const monetizationScore = numericOrUnknown(monetization?.monetization_score);
    const rankingScore = compositeRankingScore(score, monetizationScore);
    const currentBlocker = row.unknowns?.[0] ?? (real ? "NONE" : "NOT_REAL_CANONICAL");
    const currentDecision = currentDecisionFor({
      opportunityScore: score,
      monetizationScore,
      currentBlocker,
    });
    const researchIds = Array.isArray(row.research_run_ids) ? row.research_run_ids : [];
    const hypothesizedPrice = priceLabel(
      plan?.estimated_price_base ?? monetization?.estimated_price_base ?? monetization?.hypothesized_price,
    );
    const businessFromCandidate = Array.isArray(row.business_model_candidates)
      ? row.business_model_candidates.filter((item): item is string => typeof item === "string").join(", ")
      : "";
    const knownCost = numericOrUnknown(plan?.estimated_cost ?? monetization?.estimated_cost);
    const selectedVenture = row.id === ASKREVIEW_CANDIDATE_ID || row.id === OCCUPANCYNPV_CANDIDATE_ID;
    return {
      candidateId: row.id,
      name: row.title ?? "UNKNOWN",
      problem: row.problem ?? row.summary ?? "UNKNOWN",
      customer: row.target_customer ?? "UNKNOWN",
      industry: row.market ?? "UNKNOWN",
      opportunityScore: score,
      monetizationScore,
      rankingScore,
      viability: monetization?.economic_viability ?? "UNKNOWN",
      confidence: row.unknowns?.length ? "MEDIUM_WITH_UNKNOWNS" : "UNKNOWN",
      validationState: lifecycle === "SELECTED" || lifecycle === "VALIDATING" ? lifecycle : "NOT_STARTED",
      selectionState: selectionStateFor(row.id, lifecycle),
      lifecycle,
      classification,
      evidenceTimestamp: row.updated_at ?? row.created_at ?? null,
      latestDecision: selectedVenture ? lifecycle : currentDecision,
      currentDecision,
      reason: row.summary ?? "Scanner-persisted opportunity candidate.",
      currentBlocker,
      discoveryRunId: row.discovery_run_id ?? null,
      rank: null,
      liveRank: null,
      eligibleForLiveRanking: false,
      inLiveTop10: false,
      availableForSelection: false,
      selectedVenture,
      relatedVentureId: relatedVentureFor(row.id),
      shortlistIds,
      scoreTimestamp: row.updated_at ?? row.created_at ?? null,
      scoringModel: "opportunity_scanner_v1",
      hqVisible: real,
      selectable: real,
      updatedAt: row.updated_at ?? null,
      createdAt: row.created_at ?? null,
      movement: null,
      evidenceCount: researchIds.length > 0 ? researchIds.length : "UNKNOWN",
      groundedSourceCount: "UNKNOWN",
      researchStatus: researchIds.length > 0 ? "RESEARCH_LINKED" : "UNKNOWN",
      evidenceFreshness: row.updated_at ?? row.created_at ?? "UNKNOWN",
      businessModel: plan?.model_type ?? plan?.model_name ?? monetization?.model_type ?? (businessFromCandidate || "UNKNOWN"),
      hypothesizedPrice,
      knownCost,
      unknownEconomics: monetizationScore === "UNKNOWN" || knownCost === "UNKNOWN",
      scoreHistoryStatus: HISTORICAL_SCORE_DATA_UNAVAILABLE,
      scoreHistory: [],
      detailRoute: `${OPPORTUNITIES_ROUTE}/${row.id}`,
    } satisfies CanonicalOpportunityRecord;
  });
  return projected;
}

export function realCanonicalOpportunities(records: CanonicalOpportunityRecord[]): CanonicalOpportunityRecord[] {
  return records.filter((row) => row.hqVisible);
}

export function countOpportunityUniverse(records: CanonicalOpportunityRecord[], newSinceLastDiscovery = 0): OpportunityHqCounts {
  const real = realCanonicalOpportunities(records);
  const count = (lifecycle: CanonicalOpportunityRecord["lifecycle"]) => real.filter((row) => row.lifecycle === lifecycle).length;
  return {
    total: real.length,
    currentTop10: real.filter((row) => row.inLiveTop10).length,
    discovered: count("DISCOVERED") + count("SCORED"),
    underReview: real.filter((row) => row.selectionState === "SELECTION_UNDER_REVIEW").length,
    shortlisted: count("SHORTLISTED"),
    validating: count("VALIDATING"),
    selected: count("SELECTED"),
    deferred: count("DEFERRED"),
    rejected: count("REJECTED"),
    archived: count("ARCHIVED"),
    newSinceLastDiscovery,
    availableForSelection: real.filter((row) => row.availableForSelection).length,
  };
}

export function makeCanonicalOpportunityRecord(
  partial: Partial<CanonicalOpportunityRecord> & Pick<CanonicalOpportunityRecord, "candidateId" | "name">,
): CanonicalOpportunityRecord {
  const opportunityScore = partial.opportunityScore ?? "UNKNOWN";
  const monetizationScore = partial.monetizationScore ?? "UNKNOWN";
  const lifecycle = partial.lifecycle ?? "DISCOVERED";
  const classification = partial.classification ?? "REAL_CANONICAL";
  return {
    problem: "UNKNOWN",
    customer: "UNKNOWN",
    industry: "UNKNOWN",
    opportunityScore,
    monetizationScore,
    rankingScore: compositeRankingScore(opportunityScore, monetizationScore),
    viability: "UNKNOWN",
    confidence: "UNKNOWN",
    validationState: "NOT_STARTED",
    selectionState: lifecycle === "SELECTED" ? "SELECTED" : "NOT_SELECTED",
    lifecycle,
    classification,
    evidenceTimestamp: null,
    latestDecision: lifecycle,
    currentDecision: "HOLD",
    reason: "test",
    currentBlocker: "NONE",
    discoveryRunId: null,
    rank: null,
    liveRank: null,
    eligibleForLiveRanking: false,
    inLiveTop10: false,
    availableForSelection: false,
    selectedVenture: false,
    relatedVentureId: null,
    shortlistIds: [],
    scoreTimestamp: null,
    scoringModel: "opportunity_scanner_v1",
    hqVisible: classification === "REAL_CANONICAL",
    selectable: classification === "REAL_CANONICAL",
    updatedAt: null,
    createdAt: null,
    movement: null,
    evidenceCount: "UNKNOWN",
    groundedSourceCount: "UNKNOWN",
    researchStatus: "UNKNOWN",
    evidenceFreshness: "UNKNOWN",
    businessModel: "UNKNOWN",
    hypothesizedPrice: "UNKNOWN",
    knownCost: "UNKNOWN",
    unknownEconomics: monetizationScore === "UNKNOWN",
    scoreHistoryStatus: HISTORICAL_SCORE_DATA_UNAVAILABLE,
    scoreHistory: [],
    detailRoute: `${OPPORTUNITIES_ROUTE}/${partial.candidateId}`,
    ...partial,
  };
}

export function projectDiscoveryRuns(input: Array<{
  id: string;
  status?: string | null;
  created_at?: string | null;
  candidates_discovered?: number | null;
  candidates_persisted?: number | null;
  scanner_version?: string | null;
}>): OpportunityDiscoveryRunProjection[] {
  return input.map((row, index, all) => {
    const persisted = row.candidates_persisted ?? 0;
    const previous = all[index + 1]?.candidates_persisted ?? 0;
    return {
      runId: row.id,
      timestamp: row.created_at ?? "UNKNOWN",
      status: row.status ?? "UNKNOWN",
      candidateCount: persisted,
      newCandidates: Math.max(0, persisted),
      updatedCandidates: previous > 0 ? persisted : 0,
      rejectedCandidates: Math.max(0, (row.candidates_discovered ?? persisted) - persisted),
      scannerVersion: row.scanner_version ?? "opportunity_scanner_v1",
      evidenceQuality: persisted > 0 ? "PERSISTED" : "EMPTY",
      result: row.status ?? "UNKNOWN",
    };
  });
}

export function isOpportunitySelectable(record: CanonicalOpportunityRecord | null | undefined): boolean {
  return Boolean(record?.hqVisible && record.selectable && record.classification === "REAL_CANONICAL");
}
