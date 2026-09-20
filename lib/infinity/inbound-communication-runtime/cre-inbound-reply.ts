import { executeEmailSend } from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import {
  ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS,
  ALLOWED_CRE_INBOUND_REPLY_THREADS,
} from "@/lib/infinity/communication-provider/constants";
import { generateContextRichGroundedReply } from "./context-rich-reply";
import { lookupConversation } from "./conversation-store";
import { persistMessage } from "./message-store";
import { inspectInboundRuntimeState, mutateInboundRuntimeState } from "./persist";
import { updateConversationState } from "./conversation-store";
import {
  CALEB_EMAIL,
  CALEB_PROSPECT_ID,
  CRE_CHANNEL,
  CRE_INBOUND_REPLY_AUTHORIZATION_ID,
  GMAIL_PROVIDER_ID,
  INFINITY_MANAGED_SENDER,
  LOCKED_ORG,
  LOCKED_VENTURE,
  MICHAEL_EMAIL,
  MICHAEL_PROSPECT_ID,
} from "./constants";
import type { AutonomousCommunicationDecision, IntentClassification } from "./types";
import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";

const NO_REPLY_INTENTS = new Set(["OUT_OF_OFFICE", "AUTOMATED_REPLY", "BOUNCE", "MEETING_REQUEST", "REFERRAL_TO_OTHER_PERSON"]);

export function inboundIntentMayAutoreply(intent: string): boolean {
  return !NO_REPLY_INTENTS.has(intent);
}

