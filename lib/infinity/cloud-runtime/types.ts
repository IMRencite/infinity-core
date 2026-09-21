import type { AutonomousLoopPersistedState } from "@/lib/infinity/autonomous-operating-loop/types";
import type {
  CLOUD_RUNTIME_CONTRACT,
  CloudRuntimeEventType,
  CloudRuntimeHealthState,
  CloudRuntimeWakeSource,
} from "./contract";

export type UnknownOrNumber = number | "UNKNOWN";

export type NamedCloudRuntimeGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type CloudRuntimeLease = {
  scope: string;
  holder: string;
  acquired_at: string;
  expires_at: string;
  instance_id: string;
};

export type CloudRuntimeHeartbeat = {
  state: CloudRuntimeHealthState;
  last_wake_at: string | null;
  last_wake_source: CloudRuntimeWakeSource | null;
  last_successful_iteration_at: string | null;
  last_failed_iteration_at: string | null;
  last_meaningful_action: string | null;
  next_review_at: string | null;
  next_expected_wake_at: string | null;
  runtime_version: string;
  deployment_id: string | null;
  git_sha: string | null;
  lease_held: boolean;
  current_mission: string | null;
  failure_reason: string | null;
  freshness: "FRESH" | "STALE" | "UNKNOWN";
  scheduler_freshness: "FRESH" | "STALE" | "UNKNOWN";
  invocation_count: number;
  known_execution_cost: UnknownOrNumber;
  provider_calls: number;
};

export type CloudRuntimeFailureRecord = {
  action_id: string;
  reason: string;
  attempt_count: number;
  provider: string | null;
  at: string;
  safe_error: string;
  recovery_state: "RETRY_ELIGIBLE" | "DEAD_LETTER" | "RECOVERED";
  next_retry_at: string | null;
};

export type CloudRuntimeIdempotencyRecord = {
  key: string;
  kind: string;
  result: string;
  at: string;
};

export type CloudRuntimeEvent = {
  event_id: string;
  type: CloudRuntimeEventType;
  at: string;
  venture_id: string | null;
  reason: string;
  fixture?: boolean;
};

export type CloudRuntimeObservation = {
  occupancy_loaded: boolean;
  campaign_id: string | null;
  campaign_recognized: boolean;
  duplicate_campaign: false;
  sales_floor_available: boolean;
  affiliate_available: boolean;
  affiliate_program_state: string | null;
  payout_live: false;
  outreach_sent: false;
  affiliate_outreach_sent: false;
};

export type CloudRuntimePersistedState = {
  contract: typeof CLOUD_RUNTIME_CONTRACT;
  scope: string;
  version: number;
  instance_id: string;
  loop: AutonomousLoopPersistedState;
  heartbeat: CloudRuntimeHeartbeat;
  lease: CloudRuntimeLease | null;
  idempotency: CloudRuntimeIdempotencyRecord[];
  event_ids: string[];
  failed_work: CloudRuntimeFailureRecord[];
  observation: CloudRuntimeObservation;
  last_completed_action_key: string | null;
  last_catchup_reason: string | null;
  local_file_used: false;
  hq_required: false;
  founder_pc_required: false;
  founder_browser_required: false;
  public_imros_required: false;
  updated_at: string;
};

export type CloudRuntimeHqProjection = {
  surface: "CLOUD";
  distinction: "CLOUD";
  execution_dependency: false;
  runtime_state: CloudRuntimeHealthState;
  last_wake_at: string | null;
  last_successful_iteration_at: string | null;
  last_meaningful_action: string | null;
  next_review_at: string | null;
  current_mission: string | null;
  wake_reason: CloudRuntimeWakeSource | null;
  persistence: "DURABLE" | "MISSING";
  scheduler: "VERCEL_CRON" | "UNCONFIGURED";
  freshness: CloudRuntimeHeartbeat["freshness"];
  project: string;
  url: string;
  deployment_id: string | null;
  runtime_version: string;
  git_sha: string | null;
  lease_held: boolean;
  next_expected_wake_at: string | null;
  persistence_kind: "DURABLE_POSTGRES" | "DURABLE_MEMORY" | "MISSING";
};

export type CloudRuntimeIterationResult = {
  ran: boolean;
  deferred: boolean;
  duplicate: boolean;
  catchup: boolean;
  decision: string | null;
  mission_created: boolean;
  external_action: false;
  payout_executed: false;
  sales_outreach_sent: false;
  affiliate_outreach_sent: false;
  state: CloudRuntimePersistedState;
  hq: CloudRuntimeHqProjection;
};
