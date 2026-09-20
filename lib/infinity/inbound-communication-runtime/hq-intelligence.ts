import { inspectInboundRuntimeState } from "./persist";
import { listConversations } from "./conversation-store";
import { classifyReplyIntent } from "./intent-classifier";
import { lookupMessage } from "./message-store";
import { inspectMailboxObserverHealth } from "./observer-persist";
import type { CommunicationIntelligenceProjection } from "./types";

export function projectCommunicationIntelligence(): CommunicationIntelligenceProjection {
  const state = inspectInboundRuntimeState();
  const conversations = listConversations();
  const intents = state.events.map((event) => {
    const message = lookupMessage(event.messageId);
    return message ? classifyReplyIntent({ text: message.normalizedText, sourceMessageId: message.id }) : null;
  });
  return {
    newInboundReplies: state.events.filter((row) => row.classification === "HUMAN_REPLY").length,
    positiveInterest: intents.filter((row) => row?.intent === "POSITIVE_INTEREST").length,
    pricingQuestions: intents.filter((row) => row?.intent === "PRICING_QUESTION").length,
    meetingRequests: intents.filter((row) => row?.intent === "MEETING_REQUEST").length,
    objections: intents.filter((row) => row?.intent === "OBJECTION").length,
    negativeReplies: intents.filter((row) => row?.intent === "NOT_INTERESTED").length,
    optOuts: state.events.filter((row) => row.classification === "OPT_OUT").length,
    bounces: state.events.filter((row) => row.classification === "BOUNCE").length,
    autonomousReplies: 0,
    pausedExceptions: conversations.filter((row) => row.ownershipState === "PAUSED_EXCEPTION").length,
    activeConversations: conversations.filter((row) => row.ownershipState === "INFINITY_MANAGED").length,
    recentActivity: conversations.slice(-8).map((row) => ({
      conversationId: row.id,
      prospectId: row.prospectId,
      stage: row.currentConversationStage,
      lastIntent: intents.find((item) => item)?.intent ?? null,
      lastOutcome: null,
      updatedAt: row.updatedAt,
    })),
    conversations,
    mailboxObserver: inspectMailboxObserverHealth(),
  };
}
