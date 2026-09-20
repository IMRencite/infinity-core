import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectCommunicationCredentialAttestation, readGmailOAuthMaterial } from "../credential-boundary";
import { readGmailRuntimeConfig } from "../gmail-runtime-config";
import { MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { evaluateAlwaysOnMailboxWatchGate, projectCommunicationSchedulerHq, replaceCommunicationSchedulerState, resetCommunicationSchedulerState } from "@/lib/infinity/production-outbound/communication-runtime";

describe("gmail runtime env mailbox watch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetCommunicationSchedulerState();
  });

  it("reads Gmail material from live process.env, not a static empty bag", () => {
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "live-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "live-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "live-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinity@example.com");
    const material = readGmailOAuthMaterial();
    expect(material.clientId).toBe("live-client-id-value");
    expect(material.clientSecret).toBe("live-client-secret-value");
    expect(material.refreshToken).toBe("live-refresh-token-value");
    const attestation = inspectCommunicationCredentialAttestation();
    expect(attestation.clientIdPresent).toBe(true);
    expect(attestation.refreshTokenPresent).toBe(true);
    expect(attestation.senderEmailDeclared).toBe(true);
    expect(readGmailRuntimeConfig().source).toBe("PROCESS_ENV");
    expect(readGmailRuntimeConfig().fallback_used).toBe(false);
  });

  it("does not treat a GRANT-blind cron tick as watching", () => {
    resetCommunicationSchedulerState();
    replaceCommunicationSchedulerState({
      version: 1,
      last_tick_at: "2026-09-19T01:15:00.000Z",
      last_success_at: null,
      last_failure_at: "2026-09-19T01:15:00.000Z",
      last_gmail_check_at: "2026-09-19T01:15:00.000Z",
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID,GMAIL_OAUTH_CLIENT_SECRET,GMAIL_OAUTH_REFRESH_TOKEN",
      messages_detected: 0,
      detections_24h: [],
      jobs_created: 0,
      jobs_sent: 0,
      scheduler_instance: "communication-tick:test",
      lease: null,
      jobs: [],
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: null,
      last_detected_at: null,
      token_exchange: false,
    });
    const hq = projectCommunicationSchedulerHq(undefined, "2026-09-19T01:16:00.000Z");
    expect(hq.watching).toBe(false);
    expect(hq.mailbox_watch.result).toBe("FAIL");
    expect(hq.mailbox_watch.reasons).toEqual(expect.arrayContaining(["MAILBOX_BLIND_GRANT", "TOKEN_EXCHANGE_FAIL"]));
    expect(evaluateAlwaysOnMailboxWatchGate({
      last_gmail_check_at: hq.last_gmail_check_at,
      now: "2026-09-19T01:16:00.000Z",
      token_exchange: hq.token_exchange,
      last_error: hq.last_error,
      cron_bound: true,
    }).result).toBe("FAIL");
    expect(MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE.defect_class).toContain("GMAIL_ENV_INLINED_POST_DEPLOY");
  });
});
