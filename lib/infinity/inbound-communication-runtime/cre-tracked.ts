import {
  CALEB_ATTEMPT_ID,
  CALEB_CONVERSATION_ID,
  CALEB_EMAIL,
  CALEB_PROSPECT_ID,
  CALEB_PROVIDER_MESSAGE_ID,
  CALEB_PROVIDER_THREAD_ID,
  CRE_CHANNEL,
  GMAIL_PROVIDER_ID,
  LOCKED_COHORT,
  LOCKED_EXPERIMENT,
  LOCKED_ORG,
  LOCKED_VENTURE,
  MICHAEL_ATTEMPT_ID,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_EMAIL,
  MICHAEL_PROSPECT_ID,
  MICHAEL_PROVIDER_MESSAGE_ID,
  MICHAEL_PROVIDER_THREAD_ID,
  BEN_PROSPECT_ID,
  STEPHANIE_PROSPECT_ID,
} from "./constants";
import { persistConversation, lookupConversationByThread } from "./conversation-store";
import { persistMessage } from "./message-store";
import type { CommunicationConversation } from "./types";

export function prepareCreWave1TrackedConversations(now = new Date()): {
  caleb: CommunicationConversation;
  michael: CommunicationConversation;
  benPrepared: false;
  stephaniePrepared: false;
} {
  const caleb =
    lookupConversationByThread(CALEB_PROVIDER_THREAD_ID) ??
    persistConversation({
      id: CALEB_CONVERSATION_ID,
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      experimentId: LOCKED_EXPERIMENT,
      cohortId: LOCKED_COHORT,
      prospectId: CALEB_PROSPECT_ID,
      customerId: null,
      channel: CRE_CHANNEL,
      provider: GMAIL_PROVIDER_ID,
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      subject: "Question on Columbus lease-scenario comparison",
      conversationType: "MARKET_VALIDATION_OUTREACH",
      ownershipState: "INFINITY_MANAGED",
      conversationState: "AWAITING_INBOUND",
      strategyProfile: "CONSULTATIVE_DISCOVERY",
      currentConversationStage: "OPEN_CONTEXT+CURRENT_PROCESS",
      lastInboundAt: null,
      lastOutboundAt: now.toISOString(),
      sourceAttemptId: CALEB_ATTEMPT_ID,
      sourceProviderMessageId: CALEB_PROVIDER_MESSAGE_ID,
      now,
    });
  const michael =
    lookupConversationByThread(MICHAEL_PROVIDER_THREAD_ID) ??
    persistConversation({
      id: MICHAEL_CONVERSATION_ID,
      organizationId: LOCKED_ORG,
      ventureId: LOCKED_VENTURE,
      experimentId: LOCKED_EXPERIMENT,
      cohortId: LOCKED_COHORT,
      prospectId: MICHAEL_PROSPECT_ID,
      customerId: null,
      channel: CRE_CHANNEL,
      provider: GMAIL_PROVIDER_ID,
      providerThreadId: MICHAEL_PROVIDER_THREAD_ID,
      subject: "Question on Chicago tenant-rep lease comparison",
      conversationType: "MARKET_VALIDATION_OUTREACH",
      ownershipState: "INFINITY_MANAGED",
      conversationState: "AWAITING_INBOUND",
      strategyProfile: "CONSULTATIVE_DISCOVERY",
      currentConversationStage: "OPEN_CONTEXT+CURRENT_PROCESS",
      lastInboundAt: null,
      lastOutboundAt: now.toISOString(),
      sourceAttemptId: MICHAEL_ATTEMPT_ID,
      sourceProviderMessageId: MICHAEL_PROVIDER_MESSAGE_ID,
      now,
    });
  if (!caleb.sourceAttemptId) {
    persistMessage({
      conversationId: caleb.id,
      direction: "OUTBOUND",
      provider: GMAIL_PROVIDER_ID,
      providerMessageId: CALEB_PROVIDER_MESSAGE_ID,
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      sender: "infinitemediaresources@gmail.com",
      recipients: [CALEB_EMAIL],
      subject: caleb.subject,
      normalizedText: "initial consultative outreach",
      receivedAt: null,
      sentAt: now.toISOString(),
      messageType: "INITIAL_OUTREACH",
      automationClassification: "UNKNOWN",
      providerMetadata: {},
      traceability: {
        organizationId: LOCKED_ORG,
        ventureId: LOCKED_VENTURE,
        experimentId: LOCKED_EXPERIMENT,
        prospectId: CALEB_PROSPECT_ID,
        sourceAttemptId: CALEB_ATTEMPT_ID,
      },
      attachmentMetadata: [],
    });
  }
  void BEN_PROSPECT_ID;
  void STEPHANIE_PROSPECT_ID;
  void MICHAEL_EMAIL;
  void MICHAEL_PROVIDER_MESSAGE_ID;
  return { caleb, michael, benPrepared: false, stephaniePrepared: false };
}

export function calebThreadLinked(): boolean {
  return lookupConversationByThread(CALEB_PROVIDER_THREAD_ID)?.prospectId === CALEB_PROSPECT_ID;
}

export function michaelThreadLinked(): boolean {
  return lookupConversationByThread(MICHAEL_PROVIDER_THREAD_ID)?.prospectId === MICHAEL_PROSPECT_ID;
}
