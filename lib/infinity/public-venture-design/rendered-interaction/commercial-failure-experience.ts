export const RENDERED_COMMERCIAL_FAILURE_EXPERIENCE_GATE =
  "RenderedCommercialFailureExperienceGate" as const;
export const OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR =
  "We couldn't start checkout. Please try again or contact support." as const;

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateRenderedCommercialFailureExperienceGate(input: {
  body: string;
  contentType?: string | null;
}): NamedGateResult {
  const reasons: string[] = [];
  const body = input.body;
  if (/^\s*\{[\s\S]*"ok"\s*:/.test(body) || /^\s*\{[\s\S]*"reason"\s*:/.test(body)) reasons.push("RAW_JSON");
  if (/at\s+\S+\s+\(/.test(body) || /TypeError|ReferenceError|stack/i.test(body)) reasons.push("STACK_TRACE");
  if (/CHECKOUT_SESSION_CREATE_FAILED|STRIPE_SECRET_KEY_MISSING|more_permissions_required/i.test(body)) {
    reasons.push("INTERNAL_ENUM");
  }
  if (/invalid_request_error|api_error|card_error|idempotency_error/i.test(body)) reasons.push("PROVIDER_CODE");
  if (/rk_live_|sk_live_|sk_test_|whsec_/i.test(body)) reasons.push("DEBUG_OBJECT");
  if (!body.includes(OCCUPANCYNPV_CHECKOUT_CUSTOMER_SAFE_ERROR)) reasons.push("CUSTOMER_SAFE_COPY_MISSING");
  return {
    gate: RENDERED_COMMERCIAL_FAILURE_EXPERIENCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
