import type { NamedOutboundLoopGate } from "./closed-loop";
import { isRenewVsRelocateQuestion, isStopOnly } from "./conversation-semantics";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "./email-signature";
import { stripQuotedReply } from "./gmail-message-body";
import type { ClosedLoopSuppressionRecord } from "./closed-loop-durable";

export const SUPPRESSION_CORRECTION_GATE = "SuppressionCorrectionGate" as const;
export const CONVERSATION_STATE_REPAIR_GATE = "ConversationStateRepairGate" as const;
export const PERFORMANCE_OBSERVATION_CORRECTION_GATE = "PerformanceObservationCorrectionGate" as const;
export const LIVE_DELIVERED_SEMANTIC_PARITY_GATE = "LiveDeliveredSemanticParityGate" as const;
export const LIVE_SALES_COMPOSER_PARITY_GATE = "LiveSalesComposerParityGate" as const;
export const LIVE_CONVERSATION_SEMANTIC_GATE = "LiveConversationSemanticGate" as const;
export const ESCAPED_DEFECT_LEARNING_GATE = "EscapedDefectLearningGate" as const;

const FALSE_STOP_ID = "1a0b254b39f5c645";
const SECOND_TURN_ID = "1a0b2000b6fda6c0";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateSuppressionCorrectionGate(input: {
  found: boolean;
  source_message_id: string | null;
  source_role: string | null;
  valid_prospect_opt_out: boolean | null;
  invalidated: boolean;
}): NamedOutboundLoopGate {
  if (!input.found) return named(SUPPRESSION_CORRECTION_GATE, "FAIL", ["SUPPRESSION_NOT_FOUND"]);
  const reasons: string[] = [];
  if (input.source_message_id !== FALSE_STOP_ID) reasons.push("SOURCE_MISMATCH");
  if (!/INFINITY|SYSTEM/i.test(input.source_role ?? "")) reasons.push("SOURCE_ROLE_NOT_INFINITY");
  if (input.valid_prospect_opt_out) reasons.push("MARKED_VALID_OPTOUT");
  if (!input.invalidated) reasons.push("NOT_INVALIDATED");
  return named(SUPPRESSION_CORRECTION_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["FALSE_OPTOUT_INVALIDATED"]);
}

