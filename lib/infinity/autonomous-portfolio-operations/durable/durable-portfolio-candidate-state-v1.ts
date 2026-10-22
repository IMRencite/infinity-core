import {
  createPortfolioDurableSupabase,
  portfolioDurablePostgresConfigured,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";

export class DurablePortfolioCandidateStateUnavailableError extends Error {
  constructor(message = "DURABLE_CANDIDATE_STATE_UNAVAILABLE") {
    super(message);
    this.name = "DurablePortfolioCandidateStateUnavailableError";
  }
}

export function durableCandidateStateFailClosedRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return portfolioDurablePostgresConfigured(env) && env.NODE_ENV !== "test";
}

export const DURABLE_PORTFOLIO_CANDIDATE_STATE_V1 = "DURABLE_PORTFOLIO_CANDIDATE_STATE_V1" as const;

export const CANDIDATE_STATE_TABLE = "autonomous_portfolio_candidate_state" as const;

export type PortfolioCandidateLane = "CONTENT_SLUG" | "SHIRT_CONCEPT" | "AUTHORITY_GAP";

export type PortfolioCandidateTerminalState =
  | "ACTIVE"
  | "REPAIRABLE"
  | "QUARANTINED_QC_EXHAUSTED"
  | "SUPERSEDED"
  | "PUBLISHED";

export type DurablePortfolioCandidateStateRow = {
  venture_id: string;
  lane: PortfolioCandidateLane;
  candidate_key: string;
  revision_identity: string | null;
  terminal_state: PortfolioCandidateTerminalState;
  failure_class: string | null;
  attempt_count: number;
  failure_reasons: string[];
  quarantine_reason: string | null;
  quarantined_at: string | null;
  last_cycle_id: string | null;
  last_release_sha: string | null;
  payload: Record<string, unknown>;
  updated_at: string;
};

const quarantineKeyCache = new Set<string>();

function cacheKey(input: { venture_id: string; lane: PortfolioCandidateLane; candidate_key: string }): string {
  return `${input.venture_id}:${input.lane}:${input.candidate_key}`;
}

export function hydratePortfolioCandidateQuarantineCache(
  rows: DurablePortfolioCandidateStateRow[],
  options?: { replace?: boolean },
): void {
  if (options?.replace) quarantineKeyCache.clear();
  for (const row of rows) {
    if (row.terminal_state === "QUARANTINED_QC_EXHAUSTED") {
      quarantineKeyCache.add(cacheKey(row));
    }
  }
}

export function countQuarantinedCandidatesInCacheForVenture(venture_id: string): number {
  let count = 0;
  for (const key of quarantineKeyCache) {
    if (key.startsWith(`${venture_id}:`)) count += 1;
  }
  return count;
}

export function resetPortfolioCandidateQuarantineCacheForTests(): void {
  quarantineKeyCache.clear();
}

export function isPortfolioCandidateQuarantinedInCache(input: {
  venture_id: string;
  lane: PortfolioCandidateLane;
  candidate_key: string;
}): boolean {
  return quarantineKeyCache.has(cacheKey(input));
}

export async function loadQuarantinedPortfolioCandidateRows(
  venture_ids: string[],
): Promise<DurablePortfolioCandidateStateRow[]> {
  const client = createPortfolioDurableSupabase();
  if (!client || venture_ids.length === 0) return [];
  const { data } = await client
    .from(CANDIDATE_STATE_TABLE)
    .select("*")
    .in("venture_id", venture_ids)
    .eq("terminal_state", "QUARANTINED_QC_EXHAUSTED");
  const rows = (data ?? []) as DurablePortfolioCandidateStateRow[];
  hydratePortfolioCandidateQuarantineCache(rows, { replace: true });
  return rows;
}

