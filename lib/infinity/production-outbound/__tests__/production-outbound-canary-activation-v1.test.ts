import { describe, expect, it } from "vitest";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID } from "@/lib/infinity/autonomous-sales-execution/contract";
import { evaluateMercuryReadOnlyVerificationGate, loadMercuryConfig } from "@/lib/infinity/treasury/providers/mercury";
import { FOUNDER_AUTHORIZED_PORTFOLIO_CAPITAL_USD } from "@/lib/infinity/financial-truth/founder-capital-policy";
import { FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD } from "@/lib/infinity/financial-truth/allocation-reconciliation";
import {
  authorizeOutboundSend,
  evaluateProductionKillSwitchLiveProofGate,
  evaluateProductionOutboundProviderReadinessGate,
  evaluateProductionRestartIdempotencyGate,
  evaluateProductionSuppressionLiveProofGate,
  executeProductionOutboundTickAsync,
  fixtureOutboundProvider,
  inspectApprovedCanaryContact,
  inspectGmailProviderReadiness,
  loadProductionOutboundControl,
  emptyProductionOutboundState,
  outboundToPerformanceObservations,
  projectPublicOutbound,
  resolveApprovedCanaryCandidates,
} from "..";

const NOW = "2026-09-16T17:00:00.000Z";

const canaryEnv = {
  OUTBOUND_CANARY_ENABLED: "true",
  OUTBOUND_CANARY_EMAIL: "founder.canary@imr.test",
  OUTBOUND_CANARY_TIMEZONE: "America/New_York",
  OUTBOUND_CANARY_TIMEZONE_BASIS: "founder_declared",
};

