import {
  classifyDecision,
  passesBuildGate,
} from "@/lib/infinity/venture-selection/decisions/classify";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID, OCCUPANCYNPV_CANDIDATE_ID, OCCUPANCYNPV_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import {
  LIVE_RANKING_EXCLUDED_CLASSIFICATIONS,
  LIVE_RANKING_EXCLUDED_LIFECYCLES,
  LIVE_RANKING_MODEL,
  LIVE_RANKING_SOURCE,
  OPPORTUNITY_TOP_N,
  type CanonicalOpportunityRecord,
  type LiveOpportunityRanking,
  type OpportunityDecision,
  type OpportunityRankingSnapshot,
  type RankMovement,
} from "./types";

/**
 * Exact live Top 10 eligibility (existing classifier + lifecycle — not invented):
 * INCLUDE: REAL_CANONICAL with DISCOVERED | SCORED | SHORTLISTED | VALIDATING | SELECTED | DEFERRED
 * EXCLUDE: REJECTED | ARCHIVED lifecycle; INVALID | ARCHIVED | TEST | SIMULATION | E2E_FIXTURE classification
 *
 * Ranking key (existing Decision Engine / second-venture factory, not a new model):
 *   rankingScore = opportunityScore * 0.55 + monetizationScore * 0.45 when both known
 *   rankingScore = opportunityScore when monetization is UNKNOWN (never coerce UNKNOWN → 0)
 *   rankingScore = UNKNOWN / sort last when opportunity score is UNKNOWN
 *
 * Decision values are VentureSelection.classifyDecision: BUILD | VALIDATE | HOLD | REJECT
 */
export const LIVE_RANKING_ELIGIBILITY_RULES = {
  includeClassifications: ["REAL_CANONICAL"] as const,
  includeLifecycles: ["DISCOVERED", "SCORED", "SHORTLISTED", "VALIDATING", "SELECTED", "DEFERRED"] as const,
  excludeClassifications: LIVE_RANKING_EXCLUDED_CLASSIFICATIONS,
  excludeLifecycles: LIVE_RANKING_EXCLUDED_LIFECYCLES,
  rankingModel: LIVE_RANKING_MODEL,
  selectedRemainVisible: true,
  historicalShortlistDoesNotFreeze: true,
} as const;

export function numericOrSentinel(value: number | "UNKNOWN" | null | undefined, sentinel = -1): number {
  return typeof value === "number" && Number.isFinite(value) ? value : sentinel;
}

export function compositeRankingScore(
  opportunityScore: number | "UNKNOWN",
  monetizationScore: number | "UNKNOWN",
): number | "UNKNOWN" {
  if (typeof opportunityScore !== "number") return "UNKNOWN";
  if (typeof monetizationScore !== "number") return opportunityScore;
  return Number((opportunityScore * 0.55 + monetizationScore * 0.45).toFixed(2));
}

export function isEligibleForLiveRanking(record: Pick<
  CanonicalOpportunityRecord,
  "classification" | "lifecycle" | "hqVisible"
>): boolean {
  if (!record.hqVisible) return false;
  if ((LIVE_RANKING_EXCLUDED_CLASSIFICATIONS as readonly string[]).includes(record.classification)) return false;
  if ((LIVE_RANKING_EXCLUDED_LIFECYCLES as readonly string[]).includes(record.lifecycle)) return false;
  return record.classification === "REAL_CANONICAL";
}

export function currentDecisionFor(record: Pick<
  CanonicalOpportunityRecord,
  "opportunityScore" | "monetizationScore" | "currentBlocker"
>): OpportunityDecision {
  const rankingScore = compositeRankingScore(record.opportunityScore, record.monetizationScore);
  const selectionScore = typeof rankingScore === "number" ? rankingScore : 0;
  const monetizationNumeric = typeof record.monetizationScore === "number" ? record.monetizationScore : null;
  const evaluation = {
    selectionScore,
    validationScore: monetizationNumeric ?? 0,
    confidence: typeof record.monetizationScore === "number" ? 0.5 : 0.4,
    fatalAssumptionRiskScore: record.currentBlocker !== "NONE" ? 0.2 : 0.1,
    blockingAssumptions: record.currentBlocker !== "NONE" ? [record.currentBlocker] : [],
    candidate: {
      monetization: {
        monetizationScore: monetizationNumeric,
        primaryPlan: {
          estimatedCapitalRequired: 8000,
          platformDependencyRisk: 0.35,
          regulatoryRisk: 0.2,
          estimatedCAC: null,
          estimatedLTV: null,
          ltvCacRatio: null,
        },
      },
    },
    buildability: { buildabilityScore: 72 },
    expectedValueDerived: { expectedRoi: null },
  };
  const buildGate = passesBuildGate({
    evaluation: evaluation as never,
    thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
  });
  return classifyDecision({
    evaluation: evaluation as never,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity: true,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  }).decision;
}

function compareForLiveRank(a: CanonicalOpportunityRecord, b: CanonicalOpportunityRecord): number {
  const as = numericOrSentinel(a.rankingScore);
  const bs = numericOrSentinel(b.rankingScore);
  if (bs !== as) return bs - as;
  const ao = numericOrSentinel(a.opportunityScore);
  const bo = numericOrSentinel(b.opportunityScore);
  if (bo !== ao) return bo - ao;
  const am = numericOrSentinel(a.monetizationScore);
  const bm = numericOrSentinel(b.monetizationScore);
  if (bm !== am) return bm - am;
  return a.candidateId.localeCompare(b.candidateId);
}

