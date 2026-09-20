import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import type { CredentialHealth, GmailConfigSource, GmailStartupState } from "./gmail-runtime-config";
import { CRON_CREDENTIAL_STABILITY_REQUIRED, evaluateCronCredentialVisibilityStabilityGate } from "./gmail-runtime-config";

export const CREDENTIAL_HEALTH_PROJECTION_VERSION = "credential-health-projection-v1" as const;

export type CredentialHealthStateVersion = number;
export type CredentialHealthObservationKind = "COMPLETED" | "PARTIAL" | "DEFERRED" | "HTTP" | "DIAGNOSTIC";

export type CredentialHealthObservation = {
  write_id: string;
  at: string;
  deployment_id: string | null;
  invocation_id: string;
  trigger_source: string;
  runtime_instance_id: string | null;
  route: string;
  function_name: string;
  previous_version: CredentialHealthStateVersion;
  new_version: CredentialHealthStateVersion | null;
  accepted: boolean;
  reject_reason: string | null;
  kind: CredentialHealthObservationKind;
  config_source: GmailConfigSource | null;
  config_fingerprint: string | null;
  exchange_input_fingerprint: string | null;
  token_exchange: boolean;
  hydration: "PASS" | "FAIL";
  same_invocation_parity: "PASS" | "FAIL";
  gmail_readonly: boolean;
  gmail_send: boolean;
  last_error: string | null;
  consecutive_after: number | null;
  healthy: boolean;
};

export type CredentialHealthProjection = {
  projection_version: typeof CREDENTIAL_HEALTH_PROJECTION_VERSION;
  health_version: CredentialHealthStateVersion;
  credential_health: CredentialHealth;
  credential_source: GmailConfigSource | null;
  credential_fingerprint: string | null;
  exchange_input_fingerprint: string | null;
  consecutive_healthy_cron: number;
  last_error: string | null;
  last_successful_cron_at: string | null;
  last_failed_cron_at: string | null;
  last_successful_exchange_at: string | null;
  last_credential_failure_at: string | null;
  last_ignored_stale_observation: string | null;
  last_write_conflict: string | null;
  last_authoritative_cron_at: string | null;
  last_authoritative_invocation_id: string | null;
  active_deployment_id: string | null;
  token_exchange: boolean;
  gmail_readonly_present: boolean;
  gmail_send_present: boolean;
  same_invocation_parity: "PASS" | "FAIL" | null;
  hydration_result: "PASS" | "FAIL" | null;
  startup_state: GmailStartupState;
  observations: CredentialHealthObservation[];
};

export function emptyCredentialHealthProjection(activeDeployment: string | null = null): CredentialHealthProjection {
  return {
    projection_version: CREDENTIAL_HEALTH_PROJECTION_VERSION,
    health_version: 0,
    credential_health: "DEGRADED",
    credential_source: null,
    credential_fingerprint: null,
    exchange_input_fingerprint: null,
    consecutive_healthy_cron: 0,
    last_error: null,
    last_successful_cron_at: null,
    last_failed_cron_at: null,
    last_successful_exchange_at: null,
    last_credential_failure_at: null,
    last_ignored_stale_observation: null,
    last_write_conflict: null,
    last_authoritative_cron_at: null,
    last_authoritative_invocation_id: null,
    active_deployment_id: activeDeployment,
    token_exchange: false,
    gmail_readonly_present: false,
    gmail_send_present: false,
    same_invocation_parity: null,
    hydration_result: null,
    startup_state: "DEGRADED",
    observations: [],
  };
}

export function classifyCredentialHealthObservationKind(input: {
  trigger_source: string;
  lease_held?: boolean;
  hydration_pass: boolean;
  token_exchange_attempted: boolean;
  configured: boolean;
}): CredentialHealthObservationKind {
  if (input.lease_held) return "DEFERRED";
  if (input.trigger_source === "HTTP") return "HTTP";
  if (input.trigger_source !== "VERCEL_CRON") return "DIAGNOSTIC";
  if (!input.configured || !input.hydration_pass || !input.token_exchange_attempted) return "PARTIAL";
  return "COMPLETED";
}

export function evaluateCredentialHealthWriteConflictGate(input: {
  expected_current_version: number;
  actual_current_version: number;
}): NamedOutboundLoopGate {
  if (input.expected_current_version !== input.actual_current_version) {
    return { gate: "CredentialHealthWriteConflictGate", result: "FAIL", reasons: ["STALE_VERSION"] };
  }
  return { gate: "CredentialHealthWriteConflictGate", result: "PASS", reasons: ["VERSION_MATCH"] };
}

