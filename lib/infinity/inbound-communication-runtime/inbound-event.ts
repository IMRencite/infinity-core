import { buildId, inspectInboundRuntimeState, mutateInboundRuntimeState } from "./persist";
import { persistMessage } from "./message-store";
import { evaluateMailboxPrivacy } from "./mailbox-privacy";
import { matchInboundThread } from "./thread-matching";
import { classifyInboundEventClass } from "./intent-classifier";
import { updateConversationState } from "./conversation-store";
import { LOCKED_ORG, LOCKED_VENTURE } from "./constants";
import type { InboundCommunicationEvent } from "./types";

export type NormalizedInboundPayload = {
  providerMessageId: string;
  providerThreadId?: string | null;
  inReplyTo?: string | null;
  sender: string;
  recipients: string[];
  subject: string;
  text: string;
  receivedAt?: string;
};

export function ingestInboundEvent(payload: NormalizedInboundPayload): {
  accepted: boolean;
  duplicate: boolean;
  privacyExcluded: boolean;
  identityUncertainty: boolean;
  event: InboundCommunicationEvent | null;
} {
  const ingestIdempotencyKey = buildId("ing", [payload.providerMessageId, payload.providerThreadId ?? "", payload.sender].join("|"));
  const existing = inspectInboundRuntimeState().processedIngestKeys.includes(ingestIdempotencyKey);
  if (existing) {
    const event = inspectInboundRuntimeState().events.find((row) => row.ingestIdempotencyKey === ingestIdempotencyKey) ?? null;
    return { accepted: Boolean(event), duplicate: true, privacyExcluded: false, identityUncertainty: false, event };
  }
  const privacy = evaluateMailboxPrivacy({
    providerThreadId: payload.providerThreadId,
    sender: payload.sender,
    recipients: payload.recipients,
  });
  if (!privacy.process) {
    return { accepted: false, duplicate: false, privacyExcluded: true, identityUncertainty: false, event: null };
  }
  const match = matchInboundThread({
    providerThreadId: payload.providerThreadId,
    providerMessageId: payload.providerMessageId,
    inReplyTo: payload.inReplyTo,
    sender: payload.sender,
    recipients: payload.recipients,
    subject: payload.subject,
  });
  if (!match.matched) {
    return {
      accepted: false,
      duplicate: false,
      privacyExcluded: false,
      identityUncertainty: match.identityUncertainty,
      event: null,
    };
  }
  const message = persistMessage({
    conversationId: match.conversation.id,
    direction: "INBOUND",
    provider: "gmail.com_v1",
    providerMessageId: payload.providerMessageId,
    providerThreadId: payload.providerThreadId ?? match.conversation.providerThreadId,
    sender: payload.sender.toLowerCase(),
    recipients: payload.recipients.map((item) => item.toLowerCase()),
    subject: payload.subject,
    normalizedText: payload.text,
    receivedAt: payload.receivedAt ?? new Date().toISOString(),
    sentAt: null,
    messageType: "HUMAN_REPLY",
    automationClassification: classifyInboundEventClass(payload.text) === "HUMAN_REPLY" ? "HUMAN" : "AUTOMATED",
    providerMetadata: { inReplyTo: payload.inReplyTo ?? null },
    traceability: {
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      experimentId: match.conversation.experimentId,
      prospectId: match.conversation.prospectId,
      sourceAttemptId: match.conversation.sourceAttemptId,
    },
    attachmentMetadata: [],
  });
  const event: InboundCommunicationEvent = {
    id: buildId("iev", ingestIdempotencyKey),
    messageId: message.id,
    conversationId: match.conversation.id,
    provider: "gmail.com_v1",
    ventureId: match.conversation.ventureId,
    prospectId: match.conversation.prospectId,
    experimentId: match.conversation.experimentId,
    sourceOutboundAttemptId: match.conversation.sourceAttemptId,
    classification: classifyInboundEventClass(payload.text),
    ingestIdempotencyKey,
    createdAt: new Date().toISOString(),
  };
  mutateInboundRuntimeState((state) => {
    state.events.push(event);
    state.processedIngestKeys.push(ingestIdempotencyKey);
  });
  updateConversationState({
    conversationId: match.conversation.id,
    conversationState: "INBOUND_RECEIVED",
    lastInboundAt: event.createdAt,
  });
  return { accepted: true, duplicate: false, privacyExcluded: false, identityUncertainty: false, event };
}
