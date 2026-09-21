export const OPPORTUNITY_HQ_VISIBILITY_GATE = "OpportunityHQVisibilityGate" as const;
export const OPPORTUNITY_SHORTLIST_GOVERNANCE_GATE = "OpportunityShortlistGovernanceGate" as const;
export const VENTURE_SELECTION_TRACEABILITY_GATE = "VentureSelectionTraceabilityGate" as const;
export const LIVE_OPPORTUNITY_RANKING_GATE = "LiveOpportunityRankingGate" as const;
export const HQ_OPPORTUNITY_INTELLIGENCE_QUALITY_GATE = "HQOpportunityIntelligenceQualityGate" as const;
export const OPPORTUNITY_UNIVERSE_DETAIL_GATE = "OpportunityUniverseDetailGate" as const;

export const LIVE_RANKING_MODEL = "venture_selection_v1_opportunity_55_monetization_45" as const;
export const LIVE_RANKING_SOURCE = "CURRENT_CANONICAL_OPPORTUNITY_RECORDS" as const;
export const HISTORICAL_SCORE_DATA_UNAVAILABLE = "HISTORICAL_SCORE_DATA_UNAVAILABLE" as const;
export const OPPORTUNITIES_ROUTE = "/dashboard/opportunities" as const;

export const OPPORTUNITY_CLASSIFICATIONS = [
  "REAL_CANONICAL",
  "SIMULATION",
  "E2E_FIXTURE",
  "TEST",
  "ARCHIVED",
  "INVALID",
  "OTHER",
] as const;
export type OpportunityClassification = (typeof OPPORTUNITY_CLASSIFICATIONS)[number];