export async function executeCreInboundAutonomousReply(input: {
  conversationId: string;
  inboundEventId: string;
  inboundText: string;
  inboundProviderMessageId: string;
  classification: IntentClassification;
  policy: AutonomousCommunicationDecision;
  stage: ConversationStage;
  firstName?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{
  attempted: boolean;
  accepted: boolean;
  duplicate: boolean;
  providerMessageId: string | null;
  providerThreadId: string | null;
  reason: string | null;
}> {
  if (input.policy.outcome !== "AUTO_EXECUTE" || !inboundIntentMayAutoreply(input.classification.intent)) {
    return { attempted: false, accepted: false, duplicate: false, providerMessageId: null, providerThreadId: null, reason: input.policy.outcome };
  }
  const conversation = lookupConversation(input.conversationId);
  if (!conversation?.providerThreadId || !conversation.prospectId) {
    return { attempted: false, accepted: false, duplicate: false, providerMessageId: null, providerThreadId: null, reason: "UNTRACKED_CONVERSATION" };
  }
  if (
    !ALLOWED_CRE_INBOUND_REPLY_THREADS.includes(
      conversation.providerThreadId as (typeof ALLOWED_CRE_INBOUND_REPLY_THREADS)[number],
    )
  ) {
    return { attempted: false, accepted: false, duplicate: false, providerMessageId: null, providerThreadId: null, reason: "THREAD_NOT_AUTHORIZED" };
  }
  const already = inspectInboundRuntimeState().messages.some(
    (row) =>
      row.conversationId === conversation.id &&
      row.messageType === "AUTONOMOUS_REPLY" &&
      row.providerMetadata &&
      (row.providerMetadata as { inboundEventId?: string }).inboundEventId === input.inboundEventId,
  );
  if (already) {
    return { attempted: false, accepted: false, duplicate: true, providerMessageId: null, providerThreadId: conversation.providerThreadId, reason: "REPLY_ALREADY_SENT" };
  }
  const firstName =
    input.firstName ??
    (conversation.prospectId === CALEB_PROSPECT_ID ? "Caleb" : conversation.prospectId === MICHAEL_PROSPECT_ID ? "Michael" : "there");
  const toAddress = conversation.prospectId === CALEB_PROSPECT_ID ? CALEB_EMAIL : MICHAEL_EMAIL;
  if (
    !ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS.includes(toAddress as (typeof ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS)[number])
  ) {
    return { attempted: false, accepted: false, duplicate: false, providerMessageId: null, providerThreadId: null, reason: "NEW_COLD_RECIPIENT_FORBIDDEN" };
  }
  const draft = generateContextRichGroundedReply({
    conversationId: conversation.id,
    inboundEventId: input.inboundEventId,
    inboundText: input.inboundText,
    intent: input.classification.intent,
    stage: input.stage,
    policy: input.policy,
    firstName,
  });
  if (!draft.body) {
    return { attempted: false, accepted: false, duplicate: false, providerMessageId: null, providerThreadId: conversation.providerThreadId, reason: "EMPTY_DRAFT" };
  }
  if (inspectInboundRuntimeState().processedReplyKeys.includes(draft.replyIdempotencyKey)) {
    const sent = inspectInboundRuntimeState().messages.some(
      (row) => row.conversationId === conversation.id && row.messageType === "AUTONOMOUS_REPLY",
    );
    if (sent) {
      return { attempted: false, accepted: false, duplicate: true, providerMessageId: null, providerThreadId: conversation.providerThreadId, reason: "REPLY_IDEMPOTENT" };
    }
  }
  const now = input.now ?? new Date();
  const envelope = buildEmailEnvelope({
    organizationId: LOCKED_ORG,
    ventureId: LOCKED_VENTURE,
    experimentId: conversation.experimentId,
    cohortId: conversation.cohortId,
    prospectId: conversation.prospectId,
    fromIdentity: INFINITY_MANAGED_SENDER,
    toAddress,
    subject: draft.subject,
    body: draft.body,
    authorizationId: CRE_INBOUND_REPLY_AUTHORIZATION_ID,
    idempotencyKey: draft.replyIdempotencyKey,
    providerThreadId: conversation.providerThreadId,
    inReplyTo: input.inboundProviderMessageId,
    attribution: {
      candidateId: conversation.ventureId,
      channel: CRE_CHANNEL,
      experimentId: conversation.experimentId,
      cohortId: conversation.cohortId,
      prospectId: conversation.prospectId,
      attemptId: conversation.sourceAttemptId,
      artifactId: null,
      landingUrl: null,
    },
  });
  const sent = await executeEmailSend({
    intent: buildEmailIntent(envelope, "autonomous_inbound_reply"),
    prospectSendAuthorized: true,
    contentApproved: true,
    channelAllowed: true,
    now,
    fetchImpl: input.fetchImpl,
  });
  mutateInboundRuntimeState((state) => {
    if (!state.processedReplyKeys.includes(draft.replyIdempotencyKey)) {
      state.processedReplyKeys.push(draft.replyIdempotencyKey);
    }
  });
  if (sent.blocked || !sent.attempt.providerResult?.accepted) {
    return {
      attempted: true,
      accepted: false,
      duplicate: false,
      providerMessageId: null,
      providerThreadId: conversation.providerThreadId,
      reason: sent.authorization.reason,
    };
  }
  persistMessage({
    conversationId: conversation.id,
    direction: "OUTBOUND",
    provider: GMAIL_PROVIDER_ID,
    providerMessageId: sent.attempt.providerResult.providerMessageId,
    providerThreadId: sent.attempt.providerResult.providerThreadId ?? conversation.providerThreadId,
    sender: INFINITY_MANAGED_SENDER,
    recipients: [toAddress],
    subject: draft.subject,
    normalizedText: draft.body,
    receivedAt: null,
    sentAt: now.toISOString(),
    messageType: "AUTONOMOUS_REPLY",
    automationClassification: "UNKNOWN",
    providerMetadata: { purpose: "CRE_INBOUND_AUTONOMOUS_REPLY", inboundEventId: input.inboundEventId },
    traceability: {
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      experimentId: conversation.experimentId,
      prospectId: conversation.prospectId,
      sourceAttemptId: sent.attempt.attemptId,
    },
    attachmentMetadata: [],
  });
  updateConversationState({
    conversationId: conversation.id,
    conversationState: "REPLY_SENT",
    lastOutboundAt: now.toISOString(),
    currentConversationStage: input.stage,
  });
  return {
    attempted: true,
    accepted: true,
    duplicate: false,
    providerMessageId: sent.attempt.providerResult.providerMessageId,
    providerThreadId: sent.attempt.providerResult.providerThreadId,
    reason: null,
  };
}
