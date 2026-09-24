import { currentSecondQcHold, persistDurableHold, getDurableHold } from "./hold";
import { DurableBlogStore } from "./store";
import type { DurableBlogHold, DurableBlogObligation } from "./types";
import { isIsolatedTestAuthorization, readPublishHoldFromKnownSources } from "./publish-hold-contract";
import {
  CANONICAL_ORGANIC_HOLD_KEY,
  deriveEffectiveOrganicExecutionState,
} from "./effective-execution-state";
import { createOrganicRuntimeClient } from "@/lib/infinity/organic-growth-engine/runtime-principal";
import { assertOrganicPersistWrite } from "@/lib/infinity/organic-growth-engine/obligation/tick-result";

const SCOPE = "blog-os-durable-v3";

function adminClient() {
  return createOrganicRuntimeClient();
}

function freezeAuthorizationHold(existing: DurableBlogHold | undefined, hold: DurableBlogHold): DurableBlogHold {
  if (existing?.hold_id) {
    return {
      ...hold,
      hold_id: existing.hold_id,
      reason: existing.reason,
      hold_state: existing.hold_state,
      hold_version: existing.hold_version,
      execute_publish: existing.execute_publish,
      resolved_at: existing.resolved_at,
      founder_review_status: existing.founder_review_status,
      exit_condition_hash: existing.exit_condition_hash,
      exit_condition_version: existing.exit_condition_version,
    };
  }
  return {
    ...hold,
    execute_publish: false,
    hold_state: hold.hold_state === "CLEARED" ? "ACTIVE" : hold.hold_state,
    resolved_at: null,
  };
}

export async function persistDurableBlogOs(store: DurableBlogStore, hold: DurableBlogHold): Promise<"POSTGRES" | "RUNTIME_JSON" | "MEMORY"> {
  persistDurableHold(hold);
  const client = adminClient();
  if (!client) return "MEMORY";
  const existingJson = await client.from("cloud_runtime_state").select("payload").eq("scope", SCOPE).maybeSingle();
  const existingHold = (existingJson.data?.payload as { hold?: DurableBlogHold } | undefined)?.hold;
  const frozenHold = freezeAuthorizationHold(existingHold, hold);
  persistDurableHold(frozenHold);
  const rows = store.list();
  let tableOk = true;
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
  const fallback = await client.from("cloud_runtime_state").update({
    payload: { hold: frozenHold, obligations: rows, events: rows.flatMap((row) => store.eventsFor(row.id)), scheduler: store.schedulerEvents() },
    updated_at: new Date().toISOString(),
  }).eq("scope", SCOPE).select("scope");
  assertOrganicPersistWrite({
    error: fallback.error,
    rowCount: fallback.data?.length ?? 0,
    stage: "persist_durable",
  });
  if (tableOk && !fallback.error) return "POSTGRES";
  return "RUNTIME_JSON";
}

export async function hydrateDurableBlogOs(store: DurableBlogStore): Promise<DurableBlogHold> {
  const fallbackHold = persistDurableHold(currentSecondQcHold());
  const client = adminClient();
  if (!client) return fallbackHold;
  const table = await client.from("blog_daily_obligations").select("*").eq("venture_id", "occupancynpv");
  const holdRow = await client.from("blog_publishing_holds").select("*").eq("hold_id", fallbackHold.hold_id).maybeSingle();
  const json = await client.from("cloud_runtime_state").select("payload").eq("scope", SCOPE).maybeSingle();
  const scheduler = await client.from("cloud_runtime_state").select("payload").eq("scope", "organic-growth-scheduler-v1").maybeSingle();
  const payload = json.data?.payload as { hold?: DurableBlogHold; obligations?: DurableBlogObligation[] } | undefined;
  const schedulerPayload = scheduler.data?.payload as { publishing_hold?: string | null; execute_publish?: boolean | null } | undefined;
  const canonical = await client
    .from("organic_publication_authorization")
    .select("hold_state,execute_publish,hold_version,updated_at,authorized_decision_id,resolved_at")
    .eq("hold_key", CANONICAL_ORGANIC_HOLD_KEY)
    .maybeSingle();
  if (!table.error && table.data?.length) {
    for (const row of table.data as DurableBlogObligation[]) store.insertDailyObligation(row, { silent: true });
  } else {
    for (const row of payload?.obligations ?? []) store.insertDailyObligation(row, { silent: true });
  }
  const effective = deriveEffectiveOrganicExecutionState({
    canonical: canonical.error ? null : canonical.data,
    scheduler: schedulerPayload,
    canonical_readable: !canonical.error,
  });
  if (effective.result === "AUTHORIZED") {
    return persistDurableHold({
      ...fallbackHold,
      hold_state: "CLEARED",
      execute_publish: true,
      resolved_at: canonical.data?.resolved_at ?? canonical.data?.updated_at ?? new Date().toISOString(),
      founder_review_status: "CLEAR",
    });
  }
  const resolved = readPublishHoldFromKnownSources({
    table_hold: holdRow.error ? null : (holdRow.data as DurableBlogHold | null),
    runtime_hold: payload?.hold ?? null,
    scheduler_publishing_hold: schedulerPayload?.publishing_hold ?? null,
    table_error: holdRow.error?.message ?? null,
    runtime_error: json.error?.message ?? scheduler.error?.message ?? null,
  });
  const productionHold = resolved.hold && isIsolatedTestAuthorization(resolved.hold) ? null : resolved.hold;
  const hold = productionHold ?? fallbackHold;
  return persistDurableHold({
    ...hold,
    execute_publish: false,
    hold_state: "ACTIVE",
    resolved_at: null,
  });
}
