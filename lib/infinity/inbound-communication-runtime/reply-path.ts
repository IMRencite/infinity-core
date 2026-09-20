import { evaluateEmailSendAuthorization } from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import { lookupConversation } from "./conversation-store";
import { lookupMessage } from "./message-store";
import { generateGroundedReply } from "./grounded-response";
import { inspectInboundRuntimeState, mutateInboundRuntimeState } from "./persist";
import { CRE_CHANNEL, GMAIL_PROVIDER_ID, INFINITY_MANAGED_SENDER, LOCKED_ORG, LOCKED_VENTURE } from "./constants";
import type { AutonomousCommunicationDecision, GroundedReplyDraft, IntentClassification } from "./types";

export function planAutonomousReply(input: {
  conversationId: string;
  inboundEventId: string;
  inboundText: string;
  classification: IntentClassification;
  policy: AutonomousCommunicationDecision;
  stage: Parameters<typeof generateGroundedReply>[0]["stage"];
  firstName?: string;
}): {
  planned: boolean;
  duplicate: boolean;
  threadBounded: boolean;
  draft: GroundedReplyDraft | null;
  authorizationAllowed: boolean;
  liveReplyExecuted: false;
} {
  const conversation = lookupConversation(input.conversationId);
  if (!conversation?.providerThreadId) {
    return { planned: false, duplicate: false, threadBounded: false, draft: null, authorizationAllowed: false, liveReplyExecuted: false };
  }
  const event = inspectInboundRuntimeState().events.find((row) => row.id === input.inboundEventId);
  if (!event) {
    return { planned: false, duplicate: false, threadBounded: true, draft: null, authorizationAllowed: false, liveReplyExecuted: false };
  }
  const noReply =
    input.classification.intent === "OUT_OF_OFFICE" ||
    input.classification.intent === "AUTOMATED_REPLY" ||
    input.classification.intent === "BOUNCE" ||
    input.classification.intent === "MEETING_REQUEST" ||
    input.policy.outcome === "PAUSE_EXCEPTION" ||
    input.policy.outcome === "ROUTE_TO_GOVERNED_SYSTEM";
  if (noReply && input.classification.intent !== "REFERRAL_TO_OTHER_PERSON") {
    return { planned: false, duplicate: false, threadBounded: true, draft: null, authorizationAllowed: false, liveReplyExecuted: false };
  }
  const draft = generateGroundedReply({
    conversationId: conversation.id,
    inboundEventId: input.inboundEventId,
    inboundText: input.inboundText,
    intent: input.classification.intent,
    stage: input.stage,
    policy: input.policy,
    firstName: input.firstName,
  });
  if (inspectInboundRuntimeState().processedReplyKeys.includes(draft.replyIdempotencyKey)) {
    return { planned: false, duplicate: true, threadBounded: true, draft, authorizationAllowed: true, liveReplyExecuted: false };
  }
  const inbound = lookupMessage(event.messageId);
  const envelope = buildEmailEnvelope({
    organizationId: LOCKED_ORG,
    ventureId: LOCKED_VENTURE,
    experimentId: conversation.experimentId,
    cohortId: conversation.cohortId,
    prospectId: conversation.prospectId,
    fromIdentity: INFINITY_MANAGED_SENDER,
    toAddress: inbound?.sender ?? "",
    subject: draft.subject,
    body: draft.body,
    authorizationId: "authz_inbound_autonomous_reply_v1",
    idempotencyKey: draft.replyIdempotencyKey,
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
  const intent = { ...buildEmailIntent(envelope, "bounded_outreach"), capability: EMAIL_SEND_CAPABILITY };
  const authorization = evaluateEmailSendAuthorization({
    intent,
    prospectSendAuthorized: true,
    contentApproved: true,
    channelAllowed: true,
  });
  mutateInboundRuntimeState((state) => {
    if (!state.processedReplyKeys.includes(draft.replyIdempotencyKey)) {
      state.processedReplyKeys.push(draft.replyIdempotencyKey);
    }
  });
  void GMAIL_PROVIDER_ID;
  return {
    planned: draft.body.length > 0,
    duplicate: false,
    threadBounded: true,
    draft,
    authorizationAllowed: authorization.allowed,
    liveReplyExecuted: false,
  };
}

export function liveRepliesExecutedThisMilestone(): 0 {
  return 0;
}
