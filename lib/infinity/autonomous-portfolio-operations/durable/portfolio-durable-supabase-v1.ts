import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PortfolioDurableSupabase = SupabaseClient;

export function portfolioDurablePostgresConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createPortfolioDurableSupabase(env: NodeJS.ProcessEnv = process.env): PortfolioDurableSupabase | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const PORTFOLIO_DURABLE_TABLES = {
  cycles: "autonomous_portfolio_cycles",
  jobs: "autonomous_portfolio_jobs",
  ledger: "autonomous_runtime_scheduled_execution_ledger",
  publications: "autonomous_venture_publication_registry",
  deployTelemetry: "autonomous_venture_deploy_telemetry",
} as const;
