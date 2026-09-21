import type { NamedGateResult } from "./types";

export function evaluateWebhookHealthIndependently(input: {
  configured: boolean;
  correctEndpoint: boolean;
  expectedEventSubscriptions: boolean;
  signatureValidation: boolean;
  idempotency: boolean;
  eventPersistence: boolean;
  failureRetry: boolean;
  checkoutSessionCreate?: "PASS" | "FAIL";
}): NamedGateResult {
  const reasons: string[] = [];
  if (!input.configured) reasons.push("WEBHOOK_NOT_CONFIGURED");
  if (!input.correctEndpoint) reasons.push("WEBHOOK_ENDPOINT_INCORRECT");
  if (!input.expectedEventSubscriptions) reasons.push("WEBHOOK_EVENTS_MISSING");
  if (!input.signatureValidation) reasons.push("WEBHOOK_SIGNATURE_VALIDATION_MISSING");
  if (!input.idempotency) reasons.push("WEBHOOK_IDEMPOTENCY_MISSING");
  if (!input.eventPersistence) reasons.push("WEBHOOK_EVENT_PERSISTENCE_MISSING");
  if (!input.failureRetry) reasons.push("WEBHOOK_FAILURE_RETRY_MISSING");
  return {
    gate: "WebhookHealthGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function checkoutSessionCreateDoesNotProveWebhookHealth(): true {
  return true;
}
