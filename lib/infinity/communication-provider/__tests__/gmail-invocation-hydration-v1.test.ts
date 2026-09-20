import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  GMAIL_INVOCATION_CONTEXT_VERSION,
  evaluateColdCronCredentialInitializationGate,
  evaluateGmailConfigHydrationGate,
  evaluateGmailSameInvocationParityGate,
  evaluateGmailTokenExchangeInputGate,
  recordGmailInvocationEvent,
  resolveGmailInvocationContext,
} from "../gmail-invocation-context";
import { exchangeGmailAccessToken } from "../gmail-adapter";
import { cronExecutionIsCredentialHealthy } from "../gmail-runtime-config";
import { CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import { observeOccupancynpvCanaryInbound } from "@/lib/infinity/production-outbound/canary-inbound";

function stubEnv() {
  process.env.GMAIL_OAUTH_CLIENT_ID = "live-client-id-value";
  process.env.GMAIL_OAUTH_CLIENT_SECRET = "live-client-secret-value";
  process.env.GMAIL_OAUTH_REFRESH_TOKEN = "live-refresh-token-value";
  process.env.GMAIL_SENDER_EMAIL = "infinity@example.com";
}

function mockTokenFetch(): typeof fetch {
  return (async (raw: RequestInfo | URL) => {
    const url = String(raw);
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return new Response(JSON.stringify({
        access_token: "ya29.test-access",
        scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
  }) as typeof fetch;
}

describe("gmail invocation hydration + explicit injection v1", () => {
  it("resolves an immutable invocation context at request start", () => {
    stubEnv();
    const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON", now: "2026-09-19T06:00:00.000Z" });
    expect(context.context_version).toBe(GMAIL_INVOCATION_CONTEXT_VERSION);
    expect(context.configured).toBe(true);
    expect(context.config_source).toBe("PROCESS_ENV");
    expect(context.config_fingerprint).toBeTruthy();
    expect(context.events.map((event) => event.name)).toEqual([
      "CONFIG_RESOLUTION_STARTED",
      "CONFIG_RESOLVED",
    ]);
    expect(evaluateGmailConfigHydrationGate({ context }).result).toBe("PASS");
  });

  it("fails hydration if token exchange starts before config is resolved", () => {
    stubEnv();
    const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
    context.events = [];
    recordGmailInvocationEvent(context, "TOKEN_EXCHANGE_STARTED");
    recordGmailInvocationEvent(context, "CONFIG_RESOLVED");
    expect(evaluateGmailConfigHydrationGate({ context }).result).toBe("FAIL");
    expect(evaluateGmailConfigHydrationGate({ context }).reasons).toContain("EXCHANGE_BEFORE_HYDRATION");
  });

  it("exchanges with the hydrated material and refuses an independent env reread", async () => {
    stubEnv();
    const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
    const resolved = context.config_fingerprint;
    process.env.GMAIL_OAUTH_CLIENT_ID = "";
    process.env.GMAIL_OAUTH_CLIENT_SECRET = "";
    process.env.GMAIL_OAUTH_REFRESH_TOKEN = "";
    const token = await exchangeGmailAccessToken(mockTokenFetch(), context);
    expect(token.ok).toBe(true);
    expect(context.exchange_input_fingerprint).toBe(resolved);
    expect(context.token_exchange_result).toBe("PASS");
    expect(evaluateGmailTokenExchangeInputGate({
      context_fingerprint: context.config_fingerprint,
      exchange_input_fingerprint: context.exchange_input_fingerprint,
    }).result).toBe("PASS");
    expect(evaluateGmailSameInvocationParityGate({
      resolved_fingerprint: context.config_fingerprint,
      exchange_input_fingerprint: context.exchange_input_fingerprint,
    }).result).toBe("PASS");
    const orphan = await exchangeGmailAccessToken(mockTokenFetch());
    expect(orphan.ok).toBe(false);
    if (!orphan.ok) expect(orphan.reason).toBe("HYDRATION_REQUIRED:NO_INVOCATION_CONTEXT");
  });

  it("makes token exchange the first Gmail-dependent operation after resolve", async () => {
    stubEnv();
    const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
    expect(context.events.map((event) => event.name)).toEqual([
      "CONFIG_RESOLUTION_STARTED",
      "CONFIG_RESOLVED",
    ]);
    const token = await exchangeGmailAccessToken(mockTokenFetch(), context);
    expect(token.ok).toBe(true);
    expect(context.events.map((event) => event.name)).toEqual([
      "CONFIG_RESOLUTION_STARTED",
      "CONFIG_RESOLVED",
      "TOKEN_EXCHANGE_STARTED",
      "TOKEN_EXCHANGE_COMPLETED",
    ]);
  });

  it("fails observe without an invocation context and does not reread env", async () => {
    stubEnv();
    const observed = await observeOccupancynpvCanaryInbound({ worker_running: true });
    expect(observed.last_error).toBe("HYDRATION_REQUIRED:NO_INVOCATION_CONTEXT");
    expect(observed.token_exchange).toBe(false);
  });

  it("proves a cold cron path: resolve then exchange with no HTTP warmup", async () => {
    stubEnv();
    const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
    const token = await exchangeGmailAccessToken(mockTokenFetch(), context);
    expect(token.ok).toBe(true);
    const hydration = evaluateGmailConfigHydrationGate({ context });
    const parity = evaluateGmailSameInvocationParityGate({
      resolved_fingerprint: context.config_fingerprint,
      exchange_input_fingerprint: context.exchange_input_fingerprint,
    });
    expect(evaluateColdCronCredentialInitializationGate({
      http_warmup: false,
      operating_state_warmup: false,
      config_resolved_before_gmail: hydration.result === "PASS",
      token_exchange: token.ok,
      same_invocation_parity: parity.result === "PASS",
    }).result).toBe("PASS");
  });

  it("does not count a cron healthy unless hydration, parity, exchange, and scopes all pass", () => {
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
      hydration_pass: false,
      same_invocation_parity: true,
    })).toBe(false);
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
      hydration_pass: true,
      same_invocation_parity: false,
    })).toBe(false);
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
      hydration_pass: true,
      same_invocation_parity: true,
    })).toBe(true);
  });

  it("keeps OS fallback only inside the invocation resolver", () => {
    const resolver = readFileSync("lib/infinity/communication-provider/gmail-invocation-context.ts", "utf8");
    const adapter = readFileSync("lib/infinity/communication-provider/gmail-adapter.ts", "utf8");
    const inbound = readFileSync("lib/infinity/inbound-communication-runtime/gmail-inbound-read.ts", "utf8");
    expect(resolver).toContain("readGmailRuntimeConfig()");
    expect(adapter).not.toContain("readGmailOAuthMaterial()");
    expect(adapter).not.toContain("readGmailRuntimeConfig(");
    expect(adapter).toContain("gmailContext.oauth_material");
    expect(inbound).toContain("gmailContext");
    expect(CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE.defect_class).toContain("GMAIL_CREDENTIAL_READ_ORDER_RACE");
  });

  it("feeds the read-order race into Daily Improvement", () => {
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
    expect(cycle.run.observations.some((row) => row.observation_id === "obs:gmail-credential-read-order-race")).toBe(true);
    expect(cycle.report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Did token exchange use the same resolved context?",
      "Did any Gmail operation occur before hydration?",
      "Did any context reread credentials independently?",
      "Did any cron require a warm HTTP request?",
    ]));
  });
});
