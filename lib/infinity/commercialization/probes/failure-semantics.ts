import type { CommercialFailureCode } from "../types";

const FAILURE_MAP: Array<{ pattern: RegExp; code: CommercialFailureCode }> = [
  { pattern: /AUTHORIZATION_MISSING/i, code: "AUTHORIZATION_MISSING" },
  { pattern: /BUDGET_DENIED/i, code: "BUDGET_DENIED" },
  { pattern: /DOMAIN_UNAVAILABLE/i, code: "DOMAIN_UNAVAILABLE" },
  { pattern: /PRICE_CHANGED/i, code: "PRICE_CHANGED" },
  { pattern: /DNS_VERIFICATION_FAILED/i, code: "DNS_VERIFICATION_FAILED" },
  { pattern: /DEPLOYMENT_FAILED/i, code: "DEPLOYMENT_FAILED" },
  { pattern: /CHECKOUT_CONFIGURATION_FAILED/i, code: "CHECKOUT_CONFIGURATION_FAILED" },
  { pattern: /WEBHOOK_FAILED/i, code: "WEBHOOK_FAILED" },
  { pattern: /FULFILLMENT_FAILED/i, code: "FULFILLMENT_FAILED" },
  { pattern: /rate limit|429/i, code: "PROVIDER_UNAVAILABLE" },
  { pattern: /network|ECONNREFUSED|ETIMEDOUT/i, code: "PROVIDER_UNAVAILABLE" },
  { pattern: /401|403|auth/i, code: "AUTHORIZATION_MISSING" },
];

export function classifyCommercialProviderFailure(error: unknown): CommercialFailureCode | "UNKNOWN_PROVIDER_ERROR" {
  const message = error instanceof Error ? error.message : String(error);
  if (/BUSINESS_NO_GO|NO_GO/i.test(message)) {
    return "UNKNOWN_PROVIDER_ERROR";
  }
  for (const entry of FAILURE_MAP) {
    if (entry.pattern.test(message)) return entry.code;
  }
  return "UNKNOWN_PROVIDER_ERROR";
}
