import { AUTONOMOUS_DAILY_OPERATING_LOOP } from "@/lib/infinity/autonomous-operating-loop/types";
import type { AutonomousLoopPersistedState } from "@/lib/infinity/autonomous-operating-loop/types";
import {
  CLOUD_RUNTIME_CONTRACT,
  CLOUD_RUNTIME_SCOPE,
  CLOUD_RUNTIME_VERSION,
  LEASE_SECONDS,
} from "./contract";
import type {
  CloudRuntimeFailureRecord,
  CloudRuntimeIdempotencyRecord,
  CloudRuntimeLease,
  CloudRuntimePersistedState,
} from "./types";

function emptyLoop(now: string): AutonomousLoopPersistedState {
  return {
    contract: AUTONOMOUS_DAILY_OPERATING_LOOP,
    portfolio_state: "BOOTSTRAPPING",
    venture_states: {},
    last_decision: null,
    last_explanation: null,
    last_mission_id: null,
    last_completed_mission_id: null,
    last_action_idempotency_key: null,
    last_external_action_key: null,
    last_action_at: null,
    last_action_kind: null,
    waiting_dependency: null,
    last_daily_review_at: null,
    next_daily_review_at: null,
    next_run_at: null,
    daily_reviews: [],
    pending_events: [],
    consecutive_failures: 0,
    same_decision_streak: 0,
    learning: [],
    decision_history: [],
    action_history: [],
    mission_history: [],
    updated_at: now,
  };
}

export function emptyCloudRuntimeState(now: string, instanceId = "runtime:memory"): CloudRuntimePersistedState {
  return {
    contract: CLOUD_RUNTIME_CONTRACT,
    scope: CLOUD_RUNTIME_SCOPE,
    version: 1,
    instance_id: instanceId,
    loop: emptyLoop(now),
    heartbeat: {
      state: "IDLE",
      last_wake_at: null,
      last_wake_source: null,
      last_successful_iteration_at: null,
      last_failed_iteration_at: null,
      last_meaningful_action: null,
      next_review_at: null,
      next_expected_wake_at: null,
      runtime_version: CLOUD_RUNTIME_VERSION,
      deployment_id: null,
      git_sha: null,
      lease_held: false,
      current_mission: null,
      failure_reason: null,
      freshness: "UNKNOWN",
      scheduler_freshness: "UNKNOWN",
      invocation_count: 0,
      known_execution_cost: "UNKNOWN",
      provider_calls: 0,
    },
    lease: null,
    idempotency: [],
    event_ids: [],
    failed_work: [],
    observation: {
      occupancy_loaded: false,
      campaign_id: null,
      campaign_recognized: false,
      duplicate_campaign: false,
      sales_floor_available: false,
      affiliate_available: false,
      affiliate_program_state: null,
      payout_live: false,
      outreach_sent: false,
      affiliate_outreach_sent: false,
    },
    last_completed_action_key: null,
    last_catchup_reason: null,
    local_file_used: false,
    hq_required: false,
    founder_pc_required: false,
    founder_browser_required: false,
    public_imros_required: false,
    updated_at: now,
  };
}

export type CloudRuntimeStateStore = {
  kind: "DURABLE_MEMORY" | "DURABLE_POSTGRES";
  uses_local_file: false;
  load(now: string): Promise<CloudRuntimePersistedState>;
  save(state: CloudRuntimePersistedState): Promise<CloudRuntimePersistedState>;
  claimLease(input: { holder: string; instance_id: string; now: string; seconds?: number }): Promise<{
    acquired: boolean;
    lease: CloudRuntimeLease | null;
    reason: string;
  }>;
  releaseLease(holder: string): Promise<void>;
  rememberIdempotency(record: CloudRuntimeIdempotencyRecord): Promise<boolean>;
  hasIdempotency(key: string): Promise<boolean>;
  rememberEvent(eventId: string): Promise<boolean>;
  recordFailure(record: CloudRuntimeFailureRecord): Promise<void>;
  snapshot(): string;
  restore(serialized: string): void;
};

