import type { OfferDecision, OfferType } from "./types";
import type { OfferEconomicsEvaluation } from "./economics";
import type { PurchaseFrictionAssessment } from "./assess";
import type { OfferFeedbackSignal } from "./types";

export type OfferSelectionInput = {
  offer_type: OfferType;
  friction: PurchaseFrictionAssessment;
  time_to_value: string;
  economics: OfferEconomicsEvaluation;
  payment_ready: boolean;
  fulfillment_ready: boolean;
  capital_authorized: boolean;
  legal_policy_pass: boolean;
  customer_disclosure_pass: boolean;
  qc_pass: boolean;
  evidence_quality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  strategic_fit: "STRONG" | "PLAUSIBLE" | "WEAK";
  already_live?: boolean;
  analysis_only?: boolean;
  feedback: OfferFeedbackSignal[];
};

export type OfferSelectionResult = {
  decision: OfferDecision;
  reason: string;
  factors: string[];
};

export function selectOffer(input: OfferSelectionInput): OfferSelectionResult {
  const factors: string[] = [
    `friction:${input.friction.level}`,
    `ttv:${input.time_to_value}`,
    `evidence:${input.evidence_quality}`,
    `payment:${input.payment_ready ? "READY" : "NOT_READY"}`,
    `fulfillment:${input.fulfillment_ready ? "READY" : "NOT_READY"}`,
    `capital:${input.capital_authorized ? "AUTHORIZED" : "BLOCKED"}`,
  ];
  const realSignals = input.feedback.filter((row) => row.real_count > 0 && row.category !== "other");
  if (realSignals.length) factors.push(`real_feedback:${realSignals.map((row) => row.category).join(",")}`);
  if (input.analysis_only || input.already_live) {
    return {
      decision: "DEFER",
      reason: input.already_live
        ? "Current live offer remains in place. Analysis does not activate a replacement."
        : "Analysis-only. No customer-facing offer change is authorized.",
      factors,
    };
  }
  if (!input.payment_ready || !input.fulfillment_ready || !input.capital_authorized) {
    return {
      decision: "DEFER",
      reason: "Payment, fulfillment, or capital is not ready. Offer activation is blocked.",
      factors,
    };
  }
  if (!input.legal_policy_pass || !input.customer_disclosure_pass || !input.qc_pass) {
    return { decision: "REJECT", reason: "Disclosure, legal/policy, or QC failed.", factors };
  }
  if (input.evidence_quality === "INSUFFICIENT" || input.economics.expected_contribution_margin.classification === "UNKNOWN") {
    return {
      decision: "NEEDS_RESEARCH",
      reason: "UNKNOWN economics or insufficient evidence cannot authorize activation.",
      factors,
    };
  }
  if (input.strategic_fit === "WEAK") {
    return { decision: "REJECT", reason: "Strategic fit is weak.", factors };
  }
  if (input.offer_type.includes("FREE") || input.offer_type.includes("TRIAL") || input.offer_type.includes("PILOT")) {
    return {
      decision: "TEST",
      reason: "Free/trial/pilot structures are testable tactics, not defaults.",
      factors,
    };
  }
  return {
    decision: "ACTIVATE",
    reason: "Paid offer is evidence-supported and gates pass.",
    factors,
  };
}
