import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import {
  buildEmailIntent,
  evaluateEmailSendAuthorization,
  executeControlledGmailWriteVerification,
  inspectEmailSendCapabilityState,
  inspectGmailWriteVerificationRecord,
  isForbiddenWriteVerificationRecipient,
  providerAcceptedIsDelivered,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
  unknownCostIsZero,
} from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope } from "../envelope";
import { emailSentIsQualifiedEvidence } from "../telemetry";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { completeFirstRealCreProspectCohort } from "@/lib/infinity/market-validation-experiment/cre-first-real-cohort-completion";

const NOW = new Date("2026-09-02T15:20:00.000Z");
const SAFE_TARGET = "verify@imros.io";
const SENDER = "infinitemediaresources@gmail.com";

function sendFetch(status = 200, body: Record<string, unknown> = { id: "msg_verify_1", threadId: "thrd_verify_1" }) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
    }
    if (/messages\/send/i.test(url)) {
      return new Response(JSON.stringify(body), { status });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fetchImpl, calls };
}

async function runWrite(fetchImpl: typeof fetch) {
  return executeControlledGmailWriteVerification({
    organizationId: LIVE_ORG,
    now: NOW,
    fetchImpl,
    skipIdentityProbe: true,
    durable: false,
  });
}

describe("GMAIL CONTROLLED WRITE VERIFICATION V1", () => {
  beforeEach(() => {
    resetCommunicationProviderRuntime();
    resetPersistedAcquisitionProspects();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    completeFirstRealCreProspectCohort();
    vi.unstubAllEnvs();
    setEmailSendCapabilityStateForTest("READ_ONLY_VERIFIED");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", SENDER);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", "");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "");
  });

  it("requires a configured controlled target", async () => {
    const { fetchImpl, calls } = sendFetch();
    const result = await runWrite(fetchImpl);
    expect(result.blocked).toBe(true);
    expect(result.blockedReason).toBe("CONTROLLED_WRITE_TARGET_MISSING");
    expect(result.sendAttempts).toBe(0);
    expect(result.capabilityAfter).toBe("READ_ONLY_VERIFIED");
    expect(calls).toEqual([]);
    expect(result.gates.targetConfigured).toBe("FAIL");
  });

  it("requires explicit founder authorization", async () => {
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", SAFE_TARGET);
    const { fetchImpl, calls } = sendFetch();
    const result = await runWrite(fetchImpl);
    expect(result.blocked).toBe(true);
    expect(result.blockedReason).toBe("WRITE_VERIFICATION_NOT_AUTHORIZED");
    expect(result.sendAttempts).toBe(0);
    expect(calls).toEqual([]);
    expect(result.gates.targetAuthorized).toBe("FAIL");
    expect(inspectEmailSendCapabilityState().state).toBe("READ_ONLY_VERIFIED");
  });

  it("rejects CRE prospect targets and does not send", async () => {
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", "caleb.struewing@jll.com");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
    const { fetchImpl, calls } = sendFetch();
    const result = await runWrite(fetchImpl);
    expect(isForbiddenWriteVerificationRecipient("caleb.struewing@jll.com")).toBe(true);
    expect(result.blocked).toBe(true);
    expect(result.targetIsProspect).toBe("YES");
    expect(result.blockedReason).toBe("PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT");
    expect(result.sendAttempts).toBe(0);
    expect(calls).toEqual([]);
    expect(result.authorizationConsumed).toBe(false);
  });

  it("sends once through the canonical Gmail adapter and transitions LIVE_WRITE_VERIFIED", async () => {
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", SAFE_TARGET);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
    const { fetchImpl, calls } = sendFetch();
    const beforeEvidence = inspectRealMarketEvidence({ now: NOW }).counts;
    const result = await runWrite(fetchImpl);
    expect(result.blocked).toBe(false);
    expect(result.sendAttempts).toBe(1);
    expect(result.emailsAccepted).toBe(1);
    expect(result.providerAccepted).toBe(true);
    expect(result.delivered).toBe(false);
    expect(result.providerMessageId).toBe("msg_verify_1");
    expect(result.threadId).toBe("thrd_verify_1");
    expect(result.capabilityAfter).toBe("LIVE_WRITE_VERIFIED");
    expect(result.canonicalReadback).toBe("LIVE_WRITE_VERIFIED");
    expect(inspectEmailSendCapabilityState().state).toBe("LIVE_WRITE_VERIFIED");
    expect(calls.some((url) => /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/i.test(url))).toBe(true);
    expect(calls.some((url) => /drafts/i.test(url))).toBe(false);
    expect(result.attempt?.subject).toBe("Infinity OS Gmail Provider Verification");
    expect(result.attempt?.body).toContain("No action is required");
    expect(result.attempt?.body).not.toMatch(/caleb|jll|cresa|tenantadvisors|avisonyoung/i);
    expect(result.countedAsAcquisition).toBe(false);
    expect(result.countedAsExperimentEvidence).toBe(false);
    expect(emailSentIsQualifiedEvidence()).toBe(false);
    expect(providerAcceptedIsDelivered()).toBe(false);
    expect(unknownCostIsZero()).toBe(false);
    expect(result.attempt?.providerResult?.cost.treatedAsZero).toBe(false);
    expect(inspectGmailWriteVerificationRecord()?.purpose).toBe("PROVIDER_WRITE_VERIFICATION");
    expect(JSON.stringify(result.record)).not.toMatch(/ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}/i);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(beforeEvidence);

    const second = await runWrite(fetchImpl);
    expect(second.reusedExisting).toBe(true);
    expect(second.sendAttempts).toBe(1);
    expect(calls.filter((url) => /messages\/send/i.test(url))).toHaveLength(1);
  });

  it("does not retry a failed provider write and remains READ_ONLY_VERIFIED", async () => {
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", SAFE_TARGET);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
    const { fetchImpl, calls } = sendFetch(403, { error: { message: "insufficientPermissions" } });
    const first = await runWrite(fetchImpl);
    expect(first.blocked).toBe(true);
    expect(first.sendAttempts).toBe(1);
    expect(first.emailsAccepted).toBe(0);
    expect(first.capabilityAfter).toBe("READ_ONLY_VERIFIED");
    expect(first.authorizationConsumed).toBe(true);
    expect(inspectEmailSendCapabilityState().state).toBe("READ_ONLY_VERIFIED");
    const second = await runWrite(fetchImpl);
    expect(second.reusedExisting).toBe(true);
    expect(second.sendAttempts).toBe(1);
    expect(calls.filter((url) => /messages\/send/i.test(url))).toHaveLength(1);
    expect(inspectEmailSendCapabilityState().state).toBe("READ_ONLY_VERIFIED");
  });

  it("still requires separate prospect-send authorization after LIVE_WRITE_VERIFIED", () => {
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(
        buildEmailEnvelope({
          organizationId: LIVE_ORG,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          cohortId: "chrt_cre_first_real_v1",
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          subject: "Early validation",
          body: "Public materials describe tenant representation.",
        }),
        "bounded_outreach",
      ),
      prospectSendAuthorized: false,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.providerVerificationGate).toBe("PASS");
    expect(decision.prospectSendAuthorization).toBe("FAIL");
  });

  it("keeps verification off the CRE evidence ledger", async () => {
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", SAFE_TARGET);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
    const { fetchImpl } = sendFetch();
    const before = inspectRealMarketEvidence({ now: NOW });
    await runWrite(fetchImpl);
    const after = inspectRealMarketEvidence({ now: NOW });
    expect(after.counts.qualifiedVisitors).toBe(0);
    expect(after.counts.strongIntent).toBe(0);
    expect(after.counts.pricingSelections).toBe(0);
    expect(after.experiment.state).toBe("COLLECTING");
    expect(after.counts).toEqual(before.counts);
    expect(EMAIL_SEND_CAPABILITY).toBe("communication.email.send");
  });
});
