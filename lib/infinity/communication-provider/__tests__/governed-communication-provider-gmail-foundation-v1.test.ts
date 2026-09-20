import { beforeEach, describe, expect, it } from "vitest";
import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import {
  buildEmailEnvelope,
  buildEmailIntent,
  codingAgentMayReadProviderSecrets,
  evaluateEmailSendAuthorization,
  executeEmailSend,
  inspectCommunicationCredentialAttestation,
  inspectEmailSendCapabilityState,
  isForbiddenWriteVerificationRecipient,
  normalizeGmailSendResponse,
  persistPreparedAttempt,
  providerAcceptedIsDelivered,
  recordSuppression,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
  translateEnvelopeToGmailRequest,
  unknownCostIsZero,
} from "@/lib/infinity/communication-provider";
import type { ContactabilityRecord } from "@/lib/infinity/market-validation-acquisition-runtime/contactability";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";

const NOW = new Date("2026-09-02T13:44:00.000Z");

function contact(email: string): ContactabilityRecord {
  return {
    status: "DIRECT_PUBLIC_BUSINESS_EMAIL",
    channel: email,
    sourceUrl: "https://example.com/people/broker",
    scope: "DIRECT_CONTACT",
    observedAt: NOW.toISOString(),
  };
}

function envelope(to: string, extras: Partial<Parameters<typeof buildEmailEnvelope>[0]> = {}) {
  return buildEmailEnvelope({
    organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    cohortId: "chrt_cre_first_real_v1",
    prospectId: extras.prospectId ?? "prs_089dad6786418f4b",
    toAddress: to,
    subject: "Early validation",
    body: "Public materials describe tenant representation.",
    landingUrl: "https://infinity-validation-cre-lease-npv-e72beb7b-id9w3e8nb.vercel.app",
    attribution: {
      candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
      artifactId: "art_c62f12bc59759bdbf3d1",
      channel: "bounded_professional_outreach",
    },
    ...extras,
  });
}

function prospect(overrides: Partial<Parameters<typeof evaluateEmailSendAuthorization>[0]["prospect"]> = {}) {
  return {
    prospectId: "prs_089dad6786418f4b",
    name: "Caleb Struewing",
    organization: "JLL",
    qualified: true,
    synthetic: false,
    optedOut: false,
    duplicate: false,
    cooldownUntil: null,
    activeInOtherCohort: false,
    contactability: contact("caleb.struewing@jll.com"),
    attempts: 0,
    ...overrides,
  };
}

