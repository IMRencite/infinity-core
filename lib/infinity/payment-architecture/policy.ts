import { UNRESOLVED_POLICY_CODES, type PaymentArchitectureKind, type UnresolvedPolicyCode } from "./constants";
import type { PaymentArchitectureEvidence, UnresolvedPolicyRequirement } from "./types";

const QUESTIONS: Record<UnresolvedPolicyCode, string> = {
  CONNECT_ACCOUNT_TYPE: "Which Stripe Connect account type should sellers use (Express, Standard, or Custom)?",
  MERCHANT_OF_RECORD: "Is the platform or the seller the merchant of record?",
  SELLER_KYC_RESPONSIBILITY: "Who is responsible for seller identity verification?",
  REFUND_LIABILITY: "Who funds refunds when a buyer is repaid?",
  DISPUTE_LIABILITY: "Who bears dispute and chargeback liability?",
  NEGATIVE_SELLER_BALANCES: "Are negative seller balances allowed?",
  PAYOUT_SCHEDULE: "What seller payout schedule is required?",
  CROSS_BORDER_SELLER_SUPPORT: "Will the platform support cross-border sellers?",
  TAX_RESPONSIBILITY: "Who is responsible for tax collection and remittance?",
};

const POLICY_FIELD: Record<UnresolvedPolicyCode, keyof NonNullable<PaymentArchitectureEvidence["resolvedPolicy"]>> = {
  CONNECT_ACCOUNT_TYPE: "connectAccountType",
  MERCHANT_OF_RECORD: "merchantOfRecord",
  SELLER_KYC_RESPONSIBILITY: "sellerKycResponsibility",
  REFUND_LIABILITY: "refundLiability",
  DISPUTE_LIABILITY: "disputeLiability",
  NEGATIVE_SELLER_BALANCES: "negativeSellerBalances",
  PAYOUT_SCHEDULE: "payoutSchedule",
  CROSS_BORDER_SELLER_SUPPORT: "crossBorderSellers",
  TAX_RESPONSIBILITY: "taxResponsibility",
};

export function unresolvedPaymentPolicy(
  architectureKind: PaymentArchitectureKind,
  evidence: PaymentArchitectureEvidence,
): UnresolvedPolicyRequirement[] {
  if (architectureKind !== "MARKETPLACE_MULTI_PARTY") return [];
  const resolved = evidence.resolvedPolicy ?? {};
  return UNRESOLVED_POLICY_CODES.filter((code) => resolved[POLICY_FIELD[code]] == null).map((code) => ({
    code,
    question: QUESTIONS[code],
    requiredForLiveWrite: true as const,
  }));
}
