import { createClient } from "@supabase/supabase-js";
import { currentSecondQcHold, persistDurableHold, getDurableHold } from "./hold";
import { DurableBlogStore } from "./store";
import type { DurableBlogHold, DurableBlogObligation } from "./types";

const SCOPE = "blog-os-durable-v3";

function adminClient() {
  if (process.env.VITEST) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistDurableBlogOs(store: DurableBlogStore, hold: DurableBlogHold): Promise<"POSTGRES" | "RUNTIME_JSON" | "MEMORY"> {
  persistDurableHold(hold);
  const client = adminClient();
  if (!client) return "MEMORY";
  const rows = store.list();
  let tableOk = true;
  const holdWrite = await client.from("blog_publishing_holds").upsert({
    hold_id: hold.hold_id,
    venture_id: hold.venture_id,
    reason: hold.reason,
    created_at: hold.created_at,
    owner: hold.owner,
    engineering_owner: hold.engineering_owner,
    founder_decision_owner: hold.founder_decision_owner,
    due_at: hold.due_at,
    next_review_at: hold.next_review_at,
    requested_at: hold.requested_at,
    renotify_at: hold.renotify_at,
    escalation_count: hold.escalation_count,
    exit_condition_version: hold.exit_condition_version,
    exit_condition_frozen_at: hold.exit_condition_frozen_at,
    exit_condition_hash: hold.exit_condition_hash,
    evidence_required: hold.evidence_required,
    evidence_pack_url: hold.evidence_pack_url,
    founder_review_status: hold.founder_review_status,
    resolved_at: hold.resolved_at,
  });
  if (holdWrite.error) tableOk = false;
  for (const row of rows) {
    const written = await client.from("blog_daily_obligations").upsert(row);
    if (written.error) tableOk = false;
  }
  for (const event of rows.flatMap((row) => store.eventsFor(row.id))) {
    await client.from("blog_obligation_events").upsert(event);
  }
  for (const event of store.schedulerEvents()) {
    await client.from("blog_scheduler_events").upsert(event);
  }
  const fallback = await client.from("cloud_runtime_state").upsert({
    scope: SCOPE,
    version: 1,
    instance_id: "blog-os-durable",
    payload: { hold, obligations: rows, events: rows.flatMap((row) => store.eventsFor(row.id)), scheduler: store.schedulerEvents() },
    updated_at: new Date().toISOString(),
  });
  if (tableOk && !holdWrite.error) return "POSTGRES";
  return fallback.error ? "MEMORY" : "RUNTIME_JSON";
}

export async function hydrateDurableBlogOs(store: DurableBlogStore): Promise<DurableBlogHold> {
  const fallbackHold = persistDurableHold(currentSecondQcHold());
  const client = adminClient();
  if (!client) return fallbackHold;
  const table = await client.from("blog_daily_obligations").select("*").eq("venture_id", "occupancynpv");
  const holdRow = await client.from("blog_publishing_holds").select("*").eq("hold_id", fallbackHold.hold_id).maybeSingle();
  if (!table.error && table.data?.length) {
    for (const row of table.data as DurableBlogObligation[]) store.insertDailyObligation(row, { silent: true });
    return persistDurableHold({
      ...fallbackHold,
      ...((holdRow.data as DurableBlogHold | null) ?? {}),
      engineering_owner: (holdRow.data as DurableBlogHold | null)?.engineering_owner || fallbackHold.engineering_owner,
      founder_decision_owner: (holdRow.data as DurableBlogHold | null)?.founder_decision_owner || fallbackHold.founder_decision_owner,
      exit_condition_hash: (holdRow.data as DurableBlogHold | null)?.exit_condition_hash || fallbackHold.exit_condition_hash,
    });
  }
  const json = await client.from("cloud_runtime_state").select("payload").eq("scope", SCOPE).maybeSingle();
  const payload = json.data?.payload as { hold?: DurableBlogHold; obligations?: DurableBlogObligation[] } | undefined;
  for (const row of payload?.obligations ?? []) store.insertDailyObligation(row, { silent: true });
  return persistDurableHold(payload?.hold ?? fallbackHold);
}
