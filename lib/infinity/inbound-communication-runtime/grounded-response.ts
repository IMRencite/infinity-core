import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import { creOffer, crePricingHypotheses } from "@/lib/infinity/market-validation-experiment/offer";
import { DEPLOYED_SEO_GEO_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";
import { getActivePublicValidationUrl } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import type { AutonomousCommunicationDecision, GroundedReplyDraft, ReplyIntent } from "./types";
import { buildId } from "./persist";

const FORBIDDEN =
  /limited time|act now|only today|customers love|already used by|we're the leading|guaranteed|excel is painful|losing deals/i;

export function generateGroundedReply(input: {
  conversationId: string;
  inboundEventId: string;
  inboundText: string;
  intent: ReplyIntent;
  stage: ConversationStage;
  policy: AutonomousCommunicationDecision;
  firstName?: string;
}): GroundedReplyDraft {
  const offer = creOffer();
  const pricing = crePricingHypotheses();
  const first = input.firstName ?? "there";
  const body = bodyFor(input.intent, first, offer.valueProposition, pricing[0]?.displayPrice ?? "$290 / year", pricing[1]?.displayPrice ?? "$149 / deal");
  if (FORBIDDEN.test(body)) {
    throw new Error("Grounded reply failed quality gate");
  }
  return {
    conversationId: input.conversationId,
    inboundEventId: input.inboundEventId,
    subject: "Re: lease-scenario comparison",
    body,
    conversationStage: input.stage,
    questionLed: /\?/.test(body) && input.intent !== "PRICING_QUESTION" && input.intent !== "OPT_OUT",
    fabricatedClaims: 0,
    liveSend: false,
    replyIdempotencyKey: buildId("rply", `${input.conversationId}|${input.inboundEventId}`),
  };
}

export function groundedReplyContainsFabricatedClaims(body: string): boolean {
  return /our customers|case study|we already work with|guaranteed results|adopted by/i.test(body);
}

function bodyFor(
  intent: ReplyIntent,
  first: string,
  value: string,
  annual: string,
  perDeal: string,
): string {
  if (intent === "OPT_OUT") {
    return `Hi ${first} — understood. I will not email you again about this.`;
  }
  if (intent === "NOT_INTERESTED") {
    return `Hi ${first} — thanks for saying so. I will not follow up.`;
  }
  if (intent === "WRONG_PERSON") {
    return `Hi ${first} — thanks for letting me know. I will not keep this thread going.`;
  }
  if (intent === "OUT_OF_OFFICE" || intent === "AUTOMATED_REPLY" || intent === "BOUNCE") {
    return "";
  }
  if (intent === "PRICING_QUESTION") {
    return `Hi ${first} — the current validation prices are ${annual} or ${perDeal}. Those are hypotheses, not a custom quote. If useful, how are you comparing occupancy-cost or NPV for clients today?`;
  }
  if (intent === "REQUEST_MORE_INFORMATION") {
    const url = getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL;
    return `Hi ${first} — happy to share the early validation page: ${url}. ${value} It is not a CRM. When you compare lease scenarios today, what does that process look like?`;
  }
  if (intent === "POSITIVE_INTEREST") {
    return `Hi ${first} — thanks. I do not want to assume your current workflow is a problem. When you compare multiple lease scenarios for a client, how is that analysis typically done today?`;
  }
  if (intent === "OBJECTION") {
    return `Hi ${first} — that is fair. I am not asking you to change anything. If you are willing to say, what part of the current comparison process is already working well enough?`;
  }
  if (intent === "MEETING_REQUEST") {
    return "";
  }
  return `Hi ${first} — thanks for writing back. How are you handling lease-scenario comparison today?`;
}
