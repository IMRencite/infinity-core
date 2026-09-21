import { beforeEach, describe, expect, it } from "vitest";
import {
  persistPreparedAttempt,
  resetCommunicationProviderRuntime,
  restoreCommunicationAttempt,
} from "@/lib/infinity/communication-provider";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { outreachAttemptIsQualifiedEvidence, emailOpenIsStrongIntent, siteVisitIsPricingIntent } from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import {
  auditInterruptedCreWave1Run,
  classifyInterruptedRun,
  classifyWave1ProspectSend,
  gmailReadbackAvailability,
  safeResumeProspectIds,
  type Wave1AttemptView,
} from "../cre-wave-1-interrupted-run-audit";
import { buildWave1IdempotencyKey } from "../cre-wave-1-bounded-send";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";

const NOW = new Date("2026-09-02T16:44:00.000Z");

function attempt(partial: Partial<Wave1AttemptView> & Pick<Wave1AttemptView, "prospectId" | "toAddress">): Wave1AttemptView {
  return {
    purpose: "bounded_outreach",
    state: "PREPARED",
    authorized: false,
    providerAccepted: false,
    providerMessageId: null,
    providerThreadId: null,
    idempotencyKey: buildWave1IdempotencyKey(partial.prospectId ?? "prs_089dad6786418f4b"),
    ...partial,
  };
}

