import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateConsultativeSalesLanguageGate, evaluateSalesOverExplanationGate, evaluateSalesQuestionQualityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateNaturalSalesConversationGate, rewriteNaturalSalesReply } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { evaluateOfferDrivenSalesAdvancementGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { evaluateSalesAdvancementQualityGate } from "@/lib/infinity/always-closing-sales/doctrine";
import { parseCommercialAction } from "@/lib/infinity/always-closing-sales/commercial-action";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { evaluateResponseContentQualityGate } from "../conversation-semantics";
import { FOUNDER_TRIAL_INBOUND_TEXT } from "./canary";
import { composeHighIntentOfferFallback } from "./high-intent";

export const LEGACY_TRIAL_INBOUND = FOUNDER_TRIAL_INBOUND_TEXT;
export const EXACT_LEGACY_FAILURE = {
  gate: "ConsultativeSalesLanguageGate",
  reason: "NO_PAIN",
} as const;

export type LegacyGateVerdict = {
  gate: string;
  expected_rule: string;
  actual_condition: string;
  result: "PASS" | "FAIL";
  rejection_reason: string | null;
};

function verdict(gate: string, expected: string, actual: string, result: "PASS" | "FAIL", reason: string | null): LegacyGateVerdict {
  return { gate, expected_rule: expected, actual_condition: actual, result, rejection_reason: reason };
}

function provenResult(result: string): "PASS" | "FAIL" {
  return result === "PASS" ? "PASS" : "FAIL";
}

export function composeLegacyTrialDraft(attempt: 1 | 2): { body: string; stage: string; next_action: string } {
  const composed = composeOccupancyNpvAlwaysClosingReply({
    inbound: LEGACY_TRIAL_INBOUND,
    intent: "POSITIVE_INTEREST",
    turn: 4,
  });
  const body = attempt === 1 ? composed.body : rewriteNaturalSalesReply(composed.body);
  return { body, stage: "QUALIFIED", next_action: composed.next_action };
}

export function replayLegacyDraftGates(attempt: 1 | 2): {
  draft: string;
  verdicts: LegacyGateVerdict[];
  first_failing_gate: string | null;
  first_reason: string | null;
} {
  const draft = composeLegacyTrialDraft(attempt);
  const parsedAction = parseCommercialAction(draft.next_action);
  if (!parsedAction.ok) {
    const invalid = [verdict("CommercialActionParse", "recognized CommercialAction", parsedAction.raw, "FAIL", parsedAction.reason)];
    return { draft: draft.body, verdicts: invalid, first_failing_gate: invalid[0].gate, first_reason: parsedAction.reason };
  }
  const next_action = parsedAction.value;
  const profile = loadVentureOfferProfile("occupancynpv");
  const quality = evaluateResponseContentQualityGate({ inbound: LEGACY_TRIAL_INBOUND, generated: draft.body, latest_question: LEGACY_TRIAL_INBOUND });
  const natural = evaluateNaturalSalesConversationGate({ inbound: LEGACY_TRIAL_INBOUND, generated: draft.body, next_action });
  const advancement = evaluateSalesAdvancementQualityGate({ inbound: LEGACY_TRIAL_INBOUND, generated: draft.body, next_action });
  const offer = evaluateOfferDrivenSalesAdvancementGate({
    stage: "QUALIFIED",
    profile,
    generated: draft.body,
    next_action,
    inbound: LEGACY_TRIAL_INBOUND,
  });
  const consultative = evaluateConsultativeSalesLanguageGate({
    inbound: LEGACY_TRIAL_INBOUND,
    generated: draft.body,
    stage: "QUALIFIED",
    next_action,
    turn: 4,
  });
  const over = evaluateSalesOverExplanationGate({ inbound: LEGACY_TRIAL_INBOUND, generated: draft.body });
  const question = evaluateSalesQuestionQualityGate({ inbound: LEGACY_TRIAL_INBOUND, generated: draft.body, stage: "QUALIFIED" });
  const legacyPainRequired = !/spreadsheet|rebuild|manual|changing|two models|messy|guessing/i.test(draft.body);
  const consultativeLegacyResult = legacyPainRequired ? "FAIL" : provenResult(consultative.result);
  const consultativeLegacyReasons = legacyPainRequired ? ["NO_PAIN", ...consultative.reasons.filter((row) => row !== "NO_PAIN")] : consultative.reasons;
  const verdicts: LegacyGateVerdict[] = [
    verdict("ResponseContentQualityGate", "answers inbound", quality.reasons.join(","), provenResult(quality.result), quality.result === "FAIL" ? quality.reasons[0] : null),
    verdict("NaturalSalesConversationGate", "natural customer language", natural.reasons.join(","), provenResult(natural.result), natural.result === "FAIL" ? natural.reasons[0] : null),
    verdict("ConsultativeSalesLanguageGate", "LEGACY QUALIFIED turn<5 required pain+consequence+contrast as HARD", consultativeLegacyReasons.join(","), consultativeLegacyResult, consultativeLegacyResult === "FAIL" ? consultativeLegacyReasons[0] : null),
    verdict("SalesOverExplanationGate", "not over-explained", over.reasons.join(","), provenResult(over.result), over.result === "FAIL" ? over.reasons[0] : null),
    verdict("SalesQuestionQualityGate", "<=2 questions", question.reasons.join(","), provenResult(question.result), question.result === "FAIL" ? question.reasons[0] : null),
    verdict("SalesAdvancementQualityGate", "advances next action", advancement.reasons.join(","), provenResult(advancement.result), advancement.result === "FAIL" ? advancement.reasons[0] : null),
    verdict("OfferDrivenSalesAdvancementGate", "trial CTA + offer truth", offer.reasons.join(","), provenResult(offer.result), offer.result === "FAIL" ? offer.reasons[0] : null),
  ];
  const first = verdicts.find((row) => row.result === "FAIL") ?? null;
  return { draft: draft.body, verdicts, first_failing_gate: first?.gate ?? null, first_reason: first?.rejection_reason ?? null };
}

export function replayLegacyDraftOnNewStack(attempt: 1 | 2): {
  old: ReturnType<typeof replayLegacyDraftGates>;
  new_first_failing_gate: string | null;
  fallback_used: boolean;
} {
  const old = replayLegacyDraftGates(attempt);
  const fallback = composeHighIntentOfferFallback(LEGACY_TRIAL_INBOUND).body;
  const consultative = evaluateConsultativeSalesLanguageGate({
    inbound: LEGACY_TRIAL_INBOUND,
    generated: fallback,
    stage: "HIGH_INTENT",
    next_action: "START_TRIAL",
    turn: 5,
  });
  return {
    old,
    new_first_failing_gate: consultative.result === "FAIL" ? "ConsultativeSalesLanguageGate" : null,
    fallback_used: true,
  };
}

export function evaluateLegacySemanticReplayGate(): NamedOutboundLoopGate {
  const first = replayLegacyDraftGates(1);
  const second = replayLegacyDraftGates(2);
  const same = first.first_failing_gate === second.first_failing_gate && first.first_reason === second.first_reason;
  return {
    gate: "LegacySemanticReplayGate",
    result: first.first_failing_gate ? "PASS" : "FAIL",
    reasons: [
      first.first_failing_gate ?? "NO_FAIL",
      first.first_reason ?? "NONE",
      same ? "ATTEMPT2_SAME_STRATEGY" : "ATTEMPT2_CHANGED",
    ],
  };
}
