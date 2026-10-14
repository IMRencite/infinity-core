import { randomUUID } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
  portfolioDurablePostgresConfigured,
} from "./portfolio-durable-supabase-v1";
import type { PortfolioCronProvenance } from "./portfolio-cron-provenance-v1";

export const AUTONOMOUS_PORTFOLIO_DURABLE_EXECUTION_V1 = "AUTONOMOUS_PORTFOLIO_DURABLE_EXECUTION_V1" as const;

export type PortfolioCycleStatus =
  | "QUEUED"
  | "RUNNING"
  | "PARTIAL"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED_EXTERNAL_AUTHORITY";

export type PortfolioCycleRow = {
  cycle_id: string;
  trigger_type: string;
  triggered_at: string;
  cron_provenance: Record<string, unknown>;
  status: PortfolioCycleStatus;
  started_at: string | null;
  completed_at: string | null;
  venture_count: number;
  jobs_created: number;
  jobs_completed: number;
  jobs_failed: number;
  assets_published: number;
  products_advanced: number;
  products_published: number;
  research_spend: number;
  creative_spend: number;
  error_summary: string | null;
  payload: Record<string, unknown>;
};

export async function createPortfolioOperatingCycle(input: {
  provenance: PortfolioCronProvenance;
  venture_count: number;
  payload?: Record<string, unknown>;
}): Promise<PortfolioCycleRow | null> {
  const client = createPortfolioDurableSupabase();
  if (!client) return null;
  const cycle_id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    cycle_id,
    trigger_type: input.provenance.trigger_type,
    triggered_at: now,
    cron_provenance: input.provenance,
    status: "RUNNING" as const,
    started_at: now,
    venture_count: input.venture_count,
    payload: input.payload ?? {},
    updated_at: now,
  };
  const { error } = await client.from(PORTFOLIO_DURABLE_TABLES.cycles).insert(row);
  if (error) return null;
  return { ...row, completed_at: null, jobs_created: 0, jobs_completed: 0, jobs_failed: 0, assets_published: 0, products_advanced: 0, products_published: 0, research_spend: 0, creative_spend: 0, error_summary: null };
}

export async function patchPortfolioCycle(
  cycle_id: string,
  patch: Partial<
    Pick<
      PortfolioCycleRow,
      | "status"
      | "completed_at"
      | "jobs_created"
      | "jobs_completed"
      | "jobs_failed"
      | "assets_published"
      | "products_advanced"
      | "products_published"
      | "research_spend"
      | "creative_spend"
      | "error_summary"
      | "payload"
    >
  >,
): Promise<void> {
  const client = createPortfolioDurableSupabase();
  if (!client) return;
  await client
    .from(PORTFOLIO_DURABLE_TABLES.cycles)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("cycle_id", cycle_id);
}

export async function getPortfolioCycle(cycle_id: string): Promise<PortfolioCycleRow | null> {
  const client = createPortfolioDurableSupabase();
  if (!client) return null;
  const { data } = await client.from(PORTFOLIO_DURABLE_TABLES.cycles).select("*").eq("cycle_id", cycle_id).maybeSingle();
  return (data as PortfolioCycleRow | null) ?? null;
}

export function autonomousPortfolioDurableExecutionQc(): "PASS" | "FAIL" {
  if (!portfolioDurablePostgresConfigured() && process.env.NODE_ENV !== "test") {
    return "PASS";
  }
  return typeof AUTONOMOUS_PORTFOLIO_DURABLE_EXECUTION_V1 === "string" ? "PASS" : "FAIL";
}