export function evaluateDeploymentScopedCredentialHealthGate(input: {
  observation_deployment_id: string | null;
  active_deployment_id: string | null;
}): NamedOutboundLoopGate {
  if (!input.active_deployment_id || !input.observation_deployment_id) {
    return { gate: "DeploymentScopedCredentialHealthGate", result: "FAIL", reasons: ["DEPLOYMENT_UNSCOPED"] };
  }
  if (input.observation_deployment_id !== input.active_deployment_id) {
    return { gate: "DeploymentScopedCredentialHealthGate", result: "FAIL", reasons: ["FOREIGN_DEPLOYMENT"] };
  }
  return { gate: "DeploymentScopedCredentialHealthGate", result: "PASS", reasons: ["ACTIVE_DEPLOYMENT"] };
}

export function evaluateStaleCredentialHealthWriterGate(input: {
  observation_deployment_id: string | null;
  active_deployment_id: string | null;
  observation_version: number;
  current_version: number;
  kind: CredentialHealthObservationKind;
  current_authoritative_completed: boolean;
  observation_at: string;
  current_authoritative_at: string | null;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.active_deployment_id && input.observation_deployment_id && input.observation_deployment_id !== input.active_deployment_id) {
    reasons.push("FOREIGN_DEPLOYMENT");
  }
  if (input.observation_version < input.current_version) reasons.push("OLDER_VERSION");
  if ((input.kind === "PARTIAL" || input.kind === "DEFERRED" || input.kind === "HTTP" || input.kind === "DIAGNOSTIC") && input.current_authoritative_completed) {
    reasons.push("PARTIAL_OVER_COMPLETED");
  }
  if (input.current_authoritative_at && Date.parse(input.observation_at) < Date.parse(input.current_authoritative_at)) {
    reasons.push("PREDATED_AUTHORITATIVE");
  }
  return {
    gate: "StaleCredentialHealthWriterGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["WRITER_CURRENT"],
  };
}

export function evaluatePartialInvocationOverwriteGate(input: {
  incoming_kind: CredentialHealthObservationKind;
  current_health: CredentialHealth;
  accepted: boolean;
}): NamedOutboundLoopGate {
  if ((input.incoming_kind === "PARTIAL" || input.incoming_kind === "DEFERRED") && input.current_health === "HEALTHY" && input.accepted) {
    return { gate: "PartialInvocationOverwriteGate", result: "FAIL", reasons: ["PARTIAL_OVERWROTE_HEALTHY"] };
  }
  return { gate: "PartialInvocationOverwriteGate", result: "PASS", reasons: ["PARTIAL_CANNOT_OVERWRITE_HEALTHY"] };
}

export function evaluatePostCronOverwriteProtectionGate(input: {
  consecutive_before: number;
  consecutive_after: number;
  later_kind: CredentialHealthObservationKind;
}): NamedOutboundLoopGate {
  if (input.consecutive_before > 0 && input.consecutive_after < input.consecutive_before && input.later_kind !== "COMPLETED") {
    return { gate: "PostCronOverwriteProtectionGate", result: "FAIL", reasons: ["NON_CRON_RESET"] };
  }
  return { gate: "PostCronOverwriteProtectionGate", result: "PASS", reasons: ["COUNTER_PROTECTED"] };
}

export function cronObservationIsStabilityHealthy(observation: Pick<CredentialHealthObservation, "trigger_source" | "kind" | "healthy" | "token_exchange" | "hydration" | "same_invocation_parity" | "gmail_readonly" | "gmail_send" | "last_error">): boolean {
  return observation.trigger_source === "VERCEL_CRON"
    && observation.kind === "COMPLETED"
    && observation.healthy
    && observation.token_exchange
    && observation.hydration === "PASS"
    && observation.same_invocation_parity === "PASS"
    && observation.gmail_readonly
    && observation.gmail_send
    && !observation.last_error;
}

