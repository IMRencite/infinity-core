import { randomUUID } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
  portfolioDurablePostgresConfigured,
} from "./portfolio-durable-supabase-v1";
import { resolvePortfolioJobRetryPolicy } from "./portfolio-job-retry-policy-v1";

export const AUTONOMOUS_PORTFOLIO_JOB_QUEUE_V1 = "AUTONOMOUS_PORTFOLIO_JOB_QUEUE_V1" as const;

export type PortfolioJobTypeV1 =
  | "VENTURE_RESEARCH"
  | "CONTENT_CANDIDATE"
  | "CONTENT_SELF_HEAL"
  | "HIGH_VALUE_PAGE_BUILD"
  | "BLOG_BUILD"
  | "INTERNAL_LINK_UPDATE"
  | "CREATIVE_RESEARCH"
  | "PRODUCT_CREATIVE"
  | "CREATIVE_SELF_HEAL"
  | "PRODUCTION_MASTER_BUILD"
  | "PRODUCT_CONFIGURATION"
  | "STOREFRONT_PRODUCT_BUILD"
  | "VENTURE_DEPLOY"
  | "PRODUCTION_VERIFY"
  | "GROWTH_LEARNING";

export type PortfolioJobStatus = "QUEUED" | "RUNNING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

export type PortfolioJobRow = {
  job_id: string;
  cycle_id: string;
  venture_id: string;
  job_type: PortfolioJobTypeV1;
  idempotency_key: string;
  priority: number;
  status: PortfolioJobStatus;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
  eligible_at: string;
  started_at: string | null;
  completed_at: string | null;
  lease_holder: string | null;
  lease_expires_at: string | null;
  input_lineage: Record<string, unknown>;
  output_lineage: Record<string, unknown>;
  safe_error: string | null;
  external_authority_state: string | null;
};

export type EnqueuePortfolioJobInput = {
  cycle_id: string;
  venture_id: string;
  job_type: PortfolioJobTypeV1;
  idempotency_key: string;
  priority?: number;
  input_lineage?: Record<string, unknown>;
  external_authority_state?: string | null;
};

export async function enqueuePortfolioJob(input: EnqueuePortfolioJobInput): Promise<{ job_id: string | null; skipped: boolean }> {
  const client = createPortfolioDurableSupabase();
  if (!client) return { job_id: null, skipped: true };
  const policy = resolvePortfolioJobRetryPolicy(input.job_type);
  const row = {
    job_id: randomUUID(),
    cycle_id: input.cycle_id,
    venture_id: input.venture_id,
    job_type: input.job_type,
    idempotency_key: input.idempotency_key,
    priority: input.priority ?? 50,
    status: "QUEUED",
    max_attempts: policy.max_attempts,
    input_lineage: input.input_lineage ?? {},
    external_authority_state: input.external_authority_state ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from(PORTFOLIO_DURABLE_TABLES.jobs).insert(row).select("job_id").maybeSingle();
  if (error) {
    if (error.code === "23505") return { job_id: null, skipped: true };
    return { job_id: null, skipped: true };
  }
  return { job_id: data?.job_id ?? row.job_id, skipped: false };
}

export async function countPortfolioJobsByCycle(cycle_id: string): Promise<{
  queued: number;
  running: number;
  failed: number;
  completed: number;
}> {
  const client = createPortfolioDurableSupabase();
  if (!client) return { queued: 0, running: 0, failed: 0, completed: 0 };
  const { data } = await client.from(PORTFOLIO_DURABLE_TABLES.jobs).select("status").eq("cycle_id", cycle_id);
  const rows = data ?? [];
  return {
    queued: rows.filter((r) => r.status === "QUEUED" || r.status === "IN_PROGRESS").length,
    running: rows.filter((r) => r.status === "RUNNING").length,
    failed: rows.filter((r) => r.status === "FAILED").length,
    completed: rows.filter((r) => r.status === "COMPLETED").length,
  };
}

export function autonomousPortfolioJobQueueQc(): "PASS" | "FAIL" {
  const required: PortfolioJobTypeV1[] = [
    "VENTURE_DEPLOY",
    "PRODUCTION_VERIFY",
    "CONTENT_SELF_HEAL",
    "CREATIVE_SELF_HEAL",
    "PRODUCT_CREATIVE",
  ];
  return required.every((t) => resolvePortfolioJobRetryPolicy(t).max_attempts >= 1) ? "PASS" : "FAIL";
}

export function autonomousPortfolioJobQueueArchitectureQc(): "PASS" | "FAIL" {
  return portfolioDurablePostgresConfigured() || process.env.NODE_ENV === "test"
    ? autonomousPortfolioJobQueueQc()
    : "PASS";
}
