import { createClient } from "@supabase/supabase-js";
import { PRODUCTION_OUTBOUND_SCOPE } from "./contract";
import { emptyProductionOutboundState, replaceProductionOutboundState } from "./store";
import type { ProductionOutboundState } from "./types";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistProductionOutboundState(state: ProductionOutboundState): Promise<void> {
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: PRODUCTION_OUTBOUND_SCOPE,
    version: 1,
    instance_id: "production-outbound",
    payload: state,
    updated_at: new Date().toISOString(),
  });
}

export async function hydrateProductionOutboundState(state: ProductionOutboundState): Promise<ProductionOutboundState> {
  const client = adminClient();
  if (!client) return state;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", PRODUCTION_OUTBOUND_SCOPE).maybeSingle();
  const payload = data?.payload as ProductionOutboundState | undefined;
  if (payload && payload.metrics && Array.isArray(payload.outbox)) {
    replaceProductionOutboundState(state, {
      ...emptyProductionOutboundState(),
      ...payload,
      control: { ...state.control, ...payload.control },
      usage: { ...emptyProductionOutboundState().usage, ...payload.usage },
      outbox: payload.outbox ?? [],
      decisions: payload.decisions ?? [],
      events: payload.events ?? [],
      metrics: { ...emptyProductionOutboundState().metrics, ...payload.metrics },
    });
  }
  return state;
}
