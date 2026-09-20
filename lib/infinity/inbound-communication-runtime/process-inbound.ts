import { classifyReplyIntent } from "./intent-classifier";
import { inferConversationStage } from "./conversation-stage";
import { evaluateAutonomousCommunicationPolicy } from "./autonomous-policy";
import { persistSuppression, interpretDoNotEmailAgain } from "./suppression";
import { evaluateInboundEvidenceImpact, applyInboundEvidenceToExperiment } from "./evidence-bridge";
import { ingestInboundEvent, type NormalizedInboundPayload } from "./inbound-event";
import { planAutonomousReply } from "./reply-path";
import { lookupConversation, updateConversationState } from "./conversation-store";
import { lookupMessage } from "./message-store";
import { buildId, mutateInboundRuntimeState } from "./persist";
import type { ReferralCandidate } from "./types";

export function processInboundReply(payload: NormalizedInboundPayload): {
  ingested: boolean;
  duplicate: boolean;
  privacyExcluded: boolean;
  paused: boolean;
  outcome: "AUTO_EXECUTE" | "ROUTE_TO_GOVERNED_SYSTEM" | "PAUSE_EXCEPTION" | "EXCLUDED";
  intent: string | null;
  liveReplyExecuted: false;
} {
  const ingested = ingestInboundEvent(payload);
  if (ingested.privacyExcluded) {
    return { ingested: false, duplicate: false, privacyExcluded: true, paused: false, outcome: "EXCLUDED", intent: null, liveReplyExecuted: false };
  }
  if (ingested.identityUncertainty || !ingested.accepted || !ingested.event) {
    return {
      ingested: false,
      duplicate: ingested.duplicate,
      privacyExcluded: false,
      paused: true,
      outcome: "PAUSE_EXCEPTION",
      intent: null,
      liveReplyExecuted: false,
    };
  }
  const message = lookupMessage(ingested.event.messageId);
  const conversation = ingested.event.conversationId ? lookupConversation(ingested.event.conversationId) : null;
  if (!message || !conversation) {
    return { ingested: true, duplicate: ingested.duplicate, privacyExcluded: false, paused: true, outcome: "PAUSE_EXCEPTION", intent: null, liveReplyExecuted: false };
  }
  const classification = classifyReplyIntent({ text: message.normalizedText, sourceMessageId: message.id });
  const stage = inferConversationStage({
    current: conversation.currentConversationStage,
    inboundText: message.normalizedText,
    intent: classification.intent,
  });
  const policy = evaluateAutonomousCommunicationPolicy({
    classification,
    identityCertain: Boolean(conversation.prospectId),
    trackedThread: Boolean(conversation.providerThreadId),
  });
  if (classification.intent === "OPT_OUT") {
    persistSuppression({
      identity: message.sender,
      reason: "OPT_OUT",
      scope: interpretDoNotEmailAgain(),
      sourceMessageId: message.id,
      sourceAttemptId: conversation.sourceAttemptId,
      sourceConversationId: conversation.id,
    });
    updateConversationState({
      conversationId: conversation.id,
      ownershipState: "CLOSED",
      conversationState: "SUPPRESSED",
      currentConversationStage: stage,
    });
  } else if (classification.intent === "BOUNCE") {
    persistSuppression({
      identity: message.sender,
      reason: "HARD_BOUNCE",
      scope: "CONTACT_GLOBAL",
      sourceMessageId: message.id,
      sourceAttemptId: conversation.sourceAttemptId,
      sourceConversationId: conversation.id,
    });
  } else if (classification.intent === "NOT_INTERESTED") {
    updateConversationState({
      conversationId: conversation.id,
      ownershipState: "CLOSED",
      conversationState: "CLOSED",
      currentConversationStage: stage,
    });
  } else if (policy.outcome === "PAUSE_EXCEPTION") {
    updateConversationState({
      conversationId: conversation.id,
      ownershipState: "PAUSED_EXCEPTION",
      conversationState: "PAUSED",
      currentConversationStage: stage,
    });
  } else {
    updateConversationState({
      conversationId: conversation.id,
      currentConversationStage: stage,
    });
  }
  if (classification.intent === "REFERRAL_TO_OTHER_PERSON") {
    const referred = message.normalizedText.match(/([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1] ?? "UNNAMED";
    const referral: ReferralCandidate = {
      id: buildId("ref", `${conversation.id}|${referred}`),
      sourceConversationId: conversation.id,
      referrer: message.sender,
      referredIdentity: referred,
      sourceEvidence: message.normalizedText.slice(0, 240),
      qualificationState: "UNQUALIFIED",
      contactAuthorizationState: "NOT_AUTHORIZED",
      createdAt: new Date().toISOString(),
    };
    mutateInboundRuntimeState((state) => {
      if (!state.referrals.some((row) => row.id === referral.id)) state.referrals.push(referral);
    });
  }
  evaluateInboundEvidenceImpact({ classification: ingested.event.classification, intent: classification.intent });
  applyInboundEvidenceToExperiment();
  if (policy.outcome === "AUTO_EXECUTE") {
    planAutonomousReply({
      conversationId: conversation.id,
      inboundEventId: ingested.event.id,
      inboundText: message.normalizedText,
      classification,
      policy,
      stage,
    });
  }
  return {
    ingested: true,
    duplicate: ingested.duplicate,
    privacyExcluded: false,
    paused: policy.outcome === "PAUSE_EXCEPTION",
    outcome: policy.outcome,
    intent: classification.intent,
    liveReplyExecuted: false,
  };
}
