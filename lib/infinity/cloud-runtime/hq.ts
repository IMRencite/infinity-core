import {
  CLOUD_RUNTIME_PRODUCTION_URL,
  CLOUD_RUNTIME_PROJECT,
  CLOUD_RUNTIME_VERSION,
} from "./contract";
import type { CloudRuntimeHqProjection, CloudRuntimePersistedState } from "./types";

export function projectCloudRuntimeHq(state: CloudRuntimePersistedState): CloudRuntimeHqProjection {
  return {
    surface: "CLOUD",
    distinction: "CLOUD",
    execution_dependency: false,
    runtime_state: state.heartbeat.state,
    last_wake_at: state.heartbeat.last_wake_at,
    last_successful_iteration_at: state.heartbeat.last_successful_iteration_at,
    last_meaningful_action: state.heartbeat.last_meaningful_action,
    next_review_at: state.heartbeat.next_review_at,
    current_mission: state.heartbeat.current_mission,
    wake_reason: state.heartbeat.last_wake_source,
    persistence: "DURABLE",
    scheduler: "VERCEL_CRON",
    freshness: state.heartbeat.freshness,
    project: CLOUD_RUNTIME_PROJECT,
    url: CLOUD_RUNTIME_PRODUCTION_URL,
    deployment_id: state.heartbeat.deployment_id ?? process.env.VERCEL_DEPLOYMENT_ID ?? null,
    runtime_version: state.heartbeat.runtime_version || CLOUD_RUNTIME_VERSION,
    git_sha: state.heartbeat.git_sha,
    lease_held: state.heartbeat.lease_held,
    next_expected_wake_at: state.heartbeat.next_expected_wake_at,
    persistence_kind:
      process.env.VERCEL === "1" || process.env.INFINITY_CLOUD_RUNTIME === "1"
        ? "DURABLE_POSTGRES"
        : "DURABLE_MEMORY",
  };
}

export function unreachableCloudRuntimeHq(): CloudRuntimeHqProjection {
  return {
    surface: "CLOUD",
    distinction: "CLOUD",
    execution_dependency: false,
    runtime_state: "OFFLINE",
    last_wake_at: null,
    last_successful_iteration_at: null,
    last_meaningful_action: null,
    next_review_at: null,
    current_mission: null,
    wake_reason: null,
    persistence: "MISSING",
    scheduler: "VERCEL_CRON",
    freshness: "STALE",
    project: CLOUD_RUNTIME_PROJECT,
    url: CLOUD_RUNTIME_PRODUCTION_URL,
    deployment_id: null,
    runtime_version: CLOUD_RUNTIME_VERSION,
    git_sha: null,
    lease_held: false,
    next_expected_wake_at: null,
    persistence_kind: "MISSING",
  };
}
