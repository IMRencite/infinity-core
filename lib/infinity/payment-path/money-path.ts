import { END_TO_END_MONEY_PATH_CONTRACT, type EndToEndMoneyPathRecord } from "./types";

export function evaluateEndToEndMoneyPathContract(input: Omit<EndToEndMoneyPathRecord, "contract" | "result" | "reasons">): EndToEndMoneyPathRecord {
  const steps = [
    ["CTA", input.cta],
    ["CUSTOMER_IDENTITY", input.customerIdentity],
    ["SERVER_CHECKOUT", input.serverCheckout],
    ["PROVIDER_SESSION_CREATE", input.providerSessionCreate],
    ["PROVIDER_CHECKOUT_SURFACE", input.providerCheckoutSurface],
    ["WEBHOOK_ARCHITECTURE", input.webhookArchitecture],
    ["ENTITLEMENT", input.entitlement],
    ["FULFILLMENT", input.fulfillment],
  ] as const;
  const reasons = steps.filter(([, value]) => value !== "PASS").map(([name]) => name);
  return {
    contract: END_TO_END_MONEY_PATH_CONTRACT,
    ...input,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function occupancynpvEndToEndMoneyPath(input?: Partial<Omit<EndToEndMoneyPathRecord, "contract" | "result" | "reasons" | "venture" | "offerId">> & { offerId?: string }): EndToEndMoneyPathRecord {
  return evaluateEndToEndMoneyPathContract({
    venture: "occupancynpv",
    offerId: input?.offerId ?? "PROFESSIONAL",
    cta: input?.cta ?? "PASS",
    customerIdentity: input?.customerIdentity ?? "PASS",
    serverCheckout: input?.serverCheckout ?? "PASS",
    providerSessionCreate: input?.providerSessionCreate ?? "PASS",
    providerCheckoutSurface: input?.providerCheckoutSurface ?? "PASS",
    webhookArchitecture: input?.webhookArchitecture ?? "PASS",
    entitlement: input?.entitlement ?? "PASS",
    fulfillment: input?.fulfillment ?? "PASS",
  });
}

export function syntheticPaymentMustNotContaminate(input: {
  recordedAsRevenue: boolean;
  recordedAsCustomer: boolean;
  consumedEntitlement: boolean;
  triggeredFulfillment: boolean;
  metadataHealthCheck?: string | null;
  paymentStatus?: string | null;
}): { result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.recordedAsRevenue) reasons.push("REVENUE_CONTAMINATION");
  if (input.recordedAsCustomer) reasons.push("CUSTOMER_COUNT_CONTAMINATION");
  if (input.consumedEntitlement) reasons.push("ENTITLEMENT_CONTAMINATION");
  if (input.triggeredFulfillment) reasons.push("FULFILLMENT_CONTAMINATION");
  if (input.metadataHealthCheck !== "synthetic_unpaid") reasons.push("SYNTHETIC_LABEL_MISSING");
  if (input.paymentStatus === "paid") reasons.push("SYNTHETIC_MARKED_PAID");
  return { result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}
