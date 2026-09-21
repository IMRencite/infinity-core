import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CRE_CANDIDATE_ID, LIVE_ORG } from "./constants";
import { executeMarketValidationExperiment } from "./execute";
import type { ExperimentExecutionResult } from "./types";
import type { CommercialProviderVerification } from "@/lib/infinity/commercialization/probes/status";

export function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function livePreRunGate(checks: Record<string, boolean>): { ok: boolean; failed: string[] } {
  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  return { ok: failed.length === 0, failed };
}

export async function executeLiveCreMarketExperiment(): Promise<ExperimentExecutionResult> {
  loadEnvLocal();
  return executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID, persist: false });
}

export async function inspectPersistedHostingVerification(): Promise<CommercialProviderVerification | null> {
  if (!loadEnvLocal()) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { loadPersistedProviderVerifications } = await import(
    "@/lib/infinity/commercialization/hq/load-provider-verifications"
  );
  const rows = await loadPersistedProviderVerifications(createAdminClient() as never, LIVE_ORG);
  return rows.find((row) => row.providerCategory === "HOSTING") ?? null;
}
