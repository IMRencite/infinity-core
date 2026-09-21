import { createHash } from "node:crypto";
import {
  buildEmailEnvelope,
  buildEmailIntent,
  executeEmailSend,
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectEmailSendCapabilityState,
  listCommunicationAttempts,
  setWriteVerificationPersistFile,
} from "@/lib/infinity/communication-provider";
import { GMAIL_WRITE_VERIFICATION_PERSIST_FILE } from "@/lib/infinity/communication-provider/constants";
import { FIRST_OUTREACH_COOLDOWN_MS } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import { evaluateContactGovernance } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import {
  reverifyPersistedProspect,
  type ProspectVerificationRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import { markPersistedProspectCooldown, type PersistedProspectRecord } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import {
  CALEB_PROSPECT_ID,
  CRE_CHANNEL,
  GMAIL_PROVIDER_ID,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
  MICHAEL_PROSPECT_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import { persistConversation, listConversations } from "@/lib/infinity/inbound-communication-runtime/conversation-store";
import { persistMessage } from "@/lib/infinity/inbound-communication-runtime/message-store";
import { hydrateInboundRuntimeState } from "@/lib/infinity/inbound-communication-runtime/persist";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { expandCreInboundObserverTracking } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CONTEXT_RICH_CONSULTATIVE_VARIANT,
  CONTEXT_RICH_CONSULTATIVE_VERSION,
} from "@/lib/infinity/inbound-communication-runtime/outreach-variants";
import {
  CRE_CANDIDATE_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";
import {
  evaluateConsultativeOutreachMessageQuality,
  evaluateConsultativeOutreachProspectEligibility,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
  inspectHistoricalWave1Preservation,
  renderContextRichVariant,
  type ContextRichVariantId,
} from "./context-rich-consultative-outreach-optimization";
import {
  CHALLENGER_CANDIDATE_SEEDS,
  CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
  CRE_CONTEXT_RICH_CHALLENGER_V1,
  persistChallengerCandidateSeeds,
  REVIEWED_AND_REJECTED_CANDIDATES,
  seedForProspect,
} from "./cre-context-rich-challenger-cohort";
import {
  emptyChallengerState,
  readContextRichChallengerState,
  writeContextRichChallengerState,
  type ChallengerSendRecord,
} from "./cre-context-rich-challenger-durable-state";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { hydrateWave1DurableState } from "./cre-wave-1-durable-state";

export const GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1 =
  "GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1" as const;
export const GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_MISSION_ID =
  "msn_governed_cre_context_rich_outreach_execution_v1" as const;
export const CONTEXT_RICH_EXECUTION_AUTHORIZATION_ID = "authz_cre_context_rich_consultative_v1" as const;
export const CONTEXT_RICH_MAX_SENDS = 4 as const;
export const CONTEXT_RICH_MESSAGE_VERSION = "cre_context_rich_consultative_v1" as const;

const PROTECTED = new Set([CALEB_PROSPECT_ID, MICHAEL_PROSPECT_ID, "Caleb Struewing", "Michael Vizzone"]);

export function buildContextRichIdempotencyKey(prospectId: string, variantId: ContextRichVariantId): string {
  const raw = [
    LOCKED_CRE_EXPERIMENT_ID,
    CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
    prospectId,
    "bounded_professional_outreach",
    CONTEXT_RICH_CONSULTATIVE_VARIANT,
    CONTEXT_RICH_MESSAGE_VERSION,
    variantId,
  ].join("|");
  return `idem_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export async function executeGovernedCreContextRichOutreachExecution(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
  hydrateCapability?: boolean;
  sendAuthorized?: boolean;
  providerWrite?: boolean;
} = {}) {
  if (input.hydrateCapability) {
    loadServerEnvFromLocalFile();
    reloadGmailOAuthFromLocalFile();
    setWriteVerificationPersistFile(GMAIL_WRITE_VERIFICATION_PERSIST_FILE);
    hydrateEmailSendCapabilityFromDurableWriteVerification();
  }
  hydrateWave1DurableState();
  hydrateInboundRuntimeState();
  const now = input.now ?? new Date();
  const clock = inspectExperimentClock(now);
  const capability = inspectEmailSendCapabilityState();
  const liveWrite = capability.state === "LIVE_WRITE_VERIFIED";
  const fetchImpl = input.fetchImpl ?? fetch;
  const historicalBefore = inspectHistoricalWave1Preservation();
  const prior = readContextRichChallengerState();
  const alreadyAccepted = new Set(
    (prior?.sends ?? [])
      .filter((row) => row.providerResult === "PROVIDER_ACCEPTED")
      .map((row) => row.prospectId),
  );
  const existingConversationIds = new Set(
    listConversations()
      .map((row) => row.prospectId)
      .filter((id): id is string => Boolean(id)),
  );
  const prospects = persistChallengerCandidateSeeds(now);
  const reviewed = CHALLENGER_CANDIDATE_SEEDS.length + REVIEWED_AND_REJECTED_CANDIDATES.length;
  const rejected: Array<{ name: string; reason: string }> = [...REVIEWED_AND_REJECTED_CANDIDATES];
  const verifications: ProspectVerificationRecord[] = [];
  const eligibleProspects: Array<{
    prospect: PersistedProspectRecord;
    verification: ProspectVerificationRecord;
    seed: NonNullable<ReturnType<typeof seedForProspect>>;
  }> = [];

  for (const prospect of prospects) {
    if (PROTECTED.has(prospect.prospectId) || PROTECTED.has(prospect.name)) {
      rejected.push({ name: prospect.name, reason: "HISTORICAL_WAVE_1_RECIPIENT" });
      continue;
    }
    if (alreadyAccepted.has(prospect.prospectId)) {
      continue;
    }
    const seed = seedForProspect(prospect.name);
    if (!seed) {
      rejected.push({ name: prospect.name, reason: "NO_SEED" });
      continue;
    }
    const verification = await reverifyPersistedProspect({
      prospect,
      fetchImpl,
      now,
      idempotencyKey: buildContextRichIdempotencyKey(prospect.prospectId, seed.variantId),
    });
    verifications.push(verification);
    const eligibility = evaluateConsultativeOutreachProspectEligibility({
      name: prospect.name,
      company: prospect.organization,
      role: prospect.role,
      email: verification.verifiedProfessionalEmail,
      personaFit: verification.roleEligibility === "QUALIFIED",
      identityConfidence: verification.identityConfidence,
      emailEvidence: verification.emailEvidence,
      currentRoleExplicit: verification.currentRoleExplicit,
      suppressed: false,
      cooldownUntil: prospect.cooldownUntil,
      duplicate: alreadyAccepted.has(prospect.prospectId),
      existingConversation: existingConversationIds.has(prospect.prospectId),
      historicalWave1Sent: false,
      inferredEmail: verification.inferredEmail,
      now,
    });
    if (verification.sendEligibility !== "SEND" || eligibility.overall !== "PASS") {
      rejected.push({
        name: prospect.name,
        reason: verification.blockReason ?? eligibility.reason,
      });
      continue;
    }
    eligibleProspects.push({ prospect, verification, seed });
  }

  const providerWrite = input.providerWrite !== false;
  const sendAuthorized = input.sendAuthorized !== false && liveWrite && providerWrite && !clock.windowExpired;
  const priorSends = prior?.sends.filter((row) => row.providerResult === "PROVIDER_ACCEPTED") ?? [];
  const sends: ChallengerSendRecord[] = [...priorSends];
  let providerWrites = 0;
  let blindRetries = 0;
  let duplicateSends = 0;
  let ambiguousResults = 0;
  const remainingSlots = Math.max(0, CONTEXT_RICH_MAX_SENDS - priorSends.length);

  for (const row of eligibleProspects.slice(0, remainingSlots)) {
    if (!sendAuthorized) break;
    if (providerWrites >= CONTEXT_RICH_MAX_SENDS) break;
    const existing = listCommunicationAttempts().find(
      (attempt) =>
        attempt.prospectId === row.prospect.prospectId &&
        (attempt.state === "PROVIDER_ACCEPTED" || attempt.state === "DELIVERED"),
    );
    if (existing) {
      duplicateSends += 1;
      continue;
    }
    const variant = renderContextRichVariant(row.seed.variantId, {
      firstName: firstName(row.prospect.name),
      verifiedName: row.verification.verifiedName,
      verifiedCompany: row.verification.verifiedCompany,
      verifiedRole: row.verification.verifiedRole,
      verifiedMarket: row.verification.verifiedMarket,
      sourceKind: "first_party_professional_bio",
    });
    const quality = evaluateConsultativeOutreachMessageQuality({
      variant,
      company: row.verification.verifiedCompany,
    });
    if (quality.overall !== "PASS" || /https?:\/\/|vercel\.app/i.test(variant.fullMessage) || /book a meeting|schedule a demo/i.test(variant.fullMessage)) {
      sends.push({
        prospectId: row.prospect.prospectId,
        name: row.prospect.name,
        email: row.verification.verifiedProfessionalEmail ?? "",
        personaSlot: row.seed.personaSlot,
        variantId: row.seed.variantId,
        subject: variant.subject,
        question: variant.currentProcessQuestion,
        wordCount: variant.wordCount,
        attemptId: null,
        conversationId: null,
        providerMessageId: null,
        providerThreadId: null,
        providerResult: "NOT_SENT",
        deliveryState: "NOT_SENT",
        strategy: CONTEXT_RICH_CONSULTATIVE_VARIANT,
        version: CONTEXT_RICH_CONSULTATIVE_VERSION,
      });
      continue;
    }
    const contactability = {
      status: "DIRECT_PUBLIC_BUSINESS_EMAIL" as const,
      channel: row.verification.verifiedProfessionalEmail,
      sourceUrl: row.verification.sourceUrl,
      scope: "DIRECT_CONTACT" as const,
      observedAt: row.verification.verifiedAt,
    };
    const governance = evaluateContactGovernance({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      prospectId: row.prospect.prospectId,
      name: row.prospect.name,
      organization: row.prospect.organization,
      qualified: row.prospect.qualified,
      synthetic: false,
      optedOut: false,
      duplicate: false,
      cooldownUntil: row.prospect.cooldownUntil,
      activeInOtherCohort: false,
      contactability,
      attempts: 0,
      now,
    });
    if (!governance.allowed) {
      rejected.push({ name: row.prospect.name, reason: governance.reason });
      continue;
    }
    const envelope = buildEmailEnvelope({
      organizationId: LIVE_ORG,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      cohortId: CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
      prospectId: row.prospect.prospectId,
      fromIdentity: "infinitemediaresources@gmail.com",
      toAddress: row.verification.verifiedProfessionalEmail!,
      subject: variant.subject,
      body: variant.fullMessage,
      authorizationId: CONTEXT_RICH_EXECUTION_AUTHORIZATION_ID,
      idempotencyKey: buildContextRichIdempotencyKey(row.prospect.prospectId, row.seed.variantId),
      createdAt: now.toISOString(),
      attribution: {
        candidateId: CRE_CANDIDATE_ID,
        artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
        channel: "bounded_professional_outreach",
      },
    });
    providerWrites += 1;
    const executed = await executeEmailSend({
      intent: buildEmailIntent(envelope, "bounded_outreach"),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now,
      fetchImpl,
      prospect: {
        prospectId: row.prospect.prospectId,
        name: row.prospect.name,
        organization: row.prospect.organization,
        qualified: true,
        synthetic: false,
        optedOut: false,
        duplicate: false,
        cooldownUntil: null,
        activeInOtherCohort: false,
        contactability,
        attempts: 0,
      },
    });
    const accepted = executed.attempt.providerResult?.accepted === true;
    const threadId = executed.attempt.providerResult?.providerThreadId ?? null;
    const messageId = executed.attempt.providerResult?.providerMessageId ?? null;
    if (accepted && !messageId && !threadId) {
      ambiguousResults += 1;
    }
    let conversationId: string | null = null;
    if (accepted && threadId) {
      const until = new Date(now.getTime() + FIRST_OUTREACH_COOLDOWN_MS).toISOString();
      markPersistedProspectCooldown(row.prospect.prospectId, until);
      const conversation = persistConversation({
        organizationId: LOCKED_ORG,
        ventureId: LOCKED_VENTURE,
        experimentId: LOCKED_EXPERIMENT,
        cohortId: CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
        prospectId: row.prospect.prospectId,
        customerId: null,
        channel: CRE_CHANNEL,
        provider: GMAIL_PROVIDER_ID,
        providerThreadId: threadId,
        subject: variant.subject,
        conversationType: "MARKET_VALIDATION_OUTREACH",
        ownershipState: "INFINITY_MANAGED",
        conversationState: "AWAITING_INBOUND",
        strategyProfile: CONTEXT_RICH_CONSULTATIVE_VARIANT,
        currentConversationStage: "OPEN_CONTEXT",
        lastInboundAt: null,
        lastOutboundAt: now.toISOString(),
        sourceAttemptId: executed.attempt.attemptId,
        sourceProviderMessageId: messageId,
        now,
      });
      conversationId = conversation.id;
      persistMessage({
        conversationId: conversation.id,
        direction: "OUTBOUND",
        provider: GMAIL_PROVIDER_ID,
        providerMessageId: messageId,
        providerThreadId: threadId,
        sender: "infinitemediaresources@gmail.com",
        recipients: [row.verification.verifiedProfessionalEmail!],
        subject: variant.subject,
        normalizedText: variant.fullMessage,
        receivedAt: null,
        sentAt: now.toISOString(),
        messageType: "INITIAL_OUTREACH",
        automationClassification: "UNKNOWN",
        providerMetadata: {},
        attachmentMetadata: [],
        traceability: {
          organizationId: LOCKED_ORG,
          ventureId: LOCKED_VENTURE,
          experimentId: LOCKED_EXPERIMENT,
          prospectId: row.prospect.prospectId,
          sourceAttemptId: executed.attempt.attemptId,
        },
      });
    }
    sends.push({
      prospectId: row.prospect.prospectId,
      name: row.prospect.name,
      email: row.verification.verifiedProfessionalEmail ?? "",
      personaSlot: row.seed.personaSlot,
      variantId: row.seed.variantId,
      subject: variant.subject,
      question: variant.currentProcessQuestion,
      wordCount: variant.wordCount,
      attemptId: executed.attempt.attemptId,
      conversationId,
      providerMessageId: messageId,
      providerThreadId: threadId,
      providerResult: accepted ? "PROVIDER_ACCEPTED" : executed.blocked ? "FAILED" : "FAILED",
      deliveryState: accepted ? "DELIVERY_UNKNOWN" : "NOT_SENT",
      strategy: CONTEXT_RICH_CONSULTATIVE_VARIANT,
      version: CONTEXT_RICH_CONSULTATIVE_VERSION,
    });
  }

  const acceptedSends = sends.filter((row) => row.providerResult === "PROVIDER_ACCEPTED");
  const tracked = acceptedSends
    .filter((row) => row.conversationId && row.providerThreadId)
    .map((row) => ({
      prospectId: row.prospectId,
      name: row.name,
      email: row.email,
      conversationId: row.conversationId!,
      threadId: row.providerThreadId!,
    }));
  if (tracked.length) {
    expandCreInboundObserverTracking({
      conversationIds: tracked.map((row) => row.conversationId),
      threadIds: tracked.map((row) => row.threadId),
    });
  }
  const nextState =
    acceptedSends.length >= 1
      ? ("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING" as const)
      : eligibleProspects.length === 0
        ? ("CRE_CONTEXT_RICH_CHALLENGER_NOT_EXECUTED" as const)
        : ("CRE_CONTEXT_RICH_CHALLENGER_EXECUTION_FAILED" as const);
  const state = writeContextRichChallengerState({
    ...(prior ?? emptyChallengerState(now)),
    authorizationConsumed: true,
    nextState,
    sends,
    tracked,
    rejected,
    providerWrites: (prior?.providerWrites ?? 0) + providerWrites,
    updatedAt: now.toISOString(),
  });
  return {
    mission: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
    authorization: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
    authorizationConsumed: state.authorizationConsumed,
    reviewed,
    eligible: eligibleProspects.length,
    rejected,
    prospects,
    verifications,
    sends,
    tracked,
    providerWrites,
    blindRetries,
    duplicateSends,
    ambiguousResults,
    liveWrite,
    sendAuthorized,
    nextState,
    historical: inspectHistoricalWave1Preservation(),
    historicalBefore,
    experiment: inspectRealMarketEvidence({ now }).experiment,
    clock: inspectExperimentClock(now),
    cohortId: CRE_CONTEXT_RICH_CHALLENGER_V1,
    economics: {
      providerCost: acceptedSends.length ? "UNKNOWN" : "NONE",
      researchCost: "UNKNOWN",
      aiModelCost: "NONE",
      unknownCosts: ["provider_send", "first_party_source_fetch"],
      treatedAsZero: false,
    },
    targetNotFilled: eligibleProspects.length < CONTEXT_RICH_MAX_SENDS ? "TARGET_4_NOT_FILLED_DUE_TO_EVIDENCE" : null,
  };
}
