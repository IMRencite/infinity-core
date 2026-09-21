import { createHash } from "node:crypto";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import type { CustomerFeedbackRecord, FeedbackType } from "./types";
import { CUSTOMER_FEEDBACK_RECORD } from "./types";
import { mutateProductImprovementLoop, inspectProductImprovementLoop } from "./store";
import {
  classifyFeedbackTypes,
  clusterKey,
  detectPromptInjection,
  evaluateCustomerFeedbackPromptInjectionGate,
  looksLikeProductSuggestion,
  requestedCapability,
} from "./classify";
import { upsertOpportunityFromFeedback } from "./cluster";

function redactIdentity(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes("@")) return trimmed.slice(0, 24) || "unknown";
  const [local, domain] = trimmed.split("@");
  return `${(local ?? "u").slice(0, 2)}***@${domain}`;
}

function hashIdentity(raw: string): string {
  return createHash("sha256").update(raw.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function severity(types: FeedbackType[], text: string): CustomerFeedbackRecord["severity"] {
  if (types.includes("SECURITY_CONCERN") || types.includes("PRIVACY_CONCERN") || /critical|down|can't work/.test(text.toLowerCase())) return "CRITICAL";
  if (types.includes("BUG") || types.includes("LEGAL_CONCERN")) return "HIGH";
  if (types.includes("ACCESSIBILITY_ISSUE") || types.includes("WORKFLOW_FRICTION")) return "MEDIUM";
  return "LOW";
}

export function ingestCustomerFeedback(input: {
  venture_id: string;
  text: string;
  customer_ref?: string | null;
  contact_identity?: string;
  channel?: string;
  message_id?: string | null;
  thread_id?: string | null;
  received_at?: string;
  paying?: boolean;
  provenance?: CustomerFeedbackRecord["provenance"];
  synthetic?: boolean;
  force_record?: boolean;
}): { recorded: boolean; feedback: CustomerFeedbackRecord | null; reason: string } {
  if (input.venture_id === ASKREVIEW_VENTURE_ID) return { recorded: false, feedback: null, reason: "ASKREVIEW_PAUSED" };
  const text = input.text.trim();
  if (!text) return { recorded: false, feedback: null, reason: "EMPTY" };
  const injection = evaluateCustomerFeedbackPromptInjectionGate(text);
  const types = classifyFeedbackTypes(text);
  const suggestion = looksLikeProductSuggestion(text) || types.some((type) => type !== "OTHER" && type !== "COMPLIMENT" && type !== "IDENTITY_QUESTION");
  if (!input.force_record && !suggestion && !detectPromptInjection(text) && !types.includes("BUG") && !types.includes("SECURITY_CONCERN")) {
    return { recorded: false, feedback: null, reason: "NOT_PRODUCT_FEEDBACK" };
  }
  const identity = input.contact_identity ?? input.customer_ref ?? "unknown";
  const key = `fb:${input.venture_id}:${input.message_id ?? hashIdentity(`${identity}|${text}`)}`;
  const existing = inspectProductImprovementLoop().feedback.find((row) => row.feedback_id === key);
  if (existing) return { recorded: false, feedback: existing, reason: "DUPLICATE" };
  const ambiguous = text.length < 12 && !types.includes("BUG");
  const record: CustomerFeedbackRecord = {
    contract: CUSTOMER_FEEDBACK_RECORD,
    feedback_id: key,
    venture_id: input.venture_id,
    customer_ref: input.customer_ref ?? null,
    contact_identity: redactIdentity(identity),
    channel: input.channel ?? "unknown",
    message_id: input.message_id ?? null,
    thread_id: input.thread_id ?? null,
    received_at: input.received_at ?? new Date().toISOString(),
    raw_message_reference: input.message_id ? `message:${input.message_id}` : `hash:${hashIdentity(text)}`,
    feedback_types: types,
    requested_capability: requestedCapability(text, clusterKey(text)),
    affected_workflow: clusterKey(text),
    problem_statement: text.slice(0, 280),
    customer_language_summary: text.slice(0, 160),
    severity: severity(types, text),
    frequency_signal: 1,
    customer_value_signal: input.paying ? "PAYING" : "UNKNOWN",
    strategic_fit: types.includes("PRICING_FEEDBACK") || types.includes("LEGAL_CONCERN") ? "WEAK" : clusterKey(text) === "TENANT_CONCESSION_FIELD" ? "PLAUSIBLE" : "STRONG",
    revenue_context: input.paying ? "PAYING_CUSTOMER" : null,
    evidence_confidence: ambiguous ? "INSUFFICIENT" : "MEDIUM",
    privacy_classification: "MINIMAL",
    risk_classification: types.includes("SECURITY_CONCERN") || types.includes("LEGAL_CONCERN") || types.includes("PRIVACY_CONCERN") || detectPromptInjection(text) ? "HIGH" : types.includes("PRICING_FEEDBACK") ? "HIGH" : "LOW",
    status: ambiguous ? "NEEDS_CLARIFICATION" : detectPromptInjection(text) ? "UNDER_EVALUATION" : "NEW_FEEDBACK",
    provenance: input.provenance ?? "CUSTOMER_MESSAGE",
    synthetic: input.synthetic === true,
    prompt_injection: injection.reasons.includes("UNTRUSTED_INJECTION_LANGUAGE"),
    untrusted: true,
  };
  mutateProductImprovementLoop((state) => {
    state.feedback.push(record);
    if (record.feedback_types.includes("SECURITY_CONCERN") || record.feedback_types.includes("PRIVACY_CONCERN") || record.prompt_injection) {
      state.incidents.push({
        incident_id: `inc:${record.feedback_id}`,
        feedback_id: record.feedback_id,
        kind: record.prompt_injection ? "PROMPT_INJECTION" : record.feedback_types.includes("BUG") ? "SECURITY_BUG" : "SECURITY_PRIVACY",
        open: true,
      });
    } else if (record.feedback_types.includes("BUG") && record.severity === "CRITICAL") {
      state.incidents.push({
        incident_id: `inc:${record.feedback_id}`,
        feedback_id: record.feedback_id,
        kind: "CRITICAL_BUG",
        open: true,
      });
    }
  });
  if (!record.synthetic) upsertOpportunityFromFeedback(record);
  return { recorded: true, feedback: record, reason: record.prompt_injection ? "RECORDED_UNTRUSTED" : "RECORDED" };
}

export function ingestInboundMessageFeedback(input: {
  venture_id: string;
  text: string;
  sender: string;
  message_id: string;
  thread_id?: string | null;
  channel?: string;
  message_type?: string;
  automation?: string;
}): { recorded: boolean; reason: string } {
  if (input.automation && input.automation !== "HUMAN") return { recorded: false, reason: "NOT_HUMAN" };
  if (input.message_type && input.message_type !== "HUMAN_REPLY" && input.message_type !== "UNKNOWN") {
    return { recorded: false, reason: "NOT_CUSTOMER_MESSAGE" };
  }
  const result = ingestCustomerFeedback({
    venture_id: input.venture_id,
    text: input.text,
    contact_identity: input.sender,
    channel: input.channel ?? "gmail",
    message_id: input.message_id,
    thread_id: input.thread_id ?? null,
    provenance: "CUSTOMER_MESSAGE",
    synthetic: false,
  });
  return { recorded: result.recorded, reason: result.reason };
}

export function realFeedbackCount(ventureId: string): number {
  return inspectProductImprovementLoop().feedback.filter((row) => row.venture_id === ventureId && !row.synthetic).length;
}
