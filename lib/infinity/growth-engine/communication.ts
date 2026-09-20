import {
  INFINITY_BRAND_NAME,
  INFINITY_COMMUNICATION_IDENTITY_CONTRACT,
  INFINITY_FIRST_CONTACT_IDENTITY,
  INFINITY_TRUTHFUL_IDENTITY,
  NATURAL_AUTONOMOUS_COMMUNICATION_CONTRACT,
  AUTONOMOUS_RESPONSE_PACING_CONTRACT,
  type InboundCommunicationClass,
  type NamedGrowthGate,
} from "./contract";

const HUMAN_NAME_CLAIMS = /\b(i['’]m|i am|this is)\s+(sarah|john|mike|alex|david|emily|jessica)\b/i;
const HUMAN_EMPLOYEE_CLAIMS = /human employee|i personally wrote|i manually reviewed|real person here/i;
const AUTOMATION_DENIAL = /i am not (an? )?(ai|bot|automated|autonomous)|i['’]m a (real )?human/i;
const CANNED = /i hope this (email )?finds you well|just circling back|touching base|as an ai/i;

export function firstContactIdentity(recipientFirstName?: string | null): string {
  if (recipientFirstName?.trim()) return `Hi ${recipientFirstName.trim()} — I’m Infinity.`;
  return INFINITY_FIRST_CONTACT_IDENTITY;
}

export function identityReply(classification: InboundCommunicationClass): string | null {
  if (classification === "IDENTITY_QUESTION" || classification === "IDENTITY_UNCERTAIN") {
    return INFINITY_TRUTHFUL_IDENTITY;
  }
  return null;
}

export function evaluateInfinityIdentityTruthfulnessGate(input: {
  opening: string;
  askedAboutIdentity: boolean;
  reply?: string;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (HUMAN_NAME_CLAIMS.test(input.opening) || HUMAN_EMPLOYEE_CLAIMS.test(input.opening)) {
    reasons.push("HUMAN_IMPERSONATION");
  }
  if (input.askedAboutIdentity && input.reply && AUTOMATION_DENIAL.test(input.reply)) {
    reasons.push("FALSE_DENIAL_OF_AUTOMATION");
  }
  if (input.askedAboutIdentity && input.reply && !/autonomous venture operating system/i.test(input.reply)) {
    reasons.push("IDENTITY_QUESTION_NOT_TRUTHFUL");
  }
  if (/IMR’s autonomous venture operating system|IMR's autonomous venture operating system/.test(input.opening) && !input.askedAboutIdentity) {
    // allowed but not required — do not fail
  }
  return { gate: "InfinityIdentityTruthfulnessGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateAutonomousCommunicationQualityGate(input: {
  message: string;
  ignoresThread: boolean;
  repeatsContent: boolean;
  unsupportedClaim: boolean;
  continuesAfterOptOut: boolean;
  wrongVentureContext: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (CANNED.test(input.message)) reasons.push("CANNED_PHRASING");
  if (input.ignoresThread) reasons.push("IGNORES_THREAD");
  if (input.repeatsContent) reasons.push("REPEATS_CONTENT");
  if (input.unsupportedClaim) reasons.push("UNSUPPORTED_CLAIM");
  if (input.continuesAfterOptOut) reasons.push("CONTINUES_AFTER_OPTOUT");
  if (input.wrongVentureContext) reasons.push("WRONG_VENTURE_CONTEXT");
  if (HUMAN_EMPLOYEE_CLAIMS.test(input.message)) reasons.push("HUMAN_IMPERSONATION");
  return { gate: "AutonomousCommunicationQualityGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function planResponseDelay(input: {
  urgent: boolean;
  afterHoursRecipientLocal: boolean;
  complexity: "LOW" | "MEDIUM" | "HIGH";
}): { delayMinutes: number; queueForNextWindow: boolean; artificiallyDelayedUrgent: boolean } {
  if (input.urgent) {
    return { delayMinutes: 0, queueForNextWindow: false, artificiallyDelayedUrgent: false };
  }
  if (input.afterHoursRecipientLocal) {
    return { delayMinutes: 0, queueForNextWindow: true, artificiallyDelayedUrgent: false };
  }
  const band = input.complexity === "HIGH" ? [30, 90] : input.complexity === "MEDIUM" ? [8, 35] : [3, 18];
  const delayMinutes = band[0]! + ((input.complexity.length * 7) % (band[1]! - band[0]! + 1));
  return { delayMinutes, queueForNextWindow: false, artificiallyDelayedUrgent: false };
}

export function classifyInboundCommunication(text: string): InboundCommunicationClass {
  const value = text.toLowerCase();
  if (/unsubscribe|opt out|stop emailing/.test(value)) return "UNSUBSCRIBE";
  if (/are you (an? )?(ai|bot|automated|human)|who are you|who operates/.test(value)) return "IDENTITY_QUESTION";
  if (/price|pricing|how much|cost/.test(value)) return "PRICING_QUESTION";
  if (/legal|lawsuit|gdpr|attorney/.test(value)) return "LEGAL_RISK";
  if (/not interested|no thanks/.test(value)) return "NOT_INTERESTED";
  if (/not now|later|busy/.test(value)) return "NOT_NOW";
  if (/wrong person|not the right/.test(value)) return "WRONG_PERSON";
  if (/refer|colleague/.test(value)) return "REFERRAL";
  if (/support|can't login|broken/.test(value)) return "SUPPORT";
  if (/interested|send more|tell me more/.test(value)) return "POSITIVE_INTEREST";
  if (/\?/.test(value)) return "QUESTION";
  return "OTHER";
}

export type ResponseQueueItem = {
  eligible_at: string;
  recipient_timezone: string | null;
  business_hours: boolean;
  urgency: "ROUTINE" | "URGENT";
  recommended_delay_minutes: number;
  actual_send_at: string | null;
  conversation_state: string;
  risk: string;
  policy_state: string;
};

export function communicationContracts() {
  return {
    identity: INFINITY_COMMUNICATION_IDENTITY_CONTRACT,
    natural: NATURAL_AUTONOMOUS_COMMUNICATION_CONTRACT,
    pacing: AUTONOMOUS_RESPONSE_PACING_CONTRACT,
    brand: INFINITY_BRAND_NAME,
    firstContact: INFINITY_FIRST_CONTACT_IDENTITY,
    truthful: INFINITY_TRUTHFUL_IDENTITY,
    fullDisclosureRequiredInEveryOpening: false,
  };
}
