import { existsSync, readFileSync } from "node:fs";
import { durableLocalPersistEnabled, writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { appendOpportunityShortlist, createOpportunityShortlist } from "./shortlist";
import { appendOpportunityRankingSnapshot } from "./ranking-snapshot";
import type {
  OpportunityAttentionSignal,
  OpportunityDecisionEvent,
  OpportunityRankingSnapshot,
  OpportunityScoreHistoryEntry,
  OpportunityShortlist,
} from "./types";

export const OPPORTUNITY_UNIVERSE_STATE_DIR = ".infinity/opportunity-universe" as const;
export const OPPORTUNITY_SHORTLIST_PATH = `${OPPORTUNITY_UNIVERSE_STATE_DIR}/shortlists.json` as const;
export const OPPORTUNITY_ATTENTION_PATH = `${OPPORTUNITY_UNIVERSE_STATE_DIR}/attention.json` as const;
export const OPPORTUNITY_DECISIONS_PATH = `${OPPORTUNITY_UNIVERSE_STATE_DIR}/decisions.json` as const;
export const OPPORTUNITY_RANKING_SNAPSHOT_PATH = `${OPPORTUNITY_UNIVERSE_STATE_DIR}/ranking-snapshots.json` as const;
export const OPPORTUNITY_SCORE_HISTORY_PATH = `${OPPORTUNITY_UNIVERSE_STATE_DIR}/score-history.json` as const;

export type OpportunityUniverseState = {
  shortlists: OpportunityShortlist[];
  rankingSnapshots: OpportunityRankingSnapshot[];
  scoreHistory: Record<string, OpportunityScoreHistoryEntry[]>;
  previousVisibleCount: number;
  lastDiscoveryRunId: string | null;
  attention: OpportunityAttentionSignal;
  decisions: OpportunityDecisionEvent[];
};

const memory: OpportunityUniverseState = {
  shortlists: [],
  rankingSnapshots: [],
  scoreHistory: {},
  previousVisibleCount: 10,
  lastDiscoveryRunId: null,
  attention: { kind: "NONE", message: "" },
  decisions: [],
};

function persistEnabled(): boolean {
  if (!durableLocalPersistEnabled()) return false;
  if (process.env.VITEST && process.env.INFINITY_OPPORTUNITY_UNIVERSE_PERSIST !== "1") return false;
  return true;
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function resetOpportunityUniverseStore(): void {
  memory.shortlists = [];
  memory.rankingSnapshots = [];
  memory.scoreHistory = {};
  memory.previousVisibleCount = 10;
  memory.lastDiscoveryRunId = null;
  memory.attention = { kind: "NONE", message: "" };
  memory.decisions = [];
}

export function loadOpportunityUniverseState(): OpportunityUniverseState {
  if (memory.shortlists.length === 0 && persistEnabled()) {
    const stored = readJson<{ shortlists?: OpportunityShortlist[] }>(OPPORTUNITY_SHORTLIST_PATH, {});
    memory.shortlists = stored.shortlists ?? [];
    const attention = readJson<OpportunityAttentionSignal>(OPPORTUNITY_ATTENTION_PATH, memory.attention);
    memory.attention = attention;
    memory.decisions = readJson<OpportunityDecisionEvent[]>(OPPORTUNITY_DECISIONS_PATH, []);
    memory.rankingSnapshots = readJson<{ snapshots?: OpportunityRankingSnapshot[] }>(
      OPPORTUNITY_RANKING_SNAPSHOT_PATH,
      {},
    ).snapshots ?? [];
    memory.scoreHistory = readJson<Record<string, OpportunityScoreHistoryEntry[]>>(
      OPPORTUNITY_SCORE_HISTORY_PATH,
      {},
    );
  }
  return memory;
}

export function writeOpportunityShortlists(shortlists: OpportunityShortlist[]): OpportunityShortlist[] {
  memory.shortlists = shortlists;
  if (persistEnabled()) writeLocalJsonIfDurable(OPPORTUNITY_SHORTLIST_PATH, { shortlists });
  return shortlists;
}

export function registerOpportunityShortlist(next: OpportunityShortlist): OpportunityShortlist[] {
  const state = loadOpportunityUniverseState();
  const updated = appendOpportunityShortlist(state.shortlists, next);
  return writeOpportunityShortlists(updated);
}

export function writeOpportunityAttention(signal: OpportunityAttentionSignal): OpportunityAttentionSignal {
  memory.attention = signal;
  if (persistEnabled()) writeLocalJsonIfDurable(OPPORTUNITY_ATTENTION_PATH, signal);
  return signal;
}

export function appendOpportunityDecision(event: OpportunityDecisionEvent): OpportunityDecisionEvent[] {
  const state = loadOpportunityUniverseState();
  state.decisions = [...state.decisions, event];
  if (persistEnabled()) writeLocalJsonIfDurable(OPPORTUNITY_DECISIONS_PATH, state.decisions);
  return state.decisions;
}

export function writeOpportunityRankingSnapshots(snapshots: OpportunityRankingSnapshot[]): OpportunityRankingSnapshot[] {
  memory.rankingSnapshots = snapshots;
  if (persistEnabled()) writeLocalJsonIfDurable(OPPORTUNITY_RANKING_SNAPSHOT_PATH, { snapshots });
  return snapshots;
}

export function registerOpportunityRankingSnapshot(next: OpportunityRankingSnapshot): OpportunityRankingSnapshot[] {
  const state = loadOpportunityUniverseState();
  return writeOpportunityRankingSnapshots(appendOpportunityRankingSnapshot(state.rankingSnapshots, next));
}

export function writeOpportunityScoreHistory(history: Record<string, OpportunityScoreHistoryEntry[]>): void {
  memory.scoreHistory = history;
  if (persistEnabled()) writeLocalJsonIfDurable(OPPORTUNITY_SCORE_HISTORY_PATH, history);
}

export function recordScoreHistoryDelta(input: {
  candidateId: string;
  field: OpportunityScoreHistoryEntry["field"];
  previous: number | "UNKNOWN";
  current: number | "UNKNOWN";
  timestamp: string;
  reason: string;
  scoringVersion: string;
}): OpportunityScoreHistoryEntry[] {
  const state = loadOpportunityUniverseState();
  if (input.previous === input.current) return state.scoreHistory[input.candidateId] ?? [];
  const entry: OpportunityScoreHistoryEntry = {
    previous: input.previous,
    current: input.current,
    field: input.field,
    timestamp: input.timestamp,
    reason: input.reason,
    scoringVersion: input.scoringVersion,
  };
  const next = {
    ...state.scoreHistory,
    [input.candidateId]: [...(state.scoreHistory[input.candidateId] ?? []), entry],
  };
  writeOpportunityScoreHistory(next);
  return next[input.candidateId] ?? [];
}

export function latestRankingSnapshot(snapshots = loadOpportunityUniverseState().rankingSnapshots): OpportunityRankingSnapshot | null {
  return snapshots.at(-1) ?? null;
}

export function seedHistoricalShortlists(input: {
  originalTen: Array<{ candidateId: string; name: string; rank: number; opportunityScore: number | "UNKNOWN"; monetizationScore: number | "UNKNOWN" }>;
  selectionForty: Array<{ candidateId: string; name: string; rank: number; opportunityScore: number | "UNKNOWN"; monetizationScore: number | "UNKNOWN" }>;
}): OpportunityShortlist[] {
  const v1 = createOpportunityShortlist({
    shortlistId: "osl_askreview_discovery_v1",
    version: 1,
    createdAt: "2026-08-17T05:37:34.508Z",
    sourceDiscoveryRunId: "3fd82037-0f03-425a-9212-f683d7cbd41a",
    selectionCriteria: "Opportunity Scanner maxCandidatesPerRun=10 for discovery run 3fd82037-0f03-425a-9212-f683d7cbd41a",
    status: "SUPERSEDED",
    members: input.originalTen.map((row) => ({
      ...row,
      reason: "Persisted by opportunity_scanner_v1 run cap of 10.",
    })),
    evidenceSnapshot: "Founder-visible cycle shortlist. Not the full historical universe.",
  });
  const v2 = createOpportunityShortlist({
    shortlistId: "osl_second_venture_eval_v2",
    version: 2,
    createdAt: "2026-09-09T06:00:00.000Z",
    sourceDiscoveryRunId: null,
    selectionCriteria: "Merged historical opportunity_candidates ordered by opportunity_score, probe limit 40",
    status: "CURRENT",
    members: input.selectionForty.map((row) => ({
      ...row,
      reason: "Included in SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1 evaluation set.",
    })),
    evidenceSnapshot: "The reported 40 was a query limit over persisted scanner rows, not a 40-candidate discovery run.",
  });
  return writeOpportunityShortlists([v1, v2]);
}
