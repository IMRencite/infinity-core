import { randomUUID } from "node:crypto";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";

export const AUTONOMOUS_DEPLOY_TELEMETRY_V1 = "AUTONOMOUS_DEPLOY_TELEMETRY_V1" as const;

export type SafeDeployTelemetryInput = {
  cycle_id?: string | null;
  job_id?: string | null;
  venture_id: string;
  bundle_started_at?: string | null;
  bundle_completed_at?: string | null;
  bundle_file_count?: number | null;
  bundle_bytes?: number | null;
  deployment_requested_at?: string | null;
  vercel_deployment_id?: string | null;
  build_status?: string | null;
  alias_promotion_status?: string | null;
  production_get_status?: number | null;
  canonical_check?: string | null;
  schema_check?: string | null;
  sitemap_check?: string | null;
  safe_payload?: Record<string, unknown>;
};

export async function persistAutonomousDeployTelemetry(input: SafeDeployTelemetryInput): Promise<string | null> {
  const client = createPortfolioDurableSupabase();
  if (!client) return null;
  const telemetry_id = randomUUID();
  const { error } = await client.from(PORTFOLIO_DURABLE_TABLES.deployTelemetry).insert({
    telemetry_id,
    cycle_id: input.cycle_id ?? null,
    job_id: input.job_id ?? null,
    venture_id: input.venture_id,
    bundle_started_at: input.bundle_started_at ?? null,
    bundle_completed_at: input.bundle_completed_at ?? null,
    bundle_file_count: input.bundle_file_count ?? null,
    bundle_bytes: input.bundle_bytes ?? null,
    deployment_requested_at: input.deployment_requested_at ?? null,
    vercel_deployment_id: input.vercel_deployment_id ?? null,
    build_status: input.build_status ?? null,
    alias_promotion_status: input.alias_promotion_status ?? null,
    production_get_status: input.production_get_status ?? null,
    canonical_check: input.canonical_check ?? null,
    schema_check: input.schema_check ?? null,
    sitemap_check: input.sitemap_check ?? null,
    safe_payload: input.safe_payload ?? {},
  });
  return error ? null : telemetry_id;
}

export function autonomousDeployTelemetryQc(): "PASS" | "FAIL" {
  return typeof AUTONOMOUS_DEPLOY_TELEMETRY_V1 === "string" ? "PASS" : "FAIL";
}