export async function upsertPortfolioCandidateQuarantine(input: {
  venture_id: string;
  lane: PortfolioCandidateLane;
  candidate_key: string;
  revision_identity?: string | null;
  failure_class?: string | null;
  failure_reasons: string[];
  attempt_count: number;
  quarantine_reason?: string | null;
  last_cycle_id?: string | null;
  last_release_sha?: string | null;
  now?: string;
}): Promise<DurablePortfolioCandidateStateRow | null> {
  const now = input.now ?? new Date().toISOString();
  const row: DurablePortfolioCandidateStateRow = {
    venture_id: input.venture_id,
    lane: input.lane,
    candidate_key: input.candidate_key,
    revision_identity: input.revision_identity ?? null,
    terminal_state: "QUARANTINED_QC_EXHAUSTED",
    failure_class: input.failure_class ?? "QC_EXHAUSTED",
    attempt_count: input.attempt_count,
    failure_reasons: input.failure_reasons,
    quarantine_reason: input.quarantine_reason ?? input.failure_reasons[input.failure_reasons.length - 1] ?? "QC_EXHAUSTED",
    quarantined_at: now,
    last_cycle_id: input.last_cycle_id ?? null,
    last_release_sha: input.last_release_sha ?? null,
    payload: {},
    updated_at: now,
  };
  quarantineKeyCache.add(cacheKey(row));
  const client = createPortfolioDurableSupabase();
  if (!client) {
    if (durableCandidateStateFailClosedRequired()) {
      throw new DurablePortfolioCandidateStateUnavailableError("QUARANTINE_WRITE_NO_DB_CLIENT");
    }
    return row;
  }
  const { error } = await client.from(CANDIDATE_STATE_TABLE).upsert(
    {
      venture_id: row.venture_id,
      lane: row.lane,
      candidate_key: row.candidate_key,
      revision_identity: row.revision_identity,
      terminal_state: row.terminal_state,
      failure_class: row.failure_class,
      attempt_count: row.attempt_count,
      failure_reasons: row.failure_reasons,
      quarantine_reason: row.quarantine_reason,
      quarantined_at: row.quarantined_at,
      last_cycle_id: row.last_cycle_id,
      last_release_sha: row.last_release_sha,
      payload: row.payload,
      updated_at: row.updated_at,
    },
    { onConflict: "venture_id,lane,candidate_key" },
  );
  if (error) {
    if (durableCandidateStateFailClosedRequired()) {
      throw new DurablePortfolioCandidateStateUnavailableError(`QUARANTINE_WRITE_FAILED:${error.message}`);
    }
  }
  return row;
}

export async function incrementPortfolioCandidateFailureAttempt(input: {
  venture_id: string;
  lane: PortfolioCandidateLane;
  candidate_key: string;
  revision_identity?: string | null;
  failure_reasons?: string[];
  last_cycle_id?: string | null;
  last_release_sha?: string | null;
}): Promise<number> {
  const client = createPortfolioDurableSupabase();
  const existing = client
    ? (
        await client
          .from(CANDIDATE_STATE_TABLE)
          .select("attempt_count,terminal_state")
          .eq("venture_id", input.venture_id)
          .eq("lane", input.lane)
          .eq("candidate_key", input.candidate_key)
          .maybeSingle()
      ).data
    : null;
  if (existing?.terminal_state === "QUARANTINED_QC_EXHAUSTED") {
    return Number(existing.attempt_count ?? 0);
  }
  const next = Number(existing?.attempt_count ?? 0) + 1;
  if (!client) {
    if (durableCandidateStateFailClosedRequired()) {
      throw new DurablePortfolioCandidateStateUnavailableError("ATTEMPT_WRITE_NO_DB_CLIENT");
    }
    return next;
  }
  const { error } = await client.from(CANDIDATE_STATE_TABLE).upsert(
    {
      venture_id: input.venture_id,
      lane: input.lane,
      candidate_key: input.candidate_key,
      revision_identity: input.revision_identity ?? null,
      terminal_state: "REPAIRABLE",
      attempt_count: next,
      failure_reasons: input.failure_reasons ?? [],
      updated_at: new Date().toISOString(),
      last_cycle_id: input.last_cycle_id ?? null,
      last_release_sha: input.last_release_sha ?? null,
    },
    { onConflict: "venture_id,lane,candidate_key" },
  );
  if (error && durableCandidateStateFailClosedRequired()) {
    throw new DurablePortfolioCandidateStateUnavailableError(`ATTEMPT_WRITE_FAILED:${error.message}`);
  }
  return next;
}

export async function readPortfolioCandidateAttemptCount(input: {
  venture_id: string;
  lane: PortfolioCandidateLane;
  candidate_key: string;
}): Promise<number> {
  const client = createPortfolioDurableSupabase();
  if (!client) return 0;
  const { data } = await client
    .from(CANDIDATE_STATE_TABLE)
    .select("attempt_count,terminal_state")
    .eq("venture_id", input.venture_id)
    .eq("lane", input.lane)
    .eq("candidate_key", input.candidate_key)
    .maybeSingle();
  if (!data) return 0;
  return Number(data.attempt_count ?? 0);
}

export function durablePortfolioCandidateStateTableRegistered(): boolean {
  return CANDIDATE_STATE_TABLE.length > 0 && typeof PORTFOLIO_DURABLE_TABLES.cycles === "string";
}
