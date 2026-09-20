import { creOffer, crePricingHypotheses } from "@/lib/infinity/market-validation-experiment/offer";
import { DEPLOYED_SEO_GEO_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";
import { getActivePublicValidationUrl } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import type { AutonomousCommunicationDecision, GroundedReplyDraft, ReplyIntent } from "./types";
import { buildId } from "./persist";
import { groundedReplyContainsFabricatedClaims } from "./grounded-response";

export function contextRichReplyPrinciplePass(body: string): boolean {
  if (!body.trim()) return false;
  if (groundedReplyContainsFabricatedClaims(body)) return false;
  const hasContext = /lease-scenario|occupancy-cost|NPV|validation/i.test(body);
  const hasReason = /reached out|wrote because|because I|following up on/i.test(body);
  const hasDirect = body.length > 80;
  const hasNext = /\?/.test(body) || /will not (email|follow)/i.test(body);
  return hasContext && hasReason && hasDirect && hasNext;
}

export function generateContextRichGroundedReply(input: {
  conversationId: string;
  inboundEventId: string;
  inboundText: string;
  intent: ReplyIntent;
  stage: ConversationStage;
  policy: AutonomousCommunicationDecision;
  firstName?: string;
}): GroundedReplyDraft {
  const first = input.firstName ?? "there";
  const offer = creOffer();
  const pricing = crePricingHypotheses();
  const url = getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL;
  const annual = pricing[0]?.displayPrice ?? "$290 / year";
  const perDeal = pricing[1]?.displayPrice ?? "$149 / deal";
  const body = bodyFor(input.intent, first, input.inboundText, offer.valueProposition, url, annual, perDeal);
  return {
    conversationId: input.conversationId,
    inboundEventId: input.inboundEventId,
    subject: "Re: lease-scenario comparison",
    body,
    conversationStage: input.stage,
    questionLed: /\?/.test(body),
    fabricatedClaims: 0,
    liveSend: false,
    replyIdempotencyKey: buildId("rply", `${input.conversationId}|${input.inboundEventId}`),
  };
}

function bodyFor(
  intent: ReplyIntent,
  first: string,
  inboundText: string,
  value: string,
  url: string,
  annual: string,
  perDeal: string,
): string {
  const context =
    `Hi ${first} — I reached out because I am validating a lease-scenario / occupancy-cost comparison tool for tenant-rep work.`;
  if (intent === "OPT_OUT") {
    return `${context} Understood. I will not email you again about this.`;
  }
  if (intent === "NOT_INTERESTED" || intent === "WRONG_PERSON") {
    return `${context} Thanks for saying so. I will not follow up.`;
  }
  if (intent === "OUT_OF_OFFICE" || intent === "AUTOMATED_REPLY" || intent === "BOUNCE" || intent === "MEETING_REQUEST") {
    return "";
  }
  if (intent === "PRICING_QUESTION") {
    return `${context} You asked about price. The current validation hypotheses are ${annual} or ${perDeal} — not a custom quote. ${value} How are you comparing occupancy-cost or NPV for clients today?`;
  }
  if (intent === "REQUEST_MORE_INFORMATION") {
    return `${context} You asked for more information. Here is the early validation page: ${url}. ${value} It is not a CRM and is not a public launch. When you compare lease scenarios today, what does that process look like?`;
  }
  if (intent === "POSITIVE_INTEREST") {
    return `${context} Thanks — I heard interest, not a commitment. I do not want to assume your current workflow is a problem. When you compare multiple lease scenarios for a client, how is that analysis typically done today?`;
  }
  if (intent === "OBJECTION") {
    return `${context} That is a fair reaction to the note I sent. I am not asking you to change anything. What part of the current comparison process is already working well enough?`;
  }
  return `${context} Thanks for writing back about "${inboundText.slice(0, 80)}". How are you handling lease-scenario comparison today?`;
}
