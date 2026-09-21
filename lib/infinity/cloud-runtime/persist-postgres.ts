import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLOUD_RUNTIME_SCOPE, LEASE_SECONDS } from "./contract";
import { emptyCloudRuntimeState, MemoryCloudRuntimeStore, type CloudRuntimeStateStore } from "./store";
import type {
  CloudRuntimeFailureRecord,
  CloudRuntimeIdempotencyRecord,
  CloudRuntimeLease,
  CloudRuntimePersistedState,
} from "./types";

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class PostgresCloudRuntimeStore implements CloudRuntimeStateStore {
  readonly kind = "DURABLE_POSTGRES" as const;
  readonly uses_local_file = false as const;

  constructor(private readonly client: SupabaseClient | null = adminClient()) {}

  async load(now: string): Promise<CloudRuntimePersistedState> {
    if (!this.client) return emptyCloudRuntimeState(now, "runtime:postgres-unconfigured");
    const { data } = await this.client
      .from("cloud_runtime_state")
      .select("payload")
      .eq("scope", CLOUD_RUNTIME_SCOPE)
      .maybeSingle();
    const payload = data?.payload as CloudRuntimePersistedState | undefined;
    return payload?.contract ? { ...payload, local_file_used: false } : emptyCloudRuntimeState(now, "runtime:postgres");
  }

  async save(state: CloudRuntimePersistedState): Promise<CloudRuntimePersistedState> {
    const next = { ...state, local_file_used: false as const };
    if (this.client) {
      await this.client.from("cloud_runtime_state").upsert({
        scope: CLOUD_RUNTIME_SCOPE,
        version: next.version,
        instance_id: next.instance_id,
        payload: next,
        updated_at: next.updated_at,
      });
    }
    return next;
  }

  async claimLease(input: { holder: string; instance_id: string; now: string; seconds?: number }) {
    const seconds = input.seconds ?? LEASE_SECONDS;
    const nowMs = Date.parse(input.now);
    const expires = new Date(nowMs + seconds * 1000).toISOString();
    if (!this.client) {
      const memory = new MemoryCloudRuntimeStore(input.now);
      return memory.claimLease(input);
    }
    const { data: existing } = await this.client
      .from("cloud_runtime_leases")
      .select("holder, expires_at, instance_id, acquired_at")
      .eq("scope", CLOUD_RUNTIME_SCOPE)
      .maybeSingle();
    if (existing && Date.parse(existing.expires_at as string) > nowMs && existing.holder !== input.holder) {
      return {
        acquired: false,
        lease: {
          scope: CLOUD_RUNTIME_SCOPE,
          holder: existing.holder as string,
          acquired_at: existing.acquired_at as string,
          expires_at: existing.expires_at as string,
          instance_id: existing.instance_id as string,
        },
        reason: "LEASE_HELD",
      };
    }
    const lease: CloudRuntimeLease = {
      scope: CLOUD_RUNTIME_SCOPE,
      holder: input.holder,
      acquired_at: input.now,
      expires_at: expires,
      instance_id: input.instance_id,
    };
    await this.client.from("cloud_runtime_leases").upsert({
      scope: CLOUD_RUNTIME_SCOPE,
      holder: lease.holder,
      instance_id: lease.instance_id,
      acquired_at: lease.acquired_at,
      expires_at: lease.expires_at,
    });
    return {
      acquired: true,
      lease,
      reason: existing && Date.parse(existing.expires_at as string) <= nowMs ? "LEASE_TAKEOVER" : "LEASE_ACQUIRED",
    };
  }

  async releaseLease(holder: string): Promise<void> {
    if (!this.client) return;
    await this.client.from("cloud_runtime_leases").delete().eq("scope", CLOUD_RUNTIME_SCOPE).eq("holder", holder);
  }

  async rememberIdempotency(record: CloudRuntimeIdempotencyRecord): Promise<boolean> {
    if (!this.client) return true;
    const { data } = await this.client
      .from("cloud_runtime_idempotency")
      .select("key")
      .eq("scope", CLOUD_RUNTIME_SCOPE)
      .eq("key", record.key)
      .maybeSingle();
    if (data) return false;
    await this.client.from("cloud_runtime_idempotency").insert({
      scope: CLOUD_RUNTIME_SCOPE,
      key: record.key,
      kind: record.kind,
      result: record.result,
      created_at: record.at,
    });
    return true;
  }

  async hasIdempotency(key: string): Promise<boolean> {
    if (!this.client) return false;
    const { data } = await this.client
      .from("cloud_runtime_idempotency")
      .select("key")
      .eq("scope", CLOUD_RUNTIME_SCOPE)
      .eq("key", key)
      .maybeSingle();
    return Boolean(data);
  }

  async rememberEvent(eventId: string): Promise<boolean> {
    if (!this.client) return true;
    const { data } = await this.client
      .from("cloud_runtime_events")
      .select("event_id")
      .eq("scope", CLOUD_RUNTIME_SCOPE)
      .eq("event_id", eventId)
      .maybeSingle();
    if (data) return false;
    await this.client.from("cloud_runtime_events").insert({
      scope: CLOUD_RUNTIME_SCOPE,
      event_id: eventId,
    });
    return true;
  }

  async recordFailure(record: CloudRuntimeFailureRecord): Promise<void> {
    if (!this.client) return;
    await this.client.from("cloud_runtime_failures").insert({
      scope: CLOUD_RUNTIME_SCOPE,
      action_id: record.action_id,
      reason: record.reason,
      attempt_count: record.attempt_count,
      provider: record.provider,
      safe_error: record.safe_error,
      recovery_state: record.recovery_state,
      next_retry_at: record.next_retry_at,
      created_at: record.at,
    });
  }

  snapshot(): string {
    return JSON.stringify({ kind: this.kind });
  }

  restore(_serialized: string): void {
    /* production store reloads from Postgres */
  }
}

export function createProductionCloudRuntimeStore(): CloudRuntimeStateStore {
  if ((process.env.VERCEL === "1" || process.env.INFINITY_CLOUD_RUNTIME === "1") && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new PostgresCloudRuntimeStore();
  }
  return new MemoryCloudRuntimeStore();
}
