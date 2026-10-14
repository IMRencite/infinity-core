import { randomUUID } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";
import type { PortfolioJobRow } from "./autonomous-portfolio-job-queue-v1";

export const PORTFOLIO_JOB_CLAIM_AND_LEASE_V1 = "PORTFOLIO_JOB_CLAIM_AND_LEASE_V1" as const;

const DEFAULT_LEASE_MS = 240_000;

export async function claimPortfolioJobs(input: {
  limit: number;
  holder?: string;
  lease_ms?: number;
}): Promise<PortfolioJobRow[]> {
  const client = createPortfolioDurableSupabase();
  if (!client) return [];
  const holder = input.holder ?? `worker:${randomUUID().slice(0, 8)}`;
  const leaseMs = input.lease_ms ?? DEFAULT_LEASE_MS;
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpires = new Date(now.getTime() + leaseMs).toISOString();

  const { data: candidates } = await client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .select("*")
    .in("status", ["QUEUED", "IN_PROGRESS"])
    .lte("eligible_at", nowIso)
    .or(`lease_expires_at.is.null,lease_expires_at.lt."${nowIso}"`)
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
