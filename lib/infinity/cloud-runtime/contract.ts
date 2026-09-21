export const CLOUD_RUNTIME_CONTRACT = "CloudRuntimeProductionizationV1" as const;
export const CLOUD_RUNTIME_VERSION = "cloud-runtime-v1" as const;
export const CLOUD_RUNTIME_SCOPE = "infinity" as const;
export const CLOUD_RUNTIME_PROJECT = "infinity-runtime" as const;
export const CLOUD_RUNTIME_PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox" as const;
export const CLOUD_RUNTIME_PRODUCTION_URL = "https://infinity-runtime.vercel.app" as const;
export const OCCUPANCYNPV_CLOUD_CAMPAIGN_ID =
  "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation" as const;

export const CLOUD_RUNTIME_HEALTH_STATES = [
  "HEALTHY",
  "IDLE",
  "RUNNING",
  "WAITING",
  "DEGRADED",
  "BLOCKED",
  "STALE",
  "OFFLINE",
  "RECOVERING",
] as const;
export type CloudRuntimeHealthState = (typeof CLOUD_RUNTIME_HEALTH_STATES)[number];

export const CLOUD_RUNTIME_WAKE_SOURCES = [
  "CRON_HOURLY",
  "CRON_DAILY",
  "EVENT",
  "MANUAL",
  "RETRY",
  "CATCHUP",
] as const;
export type CloudRuntimeWakeSource = (typeof CLOUD_RUNTIME_WAKE_SOURCES)[number];

export const CLOUD_RUNTIME_EVENT_TYPES = [
  "CUSTOMER_REPLY",
  "INBOUND_LEAD",
  "TRIAL_EVENT",
  "SALES_REPLY",
  "AFFILIATE_APPLICATION",
  "AFFILIATE_CONVERSION",
  "HOLD_PERIOD_ELIGIBLE",
  "PROVIDER_RECOVERY",
  "PROVIDER_FAILURE",
  "MISSION_COMPLETED",
  "NEW_OPPORTUNITY",
  "DEPLOYMENT_COMPLETED",
  "SALES_REVIEW",
  "SALES_REPLY",
  "SALES_FOLLOW_UP_DUE",
  "SALES_TRIAL",
  "SALES_DEMO_REQUEST",
  "SALES_PROSPECT_BATCH",
  "PROSPECT_SOURCE_OBSERVED",
  "PROSPECT_INVENTORY_LOW",
  "PROSPECT_PUBLISHED_TO_SALES",
  "PAYMENT_EVENT",
  "FULFILLMENT_EVENT",
  "PAYOUT_HOLD_EXPIRED",
  "PAYOUT_BATCH_ELIGIBLE",
  "PAYOUT_PROVIDER_RETRY",
  "PAYOUT_RECONCILIATION",
] as const;
export type CloudRuntimeEventType = (typeof CLOUD_RUNTIME_EVENT_TYPES)[number];

export const CLOUD_RUNTIME_PERSISTENCE_GATE = "CloudRuntimePersistenceGate" as const;
export const CLOUD_RUNTIME_SCHEDULER_GATE = "CloudRuntimeSchedulerGate" as const;
export const CLOUD_RUNTIME_LEASE_GATE = "CloudRuntimeLeaseGate" as const;
export const CLOUD_RUNTIME_IDEMPOTENCY_GATE = "CloudRuntimeIdempotencyGate" as const;
export const CLOUD_RUNTIME_RESTART_SAFETY_GATE = "CloudRuntimeRestartSafetyGate" as const;
export const CLOUD_RUNTIME_CATCHUP_GATE = "CloudRuntimeCatchupGate" as const;
export const CLOUD_RUNTIME_EVENT_WAKE_GATE = "CloudRuntimeEventWakeGate" as const;
export const CLOUD_RUNTIME_AUTHORIZATION_GATE = "CloudRuntimeAuthorizationGate" as const;
export const CLOUD_RUNTIME_ARTIFACT_IDENTITY_GATE = "CloudRuntimeArtifactIdentityGate" as const;
export const CLOUD_RUNTIME_HEARTBEAT_GATE = "CloudRuntimeHeartbeatGate" as const;
export const CLOUD_RUNTIME_RUNAWAY_GATE = "CloudRuntimeRunawayGate" as const;
export const CLOUD_RUNTIME_NO_LOCAL_DEPENDENCY_GATE = "CloudRuntimeNoLocalDependencyGate" as const;
export const CLOUD_RUNTIME_SINGLE_SCHEDULER_GATE = "CloudRuntimeSingleSchedulerGate" as const;
export const ALWAYS_ON_AUTONOMY_GATE = "AlwaysOnAutonomyGate" as const;

export const LOCAL_LOOP_STATE_FILE = ".infinity/autonomous-operating-loop/state.json" as const;
export const MAX_RUNTIME_RETRIES = 5;
export const LEASE_SECONDS = 90;
export const MAX_EVENTS_PER_WAKE = 3;
export const MAX_MISSED_TICKS_TO_REPLAY = 0;