export function movementFromPriorRank(input: {
  currentRank: number | null;
  previousRank: number | null;
  inLiveTop10: boolean;
  newlyDiscovered: boolean;
}): RankMovement | null {
  if (input.previousRank == null) {
    if (input.newlyDiscovered && input.inLiveTop10) {
      return { kind: "NEWLY DISCOVERED", delta: null, label: "NEWLY DISCOVERED" };
    }
    if (input.inLiveTop10) {
      return { kind: "NEW TO TOP 10", delta: null, label: "NEW TO TOP 10" };
    }
    return null;
  }
  if (input.currentRank == null) return null;
  if (input.previousRank > 10 && input.inLiveTop10) {
    return { kind: "NEW TO TOP 10", delta: null, label: "NEW TO TOP 10" };
  }
  const delta = input.previousRank - input.currentRank;
  if (delta > 0) return { kind: "UP", delta, label: `UP ${delta}` };
  if (delta < 0) return { kind: "DOWN", delta: Math.abs(delta), label: `DOWN ${Math.abs(delta)}` };
  return null;
}

export function applyLiveOpportunityRanking(input: {
  records: CanonicalOpportunityRecord[];
  previousSnapshot?: OpportunityRankingSnapshot | null;
  previousSnapshotTimestamp?: string | null;
}): CanonicalOpportunityRecord[] {
  const priorRank = new Map((input.previousSnapshot?.members ?? []).map((row) => [row.candidateId, row.rank]));
  const priorTs = input.previousSnapshot?.timestamp ?? input.previousSnapshotTimestamp ?? null;

  const decorated = input.records.map((row) => {
    const rankingScore = compositeRankingScore(row.opportunityScore, row.monetizationScore);
    const currentDecision = currentDecisionFor(row);
    const selectedVenture = row.candidateId === ASKREVIEW_CANDIDATE_ID || row.candidateId === OCCUPANCYNPV_CANDIDATE_ID;
    const relatedVentureId = row.candidateId === ASKREVIEW_CANDIDATE_ID
      ? ASKREVIEW_VENTURE_ID
      : row.candidateId === OCCUPANCYNPV_CANDIDATE_ID
        ? OCCUPANCYNPV_VENTURE_ID
        : row.relatedVentureId;
    const lifecycle = selectedVenture ? "SELECTED" as const : row.lifecycle;
    const eligible = isEligibleForLiveRanking({ ...row, lifecycle });
    return {
      ...row,
      rankingScore,
      currentDecision,
      latestDecision: selectedVenture ? row.latestDecision : currentDecision,
      selectedVenture,
      relatedVentureId,
      lifecycle,
      eligibleForLiveRanking: eligible,
      availableForSelection: eligible && !selectedVenture,
    };
  });

  const eligible = decorated.filter((row) => row.eligibleForLiveRanking).sort(compareForLiveRank);
  const ineligible = decorated.filter((row) => !row.eligibleForLiveRanking);
  const rankedEligible = eligible.map((row, index) => {
    const liveRank = index + 1;
    const inLiveTop10 = liveRank <= OPPORTUNITY_TOP_N;
    const previousRank = priorRank.get(row.candidateId) ?? null;
    const newlyDiscovered = Boolean(
      priorTs && row.createdAt && Date.parse(row.createdAt) > Date.parse(priorTs),
    );
    const movement = input.previousSnapshot
      ? movementFromPriorRank({
        currentRank: liveRank,
        previousRank,
        inLiveTop10,
        newlyDiscovered,
      })
      : null;
    const lifecycle = row.selectedVenture
      ? row.lifecycle
      : inLiveTop10
        ? "SHORTLISTED" as const
        : row.lifecycle === "SHORTLISTED"
          ? "DISCOVERED" as const
          : row.lifecycle;
    return {
      ...row,
      liveRank,
      rank: liveRank,
      inLiveTop10,
      lifecycle,
      movement,
    };
  });

  const rankedIneligible = ineligible.map((row) => ({
    ...row,
    liveRank: null,
    rank: null,
    inLiveTop10: false,
    availableForSelection: false,
    movement: null,
  }));

  return [...rankedEligible, ...rankedIneligible];
}

export function liveTop10(records: CanonicalOpportunityRecord[]): CanonicalOpportunityRecord[] {
  return records.filter((row) => row.inLiveTop10).sort((a, b) => (a.liveRank ?? 999) - (b.liveRank ?? 999));
}

export function eligibleLiveUniverse(records: CanonicalOpportunityRecord[]): CanonicalOpportunityRecord[] {
  return records.filter((row) => row.eligibleForLiveRanking).sort((a, b) => (a.liveRank ?? 999) - (b.liveRank ?? 999));
}

export function availableForSelection(records: CanonicalOpportunityRecord[]): CanonicalOpportunityRecord[] {
  return records.filter((row) => row.availableForSelection).sort((a, b) => (a.liveRank ?? 999) - (b.liveRank ?? 999));
}

export function buildLiveOpportunityRanking(input: {
  records: CanonicalOpportunityRecord[];
  previousSnapshot?: OpportunityRankingSnapshot | null;
  currentSnapshot?: OpportunityRankingSnapshot | null;
}): LiveOpportunityRanking {
  const ranked = applyLiveOpportunityRanking(input);
  return {
    model: LIVE_RANKING_MODEL,
    source: LIVE_RANKING_SOURCE,
    eligible: eligibleLiveUniverse(ranked),
    top10: liveTop10(ranked),
    availableForSelection: availableForSelection(ranked),
    previousSnapshot: input.previousSnapshot ?? null,
    currentSnapshot: input.currentSnapshot ?? null,
  };
}

export function rankingIsDeterministic(records: CanonicalOpportunityRecord[]): boolean {
  const first = applyLiveOpportunityRanking({ records }).map((row) => `${row.candidateId}:${row.liveRank}`);
  const second = applyLiveOpportunityRanking({ records }).map((row) => `${row.candidateId}:${row.liveRank}`);
  return first.join("|") === second.join("|");
}
