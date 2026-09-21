import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { ingestCustomerFeedback, realFeedbackCount } from "@/lib/infinity/product-improvement-loop/ingest";
import type { CustomerFeedbackRecord } from "@/lib/infinity/product-improvement-loop/types";
import { evaluateCustomerFeedbackPromptInjectionGate } from "@/lib/infinity/product-improvement-loop/classify";
import {
  CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT,
  VENTURE_IMPROVEMENT_INTAKE_CONTRACT,
  type IntakeSource,
  type VentureImprovementIntakeRecord,
} from "./types";
import {
  evaluateImprovementSubmissionIdempotencyGate,
  evaluateIntakeRateLimit,
  hashIntakeFingerprint,
  INTAKE_MAX_BYTES,
  INTAKE_MAX_MESSAGE,
  looksLikeSensitiveCapture,
  rememberIntakeSubmission,
  sanitizeIntakeContext,
} from "./safeguards";
import { recordIntakeAnalytics } from "./analytics";

const submissions: VentureImprovementIntakeRecord[] = [];

export function resetVentureImprovementIntakeSubmissions(): void {
  submissions.length = 0;
}

export function inspectVentureImprovementIntakeSubmissions(): VentureImprovementIntakeRecord[] {
  return submissions.map((row) => ({ ...row }));
}

export function ingestSupportFeedback(input: {
  venture_id: string;
  text: string;
  contact_identity?: string;
  message_id?: string;
  synthetic?: boolean;
}): { recorded: boolean; feedback: CustomerFeedbackRecord | null; reason: string } {
  return ingestCustomerFeedback({
    venture_id: input.venture_id,
    text: input.text,
    contact_identity: input.contact_identity,
    channel: "SUPPORT",
    message_id: input.message_id,
    provenance: "CUSTOMER_MESSAGE",
    synthetic: input.synthetic,
    force_record: true,
  });
}

