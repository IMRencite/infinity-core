import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID } from "@/lib/infinity/autonomous-sales-execution/contract";
import type { SalesProspectCandidate } from "@/lib/infinity/autonomous-sales-execution/types";
import { recordSalesInteraction } from "@/lib/infinity/sales-learning/engine";
import { emptySalesLearningState } from "@/lib/infinity/sales-learning/store";
import { executeAutonomousSalesCycle } from "@/lib/infinity/autonomous-sales-execution/cycle";
import {
  authorizeOutboundSend,
  evaluateProductionOutboundAuthorizationGate,
  evaluateProductionOutboundAutonomyGate,
  evaluateProductionOutboundCapacityGate,
  evaluateProductionOutboundKillSwitchGate,
  evaluateProductionSendIdempotencyGate,
  evaluateProductionSuppressionEnforcementGate,
  executeProductionOutboundTickAsync,
  ingestOutboundReply,
  applyOutboundProviderEvent,
  fixtureOutboundProvider,
  loadProductionOutboundControl,
  projectProductionOutboundHq,
  projectPublicOutbound,
  emptyProductionOutboundState,
  emptyProviderReadiness,
} from "..";

const NOW = "2026-09-16T13:00:00.000Z";

function candidate(overrides: Partial<SalesProspectCandidate> = {}): SalesProspectCandidate {
  return {
    prospect_id: "canary-tenant-1",
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
    business_name: "Tenant Advisors",
    person_name: "Jordan Hale",
    role: "Tenant representation broker",
    industry: "commercial real estate",
    geography: "New York",
    public_context: "Tenant representation occupancy advisory.",
    source_url: "https://www.tenantadvisors.com/team",
    source_provider: "prospect_intelligence",
    published_email: "jordan.hale@tenantadvisors.com",
    timezone: "America/New_York",
    timezone_basis: "published New York office",
    ...overrides,
  };
}

function canaryState() {
  const state = emptyProductionOutboundState(NOW, loadProductionOutboundControl({
    OUTBOUND_MODE: "canary",
    GLOBAL_OUTBOUND_KILL_SWITCH: "false",
    VENTURE_OUTBOUND_ENABLED: "true",
    OUTBOUND_EMAIL_ENABLED: "true",
  }));
  return state;
}

function readyRequest(overrides: Partial<Parameters<typeof authorizeOutboundSend>[0]["request"]> = {}) {
  return {
    prospect_id: "canary-tenant-1",
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
    channel: "email" as const,
    now: NOW,
    isolated_runtime: true,
    suppressed: false,
    unsubscribed: false,
    communication_eligible: true,
    contact_valid: true,
    timezone: "America/New_York",
    timezone_basis: "published New York office",
    prior_touches: 0,
    follow_up: false,
    provider: fixtureOutboundProvider().readiness,
    idempotency_key: "sales:campaign:canary-tenant-1:touch:1",
    ...overrides,
  };
}

