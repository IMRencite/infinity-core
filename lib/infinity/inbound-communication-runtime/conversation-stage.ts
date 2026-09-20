import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import type { ReplyIntent } from "./types";

export const VALIDATION_SIGNALS = [
  "CURRENT_PROCESS_DISCLOSURE",
  "FRICTION_DISCLOSURE",
  "IMPACT_DISCLOSURE",
  "PRICING_SIGNAL",
  "MEETING_SIGNAL",
  "REFERRAL_SIGNAL",
] as const;
export type ValidationSignal = (typeof VALIDATION_SIGNALS)[number];

export function inferConversationStage(input: {
  current: ConversationStage;
  inboundText: string;
  intent: ReplyIntent;
}): ConversationStage {
  const text = input.inboundText.toLowerCase();
  if (input.intent === "MEETING_REQUEST" || /demo|trial|let'?s talk/i.test(text)) return "NEXT_STEP";
  if (input.intent === "PRICING_QUESTION" || /how much|price|cost/i.test(text)) return "PRICING";
  if (/does (this|it|your tool) (handle|cover|do)|would this help|does that address/i.test(text)) {
    return /price|cost|npv|compare/i.test(text) ? "SOLUTION" : "RELEVANCE";
  }
  if (/so we (lose|miss|delay)|clients (wait|push back)|that costs us/i.test(text)) return "IMPACT";
  if (/painful|slow|manual|keeps breaking|hard to (show|compare)/i.test(text)) return "FRICTION";
  if (/we (use|run|build) (excel|spreadsheets|a model)|today we|our process/i.test(text)) return "CURRENT_PROCESS";
  if (input.intent === "REQUEST_MORE_INFORMATION" || input.intent === "POSITIVE_INTEREST") {
    return stayOrAdvance(input.current, "RELEVANCE");
  }
  if (input.intent === "OBJECTION") return stayOrAdvance(input.current, "FRICTION");
  return input.current;
}

export function forcedStageProgression(): false {
  return false;
}

export function inferValidationSignals(input: {
  inboundText: string;
  stage: ConversationStage;
  intent?: ReplyIntent;
}): ValidationSignal[] {
  const text = input.inboundText.toLowerCase();
  const signals: ValidationSignal[] = [];
  if (
    input.stage === "CURRENT_PROCESS" ||
    /we (use|run|build) (excel|spreadsheets|a model)|today we|our process/i.test(text)
  ) {
    signals.push("CURRENT_PROCESS_DISCLOSURE");
  }
  if (input.stage === "FRICTION" || /painful|slow|manual|keeps breaking|hard to (show|compare)/i.test(text)) {
    signals.push("FRICTION_DISCLOSURE");
  }
  if (input.stage === "IMPACT" || /so we (lose|miss|delay)|clients (wait|push back)|that costs us/i.test(text)) {
    signals.push("IMPACT_DISCLOSURE");
  }
  if (input.intent === "PRICING_QUESTION" || /how much|what('s| is) the price|pricing|cost per/i.test(text)) {
    signals.push("PRICING_SIGNAL");
  }
  if (input.intent === "MEETING_REQUEST" || /let'?s talk|schedule|book a (call|meeting)|can we meet/i.test(text)) {
    signals.push("MEETING_SIGNAL");
  }
  if (input.intent === "REFERRAL_TO_OTHER_PERSON" || /try [A-Z][a-z]+ [A-Z]|contact [A-Z][a-z]+ [A-Z]/m.test(input.inboundText)) {
    signals.push("REFERRAL_SIGNAL");
  }
  return signals;
}

function stayOrAdvance(current: ConversationStage, next: ConversationStage): ConversationStage {
  const order: ConversationStage[] = [
    "OPEN_CONTEXT",
    "OPEN_CONTEXT+CURRENT_PROCESS",
    "CURRENT_PROCESS",
    "FRICTION",
    "IMPACT",
    "RELEVANCE",
    "SOLUTION",
    "PRICING",
    "NEXT_STEP",
  ];
  return order.indexOf(next) >= order.indexOf(current) ? next : current;
}
