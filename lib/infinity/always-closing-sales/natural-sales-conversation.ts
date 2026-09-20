import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "@/lib/infinity/production-outbound/email-signature";
import { loadVentureCustomerVocabulary } from "./venture-customer-vocabulary";
import type { CommercialAction } from "./doctrine";

const DEFAULT_DISCOURAGED = [
  "verified path",
  "canonical",
  "next best action",
  "next best commercial action",
  "eligible_at",
  "semantic",
  "runtime",
  "composer",
  "venture offer",
  "offer truth",
  "qualified state",
  "conversion destination",
  "stage-aware",
  "dealworkspace",
];

export type SalesPhraseDetectorConfig = {
  discouraged: string[];
  venture_exceptions: string[];
};

export function salesPhraseDetectorConfig(venture_id = "occupancynpv"): SalesPhraseDetectorConfig {
  const vocab = loadVentureCustomerVocabulary(venture_id);
  return {
    discouraged: [...new Set([...DEFAULT_DISCOURAGED, ...vocab.terms_to_avoid, ...vocab.internal_only_terminology].map((row) => row.toLowerCase()))],
    venture_exceptions: [],
  };
}

export function detectInternalJargon(body: string, venture_id = "occupancynpv"): string[] {
  const config = salesPhraseDetectorConfig(venture_id);
  const text = body.toLowerCase();
  return config.discouraged.filter((phrase) => {
    if (config.venture_exceptions.includes(phrase)) return false;
    return text.includes(phrase);
  });
}

export type SalesConversationVoiceScore = {
  naturalness: number;
  clarity: number;
  confidence: number;
  brevity: number;
  relevance: number;
  value_articulation: number;
  offer_usage: number;
  cta_strength: number;
  internal_jargon_penalty: number;
  robotic_phrase_penalty: number;
  total: number;
};

export function scoreSalesConversationVoice(input: {
  inbound: string;
  generated: string;
  venture_id?: string;
}): SalesConversationVoiceScore {
  const body = input.generated.replace(OCCUPANCYNPV_EMAIL_SIGNATURE, "").trim();
  const jargon = detectInternalJargon(body, input.venture_id);
  const robotic = /if useful|if you'd like|let me know|the verified path|the canonical|the next action is/i.test(body);
  const formal = /pursuant|hereby|aforementioned|in accordance with/i.test(body);
  const offer = /free trial|https:\/\/occupancynpv\.com\/pricing/i.test(body);
  const cta = /start the free trial|start now|start here|try it with your actual|run both options/i.test(body);
  const answers = body.length > 80;
  const score: SalesConversationVoiceScore = {
    naturalness: robotic || formal ? 40 : 85,
    clarity: /rent|term|occupancy|npv/i.test(body) ? 90 : 60,
    confidence: /that's exactly|you can try|built for/i.test(body) ? 88 : 70,
    brevity: body.length < 1200 ? 80 : 55,
    relevance: /lease|renew|relocat|spreadsheet/i.test(`${input.inbound} ${body}`) ? 90 : 60,
    value_articulation: /side by side|without rebuilding|spreadsheet/i.test(body) ? 88 : 65,
    offer_usage: offer ? 90 : 40,
    cta_strength: cta ? 90 : 50,
    internal_jargon_penalty: jargon.length * 20,
    robotic_phrase_penalty: robotic ? 25 : 0,
    total: 0,
  };
  score.total = Math.max(
    0,
    Math.round(
      (score.naturalness + score.clarity + score.confidence + score.brevity + score.relevance + score.value_articulation + score.offer_usage + score.cta_strength) / 8
      - score.internal_jargon_penalty
      - score.robotic_phrase_penalty,
    ),
  );
  void answers;
  return score;
}

export function evaluateNaturalSalesConversationGate(input: {
  inbound: string;
  generated: string;
  next_action: CommercialAction;
  venture_id?: string;
}): NamedOutboundLoopGate & {
  natural_tone: "PASS" | "FAIL";
  conversational_flow: "PASS" | "FAIL";
  customer_facing_language: "PASS" | "FAIL";
  internal_jargon_leakage: boolean;
  overly_formal_wording: boolean;
  robotic_phrasing: boolean;
  repeated_boilerplate: boolean;
  question_answered: "PASS" | "FAIL";
  value_clear: "PASS" | "FAIL";
  offer_used: "PASS" | "FAIL" | "NOT_APPLICABLE";
  next_step_clear: "PASS" | "FAIL";
} {
  const body = input.generated;
  const jargon = detectInternalJargon(body, input.venture_id);
  const robotic = /if useful|if you'd like|let me know if|the verified path|the next action is/i.test(body);
  const formal = /pursuant|hereby|aforementioned/i.test(body);
  const boilerplate = (body.match(/OccupancyNPV is a comparison workspace/g) ?? []).length > 1;
  const question = /\?|how|what|can you|show|enter/.test(input.inbound.toLowerCase());
  const answered = !question || body.length > 80;
  const value = /side by side|spreadsheet|npv|property-value|comparison|financial sense/i.test(body);
  const offerNeeded = /INVITE_TRIAL|START_TRIAL|REQUEST_PURCHASE|REQUEST_NUMBERS|INVITE_DEMO/.test(input.next_action);
  const offer = /free trial|https:\/\/occupancynpv\.com\/pricing/i.test(body) || !offerNeeded;
  const next = input.next_action === "SUPPRESS" || input.next_action === "WAIT" || /start the free trial|try it with your actual|https:\/\/occupancynpv\.com\/pricing|\?|send the/i.test(body);
  const natural = !jargon.length && !robotic && !formal;
  const reasons: string[] = [];
  if (jargon.length) reasons.push("INTERNAL_JARGON");
  if (robotic) reasons.push("ROBOTIC_PHRASING");
  if (!answered) reasons.push("QUESTION_NOT_ANSWERED");
  if (offerNeeded && !offer) reasons.push("OFFER_MISSING");
  if (!next) reasons.push("NO_NEXT_STEP");
  return {
    gate: "NaturalSalesConversationGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NATURAL_SALES_COPY"],
    natural_tone: natural ? "PASS" : "FAIL",
    conversational_flow: body.includes("\n") || body.length > 120 ? "PASS" : "FAIL",
    customer_facing_language: jargon.length ? "FAIL" : "PASS",
    internal_jargon_leakage: jargon.length > 0,
    overly_formal_wording: formal,
    robotic_phrasing: robotic,
    repeated_boilerplate: boilerplate,
    question_answered: answered ? "PASS" : "FAIL",
    value_clear: value ? "PASS" : "FAIL",
    offer_used: offerNeeded ? (offer ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    next_step_clear: next ? "PASS" : "FAIL",
  };
}

export function rewriteNaturalSalesReply(body: string): string {
  return body
    .replace(/The verified path to try that with your real numbers is the 3-day free trial[^.]*\./gi, "You can try it with your actual numbers using the 3-day free trial — no credit card and no automatic billing.")
    .replace(/enter those numbers in one DealWorkspace/gi, "put both options into the same comparison")
    .replace(/DealWorkspace/gi, "comparison")
    .replace(/the next best (commercial )?action is to /gi, "")
    .replace(/If useful[^.]*\./gi, "Want to try it with your actual lease numbers?")
    .replace(/If you'd like[^.]*\./gi, "Want to try it with your actual scenario?")
    .replace(/Let me know if[^.]*\./gi, "Start the free trial here: https://occupancynpv.com/pricing")
    .trim();
}
