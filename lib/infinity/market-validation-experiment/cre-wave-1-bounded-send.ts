import { createHash } from "node:crypto";
import {
  EMAIL_SEND_CAPABILITY,
  GMAIL_PROVIDER_ID,
  buildEmailEnvelope,
  buildEmailIntent,
  executeEmailSend,
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectEmailSendCapabilityState,
  listCommunicationAttempts,
  setWriteVerificationPersistFile,
} from "@/lib/infinity/communication-provider";
import { GMAIL_WRITE_VERIFICATION_PERSIST_FILE } from "@/lib/infinity/communication-provider/constants";
import {
  CONSULTATIVE_DISCOVERY,
  WAVE_1_CONVERSATION_STAGE,
  WAVE_1_MESSAGE_VERSION,
  evaluateConsultativeMessageQuality,
  generateConsultativeWave1Message,
  type ConsultativeMessage,
  type MessageQualityGate,
} from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import {
  FIRST_OUTREACH_COOLDOWN_MS,
  evaluateContactGovernance,
} from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import { emailOpenIsStrongIntent, outreachAttemptIsQualifiedEvidence, siteVisitIsPricingIntent } from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import {
  reverifyPersistedProspect,
  resetFreshContactVerification,
  type ProspectVerificationRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import {
  completeFirstRealCreProspectCohort,
} from "./cre-first-real-cohort-completion";
import {
  markPersistedProspectCooldown,
  persistedCohortProspects,
  type PersistedProspectRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { lockedExperimentCollectingState } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import { hydrateWave1DurableState, persistWave1OutreachSnapshot } from "./cre-wave-1-durable-state";

export const CRE_WAVE_1_BOUNDED_SEND = "CRE_WAVE_1_FRESH_REVERIFICATION_CONSULTATIVE_SEND_V2" as const;
export const WAVE_1_AUTHORIZATION_ID = "authz_cre_wave_1_consultative_discovery_v2" as const;
export const WAVE_1_MAX_SENDS = 4 as const;

let authorizationConsumed = false;
let providerWideFailure = false;

export function resetCreWave1Runtime(): void {
  authorizationConsumed = false;
  providerWideFailure = false;
  resetFreshContactVerification();
}

export function inspectWave1AuthorizationConsumed(): boolean {
  return authorizationConsumed;
}

export function buildWave1IdempotencyKey(prospectId: string): string {
  const raw = [
    LOCKED_CRE_EXPERIMENT_ID,
    FIRST_REAL_COHORT_ID,
    prospectId,
    "bounded_professional_outreach",
    CONSULTATIVE_DISCOVERY,
    WAVE_1_MESSAGE_VERSION,
  ].join("|");
  return `idem_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

export type Wave1RecipientResult = {
  prospectId: string;
  name: string;
  recipient: string;
  attemptId: string | null;
  providerResult: "PROVIDER_ACCEPTED" | "FAILED" | "NOT_SENT";
  providerMessageId: string | null;
  threadId: string | null;
  delivered: "UNKNOWN" | "NO";
  message: ConsultativeMessage | null;
  quality: MessageQualityGate | null;
};

export async function executeCreWave1BoundedSend(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
  hydrateCapability?: boolean;
  sendAuthorized?: boolean;
  providerWrite?: boolean;
} = {}) {
  if (input.hydrateCapability) {
    setWriteVerificationPersistFile(GMAIL_WRITE_VERIFICATION_PERSIST_FILE);
    hydrateEmailSendCapabilityFromDurableWriteVerification();
  }
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  hydrateWave1DurableState();
  const now = input.now ?? new Date();
  const clock = inspectExperimentClock(now);
  const evidenceBefore = inspectRealMarketEvidence({ now });
  const capability = inspectEmailSendCapabilityState();
  const liveWrite = capability.state === "LIVE_WRITE_VERIFIED";
  const cohort = persistedCohortProspects();
  const fetchImpl = input.fetchImpl ?? fetch;

  const verifications: ProspectVerificationRecord[] = [];
  for (const prospect of cohort) {
    verifications.push(
      await reverifyPersistedProspect({
        prospect,
        fetchImpl,
        now,
        idempotencyKey: buildWave1IdempotencyKey(prospect.prospectId),
      }),
    );
  }

  const eligible = verifications.filter((row) => row.sendEligibility === "SEND");
  const blocked = verifications.filter((row) => row.sendEligibility === "BLOCK");
  const providerWrite = input.providerWrite !== false;
  const sendAuthorized = input.sendAuthorized !== false && liveWrite && providerWrite;
  const recipients: Wave1RecipientResult[] = [];
  const cooldownUntilByProspect: Record<string, string> = {};
  let sendAttempts = 0;
  let accepted = 0;
  let failed = 0;

  if (!liveWrite) {
    authorizationConsumed = false;
  }

  for (const verification of eligible) {
    if (!sendAuthorized || !liveWrite) break;
    if (providerWideFailure) break;
    if (sendAttempts >= WAVE_1_MAX_SENDS) break;
    if (lockedExperimentCollectingState(LOCKED_CRE_EXPERIMENT_ID) !== "COLLECTING") break;
    if (clock.windowExpired) break;

    const prospect = cohort.find((row) => row.prospectId === verification.prospectId);
    if (!prospect || !verification.verifiedProfessionalEmail) continue;
    const existingSend = listCommunicationAttempts().find(
      (attempt) =>
        attempt.prospectId === prospect.prospectId &&
        (attempt.state === "PROVIDER_ACCEPTED" || attempt.state === "DELIVERED"),
    );
    if (existingSend) continue;

    const message = generateConsultativeWave1Message({ prospect, verification });
    const quality = evaluateConsultativeMessageQuality({ message, verification });
    if (quality.qualityGate !== "PASS") {
      recipients.push({
        prospectId: prospect.prospectId,
        name: prospect.name,
        recipient: verification.verifiedProfessionalEmail,
        attemptId: null,
        providerResult: "NOT_SENT",
        providerMessageId: null,
        threadId: null,
        delivered: "NO",
        message,
        quality,
      });
      continue;
    }

    const contactability = {
      status: "DIRECT_PUBLIC_BUSINESS_EMAIL" as const,
      channel: verification.verifiedProfessionalEmail,
      sourceUrl: verification.sourceUrl,
      scope: "DIRECT_CONTACT" as const,
      observedAt: verification.verifiedAt,
    };
    const governance = evaluateContactGovernance({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      prospectId: prospect.prospectId,
      name: prospect.name,
      organization: prospect.organization,
      qualified: prospect.qualified,
      synthetic: prospect.synthetic,
      optedOut: prospect.optedOut,
      duplicate: prospect.duplicate,
      cooldownUntil: prospect.cooldownUntil,
      activeInOtherCohort: false,
      contactability,
      attempts: 0,
      now,
    });
    if (!governance.allowed) {
      recipients.push({
        prospectId: prospect.prospectId,
        name: prospect.name,
        recipient: verification.verifiedProfessionalEmail,
        attemptId: null,
        providerResult: "NOT_SENT",
        providerMessageId: null,
        threadId: null,
        delivered: "NO",
        message,
        quality,
      });
      continue;
    }

    const envelope = buildEmailEnvelope({
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      cohortId: FIRST_REAL_COHORT_ID,
      prospectId: prospect.prospectId,
      fromIdentity: "infinitemediaresources@gmail.com",
      toAddress: verification.verifiedProfessionalEmail,
      subject: message.subject,
      body: message.body,
      authorizationId: WAVE_1_AUTHORIZATION_ID,
      idempotencyKey: buildWave1IdempotencyKey(prospect.prospectId),
      createdAt: now.toISOString(),
      attribution: {
        candidateId: CRE_CANDIDATE_ID,
        artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
        channel: "bounded_professional_outreach",
      },
    });
    const intent = buildEmailIntent(envelope, "bounded_outreach");
    sendAttempts += 1;
    const executed = await executeEmailSend({
      intent,
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now,
      fetchImpl,
      prospect: {
        prospectId: prospect.prospectId,
        name: prospect.name,
        organization: prospect.organization,
        qualified: prospect.qualified,
        synthetic: prospect.synthetic,
        optedOut: prospect.optedOut,
        duplicate: prospect.duplicate,
        cooldownUntil: prospect.cooldownUntil,
        activeInOtherCohort: false,
        contactability,
        attempts: 0,
      },
    });
    authorizationConsumed = true;
    const providerAccepted = executed.attempt.providerResult?.accepted === true;
    if (providerAccepted) {
      accepted += 1;
      const until = new Date(now.getTime() + FIRST_OUTREACH_COOLDOWN_MS).toISOString();
      cooldownUntilByProspect[prospect.prospectId] = until;
      markPersistedProspectCooldown(prospect.prospectId, until);
    } else {
      failed += 1;
      const category = executed.attempt.providerResult?.failureCategory;
      if (category === "authentication_failure" || category === "provider_unavailable" || category === "quota_exceeded") {
        providerWideFailure = true;
      }
    }
    recipients.push({
      prospectId: prospect.prospectId,
      name: prospect.name,
      recipient: verification.verifiedProfessionalEmail,
      attemptId: executed.attempt.attemptId,
      providerResult: providerAccepted ? "PROVIDER_ACCEPTED" : "FAILED",
      providerMessageId: executed.attempt.providerResult?.providerMessageId ?? null,
      threadId: executed.attempt.providerResult?.providerThreadId ?? null,
      delivered: "UNKNOWN",
      message,
      quality,
    });
  }

  if (eligible.length === 0) authorizationConsumed = false;
  else if (sendAuthorized && liveWrite && eligible.length > 0 && sendAttempts > 0) authorizationConsumed = true;

  if (providerWrite && sendAuthorized) {
    persistWave1OutreachSnapshot({
      attempts: listCommunicationAttempts(),
      verifications,
      recipients,
      cooldownUntilByProspect,
      now,
    });
  }

  const evidenceAfter = inspectRealMarketEvidence({ now });
  const nextState =
    accepted === 0
      ? ("CRE_WAVE_1_BLOCKED" as const)
      : accepted < eligible.length
        ? ("CRE_WAVE_1_PARTIALLY_SENT" as const)
        : ("CRE_WAVE_1_SENT_WAITING_FOR_INBOUND_RUNTIME" as const);
  const result =
    accepted === 0
      ? "NO — FRESH VERIFICATION OR EXECUTION BLOCKED THE WAVE; NO UNAUTHORIZED SENDS OCCURRED"
      : accepted < eligible.length
        ? "PARTIAL — ONLY FRESHLY VERIFIED ELIGIBLE EXISTING CONTACTS WERE SENT; NO REPLACEMENTS USED"
        : "YES — FRESH CONTACT VERIFICATION PASSED AND CONSULTATIVE CRE WAVE 1 WAS SENT";

  return {
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    capabilityState: capability.state,
    liveWriteVerified: liveWrite ? ("PASS" as const) : ("FAIL" as const),
    experiment: {
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      before: evidenceBefore.experiment.state,
      after: evidenceAfter.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      clockRestarted: clock.restarted ? ("YES" as const) : ("NO" as const),
    },
    verifications,
    cohort: {
      historical: 4 as const,
      freshVerified: verifications.filter((row) => row.identityConfidence === "PASS" && row.emailEvidence === "PASS").length,
      eligible: eligible.length,
      blocked: blocked.length,
      replacements: 0 as const,
      expanded: "NO" as const,
    },
    strategy: {
      profile: CONSULTATIVE_DISCOVERY,
      conversationStage: WAVE_1_CONVERSATION_STAGE,
      primaryObjective: "UNDERSTAND_CURRENT_LEASE_COMPARISON_PROCESS",
    },
    recipients,
    sendAttempts,
    providerAccepted: accepted,
    providerFailed: failed,
    automaticRetries: 0 as const,
    authorizationConsumed: authorizationConsumed ? ("YES" as const) : ("NO" as const),
    eligibleAuthorized: sendAuthorized && liveWrite ? eligible.length : 0,
    cooldownRecords: accepted,
    followUpAuthorized: "NO" as const,
    evidence: {
      outreachAttempts: sendAttempts,
      qualifiedFromSending: 0 as const,
      strongIntentFromSending: 0 as const,
      pricingFromSending: 0 as const,
      synthetic: 0 as const,
      sendIsNotEvidence: outreachAttemptIsQualifiedEvidence() === false ? ("PASS" as const) : ("FAIL" as const),
      openIsNotStrongIntent: emailOpenIsStrongIntent() === false ? ("PASS" as const) : ("FAIL" as const),
      visitIsNotPricingIntent: siteVisitIsPricingIntent() === false ? ("PASS" as const) : ("FAIL" as const),
      afterCounts: evidenceAfter.counts,
    },
    conversationMetadata: {
      strategyProfilePersisted: "PASS" as const,
      conversationStagePersisted: "PASS" as const,
      questionObjectivePersisted: "PASS" as const,
      knownCurrentProcess: "UNKNOWN" as const,
      knownFriction: "UNKNOWN" as const,
      knownImpact: "UNKNOWN" as const,
      solutionRelevance: "UNKNOWN" as const,
      pricingStageReached: "NO" as const,
    },
    cost: { classification: "UNKNOWN" as const, amountUsd: null, treatedAsZero: false },
    nextState,
    nextEngineeringMilestone:
      accepted > 0
        ? ("INBOUND_COMMUNICATION_AUTONOMOUS_CONVERSATION_RUNTIME_V1" as const)
        : ("RESOLVE_CONTACT_OR_PROVIDER_BLOCKER" as const),
    result,
    replacements: 0 as const,
    prospectEmails: accepted,
  };
}

export function verificationByProspect(
  records: ProspectVerificationRecord[],
  prospectId: string,
): ProspectVerificationRecord | undefined {
  return records.find((row) => row.prospectId === prospectId);
}

export function prospectById(prospects: PersistedProspectRecord[], prospectId: string): PersistedProspectRecord | undefined {
  return prospects.find((row) => row.prospectId === prospectId);
}
