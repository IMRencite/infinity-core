import { ASKREVIEW_HYPOTHESIZED_MONTHLY_USD } from "@/lib/infinity/second-venture-factory/constants";

export const ASKREVIEW_PRICE_EVIDENCE_STATUS = "PRICE_VALIDATION_REQUIRED" as const;

export function evaluateAskReviewPriceEvidence() {
  return {
    hypothesizedPriceUsd: ASKREVIEW_HYPOTHESIZED_MONTHLY_USD,
    hypothesizedCadence: "month" as const,
    priceEvidence: "INSUFFICIENT" as const,
    recurringModelEvidence: "INSUFFICIENT" as const,
    cac: "UNKNOWN" as const,
    ltv: "UNKNOWN" as const,
    canonicalPrice: "UNRESOLVED" as const,
    decision: ASKREVIEW_PRICE_EVIDENCE_STATUS,
    reasons: [
      "Monetization Engine recommended_pricing is a hypothesis, not willingness-to-pay evidence.",
      "No CAC observation exists for AskReview.",
      "No LTV or retention observation exists for AskReview.",
      "Competitor $349–$399/month context does not prove $29/month conversion.",
      "A QR/review-kit utility may fit one-time or per-location pricing; that alternative is untested.",
    ],
    competitorContext: "Enterprise review platforms observed near $349–$399/month; that is category context, not AskReview WTP.",
    usageFrequency: "UNKNOWN",
    alternativesUnevaluated: ["monthly_subscription", "annual_subscription", "one_time_location_kit", "per_location", "freemium"],
  };
}

export function askReviewValidationExperiment() {
  return {
    experimentId: "askreview_price_model_validation_v1",
    hypothesis: "Local-business operators will pay $29/month for reusable review-link/QR/copy kits at a rate that supports positive unit economics versus a one-time location kit.",
    audience: "Owners/managers of local shops, salons, restaurants, contractors, and professional-service offices who already ask for Google reviews manually.",
    offer: "AskReview Starter — hypothesized authenticated kit generation. No live billing in this experiment.",
    priceBeingTested: "$29/month hypothesized; compare stated preference against a $49 one-time location kit.",
    successMetric: "Share of qualified interviews or waitlist respondents who choose $29/month over the one-time alternative and would pay within 30 days.",
    minimumEvidence: "At least 15 qualified local-business conversations with a recorded price choice, plus zero invented conversion rates.",
    decisionRule: "Promote $29/month to canonical only if ≥40% of qualified respondents choose it AND at least 5 give a concrete next-step commitment. Otherwise keep UNRESOLVED or switch hypothesized model.",
    timeWindow: "14 days after experiment start, or 15 conversations, whichever is first.",
    liveBillingRequired: false,
    currentOutcome: "NOT_STARTED",
  };
}

export function askReviewPaymentPreparation() {
  const price = evaluateAskReviewPriceEvidence();
  return {
    paidModel: "HYPOTHESIZED_MONTHLY_SUBSCRIPTION",
    canonicalOffer: "UNRESOLVED",
    hypothesizedOfferId: "ASKREVIEW_STARTER",
    hypothesizedAmountUsd: ASKREVIEW_HYPOTHESIZED_MONTHLY_USD,
    hypothesizedInterval: "month",
    entitlement: "ASKREVIEW_KIT_ACCESS — authenticated generation of review URL, QR SVG, and request copy for owned locations. No SMS/email sending.",
    checkoutArchitecture: "UNCONFIGURED — future Stripe Checkout only after price is canonical and payment activation is separately authorized.",
    postPurchaseBehavior: "Unlock or continue authenticated kit generation. Existing generated kits remain readable.",
    cancellationPolicyRequirement: "Future monthly cancellation stops new generation; already generated kits remain unless the customer requests deletion.",
    refundPolicyRequirement: "UNCONFIGURED_UNTIL_PAYMENT_ACTIVATION",
    PaymentReadinessGate: "BLOCKED" as const,
    stripeWrites: 0,
    blockReasons: price.reasons,
  };
}
