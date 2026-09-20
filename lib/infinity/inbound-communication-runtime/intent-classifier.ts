import type { InboundEventClass, IntentClassification, PolicyOutcome, ReplyIntent } from "./types";

export function classifyInboundEventClass(text: string): InboundEventClass {
  const body = text.toLowerCase();
  if (/mailer-daemon|delivery status notification|undeliverable|user unknown|550 5\./i.test(body)) return "BOUNCE";
  if (/unsubscribe|remove me|do not (email|contact) me|stop emailing|opt[- ]out/i.test(body)) return "OPT_OUT";
  if (/this is spam|report phishing|abuse@/i.test(body)) return "COMPLAINT";
  if (/out of (the )?office|i am away|on leave until/i.test(body)) return "OUT_OF_OFFICE";
  if (/delivery (has )?failed|permanent failure/i.test(body)) return "DELIVERY_FAILURE";
  if (/automatic reply|autoreply|no[- ]reply@|mailer-daemon|do not reply to this/i.test(body) && body.length < 800) {
    return "AUTOMATED_REPLY";
  }
  if (body.trim().length === 0) return "UNKNOWN";
  return "HUMAN_REPLY";
}

export function classifyReplyIntent(input: { text: string; sourceMessageId: string }): IntentClassification {
  const body = input.text.toLowerCase();
  const classification = classifyInboundEventClass(input.text);
  if (classification === "BOUNCE" || classification === "DELIVERY_FAILURE") {
    return result("BOUNCE", "HIGH", ["delivery-failure language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (classification === "OPT_OUT") {
    return result("OPT_OUT", "HIGH", ["explicit opt-out language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (classification === "OUT_OF_OFFICE") {
    return result("OUT_OF_OFFICE", "HIGH", ["out-of-office language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (classification === "AUTOMATED_REPLY") {
    return result("AUTOMATED_REPLY", "HIGH", ["automated-reply language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/not the right person|wrong person|you have the wrong|no longer (handle|with)/i.test(body)) {
    if (/try [A-Z][a-z]+|reach [A-Z][a-z]+|speak with [A-Z][a-z]+|talk to [A-Z][a-z]+|contact [A-Z][a-z]+ [A-Z]/m.test(input.text)) {
      return result("REFERRAL_TO_OTHER_PERSON", "MEDIUM", ["named another person after wrong-person language"], input.sourceMessageId, false, "ROUTE_TO_GOVERNED_SYSTEM");
    }
    return result("WRONG_PERSON", "HIGH", ["wrong-person language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/please (talk|speak|reach) (to|with) [A-Z][a-z]+|try [A-Z][a-z]+ [A-Z]|contact [A-Z][a-z]+ [A-Z][a-z]+/m.test(input.text)) {
    return result("REFERRAL_TO_OTHER_PERSON", "MEDIUM", ["referred another person"], input.sourceMessageId, true, "ROUTE_TO_GOVERNED_SYSTEM");
  }
  if (/not interested|no thanks|please don't contact|we're all set/i.test(body)) {
    return result("NOT_INTERESTED", "HIGH", ["explicit not-interested language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/how much|what('s| is) the price|pricing|cost per|\$290|\$149/i.test(body)) {
    return result("PRICING_QUESTION", "HIGH", ["explicit price/cost question"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/let'?s talk|schedule|book a (call|meeting)|can we meet|available (to )?chat/i.test(body)) {
    return result("MEETING_REQUEST", "HIGH", ["meeting/call request"], input.sourceMessageId, false, "ROUTE_TO_GOVERNED_SYSTEM");
  }
  if (/send (more )?info|tell me more|can you share|more information/i.test(body)) {
    return result("REQUEST_MORE_INFORMATION", "HIGH", ["request for more information"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/too expensive|not sure this fits|already have a process|concerned about/i.test(body)) {
    return result("OBJECTION", "MEDIUM", ["objection language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  if (/interested|this looks useful|worth a look|yes,? (send|please)/i.test(body)) {
    return result("POSITIVE_INTEREST", "MEDIUM", ["positive interest language"], input.sourceMessageId, false, "AUTO_EXECUTE");
  }
  return result("OTHER", "LOW", ["no supported intent phrase"], input.sourceMessageId, true, "AUTO_EXECUTE");
}

function result(
  intent: ReplyIntent,
  confidence: IntentClassification["confidence"],
  supportingEvidence: string[],
  sourceMessageId: string,
  uncertainty: boolean,
  recommendedGovernedAction: PolicyOutcome,
): IntentClassification {
  return { intent, confidence, supportingEvidence, sourceMessageId, uncertainty, recommendedGovernedAction };
}