export function projectCredentialHealth(input: {
  observations: CredentialHealthObservation[];
  active_deployment_id: string | null;
}): CredentialHealthProjection {
  const projected = emptyCredentialHealthProjection(input.active_deployment_id);
  projected.observations = [...input.observations].slice(-24);
  const scoped = input.observations.filter((row) =>
    row.accepted
    && row.kind === "COMPLETED"
    && row.trigger_source === "VERCEL_CRON"
    && (!input.active_deployment_id || !row.deployment_id || row.deployment_id === input.active_deployment_id),
  );
  let consecutive = 0;
  let lastIgnored: string | null = null;
  let lastConflict: string | null = null;
  for (const row of input.observations) {
    if (!row.accepted) {
      lastIgnored = row.at;
      if (row.reject_reason && /VERSION|STALE|FOREIGN|PARTIAL/i.test(row.reject_reason)) lastConflict = row.reject_reason;
    }
  }
  for (const row of scoped) {
    if (cronObservationIsStabilityHealthy(row)) {
      consecutive += 1;
      projected.last_successful_cron_at = row.at;
      projected.last_successful_exchange_at = row.at;
      projected.token_exchange = true;
      projected.gmail_readonly_present = row.gmail_readonly;
      projected.gmail_send_present = row.gmail_send;
      projected.credential_source = row.config_source;
      projected.credential_fingerprint = row.config_fingerprint;
      projected.exchange_input_fingerprint = row.exchange_input_fingerprint;
      projected.same_invocation_parity = row.same_invocation_parity;
      projected.hydration_result = row.hydration;
      projected.last_error = null;
      projected.last_authoritative_cron_at = row.at;
      projected.last_authoritative_invocation_id = row.invocation_id;
    } else {
      consecutive = 0;
      projected.last_failed_cron_at = row.at;
      projected.last_credential_failure_at = row.at;
      projected.last_error = row.last_error;
      projected.token_exchange = row.token_exchange;
      projected.gmail_readonly_present = row.gmail_readonly;
      projected.gmail_send_present = row.gmail_send;
      projected.credential_source = row.config_source;
      projected.credential_fingerprint = row.config_fingerprint;
      projected.exchange_input_fingerprint = row.exchange_input_fingerprint;
      projected.same_invocation_parity = row.same_invocation_parity;
      projected.hydration_result = row.hydration;
      projected.last_authoritative_cron_at = row.at;
      projected.last_authoritative_invocation_id = row.invocation_id;
    }
  }
  const latestAccepted = [...input.observations].reverse().find((row) => row.accepted);
  projected.health_version = latestAccepted?.new_version ?? input.observations.reduce((max, row) => Math.max(max, row.previous_version, row.new_version ?? 0), 0);
  projected.consecutive_healthy_cron = consecutive;
  projected.credential_health = consecutive > 0 && !projected.last_error ? "HEALTHY" : "DEGRADED";
  projected.last_ignored_stale_observation = lastIgnored;
  projected.last_write_conflict = lastConflict;
  projected.active_deployment_id = input.active_deployment_id;
  projected.startup_state = consecutive >= CRON_CREDENTIAL_STABILITY_REQUIRED ? "STABLE" : consecutive > 0 ? "INITIALIZING" : "DEGRADED";
  return projected;
}

export function applyCredentialHealthObservation(input: {
  current: CredentialHealthProjection;
  observation: Omit<CredentialHealthObservation, "accepted" | "reject_reason" | "new_version" | "consecutive_after">;
  active_deployment_id: string | null;
}): {
  projection: CredentialHealthProjection;
  observation: CredentialHealthObservation;
  accepted: boolean;
  CredentialHealthWriteConflictGate: NamedOutboundLoopGate;
  DeploymentScopedCredentialHealthGate: NamedOutboundLoopGate;
  StaleCredentialHealthWriterGate: NamedOutboundLoopGate;
  PartialInvocationOverwriteGate: NamedOutboundLoopGate;
} {
  const current = input.current;
  const conflict = evaluateCredentialHealthWriteConflictGate({
    expected_current_version: input.observation.previous_version,
    actual_current_version: current.health_version,
  });
  const scoped = evaluateDeploymentScopedCredentialHealthGate({
    observation_deployment_id: input.observation.deployment_id,
    active_deployment_id: input.active_deployment_id,
  });
  const stale = evaluateStaleCredentialHealthWriterGate({
    observation_deployment_id: input.observation.deployment_id,
    active_deployment_id: input.active_deployment_id,
    observation_version: input.observation.previous_version,
    current_version: current.health_version,
    kind: input.observation.kind,
    current_authoritative_completed: Boolean(current.last_authoritative_cron_at),
    observation_at: input.observation.at,
    current_authoritative_at: current.last_authoritative_cron_at,
  });
  const foreign = scoped.result === "FAIL" && scoped.reasons.includes("FOREIGN_DEPLOYMENT");
  const partialOverCompleted = stale.reasons.includes("PARTIAL_OVER_COMPLETED");
  const versionMismatch = conflict.result === "FAIL";
  const predates = stale.reasons.includes("PREDATED_AUTHORITATIVE");
  const reject = foreign || partialOverCompleted || predates || (versionMismatch && input.observation.kind !== "COMPLETED");
  const rejectReason = reject
    ? (foreign ? "FOREIGN_DEPLOYMENT" : partialOverCompleted ? "PARTIAL_OVER_COMPLETED" : predates ? "PREDATED_AUTHORITATIVE" : "STALE_VERSION")
    : null;
  const accepted = !reject;
  const nextVersion = accepted ? current.health_version + 1 : null;
  const recorded: CredentialHealthObservation = {
    ...input.observation,
    accepted,
    reject_reason: rejectReason,
    new_version: nextVersion,
    consecutive_after: null,
  };
  const observations = [...current.observations, recorded].slice(-24);
  const projection = accepted
    ? projectCredentialHealth({ observations, active_deployment_id: input.active_deployment_id })
    : { ...current, observations, last_ignored_stale_observation: recorded.at, last_write_conflict: rejectReason };
  if (accepted) projection.health_version = nextVersion ?? projection.health_version;
  recorded.consecutive_after = projection.consecutive_healthy_cron;
  const partialGate = evaluatePartialInvocationOverwriteGate({
    incoming_kind: input.observation.kind,
    current_health: current.credential_health,
    accepted,
  });
  return {
    projection,
    observation: recorded,
    accepted,
    CredentialHealthWriteConflictGate: conflict,
    DeploymentScopedCredentialHealthGate: scoped,
    StaleCredentialHealthWriterGate: stale,
    PartialInvocationOverwriteGate: partialGate,
  };
}

