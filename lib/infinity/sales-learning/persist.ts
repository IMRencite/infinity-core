import { createClient } from "@supabase/supabase-js";
import { SALES_LEARNING_SCOPE } from "./contract";
import { emptySalesLearningState, replaceSalesLearningState } from "./store";
import type { SalesLearningState } from "./types";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistSalesLearningState(state: SalesLearningState): Promise<void> {
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: SALES_LEARNING_SCOPE,
    version: 1,
    instance_id: "sales-learning",
    payload: state,
    updated_at: new Date().toISOString(),
  });
}

export async function hydrateSalesLearningState(state: SalesLearningState): Promise<SalesLearningState> {
  const client = adminClient();
  if (!client) return state;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", SALES_LEARNING_SCOPE).maybeSingle();
  const payload = data?.payload as SalesLearningState | undefined;
  if (payload && Array.isArray(payload.observations) && payload.metrics) {
    replaceSalesLearningState(state, {
      ...emptySalesLearningState(),
      ...payload,
      observations: payload.observations ?? [],
      assignments: payload.assignments ?? [],
      queue: payload.queue ?? [],
      simulations: payload.simulations ?? [],
      guidance: payload.guidance?.length ? payload.guidance : emptySalesLearningState().guidance,
      objection_patterns: payload.objection_patterns ?? [],
      follow_up_patterns: payload.follow_up_patterns ?? [],
      profiles: payload.profiles ?? {},
      knowledge: payload.knowledge ?? emptySalesLearningState().knowledge,
      capacity: { ...emptySalesLearningState().capacity, ...payload.capacity },
      metrics: { ...emptySalesLearningState().metrics, ...payload.metrics },
      events: payload.events ?? [],
    });
  }
  return state;
}