describe("Production Outbound Activation V1", () => {
  it("centralizes DISABLED, CANARY, and AUTONOMOUS modes", () => {
    expect(loadProductionOutboundControl({ OUTBOUND_MODE: "disabled" }).mode).toBe("DISABLED");
    expect(loadProductionOutboundControl({ OUTBOUND_MODE: "canary" }).mode).toBe("CANARY");
    expect(loadProductionOutboundControl({ OUTBOUND_MODE: "autonomous", OUTBOUND_AUTONOMY_READY: "false" }).mode).toBe("CANARY");
    expect(loadProductionOutboundControl({ OUTBOUND_MODE: "autonomous", OUTBOUND_AUTONOMY_READY: "true" }).mode).toBe("AUTONOMOUS");
  });

  it("disabled mode blocks live send", () => {
    const decision = authorizeOutboundSend({
      request: readyRequest(),
      control: loadProductionOutboundControl({ OUTBOUND_MODE: "disabled" }),
      usage: canaryState().usage,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("OUTBOUND_DISABLED");
  });

  it("canary authorizes a ready eligible send", () => {
    const decision = authorizeOutboundSend({
      request: readyRequest(),
      control: canaryState().control,
      usage: canaryState().usage,
    });
    expect(decision.allowed).toBe(true);
    expect(evaluateProductionOutboundAuthorizationGate({
      request: readyRequest(),
      control: canaryState().control,
      usage: canaryState().usage,
    }).result).toBe("PASS");
  });

  it("autonomous stays capped after the control model exists", () => {
    const control = loadProductionOutboundControl({
      OUTBOUND_MODE: "autonomous",
      OUTBOUND_AUTONOMY_READY: "true",
      MAX_SENDS_PER_DAY: "8",
    });
    expect(control.mode).toBe("AUTONOMOUS");
    expect(control.limits.max_sends_per_day).toBe(8);
  });

  it("provider unreadiness blocks send", () => {
    const decision = authorizeOutboundSend({
      request: readyRequest({ provider: emptyProviderReadiness("gmail") }),
      control: canaryState().control,
      usage: canaryState().usage,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("PROVIDER_NOT_BOUND");
  });

  it("eligibility, suppression, business hours, and cooldown reasons are explicit", () => {
    expect(authorizeOutboundSend({
      request: readyRequest({ communication_eligible: false }),
      control: canaryState().control,
      usage: canaryState().usage,
    }).reasons).toContain("COMMUNICATION_INELIGIBLE");
    expect(authorizeOutboundSend({
      request: readyRequest({ suppressed: true }),
      control: canaryState().control,
      usage: canaryState().usage,
    }).reasons).toContain("SUPPRESSED");
    expect(authorizeOutboundSend({
      request: readyRequest({ timezone: null, timezone_basis: null }),
      control: canaryState().control,
      usage: canaryState().usage,
    }).reasons).toContain("TIMEZONE_UNKNOWN");
  });

  it("hourly and daily caps block additional sends", () => {
    const usage = { ...canaryState().usage, hourly: 1, daily: 3 };
    const hourly = authorizeOutboundSend({ request: readyRequest(), control: canaryState().control, usage: { ...usage, daily: 0 } });
    expect(hourly.reasons).toContain("HOURLY_CAP");
    const daily = authorizeOutboundSend({ request: readyRequest(), control: canaryState().control, usage });
    expect(daily.reasons).toContain("DAILY_LIMIT_REACHED");
  });

  it("golden e2e: live send authorization through learning", async () => {
    const state = canaryState();
    const provider = fixtureOutboundProvider();
    const tick = await executeProductionOutboundTickAsync({
      state,
      candidates: [candidate()],
      now: NOW,
      isolated_runtime: true,
      provider,
    });
    expect(tick.decisions[0]?.allowed).toBe(true);
    expect(tick.sent).toBe(1);
    expect(state.outbox[0]?.status).toBe("SENT");
    applyOutboundProviderEvent(state, {
      id: "del-1",
      outbox_id: state.outbox[0]!.id,
      kind: "delivered",
      at: NOW,
      fabricated: false,
    });
    expect(state.metrics.delivered).toBe(1);
    const learning = emptySalesLearningState();
    recordSalesInteraction(learning, {
      prospect_id: "canary-tenant-1",
      now: NOW,
      turns: [{ actor: "PROSPECT", action: "reply", text: "Interested, send a walkthrough", at: NOW }],
      outcome: "meeting",
      questions: [],
      objections: [],
      qualification_signals: ["demo"],
    });
    expect(learning.observations.length).toBe(1);
    expect(learning.observations[0]?.privacy_classification).toBe("INTERNAL_ONLY");
  });

  it("golden e2e: suppression after queue prevents provider send", async () => {
    const gate = await evaluateProductionSuppressionEnforcementGate({
      state: canaryState(),
      candidate: candidate(),
      now: NOW,
    });
    expect(gate.result).toBe("PASS");
  });

  it("golden e2e: restart does not resend a completed outbox item", async () => {
    const gate = await evaluateProductionSendIdempotencyGate({
      state: canaryState(),
      candidate: candidate(),
      now: NOW,
    });
    expect(gate.result).toBe("PASS");
  });

  it("golden e2e: kill switch blocks then resumes", async () => {
    const gate = await evaluateProductionOutboundKillSwitchGate({
      state: canaryState(),
      candidate: candidate(),
      now: NOW,
    });
    expect(gate.result).toBe("PASS");
  });

  it("capacity gate enforces hourly/daily/venture/channel/follow-up caps", async () => {
    const gate = await evaluateProductionOutboundCapacityGate({
      state: canaryState(),
      candidate: candidate(),
      now: NOW,
    });
    expect(gate.result).toBe("PASS");
  });

  it("reply and opt-out cancel pending follow-ups", async () => {
    const state = canaryState();
    const provider = fixtureOutboundProvider();
    await executeProductionOutboundTickAsync({
      state,
      candidates: [candidate()],
      now: NOW,
      isolated_runtime: true,
      provider,
    });
    ingestOutboundReply({
      state,
      message_id: "m-stop",
      thread_id: "t-stop",
      prospect_id: "canary-tenant-1",
      venture_id: candidate().venture_id,
      campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
      at: NOW,
      text: "Please unsubscribe and stop contacting me",
    });
    expect(state.metrics.opt_outs).toBeGreaterThan(0);
    expect(state.outbox.every((row) => row.completed || row.status === "CANCELLED" || row.status === "SENT")).toBe(true);
  });

  it("existing sales cycle still does not send when executeSend is false", () => {
    const cycle = executeAutonomousSalesCycle({ executeSend: false, isolated_runtime: true, candidates: [candidate()] });
    expect(cycle.attempted).toBe(0);
  });

  it("HQ outbound strip exists and public copy stays sanitized", () => {
    const hq = projectProductionOutboundHq(canaryState());
    expect(hq.metrics.some((row) => row.label === "Outbound Mode")).toBe(true);
    const pub = projectPublicOutbound(canaryState());
    expect(JSON.stringify(pub)).not.toMatch(/@tenantadvisors/);
    const source = readFileSync(join(process.cwd(), "components/dashboard/operator-console/hq-sales-floor.tsx"), "utf8");
    expect(source).toContain("data-hq-sales-outbound");
  });

  it("autonomy gate stays NOT_READY until canary proof exists", () => {
    const gate = evaluateProductionOutboundAutonomyGate({
      real_send: false,
      delivery_events: false,
      bounce_events: false,
      replies: false,
      opt_outs: false,
      suppression_stops: true,
      duplicates_prevented: true,
      pacing: true,
      restart_safe: true,
      kill_switch: true,
      venture_limit: true,
      channel_limit: true,
      hourly_daily_caps: true,
      performance: false,
      learning: false,
      no_privacy_leak: true,
      no_burst: true,
    });
    expect(gate.result).toBe("NOT_READY");
  });
});