export const OPPORTUNITY_LIFECYCLES = [
  "DISCOVERED",
  "SCORED",
  "SHORTLISTED",
  "VALIDATING",
  "SELECTED",
  "DEFERRED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type OpportunityLifecycle = (typeof OPPORTUNITY_LIFECYCLES)[number];

export const OPPORTUNITY_COLLECTION_SCALE_FIXTURES = [10, 40, 133, 500] as const;
export const OPPORTUNITY_COLLECTION_PAGE_SIZE = 25 as const;
export const OPPORTUNITY_TOP_N = 10 as const;

export const LIVE_RANKING_EXCLUDED_CLASSIFICATIONS = [
  "INVALID",
  "ARCHIVED",
  "TEST",
  "SIMULATION",
  "E2E_FIXTURE",
] as const;

export const LIVE_RANKING_EXCLUDED_LIFECYCLES = ["REJECTED", "ARCHIVED"] as const;

export const OPPORTUNITY_DECISIONS = ["BUILD", "VALIDATE", "HOLD", "REJECT"] as const;
export type OpportunityDecision = (typeof OPPORTUNITY_DECISIONS)[number];

export const RANK_MOVEMENTS = ["NEW TO TOP 10", "NEWLY DISCOVERED", "UP", "DOWN"] as const;
export type RankMovementKind = (typeof RANK_MOVEMENTS)[number];

export type RankMovement = {
  kind: RankMovementKind;
  delta: number | null;
  label: string;
};

export type OpportunityScoreHistoryEntry = {
  previous: number | "UNKNOWN";
  current: number | "UNKNOWN";
  field: "opportunityScore" | "monetizationScore" | "rankingScore";
  timestamp: string;
  reason: string;
  scoringVersion: string;
};

export type CanonicalOpportunityRecord = {
  candidateId: string;
  name: string;
  problem: string;
  customer: string;
  industry: string;
  opportunityScore: number | "UNKNOWN";
  monetizationScore: number | "UNKNOWN";
  rankingScore: number | "UNKNOWN";
  viability: string;
  confidence: string;
  validationState: string;
  selectionState: string;
  lifecycle: OpportunityLifecycle;
  classification: OpportunityClassification;
  evidenceTimestamp: string | null;
  latestDecision: OpportunityDecision | OpportunityLifecycle | string;
  currentDecision: OpportunityDecision;
  reason: string;
  currentBlocker: string;
  discoveryRunId: string | null;
  rank: number | null;
  liveRank: number | null;
  eligibleForLiveRanking: boolean;
  inLiveTop10: boolean;
  availableForSelection: boolean;
  selectedVenture: boolean;
  relatedVentureId: string | null;
  shortlistIds: string[];
  scoreTimestamp: string | null;
  scoringModel: string;
  hqVisible: boolean;
  selectable: boolean;
  updatedAt: string | null;
  createdAt: string | null;
  movement: RankMovement | null;
  evidenceCount: number | "UNKNOWN";
  groundedSourceCount: number | "UNKNOWN";
  researchStatus: string;
  evidenceFreshness: string;
  businessModel: string;
  hypothesizedPrice: string;
  knownCost: number | "UNKNOWN";
  unknownEconomics: boolean;
  scoreHistoryStatus: typeof HISTORICAL_SCORE_DATA_UNAVAILABLE | "AVAILABLE";
  scoreHistory: OpportunityScoreHistoryEntry[];
  detailRoute: string;
};

export type OpportunityShortlistMember = {
  candidateId: string;
  name: string;
  rank: number;
  opportunityScore: number | "UNKNOWN";
  monetizationScore: number | "UNKNOWN";
  reason: string;
};

export type OpportunityShortlist = {
  shortlistId: string;
  version: number;
  createdAt: string;
  sourceDiscoveryRunId: string | null;
  selectionCriteria: string;
  status: "CURRENT" | "SUPERSEDED";
  members: OpportunityShortlistMember[];
  evidenceSnapshot: string;
};

export type OpportunityShortlistDiff = {
  previousId: string | null;
  currentId: string;
  added: string[];
  removed: string[];
  rankChanges: Array<{ candidateId: string; from: number | null; to: number | null }>;
};

export type OpportunityDiscoveryRunProjection = {
  runId: string;
  timestamp: string;
  status: string;
  candidateCount: number;
  newCandidates: number;
  updatedCandidates: number;
  rejectedCandidates: number;
  scannerVersion: string;
  evidenceQuality: string;
  result: string;
};

export type OpportunityDecisionEvent = {
  timestamp: string;
  from: OpportunityLifecycle | "NONE";
  to: OpportunityLifecycle;
  engine: string;
  evidence: string;
  reason: string;
  missionOrRunId: string | null;
};

export type OpportunityHqCounts = {
  total: number;
  currentTop10: number;
  discovered: number;
  underReview: number;
  shortlisted: number;
  validating: number;
  selected: number;
  deferred: number;
  rejected: number;
  archived: number;
  newSinceLastDiscovery: number;
  availableForSelection: number;
};

export type OpportunityRankingSnapshotMember = {
  candidateId: string;
  name: string;
  rank: number;
  opportunityScore: number | "UNKNOWN";
  monetizationScore: number | "UNKNOWN";
  rankingScore: number | "UNKNOWN";
  lifecycle: OpportunityLifecycle;
  eligible: boolean;
  currentDecision: OpportunityDecision;
};

export type OpportunityRankingSnapshot = {
  snapshotId: string;
  timestamp: string;
  rankingModelVersion: string;
  source: "LIVE_RECONCILE" | "DISCOVERY" | "SCORE_CHANGE" | "PRE_SELECTION" | "POST_SELECTION";
  eligibleCount: number;
  universeCount: number;
  members: OpportunityRankingSnapshotMember[];
};

export type LiveOpportunityRanking = {
  model: typeof LIVE_RANKING_MODEL;
  source: typeof LIVE_RANKING_SOURCE;
  eligible: CanonicalOpportunityRecord[];
  top10: CanonicalOpportunityRecord[];
  availableForSelection: CanonicalOpportunityRecord[];
  previousSnapshot: OpportunityRankingSnapshot | null;
  currentSnapshot: OpportunityRankingSnapshot | null;
};

export type OpportunityAttentionSignal = {
  kind: "NEW_OPPORTUNITIES" | "NEW_SHORTLIST" | "RANK_MOVEMENT" | "NONE";
  message: string;
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