describe("CRE WAVE 1 INTERRUPTED-RUN ZERO-WRITE AUDIT V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  it("classifies provider accepted + message ID as CONFIRMED_SENT and blocks resume", () => {
    const sent = classifyWave1ProspectSend({
      prospectId: "prs_089dad6786418f4b",
      name: "Caleb Struewing",
      recipient: "caleb.struewing@jll.com",
      attempts: [
        attempt({
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: "msg_sent_1",
          providerThreadId: "thrd_sent_1",
        }),
      ],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(sent.status).toBe("CONFIRMED_SENT");
    expect(sent.providerAccepted).toBe("YES");
    expect(sent.providerMessageId).toBe("msg_sent_1");
    expect(sent.duplicateProtection).toBe("PASS");
    expect(sent.safeToResume).toBe(false);
    expect(sent.experimentEvidenceAddedFromSend).toBe(false);
  });

  it("classifies no attempt and no provider state as CONFIRMED_NOT_SENT and may enter resume set", () => {
    const row = classifyWave1ProspectSend({
      prospectId: "prs_0ec2773f4c21713c",
      name: "Ben Kuhn",
      recipient: "bkuhn@cresa.com",
      attempts: [],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(row.status).toBe("CONFIRMED_NOT_SENT");
    expect(row.communicationAttempts).toBe(0);
    expect(row.providerAccepted).toBe("NO");
    expect(row.providerMessageId).toBeNull();
    expect(row.duplicateProtection).toBe("NOT_APPLICABLE");
    expect(row.cooldown).toBe(false);
    expect(row.safeToResume).toBe(true);
  });

  it("classifies conflicting or incomplete state as AMBIGUOUS and never resumes it", () => {
    const incomplete = classifyWave1ProspectSend({
      prospectId: "prs_595d8aa946521b71",
      name: "Michael Vizzone",
      recipient: "mvizzone@tenantadvisors.com",
      attempts: [
        attempt({
          prospectId: "prs_595d8aa946521b71",
          toAddress: "mvizzone@tenantadvisors.com",
          state: "AUTHORIZED",
          authorized: true,
        }),
      ],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    const acceptedNoId = classifyWave1ProspectSend({
      prospectId: "prs_4fb32c29477ab519",
      name: "Stephanie Severson",
      recipient: "stephanie.severson@avisonyoung.com",
      attempts: [
        attempt({
          prospectId: "prs_4fb32c29477ab519",
          toAddress: "stephanie.severson@avisonyoung.com",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: null,
        }),
      ],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    const cooldownWithoutSend = classifyWave1ProspectSend({
      prospectId: "prs_089dad6786418f4b",
      name: "Caleb Struewing",
      recipient: "caleb.struewing@jll.com",
      attempts: [],
      cooldownUntil: "2026-09-16T16:44:00.000Z",
      cooldownSource: "wave_1",
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(incomplete.status).toBe("AMBIGUOUS");
    expect(acceptedNoId.status).toBe("AMBIGUOUS");
    expect(cooldownWithoutSend.status).toBe("AMBIGUOUS");
    expect(incomplete.safeToResume).toBe(false);
    expect(acceptedNoId.safeToResume).toBe(false);
    expect(cooldownWithoutSend.safeToResume).toBe(false);
    expect(safeResumeProspectIds([incomplete, acceptedNoId, cooldownWithoutSend])).toEqual([]);
  });

  it("keeps confirmed-sent out of the resume set and confirmed-not-sent in", () => {
    const sent = classifyWave1ProspectSend({
      prospectId: "prs_089dad6786418f4b",
      name: "Caleb Struewing",
      recipient: "caleb.struewing@jll.com",
      attempts: [
        attempt({
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: "msg_a",
          providerThreadId: "thrd_a",
        }),
      ],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    const unsent = classifyWave1ProspectSend({
      prospectId: "prs_0ec2773f4c21713c",
      name: "Ben Kuhn",
      recipient: "bkuhn@cresa.com",
      attempts: [],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(classifyInterruptedRun([sent, unsent])).toBe("PARTIAL_SENDS_OCCURRED");
    expect(safeResumeProspectIds([sent, unsent])).toEqual(["prs_0ec2773f4c21713c"]);
  });

  it("audits duplicate protection and cooldown without mutating", () => {
    const key = buildWave1IdempotencyKey("prs_089dad6786418f4b");
    const sent = classifyWave1ProspectSend({
      prospectId: "prs_089dad6786418f4b",
      name: "Caleb Struewing",
      recipient: "caleb.struewing@jll.com",
      attempts: [
        attempt({
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: "msg_dup",
          idempotencyKey: key,
        }),
      ],
      cooldownUntil: "2026-09-16T16:44:00.000Z",
      cooldownSource: "wave_1",
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(sent.duplicateProtection).toBe("PASS");
    expect(sent.cooldown).toBe(true);
    const missingDup = classifyWave1ProspectSend({
      prospectId: "prs_089dad6786418f4b",
      name: "Caleb Struewing",
      recipient: "caleb.struewing@jll.com",
      attempts: [
        attempt({
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: "msg_dup",
          idempotencyKey: "idem_wrong_key_not_wave1",
        }),
      ],
      experimentCollecting: true,
      capabilityLiveWriteVerified: true,
      now: NOW,
    });
    expect(missingDup.status).toBe("CONFIRMED_SENT");
    expect(missingDup.duplicateProtection).toBe("FAIL");
  });

  it("treats send and provider acceptance as non-evidence and does not invoke a provider", () => {
    expect(outreachAttemptIsQualifiedEvidence()).toBe(false);
    expect(emailOpenIsStrongIntent()).toBe(false);
    expect(siteVisitIsPricingIntent()).toBe(false);
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const audit = auditInterruptedCreWave1Run({
      now: NOW,
      attempts: [],
      experimentState: "COLLECTING",
      capabilityState: "LIVE_WRITE_VERIFIED",
    });
    expect(audit.emails).toBe(0);
    expect(audit.providerWrites).toBe(0);
    expect(audit.sendIsEvidence).toBe(false);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(before);
    expect(gmailReadbackAvailability().result).toBe("GMAIL_READBACK_NOT_AVAILABLE");
    expect(audit.gmailReadback.unrelatedMailboxContentIngested).toBe(false);
    expect(audit.classification).toBe("NO_SENDS_OCCURRED");
    expect(audit.confirmedNotSent).toBe(4);
    expect(audit.ambiguous).toBe(0);
    expect(audit.containsConfirmedSent).toBe(false);
    expect(audit.containsAmbiguous).toBe(false);
    expect(audit.safeResumeCount).toBe(4);
    expect(audit.hq.canonicalMissionRuntimeUsed).toBe(false);
  });

  it("ignores write-verification attempts aimed at a non-prospect mailbox", () => {
    persistPreparedAttempt({
      messageId: "msg_verify",
      attemptId: "att_verify",
      organizationId: "org",
      ventureId: null,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      cohortId: null,
      prospectId: null,
      provider: "gmail.com_v1",
      capability: "communication.email.send",
      fromIdentity: "infinitemediaresources@gmail.com",
      toAddress: "htunity@gmail.com",
      subject: "Infinity OS Gmail Provider Verification",
      body: "verification",
      replyTo: null,
      landingUrl: null,
      attribution: {
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        cohortId: null,
        prospectId: null,
        candidateId: null,
        artifactId: null,
        channel: null,
        attemptId: "att_verify",
        landingUrl: null,
      },
      idempotencyKey: "idem_write_verification_only",
      authorizationId: "authz_gmail_provider_write_verification_v1",
      economicExposureCeiling: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
      createdAt: NOW.toISOString(),
    });
    restoreCommunicationAttempt({
      messageId: "msg_verify",
      attemptId: "att_verify",
      organizationId: "org",
      ventureId: null,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      cohortId: null,
      prospectId: null,
      provider: "gmail.com_v1",
      capability: "communication.email.send",
      fromIdentity: "infinitemediaresources@gmail.com",
      toAddress: "htunity@gmail.com",
      subject: "Infinity OS Gmail Provider Verification",
      body: "verification",
      replyTo: null,
      landingUrl: null,
      attribution: {
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        cohortId: null,
        prospectId: null,
        candidateId: null,
        artifactId: null,
        channel: null,
        attemptId: "att_verify",
        landingUrl: null,
      },
      idempotencyKey: "idem_write_verification_only",
      authorizationId: "authz_gmail_provider_write_verification_v1",
      economicExposureCeiling: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
      createdAt: NOW.toISOString(),
      state: "PROVIDER_ACCEPTED",
      authorized: true,
      providerResult: {
        accepted: true,
        delivered: false,
        deliveryProven: false,
        attemptState: "PROVIDER_ACCEPTED",
        providerMessageId: "1a062c7f46ae1e49",
        providerThreadId: "1a062c7f46ae1e49",
        providerTimestamp: null,
        failureCategory: null,
        failureMessage: null,
        cost: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
      },
    });
    const audit = auditInterruptedCreWave1Run({
      now: NOW,
      attempts: [
        {
          prospectId: null,
          toAddress: "htunity@gmail.com",
          purpose: "provider_write_verification",
          state: "PROVIDER_ACCEPTED",
          authorized: true,
          providerAccepted: true,
          providerMessageId: "1a062c7f46ae1e49",
          providerThreadId: "1a062c7f46ae1e49",
          idempotencyKey: "idem_write_verification_only",
        },
      ],
      experimentState: "COLLECTING",
      capabilityState: "LIVE_WRITE_VERIFIED",
    });
    expect(audit.classification).toBe("NO_SENDS_OCCURRED");
    expect(audit.prospects.every((row) => row.status === "CONFIRMED_NOT_SENT")).toBe(true);
    expect(audit.prospects.every((row) => row.communicationAttempts === 0)).toBe(true);
  });
});
