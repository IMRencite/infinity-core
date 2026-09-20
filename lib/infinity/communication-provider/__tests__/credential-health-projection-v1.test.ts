import { describe, expect, it } from "vitest";
import {
  applyCredentialHealthObservation,
  classifyCredentialHealthObservationKind,
  emptyCredentialHealthProjection,
  evaluateCredentialHealthWriteConflictGate,
  evaluateDeploymentScopedCredentialHealthGate,
  evaluatePartialInvocationOverwriteGate,
  evaluatePostCronOverwriteProtectionGate,
  evaluatePostCronProtectionFromLog,
  evaluateStaleCredentialHealthWriterGate,
  mergeCredentialHealthObservationLogs,
  projectCredentialHealth,
  stabilityFromProjection,
  type CredentialHealthObservation,
} from "../credential-health-projection";
import { projectCommunicationSchedulerHq } from "@/lib/infinity/production-outbound/communication-runtime";
import { SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine/cycle";
import { credentialHealthOverwriteToPerformanceObservations } from "@/lib/infinity/production-outbound/performance";

const ACTIVE = "dpl_active_test";

function draft(input: Partial<CredentialHealthObservation> & Pick<CredentialHealthObservation, "write_id" | "at" | "invocation_id" | "kind" | "previous_version">): Omit<CredentialHealthObservation, "accepted" | "reject_reason" | "new_version" | "consecutive_after"> {
  return {
    deployment_id: ACTIVE,
    trigger_source: "VERCEL_CRON",
    runtime_instance_id: "iad1",
    route: "/api/runtime/communication-tick",
    function_name: "executeCommunicationRuntimeTick",
    config_source: "PROCESS_ENV",
    config_fingerprint: "2c60da8a2c79",
    exchange_input_fingerprint: "2c60da8a2c79",
    token_exchange: true,
    hydration: "PASS",
    same_invocation_parity: "PASS",
    gmail_readonly: true,
    gmail_send: true,
    last_error: null,
    healthy: true,
    ...input,
  };
}

function applyHealthy(current: ReturnType<typeof emptyCredentialHealthProjection>, index: number) {
  return applyCredentialHealthObservation({
    current,
    observation: draft({
      write_id: `healthy-${index}`,
      at: `2026-09-19T07:0${index}:31.000Z`,
      invocation_id: `inv-healthy-${index}`,
      kind: "COMPLETED",
      previous_version: current.health_version,
    }),
    active_deployment_id: ACTIVE,
  });
}

describe("credential health projection v1", () => {
  it("classifies partial, http, deferred, and completed kinds", () => {
    expect(classifyCredentialHealthObservationKind({
      trigger_source: "VERCEL_CRON",
      hydration_pass: true,
      token_exchange_attempted: true,
      configured: true,
    })).toBe("COMPLETED");
    expect(classifyCredentialHealthObservationKind({
      trigger_source: "VERCEL_CRON",
      hydration_pass: false,
      token_exchange_attempted: false,
      configured: false,
    })).toBe("PARTIAL");
    expect(classifyCredentialHealthObservationKind({
      trigger_source: "HTTP",
      hydration_pass: true,
      token_exchange_attempted: false,
      configured: true,
    })).toBe("HTTP");
    expect(classifyCredentialHealthObservationKind({
      trigger_source: "VERCEL_CRON",
      lease_held: true,
      hydration_pass: true,
      token_exchange_attempted: false,
      configured: true,
    })).toBe("DEFERRED");
  });

  it("rejects a later partial isolate after a completed healthy cron", () => {
    const first = applyHealthy(emptyCredentialHealthProjection(ACTIVE), 1);
    expect(first.accepted).toBe(true);
    expect(first.projection.consecutive_healthy_cron).toBe(1);
    expect(first.projection.credential_health).toBe("HEALTHY");
    const overwrite = applyCredentialHealthObservation({
      current: first.projection,
      observation: draft({
        write_id: "partial-second-isolate",
        at: "2026-09-19T07:01:33.000Z",
        invocation_id: "inv-partial-overwrite",
        kind: "PARTIAL",
        previous_version: 0,
        token_exchange: false,
        hydration: "FAIL",
        same_invocation_parity: "FAIL",
        gmail_readonly: false,
        gmail_send: false,
        last_error: "GRANT:NOT_CONFIGURED",
        healthy: false,
        config_source: "UNAVAILABLE",
        config_fingerprint: null,
        exchange_input_fingerprint: null,
      }),
      active_deployment_id: ACTIVE,
    });
    expect(overwrite.accepted).toBe(false);
    expect(overwrite.observation.reject_reason).toMatch(/PARTIAL_OVER_COMPLETED|STALE_VERSION/);
    expect(overwrite.projection.consecutive_healthy_cron).toBe(1);
    expect(overwrite.projection.last_error).toBeNull();
    expect(overwrite.projection.token_exchange).toBe(true);
    expect(evaluatePartialInvocationOverwriteGate({
      incoming_kind: "PARTIAL",
      current_health: first.projection.credential_health,
      accepted: overwrite.accepted,
    }).result).toBe("PASS");
    expect(evaluatePostCronOverwriteProtectionGate({
      consecutive_before: 1,
      consecutive_after: overwrite.projection.consecutive_healthy_cron,
      later_kind: "PARTIAL",
    }).result).toBe("PASS");
  });

  it("rejects HTTP and diagnostic writes from resetting the counter", () => {
    const first = applyHealthy(emptyCredentialHealthProjection(ACTIVE), 1);
    const http = applyCredentialHealthObservation({
      current: first.projection,
      observation: draft({
        write_id: "http-read",
        at: "2026-09-19T07:01:40.000Z",
        invocation_id: "inv-http",
        kind: "HTTP",
        trigger_source: "HTTP",
        route: "/api/runtime/operating-state",
        function_name: "recordHttpGmailCredentialObservation",
        previous_version: first.projection.health_version,
        token_exchange: false,
        healthy: false,
        last_error: null,
      }),
      active_deployment_id: ACTIVE,
    });
    expect(http.accepted).toBe(false);
    expect(http.projection.consecutive_healthy_cron).toBe(1);
    expect(evaluatePostCronProtectionFromLog(http.projection.observations).result).toBe("PASS");
  });

  it("resets only when an authoritative completed automatic cron fails", () => {
    let current = emptyCredentialHealthProjection(ACTIVE);
    current = applyHealthy(current, 1).projection;
    current = applyHealthy(current, 2).projection;
    expect(current.consecutive_healthy_cron).toBe(2);
    const failed = applyCredentialHealthObservation({
      current,
      observation: draft({
        write_id: "failed-cron",
        at: "2026-09-19T07:03:31.000Z",
        invocation_id: "inv-failed",
        kind: "COMPLETED",
        previous_version: current.health_version,
        token_exchange: false,
        last_error: "GRANT:NOT_CONFIGURED",
        healthy: false,
        gmail_readonly: false,
        gmail_send: false,
      }),
      active_deployment_id: ACTIVE,
    });
    expect(failed.accepted).toBe(true);
    expect(failed.projection.consecutive_healthy_cron).toBe(0);
    expect(failed.projection.credential_health).toBe("DEGRADED");
  });

  it("union-merges concurrent completed cron observations instead of dropping one", () => {
    const first = applyHealthy(emptyCredentialHealthProjection(ACTIVE), 1);
    const second = applyHealthy(first.projection, 2);
    const thirdLocal = applyHealthy(first.projection, 3);
    const merged = mergeCredentialHealthObservationLogs({
      remote: second.projection.observations,
      local: thirdLocal.projection.observations,
      active_deployment_id: ACTIVE,
    });
    expect(merged.consecutive_healthy_cron).toBe(3);
    expect(merged.observations.filter((row) => row.accepted && row.kind === "COMPLETED").length).toBe(3);
  });

  it("increments 1 through 5 from completed automatic crons only", () => {
    let current = emptyCredentialHealthProjection(ACTIVE);
    const counts: number[] = [];
    for (let index = 1; index <= 5; index += 1) {
      const applied = applyHealthy(current, index);
      expect(applied.accepted).toBe(true);
      current = applied.projection;
      counts.push(current.consecutive_healthy_cron);
    }
    expect(counts).toEqual([1, 2, 3, 4, 5]);
    expect(stabilityFromProjection(current).result).toBe("PASS");
  });

  it("rejects foreign deployments and older versions", () => {
    const first = applyHealthy(emptyCredentialHealthProjection(ACTIVE), 1);
    const foreign = applyCredentialHealthObservation({
      current: first.projection,
      observation: draft({
        write_id: "old-deploy",
        at: "2026-09-19T07:02:31.000Z",
        invocation_id: "inv-old-deploy",
        kind: "COMPLETED",
        previous_version: first.projection.health_version,
        deployment_id: "dpl_stale",
        healthy: false,
        token_exchange: false,
        last_error: "GRANT:NOT_CONFIGURED",
      }),
      active_deployment_id: ACTIVE,
    });
    expect(foreign.accepted).toBe(false);
    expect(foreign.DeploymentScopedCredentialHealthGate.result).toBe("FAIL");
    expect(foreign.StaleCredentialHealthWriterGate.reasons).toContain("FOREIGN_DEPLOYMENT");
    expect(foreign.projection.consecutive_healthy_cron).toBe(1);
    expect(evaluateCredentialHealthWriteConflictGate({
      expected_current_version: 0,
      actual_current_version: first.projection.health_version,
    }).result).toBe("FAIL");
    expect(evaluateDeploymentScopedCredentialHealthGate({
      observation_deployment_id: "dpl_stale",
      active_deployment_id: ACTIVE,
    }).result).toBe("FAIL");
    expect(evaluateStaleCredentialHealthWriterGate({
      observation_deployment_id: "dpl_stale",
      active_deployment_id: ACTIVE,
      observation_version: 0,
      current_version: 1,
      kind: "PARTIAL",
      current_authoritative_completed: true,
      observation_at: "2026-09-19T07:00:00.000Z",
      current_authoritative_at: first.projection.last_authoritative_cron_at,
    }).result).toBe("FAIL");
  });

  it("projects HQ credential fields from the append-only log", () => {
    const first = applyHealthy(emptyCredentialHealthProjection(ACTIVE), 1);
    const hq = projectCommunicationSchedulerHq({
      version: 1,
      last_tick_at: "2026-09-19T07:01:31.000Z",
      last_success_at: "2026-09-19T07:01:31.000Z",
      last_failure_at: null,
      last_gmail_check_at: "2026-09-19T07:01:31.000Z",
      last_error: first.projection.last_error,
      messages_detected: 0,
      detections_24h: [],
      jobs_created: 0,
      jobs_sent: 0,
      scheduler_instance: "test",
      lease: null,
      jobs: [],
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: null,
      last_detected_at: null,
      token_exchange: true,
      gmail_readonly_present: true,
      gmail_send_present: true,
      consecutive_healthy_cron: first.projection.consecutive_healthy_cron,
      credential_health: first.projection.credential_health,
      credential_source: "PROCESS_ENV",
      credential_fingerprint: "2c60da8a2c79",
      active_deployment_id: ACTIVE,
      last_authoritative_cron_at: first.projection.last_authoritative_cron_at,
      last_ignored_stale_observation: null,
      last_write_conflict: null,
      credential_projection_version: first.projection.projection_version,
      credential_health_version: first.projection.health_version,
      credential_observations: first.projection.observations,
    }, "2026-09-19T07:01:40.000Z");
    expect(hq.active_deployment_id).toBe(ACTIVE);
    expect(hq.consecutive_healthy_cron).toBe(1);
    expect(hq.credential_projection_version).toBe("credential-health-projection-v1");
    expect(hq.PostCronOverwriteProtectionGate.result).toBe("PASS");
  });

  it("registers the escaped defect and Daily Improvement nightly checks", () => {
    expect(SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE.defect_class).toContain("SECOND_ISOLATE_HEALTH_STATE_OVERWRITE");
    const cycle = runDailyImprovementCycle({
      now: "2026-09-19T06:00:00.000Z",
      date: "2026-09-19",
      trigger: "VERCEL_CRON",
      constraints: {
        outbound_mode: "CANARY",
        organic_execute_publish: false,
        backlink_mode: "DISCOVERY_ONLY",
        mercury_status: "DEGRADED",
        affiliate_engine_active: false,
        communication_last_error: null,
        sales_stage: "ACTIVE_CONVERSATION",
      },
    });
    expect(cycle.run.observations.some((row) => row.observation_id === "obs:second-isolate-health-state-overwrite")).toBe(true);
    expect(cycle.report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Did a stale isolate overwrite newer state?",
      "Did a different deployment affect active health?",
      "Did a partial invocation reset a healthy counter?",
      "Did HTTP/diagnostic traffic mutate cron stability?",
    ]));
    expect(credentialHealthOverwriteToPerformanceObservations({
      at: "2026-09-19T07:01:33.000Z",
      reject_reason: "PARTIAL_OVER_COMPLETED",
      consecutive_healthy_cron: 1,
    })[0]?.rawMetric).toBe("SECOND_ISOLATE_HEALTH_STATE_OVERWRITE");
  });
});
