import type { NamedOutboundLoopGate } from "./closed-loop";
import { classifyMessageRole, isStopOnly, looksLikeInfinityAuthored, KNOWN_INFINITY_THREAD_MESSAGE_IDS } from "./conversation-semantics";
import { CANONICAL_OCCUPANCYNPV_THREAD_ID } from "./closed-loop-durable";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type OutboundEligibilityPath = "SALES" | "FOLLOW_UP" | "REACTIVATION" | "SCHEDULED_REPLY" | "CAMPAIGN" | "COLD";

export function evaluateProspectAuthoredOptOutGate(input: {
  body: string;
  role: string;
  direction: string;
  thread_id: string;
  message_id: string;
  from: string;
  to: string;
  prospect_identity: string;
  infinity_identity?: string;
}): NamedOutboundLoopGate {
  const infinity = input.infinity_identity ?? INFINITY_MANAGED_SENDER;
  const classified = classifyMessageRole({
    message_id: input.message_id,
    from: input.from,
    to: input.to,
    body: input.body,
    infinity_identity: infinity,
    prospect_identity: input.prospect_identity,
  });
  const reasons: string[] = [];
  if (!isStopOnly(input.body)) reasons.push("BODY_NOT_STOP");
  if (input.role !== "PROSPECT" || classified.role !== "PROSPECT") reasons.push("ROLE_NOT_PROSPECT");
  if (input.direction !== "INBOUND" || classified.direction !== "INBOUND") reasons.push("DIRECTION_NOT_INBOUND");
  if (input.thread_id !== CANONICAL_OCCUPANCYNPV_THREAD_ID) reasons.push("THREAD_MISMATCH");
  if (KNOWN_INFINITY_THREAD_MESSAGE_IDS.includes(input.message_id as typeof KNOWN_INFINITY_THREAD_MESSAGE_IDS[number])) {
    reasons.push("KNOWN_INFINITY_MESSAGE");
  }
  if (looksLikeInfinityAuthored(input.body)) reasons.push("INFINITY_AUTHORED_BODY");
  return named("ProspectAuthoredOptOutGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["PROSPECT_AUTHORED_STOP"]);
}

export function evaluateSuppressionAuthorityGate(input: {
  consulted_before_provider: boolean;
  provider_called: boolean;
  paths: OutboundEligibilityPath[];
  suppressed: boolean;
}): NamedOutboundLoopGate {
  const required: OutboundEligibilityPath[] = ["SALES", "FOLLOW_UP", "REACTIVATION", "SCHEDULED_REPLY", "CAMPAIGN", "COLD"];
  const missing = required.filter((path) => !input.paths.includes(path));
  const reasons: string[] = [];
  if (!input.consulted_before_provider) reasons.push("SUPPRESSION_NOT_CONSULTED");
  if (input.suppressed && input.provider_called) reasons.push("PROVIDER_BYPASS");
  if (missing.length) reasons.push("PATH_MISSING");
  return named("SuppressionAuthorityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["NO_BYPASS_PATH"]);
}

export function evaluateSalesConsentPrecedenceGate(input: {
  prior_high_intent: boolean;
  offer_available: boolean;
  active_conversation: boolean;
  classified_opt_out: boolean;
  sales_reply_generated: boolean;
  offer_advancement_used: boolean;
  next_action: string;
}): NamedOutboundLoopGate {
  if (!input.classified_opt_out) return named("SalesConsentPrecedenceGate", "NOT_PROVEN", ["OPT_OUT_NOT_CLASSIFIED"]);
  const reasons: string[] = [];
  if (input.sales_reply_generated) reasons.push("SALES_CONTINUED_AFTER_STOP");
  if (input.offer_advancement_used) reasons.push("OFFER_OVERRIDE");
  if (input.next_action !== "SUPPRESS") reasons.push("NEXT_ACTION_NOT_SUPPRESS");
  if (input.prior_high_intent && input.offer_available && input.active_conversation && reasons.length === 0) {
    return named("SalesConsentPrecedenceGate", "PASS", ["CONSENT_OUTRANKS_SALES"]);
  }
  return named("SalesConsentPrecedenceGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CONSENT_OUTRANKS_SALES"]);
}

export function evaluateCanonicalOutboundEligibility(input: {
  path: OutboundEligibilityPath;
  suppressed: boolean;
}): { eligible: boolean; reason: "SUPPRESSED" | "ELIGIBLE"; path: OutboundEligibilityPath } {
  if (input.suppressed) return { eligible: false, reason: "SUPPRESSED", path: input.path };
  return { eligible: true, reason: "ELIGIBLE", path: input.path };
}

export function evaluatePostRestartSuppressionGate(input: {
  restart_performed: boolean;
  suppression_active: boolean;
  conversation_suppressed: boolean;
  pending_eligible: boolean;
  sales_eligible: boolean;
  follow_up_eligible: boolean;
  reactivation_eligible: boolean;
  scheduled_reply_eligible: boolean;
  provider_would_call: boolean;
}): NamedOutboundLoopGate {
  if (!input.restart_performed) return named("PostRestartSuppressionGate", "NOT_PROVEN", ["RESTART_NOT_PERFORMED"]);
  const reasons: string[] = [];
  if (!input.suppression_active) reasons.push("SUPPRESSION_LOST");
  if (!input.conversation_suppressed) reasons.push("CONVERSATION_NOT_SUPPRESSED");
  if (input.pending_eligible) reasons.push("PENDING_RESURRECTED");
  if (input.sales_eligible || input.follow_up_eligible || input.reactivation_eligible || input.scheduled_reply_eligible) {
    reasons.push("FUTURE_SEND_ELIGIBLE");
  }
  if (input.provider_would_call) reasons.push("PROVIDER_WOULD_CALL");
  return named("PostRestartSuppressionGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SUPPRESSION_SURVIVED_RESTART"]);
}

export function evaluateOptOutSendBehaviorGate(input: {
  sales_reply_generated: boolean;
  reply_job_created: boolean;
  job_state: string | null;
  provider_called: boolean;
  provider_message_id: string | null;
  stop_echoed: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.sales_reply_generated) reasons.push("SALES_REPLY_GENERATED");
  if (input.reply_job_created && !/SUPPRESSED|CANCELLED|BLOCKED/i.test(input.job_state ?? "")) reasons.push("SALES_JOB_NOT_BLOCKED");
  if (input.provider_called) reasons.push("PROVIDER_CALLED");
  if (input.provider_message_id) reasons.push("PROVIDER_MESSAGE_PRESENT");
  if (input.stop_echoed) reasons.push("STOP_ECHOED");
  return named("OptOutSendBehaviorGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["NO_SALES_RESPONSE"]);
}
