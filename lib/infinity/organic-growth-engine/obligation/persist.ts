import { createClient } from "@supabase/supabase-js";
import { ORGANIC_HEALTH_SCOPE } from "@/lib/infinity/runtime-isolation/cross-system";
import { getOrganicGrowthSchedulerState, replaceOrganicGrowthSchedulerState, type OrganicGrowthSchedulerState } from "./scheduler";

function adminClient() {
  if (process.env.VITEST) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistOrganicGrowthSchedulerState(state: OrganicGrowthSchedulerState = getOrganicGrowthSchedulerState()): Promise<void> {
  replaceOrganicGrowthSchedulerState(state);
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: ORGANIC_HEALTH_SCOPE,
    version: 1,
    instance_id: "organic-growth-scheduler",
    payload: state,
    updated_at: new Date().toISOString(),
  });
}

export async function hydrateOrganicGrowthSchedulerState(): Promise<OrganicGrowthSchedulerState> {
  const client = adminClient();
  if (!client) return getOrganicGrowthSchedulerState();
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", ORGANIC_HEALTH_SCOPE).maybeSingle();
  const payload = data?.payload as OrganicGrowthSchedulerState | undefined;
  if (payload?.version === 1 && payload.scope === ORGANIC_HEALTH_SCOPE) {
    if (payload.second_canary_status !== "V3_REPAIRED_PASS") {
      payload.publishing_hold = "PAUSED_FOR_SECOND_QC_ESCAPE";
      payload.second_canary_status = payload.second_canary_status ?? "ESCAPED_DEFECT";
      payload.qc_escape_count = Math.max(2, payload.qc_escape_count ?? 2);
    } else if (payload.first_canary_status !== "REPAIRED_PASS" && payload.first_canary_status !== "NONE") {
      payload.publishing_hold = payload.publishing_hold ?? "PAUSED_FOR_QC_REPAIR";
      payload.first_canary_status = payload.first_canary_status ?? "ESCAPED_DEFECT";
      payload.qc_escape_count = Math.max(1, payload.qc_escape_count ?? 1);
    }
    replaceOrganicGrowthSchedulerState(payload);
  }
  return getOrganicGrowthSchedulerState();
}