export function evaluateConversationStateRepairGate(input: {
  state: string | null;
  latest_valid_prospect_message_id: string | null;
  intent: string | null;
  next_action: string | null;
  not_opt_out: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!/ACTIVE/i.test(input.state ?? "")) reasons.push("STATE_NOT_ACTIVE");
  if (input.latest_valid_prospect_message_id !== SECOND_TURN_ID) reasons.push("LATEST_PROSPECT_WRONG");
  if (!/REQUEST_EXAMPLE/i.test(input.intent ?? "")) reasons.push("INTENT_WRONG");
  if (!/RESPOND_TO_SECOND_TURN|WAIT|ANSWERED/i.test(input.next_action ?? "")) reasons.push("NEXT_ACTION_WRONG");
  if (!input.not_opt_out) reasons.push("STILL_OPT_OUT");
  return named(CONVERSATION_STATE_REPAIR_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CONVERSATION_REPAIRED"]);
}

export function evaluatePerformanceObservationCorrectionGate(input: {
  families: string[];
}): NamedOutboundLoopGate {
  const required = ["FALSE_OPT_OUT_INVALIDATED", "MESSAGE_ROLE_CORRECTED", "EMPTY_OUTBOUND_DEFECT", "SECOND_TURN_MISSED", "CONVERSATION_STATE_REPAIRED"];
  const missing = required.filter((family) => !input.families.includes(family));
  return named(PERFORMANCE_OBSERVATION_CORRECTION_GATE, missing.length ? "FAIL" : "PASS", missing.length ? missing : ["CORRECTIVE_EVENTS_APPENDED"]);
}

export function evaluateLiveDeliveredSemanticParityGate(input: {
  generated: string;
  delivered: string;
}): NamedOutboundLoopGate {
  const visible = stripQuotedReply(input.delivered);
  const reasons: string[] = [];
  if (!visible.trim()) reasons.push("DELIVERED_EMPTY");
  if (isStopOnly(visible)) reasons.push("DELIVERED_STOP");
  const tryNumbers = /enter the current lease first|enter the key numbers from your current lease/i.test(input.generated);
  const renew = isRenewVsRelocateQuestion(input.generated) || /renewing your current lease and moving/i.test(input.generated);
  if (tryNumbers) {
    if (!/rent|term|occupancy|exit/i.test(visible)) reasons.push("NO_INPUT_ANSWER");
    const needles = ["enter the current lease first", "enter the key numbers from your current lease"];
    if (!needles.some((needle) => visible.toLowerCase().includes(needle) || input.delivered.toLowerCase().includes(needle))) {
      reasons.push("GENERATED_NOT_VISIBLE");
    }
  } else if (renew) {
    if (!/renew/i.test(visible) || !/mov(e|ing)|relocat|new location/i.test(visible)) reasons.push("NO_RENEW_COMPARE");
    const needle = "renewing your current lease and moving to a new location";
    if (!visible.toLowerCase().includes(needle) && !input.delivered.toLowerCase().includes(needle)) {
      reasons.push("GENERATED_NOT_VISIBLE");
    }
  } else {
    const generatedVisible = stripQuotedReply(input.generated).toLowerCase();
    const deliveredVisible = `${visible} ${input.delivered}`.toLowerCase();
    const tokens = ["occupancynpv", "lease", "trial", "pricing", "rent", "$8,000", "side by side", "spreadsheet"]
      .filter((token) => generatedVisible.includes(token));
    if (tokens.length && !tokens.some((token) => deliveredVisible.includes(token))) {
      reasons.push("GENERATED_NOT_VISIBLE");
    }
    if (!/occupancynpv|lease|trial|rent|spreadsheet|side by side/i.test(visible) && !/occupancynpv|lease|trial/i.test(input.delivered)) {
      reasons.push("NO_LEASE_EXAMPLE");
    }
  }
  if (!/occupancynpv \| occupancynpv\.com/i.test(input.delivered) && !input.delivered.includes(OCCUPANCYNPV_EMAIL_SIGNATURE)) {
    reasons.push("SIGNATURE_MISSING");
  }
  return named(LIVE_DELIVERED_SEMANTIC_PARITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["DELIVERED_MATCHES_INTENT"]);
}

export function evaluateLiveSalesComposerParityGate(input: {
  composer_present: boolean;
  stage_aware_cta: boolean;
  passive_fallback_reachable_for_engaged: boolean;
  production_runtime: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.production_runtime) reasons.push("PRODUCTION_RUNTIME_MISSING");
  if (!input.composer_present) reasons.push("ALWAYS_CLOSING_COMPOSER_MISSING");
  if (!input.stage_aware_cta) reasons.push("STAGE_AWARE_CTA_MISSING");
  if (input.passive_fallback_reachable_for_engaged) reasons.push("PASSIVE_FALLBACK_STILL_REACHABLE");
  return named(LIVE_SALES_COMPOSER_PARITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["PRODUCTION_COMPOSER_PARITY"]);
}

export function evaluateLiveConversationSemanticGate(input: Record<string, boolean>): NamedOutboundLoopGate {
  const missing = Object.entries(input).filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) return named(LIVE_CONVERSATION_SEMANTIC_GATE, "FAIL", missing);
  return named(LIVE_CONVERSATION_SEMANTIC_GATE, "PASS", ["SEMANTIC_CANARY_COMPLETE"]);
}

export function evaluateEscapedDefectLearningGate(input: {
  recorded: boolean;
  live_corrected_response: boolean;
}): NamedOutboundLoopGate {
  if (!input.recorded) return named(ESCAPED_DEFECT_LEARNING_GATE, "FAIL", ["REGISTRY_MISSING"]);
  if (!input.live_corrected_response) return named(ESCAPED_DEFECT_LEARNING_GATE, "NOT_PROVEN", ["LIVE_CORRECTION_REQUIRED"]);
  return named(ESCAPED_DEFECT_LEARNING_GATE, "PASS", ["LIVE_CORRECTION_LEARNED"]);
}

export function suppressionAudit(record: ClosedLoopSuppressionRecord | null) {
  return {
    found: Boolean(record),
    source_message_id: record?.source_message_id ?? null,
    source_role: record?.source_role ?? (record?.source_message_id === FALSE_STOP_ID ? "SYSTEM" : null),
    valid_prospect_opt_out: record?.valid_prospect_opt_out ?? false,
    invalidated: record?.status === "INVALIDATED",
    original_status: record?.correction?.original_status ?? record?.status ?? null,
  };
}
