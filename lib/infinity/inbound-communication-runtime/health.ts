import { inspectInboundRuntimeState } from "./persist";
import { listConversations } from "./conversation-store";
import type { CommunicationHealth } from "./types";

export function inspectCommunicationHealthRates(): {
  humanReplyRate: "INSUFFICIENT_DATA";
  qualifiedReplyRate: "INSUFFICIENT_DATA";
  strongIntentRate: "INSUFFICIENT_DATA";
  pricingIntentRate: "INSUFFICIENT_DATA";
  negativeResponseRate: "INSUFFICIENT_DATA";
  optOutRate: "INSUFFICIENT_DATA";
  timeToReply: "INSUFFICIENT_DATA";
} {
  return {
    humanReplyRate: "INSUFFICIENT_DATA",
    qualifiedReplyRate: "INSUFFICIENT_DATA",
    strongIntentRate: "INSUFFICIENT_DATA",
    pricingIntentRate: "INSUFFICIENT_DATA",
    negativeResponseRate: "INSUFFICIENT_DATA",
    optOutRate: "INSUFFICIENT_DATA",
    timeToReply: "INSUFFICIENT_DATA",
  };
}

export function inspectCommunicationHealth(): CommunicationHealth {
  const state = inspectInboundRuntimeState();
  const events = state.events;
  return {
    sent: state.messages.filter((row) => row.direction === "OUTBOUND").length,
    providerAccepted: listConversations().filter((row) => row.sourceAttemptId).length,
    deliveredIfKnown: 0,
    hardBounce: events.filter((row) => row.classification === "BOUNCE").length,
    softBounce: 0,
    humanReply: events.filter((row) => row.classification === "HUMAN_REPLY").length,
    positiveReply: 0,
    negativeReply: events.filter((row) => row.classification === "OPT_OUT").length,
    optOut: events.filter((row) => row.classification === "OPT_OUT").length,
    complaint: events.filter((row) => row.classification === "COMPLAINT").length,
    autonomousReply: state.messages.filter((row) => row.messageType === "AUTONOMOUS_REPLY").length,
    providerFailure: 0,
    replyLatencyMs: null,
    unknownCostTreatedAsZero: false,
  };
}
