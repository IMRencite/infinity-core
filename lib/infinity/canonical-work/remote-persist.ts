import { createClient } from "@supabase/supabase-js";
import { HQ_CURRENT_IMPLEMENTATION_WORK_ID } from "./current-implementation";
import { listCanonicalWork, upsertCanonicalWork } from "./store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "./types";

export const HQ_CURRENT_IMPLEMENTATION_SCOPE = "hq-current-implementation" as const;
export const HQ_REMOTE_IMPLEMENTATION_STALE_MS = 10 * 60 * 1000;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isRemoteImplementationWork(value: unknown): value is CanonicalWorkExecutionContract {
  if (!value || typeof value !== "object") return false;
  const row = value as CanonicalWorkExecutionContract;
  return row.contract === CANONICAL_WORK_EXECUTION_CONTRACT && row.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID;
}

export async function persistRemoteCurrentImplementationWork(
  work: CanonicalWorkExecutionContract,
): Promise<"WRITTEN" | "SKIPPED"> {
  const client = adminClient();
  if (!client) return "SKIPPED";
  const { error } = await client.from("cloud_runtime_state").upsert({
    scope: HQ_CURRENT_IMPLEMENTATION_SCOPE,
    version: 1,
    instance_id: "hq-live-implementation",
    payload: work,
    updated_at: work.updated_at,
  });
  return error ? "SKIPPED" : "WRITTEN";
}

export async function loadRemoteCurrentImplementationWork(): Promise<CanonicalWorkExecutionContract | null> {
  const client = adminClient();
  if (!client) return null;
  const { data } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", HQ_CURRENT_IMPLEMENTATION_SCOPE)
    .maybeSingle();
  return isRemoteImplementationWork(data?.payload) ? data.payload : null;
}

export function applyRemoteCurrentImplementationWork(
  work: CanonicalWorkExecutionContract | null,
  now = Date.now(),
): CanonicalWorkExecutionContract | null {
  if (!work) return null;
  const updated = Date.parse(work.updated_at);
  if (work.status === "ACTIVE" && Number.isFinite(updated) && now - updated > HQ_REMOTE_IMPLEMENTATION_STALE_MS) {
    return null;
  }
  const local = listCanonicalWork().find((row) => row.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID);
  const localUpdated = local ? Date.parse(local.updated_at) : Number.NaN;
  if (local && Number.isFinite(localUpdated) && Number.isFinite(updated) && localUpdated > updated) {
    return local;
  }
  return upsertCanonicalWork(work, false);
}

export async function hydrateRemoteCurrentImplementationWork(): Promise<CanonicalWorkExecutionContract | null> {
  const remote = await loadRemoteCurrentImplementationWork();
  return applyRemoteCurrentImplementationWork(remote);
}