export class MemoryCloudRuntimeStore implements CloudRuntimeStateStore {
  readonly kind = "DURABLE_MEMORY" as const;
  readonly uses_local_file = false as const;
  private state: CloudRuntimePersistedState;
  private keys = new Map<string, CloudRuntimeIdempotencyRecord>();
  private events = new Set<string>();

  constructor(now = new Date().toISOString()) {
    this.state = emptyCloudRuntimeState(now);
  }

  async load(now: string): Promise<CloudRuntimePersistedState> {
    return structuredClone({ ...this.state, updated_at: this.state.updated_at || now });
  }

  async save(state: CloudRuntimePersistedState): Promise<CloudRuntimePersistedState> {
    this.state = structuredClone({ ...state, local_file_used: false });
    return this.load(state.updated_at);
  }

  async claimLease(input: { holder: string; instance_id: string; now: string; seconds?: number }) {
    const seconds = input.seconds ?? LEASE_SECONDS;
    const current = this.state.lease;
    const nowMs = Date.parse(input.now);
    if (current && Date.parse(current.expires_at) > nowMs && current.holder !== input.holder) {
      return { acquired: false, lease: current, reason: "LEASE_HELD" };
    }
    const lease: CloudRuntimeLease = {
      scope: CLOUD_RUNTIME_SCOPE,
      holder: input.holder,
      acquired_at: input.now,
      expires_at: new Date(nowMs + seconds * 1000).toISOString(),
      instance_id: input.instance_id,
    };
    this.state = { ...this.state, lease, updated_at: input.now };
    return { acquired: true, lease, reason: current && Date.parse(current.expires_at) <= nowMs ? "LEASE_TAKEOVER" : "LEASE_ACQUIRED" };
  }

  async releaseLease(holder: string): Promise<void> {
    if (this.state.lease?.holder === holder) {
      this.state = { ...this.state, lease: null };
    }
  }

  async rememberIdempotency(record: CloudRuntimeIdempotencyRecord): Promise<boolean> {
    if (this.keys.has(record.key)) return false;
    this.keys.set(record.key, record);
    this.state = { ...this.state, idempotency: [...this.state.idempotency.slice(-99), record] };
    return true;
  }

  async hasIdempotency(key: string): Promise<boolean> {
    return this.keys.has(key);
  }

  async rememberEvent(eventId: string): Promise<boolean> {
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    this.state = { ...this.state, event_ids: [...this.state.event_ids.slice(-199), eventId] };
    return true;
  }

  async recordFailure(record: CloudRuntimeFailureRecord): Promise<void> {
    this.state = { ...this.state, failed_work: [...this.state.failed_work.slice(-49), record] };
  }

  snapshot(): string {
    return JSON.stringify({
      state: this.state,
      keys: [...this.keys.entries()],
      events: [...this.events],
    });
  }

  restore(serialized: string): void {
    const parsed = JSON.parse(serialized) as {
      state: CloudRuntimePersistedState;
      keys: Array<[string, CloudRuntimeIdempotencyRecord]>;
      events: string[];
    };
    this.state = parsed.state;
    this.keys = new Map(parsed.keys);
    this.events = new Set(parsed.events);
  }
}

let defaultStore: CloudRuntimeStateStore | null = null;

export function getCloudRuntimeStore(): CloudRuntimeStateStore {
  defaultStore ??= new MemoryCloudRuntimeStore();
  return defaultStore;
}

export function resetCloudRuntimeStoreForTests(): MemoryCloudRuntimeStore {
  const store = new MemoryCloudRuntimeStore();
  defaultStore = store;
  return store;
}

export function bindCloudRuntimeStore(store: CloudRuntimeStateStore): void {
  defaultStore = store;
}

export function productionUsesLocalLoopFile(): false {
  return false;
}
