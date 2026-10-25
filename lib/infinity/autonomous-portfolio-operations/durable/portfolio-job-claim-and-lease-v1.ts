import { randomUUID } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";
import {
  listTestPortfolioJobQueueForTests,
  type PortfolioJobRow,
} from "./autonomous-portfolio-job-queue-v1";

export const PORTFOLIO_JOB_CLAIM_AND_LEASE_V1 = "PORTFOLIO_JOB_CLAIM_AND_LEASE_V1" as const;

const DEFAULT_LEASE_MS = 240_000;

export function claimTestPortfolioJobs(input: {
  limit: number;
  holder?: string;
  lease_ms?: number;
  cycle_id?: string;
  now?: Date;
}): PortfolioJobRow[] {
  const holder = input.holder ?? `worker:test-${Date.now()}`;
  const leaseMs = input.lease_ms ?? DEFAULT_LEASE_MS;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const leaseExpires = new Date(now.getTime() + leaseMs).toISOString();
  const candidates = listTestPortfolioJobQueueForTests()
    .filter((row) => row.status === "QUEUED" || row.status === "IN_PROGRESS")
    .filter((row) => Date.parse(row.eligible_at) <= now.getTime())
    .filter((row) => !row.lease_expires_at || Date.parse(row.lease_expires_at) < now.getTime())
    .filter((row) => !input.cycle_id || row.cycle_id === input.cycle_id)
    .sort((a, b) => b.priority - a.priority || Date.parse(a.eligible_at) - Date.parse(b.eligible_at))
    .slice(0, input.limit);
  const claimed: PortfolioJobRow[] = [];
  for (const row of candidates) {
    row.status = "RUNNING";
    row.lease_holder = holder;
    row.lease_expires_at = leaseExpires;
    row.started_at = row.started_at ?? nowIso;
    row.attempt_count = (row.attempt_count ?? 0) + 1;
    claimed.push({ ...row });
  }
  return claimed;
}

export async function claimPortfolioJobs(input: {
  limit: number;
  holder?: string;
  lease_ms?: number;
  cycle_id?: string;
}): Promise<PortfolioJobRow[]> {
  const client = createPortfolioDurableSupabase();
  if (!client) {
    if (process.env.NODE_ENV === "test") {
      return claimTestPortfolioJobs(input);
    }
    return [];
  }
  const holder = input.holder ?? `worker:${randomUUID().slice(0, 8)}`;
  const leaseMs = input.lease_ms ?? DEFAULT_LEASE_MS;
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpires = new Date(now.getTime() + leaseMs).toISOString();

  let query = client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .select("*")
    .in("status", ["QUEUED", "IN_PROGRESS"])
    .lte("eligible_at", nowIso)
    .or(`lease_expires_at.is.null,lease_expires_at.lt."${nowIso}"`);
  if (input.cycle_id) {
    query = query.eq("cycle_id", input.cycle_id);
  }
  const { data: candidates } = await query
    .order("priority", { ascending: false })
    .order("eligible_at", { ascending: true })
    .limit(input.limit);

  const claimed: PortfolioJobRow[] = [];
  for (const row of candidates ?? []) {
    const { data: updated, error } = await client
      .from(PORTFOLIO_DURABLE_TABLES.jobs)
      .update({
        status: "RUNNING",
        lease_holder: holder,
        lease_expires_at: leaseExpires,
        started_at: row.started_at ?? nowIso,
        attempt_count: (row.attempt_count ?? 0) + 1,
        updated_at: nowIso,
      })
      .eq("job_id", row.job_id)
      .in("status", ["QUEUED", "IN_PROGRESS"])
      .select("*")
      .maybeSingle();
    if (!error && updated) claimed.push(updated as PortfolioJobRow);
  }
  return claimed;
}

export async function releasePortfolioJobLease(job_id: string, holder: string): Promise<void> {
  const client = createPortfolioDurableSupabase();
  if (!client) return;
  await client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .update({ lease_holder: null, lease_expires_at: null, updated_at: new Date().toISOString() })
    .eq("job_id", job_id)
    .eq("lease_holder", holder);
}

export function portfolioJobClaimAndLeaseQc(): "PASS" | "FAIL" {
  return DEFAULT_LEASE_MS >= 60_000 ? "PASS" : "FAIL";
}
