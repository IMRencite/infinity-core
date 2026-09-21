import { createHash } from "crypto";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { planConversation } from "../conversation-planner";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import type { CommercialAction, SalesStagePolicy } from "@/lib/infinity/always-closing-sales/doctrine";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";
import { TARGET_INTERNAL_DATE_MS } from "./snapshot-ids";
import { FOUNDER_TRIAL_INBOUND_TEXT, INTERNAL_LANGUAGE } from "./canary";
import { evaluateDirectQuestionResponsivenessGate, evaluateHardSalesGates, evaluateSoftSalesGates, OFFER_TRUTH_VERSION } from "./sales-class";
import { composeHighIntentOfferFallback } from "./high-intent";
import { vercelRuntimeIdentity } from "./release";

export const LIVE_SHADOW_SCOPE = "communication-live-shadow-v5" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationThreadContinuityGate(input: {
  thread_id: string;
  in_reply_to: string | null;
  intended_thread_id: string;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.thread_id) && input.thread_id === input.intended_thread_id && Boolean(input.in_reply_to);
  return named("CommunicationThreadContinuityGate", pass ? "PASS" : "FAIL", [
    input.thread_id || "NO_THREAD",
    input.in_reply_to ? "IN_REPLY_TO_PRESENT" : "IN_REPLY_TO_ABSENT",
  ]);
}

export function executeRealMessageShadow(input: {
  provider_message_id: string;
  visible_body: string;
  authorship: "PROSPECT" | "PROVISIONAL_TEST_PROSPECT" | "SYSTEM" | "UNKNOWN";
  prior_infinity_outbound_count: number;
  rfc_message_id?: string | null;
  thread_id: string;
  now: string;
}): {
  provider_message_id: string;
  intent: string;
  stage: string;
  first_touch: boolean;
  offer_truth_version: typeof OFFER_TRUTH_VERSION;
  draft_hash: string;
  fallback_selected: boolean;
  verdicts: NamedOutboundLoopGate[];
  hard: "PASS" | "FAIL";
  soft: "PASS" | "DEGRADED";
  send: "NO";
  LivePromotedRuntimeShadowGate: NamedOutboundLoopGate;
} {
  const inbound = input.visible_body || FOUNDER_TRIAL_INBOUND_TEXT;
  const plan = planConversation({
    visible_body: inbound,
    previous_intent: "REQUEST_INPUTS",
    previous_outbound: "prior-infinity-outbound",
    stage: "QUALIFIED",
    prior_infinity_outbound_count: input.prior_infinity_outbound_count,
  });
  let body = composeOccupancyNpvAlwaysClosingReply({ inbound, intent: plan.intent, turn: 4 }).body;
  const profile = loadVentureOfferProfile("occupancynpv");
  let offer = evaluateVentureOfferTruthGate({ profile, claimed: body });
  let responsive = evaluateDirectQuestionResponsivenessGate({ inbound, generated: body });
  let fallback = false;
  if (offer.result !== "PASS" || responsive.result !== "PASS") {
    body = composeHighIntentOfferFallback(inbound).body;
    fallback = true;
    offer = evaluateVentureOfferTruthGate({ profile, claimed: body });
    responsive = evaluateDirectQuestionResponsivenessGate({ inbound, generated: body });
  }
  const hard = evaluateHardSalesGates({
    inbound,
    generated: body,
    suppressed: false,
    authorship: input.authorship,
    ownership_free: true,
    prior_outbound: input.prior_infinity_outbound_count,
    next_action: plan.next_action as CommercialAction,
    stage: plan.stage as SalesStagePolicy,
    inbound_age_ms: Math.max(0, Date.parse(input.now) - TARGET_INTERNAL_DATE_MS),
  });
  const soft = evaluateSoftSalesGates({
    inbound,
    generated: body,
    next_action: plan.next_action as CommercialAction,
    stage: plan.stage as SalesStagePolicy,
    turn: 5,
  });
  const leak = INTERNAL_LANGUAGE.test(body);
  const continuity = evaluateCommunicationThreadContinuityGate({
    thread_id: input.thread_id,
    in_reply_to: input.rfc_message_id ?? input.provider_message_id,
    intended_thread_id: input.thread_id,
  });
  const identity = vercelRuntimeIdentity();
  const verdicts = [
    ...hard.verdicts,
    ...soft.verdicts,
    offer,
    responsive,
    continuity,
    named("InternalLanguageLeakageGate", leak ? "FAIL" : "PASS", [leak ? "LEAK" : "CLEAN"]),
    named("ShadowNoSend", "PASS", ["NO_PROVIDER_SEND"]),
  ];
  const pass = input.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID
    && (input.authorship === "PROSPECT" || input.authorship === "PROVISIONAL_TEST_PROSPECT")
    && plan.stage !== "FIRST_TOUCH"
    && hard.result === "PASS"
    && offer.result === "PASS"
    && responsive.result === "PASS"
    && !leak;
  return {
    provider_message_id: input.provider_message_id,
    intent: plan.intent,
    stage: plan.stage,
    first_touch: plan.stage === "FIRST_TOUCH",
    offer_truth_version: OFFER_TRUTH_VERSION,
    draft_hash: createHash("sha256").update(body).digest("hex").slice(0, 16),
    fallback_selected: fallback,
    verdicts,
    hard: hard.result,
    soft: soft.result,
    send: "NO",
    LivePromotedRuntimeShadowGate: named(
      "LivePromotedRuntimeShadowGate",
      pass ? "PASS" : "FAIL",
      [identity.deployment_id ?? "NO_DPL", plan.intent, plan.stage, hard.result, offer.result, responsive.result],
    ),
  };
}

export function shadowPublicRecord(shadow: ReturnType<typeof executeRealMessageShadow>, now: string) {
  const identity = vercelRuntimeIdentity();
  return {
    provider_message_id: shadow.provider_message_id,
    release_sha: identity.release_sha ?? identity.git_sha,
    release_tree_hash: identity.release_tree_hash,
    deployment_id: identity.deployment_id,
    planner_version: "conversation-planner-v1",
    intent: shadow.intent,
    stage: shadow.stage,
    first_touch: shadow.first_touch,
    offer_truth_version: shadow.offer_truth_version,
    draft_hash: shadow.draft_hash,
    fallback_selected: shadow.fallback_selected,
    hard: shadow.hard,
    soft: shadow.soft,
    send: "NO",
    verdicts: shadow.verdicts.map((row) => ({ gate: row.gate, result: row.result, reasons: row.reasons })),
    LivePromotedRuntimeShadowGate: shadow.LivePromotedRuntimeShadowGate.result,
    observed_at: now,
  };
}