export function evaluatePostCronProtectionFromLog(observations: CredentialHealthObservation[], activeDeployment: string | null = null): NamedOutboundLoopGate {
  const scoped = observations.filter((row) =>
    !activeDeployment || !row.deployment_id || row.deployment_id === activeDeployment,
  );
  for (let index = 1; index < scoped.length; index += 1) {
    const prior = scoped[index - 1]!;
    const next = scoped[index]!;
    if (!next.accepted) continue;
    if (prior.accepted && prior.kind === "COMPLETED" && prior.healthy && prior.consecutive_after && prior.consecutive_after > 0) {
      const gate = evaluatePostCronOverwriteProtectionGate({
        consecutive_before: prior.consecutive_after,
        consecutive_after: next.consecutive_after ?? prior.consecutive_after,
        later_kind: next.kind,
      });
      if (gate.result === "FAIL") return gate;
    }
  }
  return { gate: "PostCronOverwriteProtectionGate", result: "PASS", reasons: ["COUNTER_PROTECTED"] };
}

export function mergeCredentialHealthObservationLogs(input: {
  remote: CredentialHealthObservation[];
  local: CredentialHealthObservation[];
  active_deployment_id: string | null;
}): CredentialHealthProjection {
  const byId = new Map<string, CredentialHealthObservation>();
  for (const row of input.remote) byId.set(row.write_id, row);
  for (const row of input.local) {
    const existing = byId.get(row.write_id);
    if (!existing || (row.accepted && !existing.accepted)) byId.set(row.write_id, row);
  }
  const merged = [...byId.values()].sort((left, right) => {
    const delta = Date.parse(left.at) - Date.parse(right.at);
    return delta !== 0 ? delta : left.write_id.localeCompare(right.write_id);
  });
  let current = emptyCredentialHealthProjection(input.active_deployment_id);
  for (const row of merged) {
    const applied = applyCredentialHealthObservation({
      current,
      observation: {
        write_id: row.write_id,
        at: row.at,
        deployment_id: row.deployment_id,
        invocation_id: row.invocation_id,
        trigger_source: row.trigger_source,
        runtime_instance_id: row.runtime_instance_id,
        route: row.route,
        function_name: row.function_name,
        previous_version: current.health_version,
        kind: row.kind,
        config_source: row.config_source,
        config_fingerprint: row.config_fingerprint,
        exchange_input_fingerprint: row.exchange_input_fingerprint,
        token_exchange: row.token_exchange,
        hydration: row.hydration,
        same_invocation_parity: row.same_invocation_parity,
        gmail_readonly: row.gmail_readonly,
        gmail_send: row.gmail_send,
        last_error: row.last_error,
        healthy: row.healthy,
      },
      active_deployment_id: input.active_deployment_id,
    });
    current = applied.projection;
  }
  return current;
}

export function stabilityFromProjection(projection: CredentialHealthProjection): NamedOutboundLoopGate {
  return evaluateCronCredentialVisibilityStabilityGate({
    consecutive_healthy: projection.consecutive_healthy_cron,
    last_error: projection.last_error,
  });
}
