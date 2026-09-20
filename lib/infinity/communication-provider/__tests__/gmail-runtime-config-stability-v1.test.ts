import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  CRON_CREDENTIAL_STABILITY_REQUIRED,
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  cronExecutionIsCredentialHealthy,
  evaluateCommunicationRuntimeStartupGracePolicy,
  evaluateCronCredentialVisibilityStabilityGate,
  evaluateGmailCredentialConflictGate,
  evaluateGmailRuntimeConfigFallbackPolicy,
  fingerprintGmailRefreshToken,
  readGmailRuntimeConfig,
} from "../gmail-runtime-config";
import { evaluateCommunicationRuntimeEnvironmentParityGate } from "@/lib/infinity/production-outbound/communication-runtime";
import { CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";

describe("gmail runtime config stability v1", () => {
  it("reads native process.env at request time without dumping the full environment", () => {
    viStub();
    const config = readGmailRuntimeConfig();
    expect(config.reader_version).toBe(GMAIL_RUNTIME_CONFIG_READER_VERSION);
    expect(config.read_time).toBe("REQUEST_TIME");
    expect(config.client_present).toBe(true);
    expect(config.secret_present).toBe(true);
    expect(config.refresh_present).toBe(true);
    expect(config.sender_present).toBe(true);
    expect(config.configured).toBe(true);
    expect(config.conflict).toBe(false);
    expect(config.source).toBe("PROCESS_ENV");
    expect(config.fallback_used).toBe(false);
    expect(readFileSync("lib/infinity/communication-provider/gmail-runtime-config.ts", "utf8")).not.toContain("JSON.stringify(process.env)");
    expect(readFileSync("lib/infinity/communication-provider/gmail-runtime-config.ts", "utf8")).toContain("shell: false");
  });

  it("fails conflict when sources disagree and does not silently pick one", () => {
    expect(evaluateGmailCredentialConflictGate({ conflict: true, conflicted_fields: ["GMAIL_OAUTH_REFRESH_TOKEN"] }).result).toBe("FAIL");
    expect(evaluateGmailCredentialConflictGate({ conflict: false }).result).toBe("PASS");
    expect(evaluateGmailRuntimeConfigFallbackPolicy({
      native_present: true,
      fallback_used: true,
      fallback_only_missing_fields: false,
      conflict: false,
    }).result).toBe("FAIL");
  });

  it("requires five consecutive healthy Vercel Cron executions", () => {
    expect(evaluateCronCredentialVisibilityStabilityGate({ consecutive_healthy: 1 }).result).toBe("NOT_PROVEN");
    expect(evaluateCronCredentialVisibilityStabilityGate({ consecutive_healthy: 4 }).result).toBe("NOT_PROVEN");
    expect(evaluateCronCredentialVisibilityStabilityGate({ consecutive_healthy: CRON_CREDENTIAL_STABILITY_REQUIRED }).result).toBe("PASS");
    expect(evaluateCronCredentialVisibilityStabilityGate({
      consecutive_healthy: 5,
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID",
    }).result).toBe("FAIL");
    expect(evaluateCronCredentialVisibilityStabilityGate({
      consecutive_healthy: 0,
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID",
    }).reasons).toContain("CREDENTIAL_VISIBILITY_FAILURE");
    expect(cronExecutionIsCredentialHealthy({
      trigger: "VERCEL_CRON",
      configured: true,
      client_present: true,
      secret_present: true,
      refresh_present: true,
      sender_present: true,
      token_exchange: true,
      gmail_readonly: true,
      gmail_send: true,
      last_error: null,
      conflict: false,
    })).toBe(true);
    expect(cronExecutionIsCredentialHealthy({
      trigger: "MANUAL",
      configured: true,
      client_present: true,
      secret_present: true,
      refresh_present: true,
      sender_present: true,
      token_exchange: true,
      gmail_readonly: true,
      gmail_send: true,
      last_error: null,
      conflict: false,
    })).toBe(false);
  });

  it("models startup grace without hiding persistent GRANT failure", () => {
    expect(evaluateCommunicationRuntimeStartupGracePolicy({
      deployment_just_changed: true,
      cron_cycles_since_deploy: 1,
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID",
      configured: false,
    }).state).toBe("INITIALIZING");
    expect(evaluateCommunicationRuntimeStartupGracePolicy({
      deployment_just_changed: true,
      cron_cycles_since_deploy: 3,
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID",
      configured: false,
    }).state).toBe("DEGRADED");
    expect(evaluateCommunicationRuntimeStartupGracePolicy({
      deployment_just_changed: false,
      cron_cycles_since_deploy: 8,
      last_error: null,
      configured: true,
    }).state).toBe("STABLE");
  });

  it("fails environment parity when HTTP and cron fingerprints diverge", () => {
    expect(evaluateCommunicationRuntimeEnvironmentParityGate({
      cron_client_present: true,
      cron_secret_present: true,
      cron_refresh_present: true,
      cron_sender_present: true,
      runtime_client_present: true,
      runtime_secret_present: true,
      runtime_refresh_present: true,
      runtime_sender_present: true,
      http_fingerprint: "2c60da8a2c79",
      cron_fingerprint: "aaaaaaaaaaaa",
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeEnvironmentParityGate({
      cron_client_present: true,
      cron_secret_present: true,
      cron_refresh_present: true,
      cron_sender_present: true,
      runtime_client_present: true,
      runtime_secret_present: true,
      runtime_refresh_present: true,
      runtime_sender_present: true,
      http_fingerprint: "2c60da8a2c79",
      cron_fingerprint: "2c60da8a2c79",
    }).result).toBe("PASS");
    expect(fingerprintGmailRefreshToken("refresh-token-value")).toBe(
      createHash("sha256").update("refresh-token-value").digest("hex").slice(0, 12),
    );
    expect(CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE.defect_class).toContain("CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE");
    expect(CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE.defect_class).toContain("GMAIL_CREDENTIAL_READ_ORDER_RACE");
  });
});

function viStub() {
  process.env.GMAIL_OAUTH_CLIENT_ID = "live-client-id-value";
  process.env.GMAIL_OAUTH_CLIENT_SECRET = "live-client-secret-value";
  process.env.GMAIL_OAUTH_REFRESH_TOKEN = "live-refresh-token-value";
  process.env.GMAIL_SENDER_EMAIL = "infinity@example.com";
}