export function submitVentureImprovementIntake(input: {
  venture_id: string;
  submission_id: string;
  source: IntakeSource;
  message: string;
  goal_or_context?: string | null;
  page_url_or_route?: string | null;
  workflow_context?: string | null;
  product_area?: string | null;
  contact_email?: string | null;
  customer_ref?: string | null;
  authenticated?: { customer_id: string; email: string } | null;
  client_key?: string;
  byte_length?: number;
  synthetic?: boolean;
  received_at?: string;
  extra_fields?: Record<string, unknown>;
}): {
  ok: boolean;
  status: number;
  reason: string;
  acknowledgement: string | null;
  intake: VentureImprovementIntakeRecord | null;
  feedback: CustomerFeedbackRecord | null;
  idempotency: ReturnType<typeof evaluateImprovementSubmissionIdempotencyGate>;
  injection: ReturnType<typeof evaluateCustomerFeedbackPromptInjectionGate>;
} {
  recordIntakeAnalytics("submission_started");
  const injection = evaluateCustomerFeedbackPromptInjectionGate(input.message ?? "");
  const emptyIdempotency = evaluateImprovementSubmissionIdempotencyGate({
    submission_id: input.submission_id || "missing",
    fingerprint: "pending",
  });

  if (input.venture_id === ASKREVIEW_VENTURE_ID) {
    recordIntakeAnalytics("submission_failed");
    return {
      ok: false,
      status: 403,
      reason: "ASKREVIEW_PAUSED",
      acknowledgement: null,
      intake: null,
      feedback: null,
      idempotency: emptyIdempotency,
      injection,
    };
  }
  if ((input.byte_length ?? 0) > INTAKE_MAX_BYTES) {
    recordIntakeAnalytics("submission_failed");
    return { ok: false, status: 413, reason: "PAYLOAD_TOO_LARGE", acknowledgement: null, intake: null, feedback: null, idempotency: emptyIdempotency, injection };
  }
  const message = (input.message ?? "").trim();
  if (!message) {
    recordIntakeAnalytics("submission_failed");
    return { ok: false, status: 400, reason: "MESSAGE_REQUIRED", acknowledgement: null, intake: null, feedback: null, idempotency: emptyIdempotency, injection };
  }
  if (message.length > INTAKE_MAX_MESSAGE) {
    recordIntakeAnalytics("submission_failed");
    return { ok: false, status: 400, reason: "MESSAGE_TOO_LONG", acknowledgement: null, intake: null, feedback: null, idempotency: emptyIdempotency, injection };
  }
  if (input.extra_fields && looksLikeSensitiveCapture(input.extra_fields)) {
    recordIntakeAnalytics("submission_failed");
    return { ok: false, status: 400, reason: "SENSITIVE_FIELD_REJECTED", acknowledgement: null, intake: null, feedback: null, idempotency: emptyIdempotency, injection };
  }

  const rate = evaluateIntakeRateLimit(input.client_key ?? "anonymous");
  if (rate.result === "FAIL") {
    recordIntakeAnalytics("submission_failed");
    return { ok: false, status: 429, reason: "RATE_LIMITED", acknowledgement: null, intake: null, feedback: null, idempotency: emptyIdempotency, injection };
  }

  const authenticated = Boolean(input.authenticated?.customer_id);
  const identity = input.authenticated?.email ?? input.contact_email ?? "anonymous";
  const customerRef = input.authenticated?.customer_id ?? input.customer_ref ?? null;
  const context = sanitizeIntakeContext(input);
  const fingerprint = hashIntakeFingerprint({ venture_id: input.venture_id, identity, message });
  const receivedAt = input.received_at ? Date.parse(input.received_at) : Date.now();
  const submissionId = input.submission_id.trim() || `auto:${fingerprint}:${Number.isFinite(receivedAt) ? receivedAt : Date.now()}`;
  const idempotency = evaluateImprovementSubmissionIdempotencyGate({
    submission_id: submissionId,
    fingerprint,
    now: Number.isFinite(receivedAt) ? receivedAt : Date.now(),
  });

  const record: VentureImprovementIntakeRecord = {
    contract: VENTURE_IMPROVEMENT_INTAKE_CONTRACT,
    venture_id: input.venture_id,
    submission_id: submissionId,
    source: input.source,
    customer_ref: authenticated ? customerRef : null,
    contact_email: authenticated ? (input.authenticated?.email ?? null) : (input.contact_email?.trim() || null),
    message: message.slice(0, INTAKE_MAX_MESSAGE),
    goal_or_context: context.goal_or_context,
    page_url_or_route: context.page_url_or_route,
    workflow_context: context.workflow_context,
    product_area: context.product_area,
    authenticated_state: authenticated ? "AUTHENTICATED" : "ANONYMOUS",
    created_at: input.received_at ?? new Date().toISOString(),
    consent_privacy: "MINIMAL_PRODUCT_CONTEXT",
    provenance: input.source === "SUPPORT" ? "SUPPORT" : input.source === "EMAIL" ? "EMAIL" : "CUSTOMER_INTAKE_FORM",
    synthetic: input.synthetic === true,
    status: "ACCEPTED",
    feedback_id: null,
  };

  if (idempotency.result === "FAIL") {
    record.status = "DUPLICATE";
    submissions.push(record);
    recordIntakeAnalytics("submission_completed");
    return {
      ok: true,
      status: 200,
      reason: idempotency.reasons[0] ?? "DUPLICATE",
      acknowledgement: CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT,
      intake: record,
      feedback: null,
      idempotency,
      injection,
    };
  }

  rememberIntakeSubmission({
    submission_id: submissionId,
    fingerprint,
    now: Number.isFinite(receivedAt) ? receivedAt : Date.now(),
  });

  const composed = [message, context.goal_or_context ? `Goal: ${context.goal_or_context}` : ""].filter(Boolean).join("\n");
  const ingested = ingestCustomerFeedback({
    venture_id: input.venture_id,
    text: composed,
    customer_ref: record.customer_ref,
    contact_identity: identity,
    channel: input.source,
    message_id: submissionId,
    received_at: record.created_at,
    provenance: "CUSTOMER_MESSAGE",
    synthetic: record.synthetic,
    force_record: true,
  });
  record.feedback_id = ingested.feedback?.feedback_id ?? null;
  record.status = ingested.recorded ? "ACCEPTED" : ingested.reason === "DUPLICATE" ? "DUPLICATE" : "REJECTED";
  submissions.push(record);
  if (ingested.recorded) recordIntakeAnalytics("submission_completed");
  else recordIntakeAnalytics("submission_failed");
  return {
    ok: ingested.recorded || record.status === "DUPLICATE",
    status: ingested.recorded || record.status === "DUPLICATE" ? 200 : 400,
    reason: ingested.reason,
    acknowledgement: ingested.recorded || record.status === "DUPLICATE" ? CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT : null,
    intake: record,
    feedback: ingested.feedback,
    idempotency,
    injection,
  };
}

export function realIntakeFeedbackCount(ventureId: string): number {
  return realFeedbackCount(ventureId);
}