describe("GOVERNED COMMUNICATION PROVIDER GMAIL FOUNDATION V1", () => {
  beforeEach(() => {
    resetCommunicationProviderRuntime();
  });

  it("keeps communication.email.send global and isolates Gmail to the adapter", () => {
    const capability = inspectEmailSendCapabilityState();
    expect(capability.capability).toBe(EMAIL_SEND_CAPABILITY);
    expect(capability.global).toBe(true);
    expect(capability.creSpecific).toBe(false);
    expect(capability.gmailSpecific).toBe(false);
    const env = envelope("broker@example.com");
    expect(env.capability).toBe("communication.email.send");
    expect("threadId" in env).toBe(false);
    expect("gmail" in env).toBe(false);
    const raw = translateEnvelopeToGmailRequest(env);
    expect(raw.userId).toBe("me");
    expect(raw.raw.length).toBeGreaterThan(10);
  });

  it("does not expose credentials to the coding agent or treat secret presence as values", () => {
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    const attestation = inspectCommunicationCredentialAttestation();
    expect(attestation.codingAgentCredentialAccess).toBe(false);
    expect(attestation.clientExposure).toBe(false);
    expect(attestation.secretLogging).toBe(false);
    expect(attestation.secretValues).toEqual([]);
    expect(JSON.stringify(attestation)).not.toMatch(/ya29\.|GOCSPX-|1\/\//);
  });

  it("blocks unverified and read-only providers from prospect send", () => {
    const intent = buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach");
    const unverified = evaluateEmailSendAuthorization({
      intent,
      prospect: prospect(),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(unverified.allowed).toBe(false);
    expect(unverified.providerVerificationGate).toBe("FAIL");

    setEmailSendCapabilityStateForTest("READ_ONLY_VERIFIED");
    const readOnly = evaluateEmailSendAuthorization({
      intent,
      prospect: prospect(),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(readOnly.allowed).toBe(false);
    expect(readOnly.providerVerificationGate).toBe("FAIL");
  });

  it("still requires separate outreach authorization after LIVE_WRITE_VERIFIED", () => {
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach"),
      prospect: prospect(),
      prospectSendAuthorized: false,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.providerVerificationGate).toBe("PASS");
    expect(decision.prospectSendAuthorization).toBe("FAIL");
  });

  it("enforces idempotency, opt-out, cooldown, invalid and unauthorized recipients", async () => {
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    const first = persistPreparedAttempt(envelope("caleb.struewing@jll.com"));
    first.authorized = true;
    first.state = "PROVIDER_ACCEPTED";
    const duplicate = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach"),
      prospect: prospect(),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(duplicate.idempotency).toBe("FAIL");
    expect(duplicate.allowed).toBe(false);

    resetCommunicationProviderRuntime();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    expect(
      evaluateEmailSendAuthorization({
        intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach"),
        prospect: prospect({ optedOut: true }),
        prospectSendAuthorized: true,
        contentApproved: true,
        channelAllowed: true,
        now: NOW,
      }).optOut,
    ).toBe("FAIL");
    expect(
      evaluateEmailSendAuthorization({
        intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach"),
        prospect: prospect({ cooldownUntil: "2026-09-20T00:00:00.000Z" }),
        prospectSendAuthorized: true,
        contentApproved: true,
        channelAllowed: true,
        now: NOW,
      }).cooldown,
    ).toBe("FAIL");
    expect(
      evaluateEmailSendAuthorization({
        intent: buildEmailIntent(envelope("not-an-email"), "bounded_outreach"),
        prospect: prospect({
          contactability: {
            status: "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
            channel: null,
            sourceUrl: null,
            scope: null,
            observedAt: NOW.toISOString(),
          },
        }),
        prospectSendAuthorized: true,
        contentApproved: true,
        channelAllowed: true,
        now: NOW,
      }).recipientAllowed,
    ).toBe("FAIL");

    recordSuppression({
      scope: "global",
      key: "blocked@example.com",
      reason: "opt_out",
      createdAt: NOW.toISOString(),
    });
    expect(
      evaluateEmailSendAuthorization({
        intent: buildEmailIntent(envelope("blocked@example.com"), "bounded_outreach"),
        prospect: prospect({
          prospectId: "prs_other",
          contactability: contact("blocked@example.com"),
        }),
        prospectSendAuthorized: true,
        contentApproved: true,
        channelAllowed: true,
        now: NOW,
      }).suppression,
    ).toBe("FAIL");

    const sent = await executeEmailSend({
      intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "bounded_outreach"),
      prospect: prospect(),
      prospectSendAuthorized: false,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
      fetchImpl: async () => {
        throw new Error("provider must not be called");
      },
    });
    expect(sent.blocked).toBe(true);
  });

  it("rejects prospects as provider verification recipients and does not mark accepted as delivered", () => {
    expect(isForbiddenWriteVerificationRecipient("caleb.struewing@jll.com")).toBe(true);
    expect(isForbiddenWriteVerificationRecipient("bkuhn@cresa.com")).toBe(true);
    expect(isForbiddenWriteVerificationRecipient("mvizzone@tenantadvisors.com")).toBe(true);
    expect(isForbiddenWriteVerificationRecipient("stephanie.severson@avisonyoung.com")).toBe(true);
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(envelope("caleb.struewing@jll.com"), "provider_write_verification"),
      prospectSendAuthorized: false,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT");
    const accepted = normalizeGmailSendResponse({
      accepted: true,
      id: "msg_provider",
      threadId: "thread_provider",
    });
    expect(accepted.accepted).toBe(true);
    expect(accepted.delivered).toBe(false);
    expect(accepted.deliveryProven).toBe(false);
    expect(accepted.attemptState).toBe("PROVIDER_ACCEPTED");
    expect(accepted.cost.classification).toBe("UNKNOWN");
    expect(accepted.cost.treatedAsZero).toBe(false);
    expect(providerAcceptedIsDelivered()).toBe(false);
    expect(unknownCostIsZero()).toBe(false);
  });

  it("preserves CRE attribution identifiers without putting recipient PII in the landing URL", () => {
    const env = envelope("caleb.struewing@jll.com");
    expect(env.attribution.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(env.attribution.cohortId).toBe("chrt_cre_first_real_v1");
    expect(env.attribution.prospectId).toBe("prs_089dad6786418f4b");
    expect(env.attribution.candidateId).toBe("7e7e924e-0741-4155-a729-8d529da77ea9");
    expect(env.attribution.artifactId).toBe("art_c62f12bc59759bdbf3d1");
    expect(env.landingUrl).not.toMatch(/caleb|struewing|jll\.com/i);
  });
});
