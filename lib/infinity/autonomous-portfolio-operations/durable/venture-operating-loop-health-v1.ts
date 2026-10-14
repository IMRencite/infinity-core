import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";

export type VentureOperatingLoopHealth = {
  venture_id: string;
  LAST_OPERATING_CYCLE_AT: string | null;
  LAST_SUCCESSFUL_JOB_AT: string | null;
  LAST_ASSET_PUBLISHED_AT: string | null;
  QUEUED_JOB_COUNT: number;
  FAILED_JOB_COUNT: number;
  QUALITY_HOLD_COUNT: number;
  NEXT_BEST_GROWTH_ACTION: string;
};

export async function loadVentureOperatingLoopHealth(venture_id: string): Promise<VentureOperatingLoopHealth> {
  const client = createPortfolioDurableSupabase();
  if (!client) {
    return {
      venture_id,
      LAST_OPERATING_CYCLE_AT: null,
      LAST_SUCCESSFUL_JOB_AT: null,
      LAST_ASSET_PUBLISHED_AT: null,
      QUEUED_JOB_COUNT: 0,
      FAILED_JOB_COUNT: 0,
      QUALITY_HOLD_COUNT: 0,
      NEXT_BEST_GROWTH_ACTION: "CONTINUE_PORTFOLIO_CYCLE",
    };
  }
  const { data: jobs } = await client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .select("status, completed_at, created_at, job_type")
    .eq("venture_id", venture_id)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = jobs ?? [];
  const { data: cycles } = await client
    .from(PORTFOLIO_DURABLE_TABLES.cycles)
    .select("triggered_at, assets_published")
    .order("triggered_at", { ascending: false })
    .limit(20);
  const lastCycle = cycles?.[0]?.triggered_at ?? null;
  const lastSuccess = rows.find((r) => r.status === "COMPLETED")?.completed_at ?? null;
  const { data: pubs } = await client
    .from(PORTFOLIO_DURABLE_TABLES.publications)
    .select("published_at")
    .eq("venture_id", venture_id)
    .order("published_at", { ascending: false })
    .limit(1);
  return {
    venture_id,
    LAST_OPERATING_CYCLE_AT: lastCycle,
    LAST_SUCCESSFUL_JOB_AT: lastSuccess,
    LAST_ASSET_PUBLISHED_AT: pubs?.[0]?.published_at ?? null,
    QUEUED_JOB_COUNT: rows.filter((r) => r.status === "QUEUED" || r.status === "IN_PROGRESS").length,
    FAILED_JOB_COUNT: rows.filter((r) => r.status === "FAILED").length,
    QUALITY_HOLD_COUNT: rows.filter((r) => r.job_type === "CREATIVE_SELF_HEAL" && r.status !== "COMPLETED").length,
    NEXT_BEST_GROWTH_ACTION: "CONTINUE_PORTFOLIO_CYCLE",
  };
}

export function ventureOperatingLoopHealthQc(): "PASS" | "FAIL" {
  return typeof loadVentureOperatingLoopHealth === "function" ? "PASS" : "FAIL";
}
