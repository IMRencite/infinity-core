import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import {
  classifyCommunicationTickSource,
  evaluateAlwaysOnAutonomyTruthGate,
  evaluateAlwaysOnMailboxWatchGate,
  evaluateCommunicationRuntimeConcurrencyGate,
  evaluateCommunicationRuntimeCronHealthGate,
  evaluateCommunicationRuntimeEnvironmentParityGate,
  evaluateCommunicationRuntimeRestartGate,
  evaluateCommunicationRuntimeSchedulerAuthGate,
  evaluateCommunicationRuntimeSchedulerPersistenceGate,
  evaluateOutboundScheduledJobGate,
  executeCommunicationRuntimeTick,
  projectCommunicationSchedulerHq,
  replaceCommunicationSchedulerState,
  resetCommunicationSchedulerState,
} from "../communication-runtime";
import {
  evaluateCommunicationRuntimeAlwaysOnGate,
  evaluateResponseContentQualityGate,
  generateRenewVsRelocateReply,
} from "../conversation-semantics";
import { evaluateLiveDeliveredSemanticParityGate } from "../conversation-repair";
import { ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";

const RENEW = "That example helps. How would this work if I wanted to compare renewing my current lease against moving to a new location?";

describe("always-on inbound communication runtime", () => {
  it("rejects unauthorized scheduler callers", () => {
    const request = new Request("https://infinity-runtime.vercel.app/api/runtime/communication-tick");
    expect(evaluateCommunicationRuntimeSchedulerAuthGate(request, {} as NodeJS.ProcessEnv).result).toBe("FAIL");
    expect(authorizeRuntimeTickRequest(request, { CRON_SECRET: "secret" } as unknown as NodeJS.ProcessEnv).ok).toBe(false);
    const authorized = new Request("https://infinity-runtime.vercel.app/api/runtime/communication-tick", {
      headers: { authorization: "Bearer secret" },
    });
    expect(evaluateCommunicationRuntimeSchedulerAuthGate(authorized, { CRON_SECRET: "secret" } as unknown as NodeJS.ProcessEnv).result).toBe("PASS");
  });

  it("treats missing x-vercel-cron as a manual trigger", () => {
    const manual = new Request("https://infinity-runtime.vercel.app/api/runtime/communication-tick", {
      headers: { authorization: "Bearer secret" },
    });
    expect(classifyCommunicationTickSource(manual)).toBe("MANUAL");
    const cron = new Request("https://infinity-runtime.vercel.app/api/runtime/communication-tick", {
      headers: { authorization: "Bearer secret", "x-vercel-cron": "1" },
    });
    expect(classifyCommunicationTickSource(cron)).toBe("VERCEL_CRON");
  });

  it("persists scheduler fields and scheduled jobs", () => {
    resetCommunicationSchedulerState();
    replaceCommunicationSchedulerState({
      version: 1,
      last_tick_at: "2026-09-18T04:00:00.000Z",
      last_success_at: "2026-09-18T04:00:00.000Z",
      last_failure_at: null,
      last_gmail_check_at: "2026-09-18T04:00:00.000Z",
      last_error: null,
      messages_detected: 1,
      detections_24h: [{ at: "2026-09-18T04:00:00.000Z", inbound_message_id: "msg-1" }],
      jobs_created: 1,
      jobs_sent: 0,
      scheduler_instance: "communication-tick:test",
      lease: null,
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: "msg-1",
      last_detected_at: "2026-09-18T04:00:00.000Z",
      jobs: [{
        job_id: "job:1a0af74557b0eb36:msg-1",
        conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
        inbound_message_id: "msg-1",
        thread_id: "1a0af74557b0eb36",
        eligible_at: "2026-09-18T04:08:00.000Z",
        state: "WAITING",
        attempt_count: 0,
        idempotency_key: "communication-job-send:1a0af74557b0eb36:msg-1",
        provider: "GMAIL",
        created_at: "2026-09-18T04:00:00.000Z",
        started_at: null,
        sent_at: null,
        failure_reason: null,
        intent: "RENEW_VS_RELOCATE",
      }],
    });
    const persisted = evaluateCommunicationRuntimeSchedulerPersistenceGate({
      version: 1,
      last_tick_at: "2026-09-18T04:00:00.000Z",
      last_success_at: "2026-09-18T04:00:00.000Z",
      last_failure_at: null,
      last_gmail_check_at: "2026-09-18T04:00:00.000Z",
      last_error: null,
      messages_detected: 1,
      detections_24h: [],
      jobs_created: 1,
      jobs_sent: 0,
      scheduler_instance: "communication-tick:test",
      lease: null,
      jobs: [],
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: "msg-1",
      last_detected_at: "2026-09-18T04:00:00.000Z",
    });
    expect(persisted.result).toBe("PASS");
    const state = projectCommunicationSchedulerHq(undefined, "2026-09-18T04:05:00.000Z");
    expect(state.waiting_jobs).toBe(1);
    expect(state.status).toBe("HEALTHY");
    expect(evaluateOutboundScheduledJobGate({
      job_id: "job:1a0af74557b0eb36:msg-1",
      conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
      inbound_message_id: "msg-1",
      thread_id: "1a0af74557b0eb36",
      eligible_at: "2026-09-18T04:08:00.000Z",
      state: "WAITING",
      attempt_count: 0,
      idempotency_key: "communication-job-send:1a0af74557b0eb36:msg-1",
      provider: "GMAIL",
      created_at: "2026-09-18T04:00:00.000Z",
      started_at: null,
      sent_at: null,
      failure_reason: null,
    }).result).toBe("PASS");
    expect(evaluateCommunicationRuntimeConcurrencyGate({ acquired: true, overlapping_send: false }).result).toBe("PASS");
  });

  it("does not mark always-on PASS from fixtures or manual ticks", () => {
    expect(evaluateCommunicationRuntimeAlwaysOnGate({ schedulerBound: true, tickInvoked: true }).result).toBe("NOT_PROVEN");
    expect(evaluateAlwaysOnAutonomyTruthGate({
      trigger_source: "MANUAL",
      cursor_triggered: true,
      founder_operational_command: true,
      automatic_send: false,
    }).result).toBe("NOT_PROVEN");
    expect(ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE.defect_class).toContain("ALWAYS_ON_RUNTIME_NOT_ACTUALLY_SCHEDULED");
    expect(evaluateCommunicationRuntimeAlwaysOnGate({ mailboxBlind: true }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeAlwaysOnGate({ mailboxBlind: true }).reasons).toContain("MAILBOX_BLIND_WHILE_CRON_TICKING");
  });

  it("fails mailbox watch when cron ticks but Gmail grant is blind", () => {
    expect(evaluateAlwaysOnMailboxWatchGate({
      last_gmail_check_at: "2026-09-19T01:15:00.000Z",
      now: "2026-09-19T01:16:00.000Z",
      token_exchange: false,
      last_error: "GRANT:NOT_CONFIGURED:GMAIL_OAUTH_CLIENT_ID,GMAIL_OAUTH_CLIENT_SECRET,GMAIL_OAUTH_REFRESH_TOKEN",
      cron_bound: true,
    }).result).toBe("FAIL");
    expect(evaluateAlwaysOnMailboxWatchGate({
      last_gmail_check_at: "2026-09-19T01:15:00.000Z",
      now: "2026-09-19T01:16:00.000Z",
      token_exchange: true,
      last_error: null,
      cron_bound: true,
    }).result).toBe("PASS");
    expect(evaluateAlwaysOnMailboxWatchGate({
      last_gmail_check_at: "2026-09-19T00:50:00.000Z",
      now: "2026-09-19T01:16:00.000Z",
      token_exchange: true,
      last_error: null,
      cron_bound: true,
    }).reasons).toContain("WATCH_STALE");
    const tick = readFileSync("app/api/runtime/communication-tick/route.ts", "utf8");
    expect(tick).toContain('export const dynamic = "force-dynamic"');
    expect(tick).toContain("execute_jobs: trigger === \"VERCEL_CRON\"");
    expect(readFileSync("vercel.json", "utf8")).toContain('"/api/runtime/communication-tick"');
    expect(readFileSync("vercel.json", "utf8")).toContain('"*/5 * * * *"');
    expect(readFileSync("scripts/infinity-runtime-isolated-deploy.mjs", "utf8")).toContain("next build --webpack");
  });

  it("answers renew-vs-relocate without restarting cold outreach", () => {
    const generated = generateRenewVsRelocateReply();
    expect(evaluateResponseContentQualityGate({ inbound: RENEW, generated, latest_question: RENEW }).result).toBe("PASS");
    expect(evaluateLiveDeliveredSemanticParityGate({ generated, delivered: generated }).result).toBe("PASS");
    expect(generated).not.toMatch(/still rebuilding lease scenarios/i);
  });

  it("defers overlapping ticks without sending", async () => {
    resetCommunicationSchedulerState();
    replaceCommunicationSchedulerState({
      ...{
        version: 1 as const,
        last_tick_at: null,
        last_success_at: null,
        last_failure_at: null,
        last_gmail_check_at: null,
        last_error: null,
        messages_detected: 0,
        detections_24h: [],
        jobs_created: 0,
        jobs_sent: 0,
        scheduler_instance: null,
        last_trigger_source: "UNKNOWN",
        cursor_triggered: false,
        last_inbound_message_id: null,
        last_detected_at: null,
        jobs: [],
        lease: { holder: "other", expires_at: "2026-09-18T05:00:00.000Z" },
      },
    });
    const first = await executeCommunicationRuntimeTick({
      now: "2026-09-18T04:00:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_jobs: false,
    });
    expect(first.deferred).toBe(true);
    expect(first.sent).toBe(false);
  });

  it("requires cron and runtime Gmail presence to match", () => {
    expect(evaluateCommunicationRuntimeEnvironmentParityGate({
      cron_client_present: true,
      cron_secret_present: true,
      cron_refresh_present: true,
      cron_sender_present: true,
      runtime_client_present: true,
      runtime_secret_present: true,
      runtime_refresh_present: true,
      runtime_sender_present: true,
    }).result).toBe("PASS");
    expect(evaluateCommunicationRuntimeEnvironmentParityGate({
      cron_client_present: false,
      cron_secret_present: true,
      cron_refresh_present: true,
      cron_sender_present: true,
      runtime_client_present: true,
      runtime_secret_present: true,
      runtime_refresh_present: true,
      runtime_sender_present: true,
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeCronHealthGate({
      trigger_source: "VERCEL_CRON",
      last_error: null,
      last_gmail_check_at: "2026-09-18T07:20:00.000Z",
      token_exchange: true,
      gmail_send_present: true,
      gmail_readonly_present: true,
    }).result).toBe("PASS");
    expect(evaluateCommunicationRuntimeCronHealthGate({
      trigger_source: "VERCEL_CRON",
      last_error: "NOT_CONFIGURED",
      last_gmail_check_at: "2026-09-18T07:20:00.000Z",
      token_exchange: false,
      gmail_send_present: false,
      gmail_readonly_present: false,
    }).result).toBe("FAIL");
  });

  it("restart gate fails when jobs disappear", () => {
    expect(evaluateCommunicationRuntimeRestartGate({
      scheduler_resumed: true,
      conversation_survived: true,
      jobs_survived: false,
      duplicate_send: false,
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeRestartGate({
      scheduler_resumed: true,
      conversation_survived: true,
      jobs_survived: true,
      duplicate_send: false,
    }).result).toBe("PASS");
  });
});