describe("Production Outbound Canary Activation V1", () => {
  it("does not promote .invalid sales-bridge contacts to live", () => {
    expect(resolveApprovedCanaryCandidates({
      OUTBOUND_CANARY_ENABLED: "true",
      OUTBOUND_CANARY_EMAIL: "person@example.invalid",
      OUTBOUND_CANARY_TIMEZONE: "America/New_York",
    })).toEqual([]);
    expect(inspectApprovedCanaryContact({
      OUTBOUND_CANARY_ENABLED: "false",
      OUTBOUND_CANARY_EMAIL: "founder.canary@imr.test",
      OUTBOUND_CANARY_TIMEZONE: "America/New_York",
    }).candidate).toBeNull();
  });

  it("attaches only the explicit approved canary with a known timezone", () => {
    const inspected = inspectApprovedCanaryContact(canaryEnv);
    expect(inspected.email_valid).toBe(true);
    expect(inspected.timezone_known).toBe(true);
    expect(inspected.candidate?.published_email).toBe("founder.canary@imr.test");
    expect(inspected.candidate?.timezone).toBe("America/New_York");
    expect(inspected.candidate?.campaign_id).toBe(OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID);
    expect(JSON.stringify(inspected)).not.toContain("GMAIL_OAUTH");
  });

  it("DETERMINISTIC: technical failure without provider message id may retry", async () => {
    const state = emptyProductionOutboundState(NOW, loadProductionOutboundControl({ OUTBOUND_MODE: "canary" }));
    const candidate = inspectApprovedCanaryContact(canaryEnv).candidate!;
    const first = await executeProductionOutboundTickAsync({
      state,
      candidates: [candidate],
      now: NOW,
      isolated_runtime: true,
      provider: fixtureOutboundProvider({ fail: true }),
    });
    expect(first.sent).toBe(0);
    expect(first.state.outbox[0]?.status).toBe("FAILED");
    const retry = await executeProductionOutboundTickAsync({
      state,
      candidates: [candidate],
      now: NOW,
      isolated_runtime: true,
      provider: fixtureOutboundProvider(),
    });
    expect(retry.sent).toBe(1);
    expect(retry.state.outbox[0]?.status).toBe("SENT");
  });

  it("unknown timezone blocks the canary", () => {
    expect(inspectApprovedCanaryContact({
      ...canaryEnv,
      OUTBOUND_CANARY_TIMEZONE: "",
    }).candidate).toBeNull();
  });

  it("provider readiness gate fails without credentials and without live auth", () => {
    expect(evaluateProductionOutboundProviderReadinessGate(inspectGmailProviderReadiness({})).result).toBe("FAIL");
    expect(evaluateProductionOutboundProviderReadinessGate({
      bound: true,
      credentials_present: true,
      sending_identity_verified: true,
      healthy: true,
      reply_path_configured: true,
      bounce_path_configured: true,
      unsubscribe_path_configured: true,
      server_only: true,
      leaked_credential: false,
      token_exchange: false,
      send_scope: false,
    }).result).toBe("FAIL");
    const ready = evaluateProductionOutboundProviderReadinessGate({
      bound: true,
      credentials_present: true,
      sending_identity_verified: true,
      healthy: true,
      reply_path_configured: true,
      bounce_path_configured: true,
      unsubscribe_path_configured: true,
      server_only: true,
      leaked_credential: false,
      token_exchange: true,
      send_scope: true,
    });
    expect(ready.result).toBe("PASS");
  });

  it("authorizes the approved canary in CANARY mode", () => {
    const candidate = inspectApprovedCanaryContact(canaryEnv).candidate!;
    const control = loadProductionOutboundControl({
      OUTBOUND_MODE: "canary",
      GLOBAL_OUTBOUND_KILL_SWITCH: "false",
      VENTURE_OUTBOUND_ENABLED: "true",
      OUTBOUND_EMAIL_ENABLED: "true",
    });
    const provider = fixtureOutboundProvider();
    const decision = authorizeOutboundSend({
      request: {
        prospect_id: candidate.prospect_id,
        venture_id: candidate.venture_id,
        campaign_id: candidate.campaign_id,
        channel: "email",
        now: NOW,
        isolated_runtime: true,
        suppressed: false,
        unsubscribed: false,
        communication_eligible: true,
        contact_valid: true,
        timezone: candidate.timezone,
        timezone_basis: candidate.timezone_basis,
        prior_touches: 0,
        follow_up: false,
        provider: provider.readiness,
        idempotency_key: "sales:canary:1",
      },
      control,
      usage: emptyProductionOutboundState(NOW, control).usage,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe("CANARY");
  });

  it("DETERMINISTIC: approved canary sends once and restart/suppression/kill-switch block fixtures", async () => {
    const state = emptyProductionOutboundState(NOW, loadProductionOutboundControl({ OUTBOUND_MODE: "canary" }));
    const candidate = inspectApprovedCanaryContact(canaryEnv).candidate!;
    const provider = fixtureOutboundProvider();
    const first = await executeProductionOutboundTickAsync({
      state,
      candidates: [candidate],
      now: NOW,
      isolated_runtime: true,
      provider,
    });
    expect(first.sent).toBe(1);
    expect(first.decisions[0]?.allowed).toBe(true);
    expect(outboundToPerformanceObservations(first.state).some((row) => row.rawMetric === "outbound_accepted")).toBe(true);
    const restarted = await executeProductionOutboundTickAsync({
      state: structuredClone(first.state),
      candidates: [candidate],
      now: NOW,
      isolated_runtime: true,
      provider,
    });
    expect(restarted.sent).toBe(0);
    expect(restarted.provider_calls).toBe(0);
    expect(evaluateProductionRestartIdempotencyGate({
      live_provider: false,
      completed_send: first.sent === 1,
      restarted: true,
      provider_calls_after_restart: restarted.provider_calls,
      same_provider_message_id: first.state.outbox[0]?.provider_message_id === restarted.state.outbox[0]?.provider_message_id,
    }).result).toBe("FAIL");
    const suppressed = await executeProductionOutboundTickAsync({
      state: emptyProductionOutboundState(NOW, loadProductionOutboundControl({ OUTBOUND_MODE: "canary" })),
      candidates: [{ ...candidate, suppressed: true }],
      now: NOW,
      isolated_runtime: true,
      provider: fixtureOutboundProvider(),
    });
    expect(suppressed.provider_calls).toBe(0);
    expect(evaluateProductionSuppressionLiveProofGate({
      live_provider: false,
      queued_then_suppressed: true,
      provider_calls_after_suppression: suppressed.provider_calls,
      pending_cancelled: suppressed.sent === 0,
    }).result).toBe("FAIL");
    const killState = emptyProductionOutboundState(NOW, loadProductionOutboundControl({
      OUTBOUND_MODE: "canary",
      GLOBAL_OUTBOUND_KILL_SWITCH: "true",
    }));
    const blocked = await executeProductionOutboundTickAsync({
      state: killState,
      candidates: [candidate],
      now: NOW,
      isolated_runtime: true,
      provider: fixtureOutboundProvider(),
    });
    expect(blocked.provider_calls).toBe(0);
    expect(evaluateProductionKillSwitchLiveProofGate({
      live_provider: false,
      eligible_queue: true,
      kill_switch_on: true,
      provider_calls_while_engaged: blocked.provider_calls,
    }).result).toBe("FAIL");
  });

  it("public outbound copy stays sanitized and does not stay ACTIVE after send", () => {
    const pub = projectPublicOutbound(emptyProductionOutboundState(NOW, loadProductionOutboundControl({ OUTBOUND_MODE: "canary" })));
    expect(JSON.stringify(pub)).not.toMatch(/@imr\.test|founder\.canary|GMAIL_/);
    expect(pub.activity).not.toMatch(/recipient|message body/i);
    expect(pub.mode).toBe("MONITORING");
    const afterSend = emptyProductionOutboundState(NOW, loadProductionOutboundControl({ OUTBOUND_MODE: "canary" }));
    afterSend.metrics.sent = 1;
    afterSend.outbox = [{
      id: "outbox:canary",
      idempotency_key: "sales:canary:1",
      prospect_id: "canary:founder-controlled:v1",
      venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      campaign_id: "occupancynpv-first-outbound",
      channel: "email",
      status: "SENT",
      provider_message_id: "redacted",
      created_at: NOW,
      updated_at: NOW,
      claimed_at: NOW,
      sent_at: NOW,
      completed: true,
    }];
    expect(projectPublicOutbound(afterSend).mode).toBe("MONITORING");
  });

  it("Mercury policy regression stays $50 / $25", () => {
    expect(FOUNDER_AUTHORIZED_PORTFOLIO_CAPITAL_USD).toBe(50);
    expect(FOUNDER_INTENDED_OCCUPANCYNPV_ALLOCATION_USD).toBe(25);
    const config = loadMercuryConfig({
      MERCURY_ENABLED: "true",
      MERCURY_ENV: "production",
      MERCURY_API_TOKEN: "secret-token:mercury_production_rma_test_token_DO_NOT_LOG",
    });
    expect(evaluateMercuryReadOnlyVerificationGate({
      publicConfig: config.public,
      authenticatedRead: true,
      balanceFromMercury: true,
      writeCapabilityEnabled: false,
    }).result).toBe("PASS");
  });
});
