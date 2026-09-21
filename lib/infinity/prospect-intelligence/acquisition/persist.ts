import { createClient } from "@supabase/supabase-js";
import type { ProspectGraph } from "../store";
import { emptyAcquisitionState, type ProspectAcquisitionState } from "./types";

export const PROSPECT_ACQUISITION_SCOPE = "prospect-acquisition-state" as const;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistAcquisitionState(graph: ProspectGraph): Promise<void> {
  const client = adminClient();
  if (!client) return;
  const now = new Date().toISOString();
  await client.from("cloud_runtime_state").upsert({
    scope: PROSPECT_ACQUISITION_SCOPE,
    version: 1,
    instance_id: "prospect-acquisition",
    payload: graph.acquisition,
    updated_at: now,
  });
}

export async function hydrateAcquisitionState(graph: ProspectGraph): Promise<ProspectAcquisitionState> {
  const client = adminClient();
  if (!client) return graph.acquisition;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", PROSPECT_ACQUISITION_SCOPE).maybeSingle();
  const payload = data?.payload as ProspectAcquisitionState | undefined;
  if (payload && payload.metrics && payload.health) {
    graph.acquisition = {
      ...emptyAcquisitionState(),
      ...payload,
      health: payload.health ?? {},
      cursors: payload.cursors ?? {},
      plans: payload.plans ?? [],
      enrichment_queue: payload.enrichment_queue ?? [],
      refresh_queue: payload.refresh_queue ?? [],
      metrics: { ...emptyAcquisitionState().metrics, ...payload.metrics },
      source_quality: payload.source_quality ?? {},
    };
  }
  return graph.acquisition;
}
