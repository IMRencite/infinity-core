import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import {
  AFFILIATE_ATTRIBUTION_TRUTH_GATE,
  AFFILIATE_CLOUD_RUNTIME_READINESS_GATE,
  AFFILIATE_COMMISSION_ECONOMICS_GATE,
  AFFILIATE_COMMISSION_ELIGIBILITY_GATE,
  AFFILIATE_CONVERSION_VERIFICATION_GATE,
  AFFILIATE_CUSTOMER_PRIVACY_GATE,
  AFFILIATE_DUPLICATE_ATTRIBUTION_GATE,
  AFFILIATE_FRAUD_GATE,
  AFFILIATE_HOLD_PERIOD_GATE,
  AFFILIATE_NO_FAKE_EVIDENCE_GATE,
  AFFILIATE_PAYOUT_AUTHORIZATION_GATE,
  AFFILIATE_PAYOUT_IDEMPOTENCY_GATE,
  AFFILIATE_PAYOUT_LIMIT_GATE,
  AFFILIATE_PAYOUT_RECONCILIATION_GATE,
  AFFILIATE_PROGRAM_ELIGIBILITY_GATE,
  AFFILIATE_COMPLIANCE_DISCLOSURE_GATE,
  AFFILIATE_PROGRAM_LEGAL_COVERAGE_GATE,
  AFFILIATE_PUBLIC_PRIVACY_GATE,
  AFFILIATE_QC_TERMINATION_GATE,
  AFFILIATE_RECRUITMENT_QUALIFICATION_GATE,
  AFFILIATE_REFUND_CHARGEBACK_GATE,
  AFFILIATE_SELF_REFERRAL_GATE,
  AFFILIATE_TAX_COMPLIANCE_GATE,
  AFFILIATE_TERMS_COMPLETENESS_GATE,
  AFFILIATE_UNKNOWN_NOT_ZERO_GATE,
  COMMERCIAL_VENTURE_AFFILIATE_COVERAGE_GATE,
  OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE,
} from "./contract";
import {
  clickCreatesNoCommission,
  holdBlocksPayable,
  resolveAffiliateAttribution,
  unverifiedCannotBecomePayable,
} from "./attribution";
import { commissionRequiresVerifiedConversion, resolveAffiliateCommission } from "./commission";
import { commercialVenturesReceiveAffiliateCapability } from "./coverage";
import { evaluateAffiliateProgramEligibility } from "./eligibility";
import { detectAffiliateFraud, fraudHoldBlocksPayout, selfReferralBlockedByDefault } from "./fraud";
import {
  cloudRuntimeReadyForAutomaticPayout,
  payoutExceedsLimit,
  payoutIdempotencyKey,
  processAffiliatePayout,
  providerFailureCannotMarkPaid,
  reconcileAffiliatePayout,
} from "./payout";
import { occupancyNpvAffiliateProgram, occupancyNpvEconomicsInput, occupancyNpvEligibilityInput } from "./occupancy";
import { affiliatePiiPublic, publicAffiliateIsSafe } from "./public";
import { portalHidesCustomerPii, qcAffiliatePortalFixture } from "./portal";
import { chargebackAffectsCommission, refundAffectsCommission } from "./attribution";
import { qualifyAffiliateRecruitment } from "./recruitment";
import { classifyQcTermination, SALES_FLOOR_HQ_VISUAL_QC_RECORD } from "./qc-termination";
import { affiliateTermsAreSubstantive, legalRouteIsNotLegalCoverage, OCCUPANCYNPV_AFFILIATE_TERMS } from "./terms";
import type { AffiliateEligibilityInput, NamedAffiliateGate } from "./types";

function pass(gate: string, reason: string): NamedAffiliateGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedAffiliateGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateCommercialVentureAffiliateCoverageGate(): NamedAffiliateGate {
  const ok = commercialVenturesReceiveAffiliateCapability([
    { venture_id: CRE_VENTURE_ID, commercial: true },
    { venture_id: ASKREVIEW_VENTURE_ID, commercial: true },
    { venture_id: "internal-lab", commercial: false, explicitly_non_commercial: true },
  ]);
  return ok
    ? pass(COMMERCIAL_VENTURE_AFFILIATE_COVERAGE_GATE, "COMMERCIAL_COVERED_NONCOMMERCIAL_EXEMPT")
    : fail(COMMERCIAL_VENTURE_AFFILIATE_COVERAGE_GATE, ["COVERAGE_GAP"]);
}

export function evaluateAffiliateProgramEligibilityGate(
  input: AffiliateEligibilityInput = occupancyNpvEligibilityInput(),
): NamedAffiliateGate {
  const result = evaluateAffiliateProgramEligibility(input);
  if (input.regulated_auto_activate && result.program_state !== "PENDING_COMPLIANCE_REVIEW") {
    return fail(AFFILIATE_PROGRAM_ELIGIBILITY_GATE, ["REGULATED_AUTO_ACTIVATED"]);
  }
  if (result.eligible_for_activation && result.program_state === "PENDING_ECONOMICS") {
    return fail(AFFILIATE_PROGRAM_ELIGIBILITY_GATE, ["ACTIVATED_WITH_UNKNOWN_ECONOMICS"]);
  }
  return pass(AFFILIATE_PROGRAM_ELIGIBILITY_GATE, result.reason);
}

export function evaluateAffiliateCommissionEconomicsGate(): NamedAffiliateGate {
  const resolution = resolveAffiliateCommission(occupancyNpvEconomicsInput());
  if (resolution.unknown_treated_as_zero) return fail(AFFILIATE_COMMISSION_ECONOMICS_GATE, ["UNKNOWN_TREATED_AS_ZERO"]);
  if (resolution.economics_status !== "PENDING_ECONOMICS") {
    return fail(AFFILIATE_COMMISSION_ECONOMICS_GATE, ["UNSAFE_RATE_INVENTED"]);
  }
  return pass(AFFILIATE_COMMISSION_ECONOMICS_GATE, "PENDING_ECONOMICS");
}

export function evaluateAffiliateAttributionTruthGate(): NamedAffiliateGate {
  const click = resolveAffiliateAttribution({
    affiliate_id: "a1",
    link_id: "l1",
    clicked_at: "2026-09-15T00:00:00.000Z",
    attribution_window_days: 30,
  });
  const coded = resolveAffiliateAttribution({
    affiliate_id: "a1",
    code: "CRE1",
    clicked_at: "2026-09-15T00:00:00.000Z",
    attribution_window_days: 30,
  });
  if (!clickCreatesNoCommission(click.state) || !clickCreatesNoCommission(coded.state)) {
    return fail(AFFILIATE_ATTRIBUTION_TRUTH_GATE, ["CLICK_CREATED_COMMISSION"]);
  }
  return pass(AFFILIATE_ATTRIBUTION_TRUTH_GATE, "LINK_AND_CODE_CLICK_ONLY");
}

export function evaluateAffiliateConversionVerificationGate(): NamedAffiliateGate {
  const allowed = commissionRequiresVerifiedConversion({
    click: true,
    conversion_verified: false,
    eligible: true,
  });
  const verified = commissionRequiresVerifiedConversion({
    conversion_verified: true,
    eligible: true,
  });
  if (allowed || !verified || !unverifiedCannotBecomePayable("CONVERSION_PENDING", false)) {
    return fail(AFFILIATE_CONVERSION_VERIFICATION_GATE, ["UNVERIFIED_PAYABLE"]);
  }
  return pass(AFFILIATE_CONVERSION_VERIFICATION_GATE, "VERIFIED_CONVERSION_REQUIRED");
}

export function evaluateAffiliateFraudGate(): NamedAffiliateGate {
  const fraud = detectAffiliateFraud({ bot_traffic: true });
  return fraud.hold && fraudHoldBlocksPayout(true)
    ? pass(AFFILIATE_FRAUD_GATE, "FRAUD_HOLD")
    : fail(AFFILIATE_FRAUD_GATE, ["FRAUD_NOT_HELD"]);
}

export function evaluateAffiliateSelfReferralGate(): NamedAffiliateGate {
  const attr = resolveAffiliateAttribution({
    affiliate_id: "a1",
    link_id: "l1",
    clicked_at: "2026-09-15T00:00:00.000Z",
    attribution_window_days: 30,
    self_referral: true,
    conversion_verified: true,
  });
  return selfReferralBlockedByDefault(attr.self_referral) && attr.state === "FRAUD_REJECTED"
    ? pass(AFFILIATE_SELF_REFERRAL_GATE, "SELF_REFERRAL_BLOCKED")
    : fail(AFFILIATE_SELF_REFERRAL_GATE, ["SELF_REFERRAL_ALLOWED"]);
}

export function evaluateAffiliateDuplicateAttributionGate(): NamedAffiliateGate {
  const attr = resolveAffiliateAttribution({
    affiliate_id: "a1",
    link_id: "l1",
    clicked_at: "2026-09-15T00:00:00.000Z",
    attribution_window_days: 30,
    existing_attribution_id: "attr-existing",
  });
  return attr.duplicate && attr.state === "VOIDED"
    ? pass(AFFILIATE_DUPLICATE_ATTRIBUTION_GATE, "DUPLICATE_VOIDED")
    : fail(AFFILIATE_DUPLICATE_ATTRIBUTION_GATE, ["DUPLICATE_ALLOWED"]);
}

export function evaluateAffiliateCommissionEligibilityGate(): NamedAffiliateGate {
  const ok = commissionRequiresVerifiedConversion({ conversion_verified: true, eligible: true });
  const blocked = commissionRequiresVerifiedConversion({ trial: true, conversion_verified: false, eligible: true });
  return ok && !blocked
    ? pass(AFFILIATE_COMMISSION_ELIGIBILITY_GATE, "ELIGIBLE_VERIFIED_ONLY")
    : fail(AFFILIATE_COMMISSION_ELIGIBILITY_GATE, ["UNSAFE_COMMISSION"]);
}

export function evaluateAffiliateHoldPeriodGate(): NamedAffiliateGate {
  const blocked = holdBlocksPayable({
    verified_at: "2026-09-15T00:00:00.000Z",
    now: "2026-09-16T00:00:00.000Z",
    hold_period_days: 30,
  });
  return blocked
    ? pass(AFFILIATE_HOLD_PERIOD_GATE, "HOLD_ENFORCED")
    : fail(AFFILIATE_HOLD_PERIOD_GATE, ["HOLD_BYPASSED"]);
}

export function evaluateAffiliatePayoutAuthorizationGate(): NamedAffiliateGate {
  return pass(AFFILIATE_PAYOUT_AUTHORIZATION_GATE, "POLICY_AUTHORIZED_NOT_LIVE");
}

export function evaluateAffiliatePayoutLimitGate(): NamedAffiliateGate {
  return payoutExceedsLimit(100, 5)
    ? pass(AFFILIATE_PAYOUT_LIMIT_GATE, "CEILING_BLOCKS")
    : fail(AFFILIATE_PAYOUT_LIMIT_GATE, ["CEILING_NOT_ENFORCED"]);
}

export function evaluateAffiliatePayoutIdempotencyGate(): NamedAffiliateGate {
  const a = payoutIdempotencyKey("c1");
  const b = payoutIdempotencyKey("c1");
  return a === b && a.includes("c1")
    ? pass(AFFILIATE_PAYOUT_IDEMPOTENCY_GATE, "STABLE_KEY")
    : fail(AFFILIATE_PAYOUT_IDEMPOTENCY_GATE, ["UNSTABLE_KEY"]);
}

export function evaluateAffiliatePayoutReconciliationGate(): NamedAffiliateGate {
  const failed = processAffiliatePayout({
    commission_id: "c1",
    amount: 10,
    provider_confirmed: false,
    provider_failed: true,
  });
  const paid = processAffiliatePayout({
    commission_id: "c2",
    amount: 10,
    provider_confirmed: true,
  });
  const recon = reconcileAffiliatePayout({ payout: paid, provider_reference: paid.provider_reference });
  if (!providerFailureCannotMarkPaid(failed) || failed.state === "PAID") {
    return fail(AFFILIATE_PAYOUT_RECONCILIATION_GATE, ["FAILURE_MARKED_PAID"]);
  }
  return recon.reconciled
    ? pass(AFFILIATE_PAYOUT_RECONCILIATION_GATE, "CONFIRMATION_REQUIRED")
    : fail(AFFILIATE_PAYOUT_RECONCILIATION_GATE, ["RECONCILIATION_FAILED"]);
}

export function evaluateAffiliateTaxComplianceGate(input: { tax_clear: boolean; payout_attempted?: boolean }): NamedAffiliateGate {
  if (!input.tax_clear && input.payout_attempted) {
    return fail(AFFILIATE_TAX_COMPLIANCE_GATE, ["TAX_BLOCK_BYPASSED"]);
  }
  return input.tax_clear
    ? pass(AFFILIATE_TAX_COMPLIANCE_GATE, "TAX_CLEAR")
    : pass(AFFILIATE_TAX_COMPLIANCE_GATE, "TAX_BLOCKS_PAYOUT");
}

export function evaluateAffiliateTermsCompletenessGate(): NamedAffiliateGate {
  if (legalRouteIsNotLegalCoverage({ route_exists: true, terms_text: OCCUPANCYNPV_AFFILIATE_TERMS })) {
    return fail(AFFILIATE_TERMS_COMPLETENESS_GATE, ["ROUTE_IS_NOT_COVERAGE"]);
  }
  return affiliateTermsAreSubstantive(OCCUPANCYNPV_AFFILIATE_TERMS)
    ? pass(AFFILIATE_TERMS_COMPLETENESS_GATE, "SUBSTANTIVE_TERMS")
    : fail(AFFILIATE_TERMS_COMPLETENESS_GATE, ["THIN_LEGAL"]);
}

export function evaluateAffiliateProgramLegalCoverageGate(): NamedAffiliateGate {
  return evaluateAffiliateTermsCompletenessGate().result === "PASS"
    ? pass(AFFILIATE_PROGRAM_LEGAL_COVERAGE_GATE, "LEGAL_COVERED")
    : fail(AFFILIATE_PROGRAM_LEGAL_COVERAGE_GATE, ["LEGAL_GAP"]);
}

export function evaluateAffiliateComplianceDisclosureGate(): NamedAffiliateGate {
  return /disclose the compensated relationship/i.test(OCCUPANCYNPV_AFFILIATE_TERMS)
    ? pass(AFFILIATE_COMPLIANCE_DISCLOSURE_GATE, "DISCLOSURE_REQUIRED")
    : fail(AFFILIATE_COMPLIANCE_DISCLOSURE_GATE, ["DISCLOSURE_MISSING"]);
}

export function evaluateAffiliateRefundChargebackGate(): NamedAffiliateGate {
  return refundAffectsCommission("PAYABLE") === "REFUNDED" && chargebackAffectsCommission("PAYABLE") === "CHARGEBACK"
    ? pass(AFFILIATE_REFUND_CHARGEBACK_GATE, "REFUND_AND_CHARGEBACK_REVERSE")
    : fail(AFFILIATE_REFUND_CHARGEBACK_GATE, ["REVERSAL_MISSING"]);
}

export function evaluateAffiliateRecruitmentQualificationGate(): NamedAffiliateGate {
  const weak = qualifyAffiliateRecruitment({
    audience_fit: false,
    buyer_overlap: true,
    channel_quality: true,
    reputation: true,
    promotion_method_allowed: true,
    estimated_reach: "UNKNOWN",
    industry_fit: true,
    compliance_risk: false,
    fraud_risk: false,
  });
  const strong = qualifyAffiliateRecruitment({
    audience_fit: true,
    buyer_overlap: true,
    channel_quality: true,
    reputation: true,
    promotion_method_allowed: true,
    estimated_reach: "UNKNOWN",
    industry_fit: true,
    compliance_risk: false,
    fraud_risk: false,
  });
  return !weak.qualified && strong.qualified
    ? pass(AFFILIATE_RECRUITMENT_QUALIFICATION_GATE, "FIT_OVER_QUANTITY")
    : fail(AFFILIATE_RECRUITMENT_QUALIFICATION_GATE, ["QUANTITY_REWARDED"]);
}

export function evaluateAffiliateQcTerminationGate(): NamedAffiliateGate {
  const afterProof = classifyQcTermination({
    proof_emitted: true,
    proof_result: "PASS",
    terminated: true,
    intentional: true,
  });
  const beforeProof = classifyQcTermination({
    proof_emitted: false,
    terminated: true,
    intentional: true,
  });
  if (afterProof.qc_result !== "PASS" || afterProof.process_termination !== "MANUAL_AFTER_PROOF") {
    return fail(AFFILIATE_QC_TERMINATION_GATE, ["AFTER_PROOF_TREATED_AS_FAIL"]);
  }
  if (beforeProof.qc_result !== "INCOMPLETE") {
    return fail(AFFILIATE_QC_TERMINATION_GATE, ["BEFORE_PROOF_TREATED_AS_PASS"]);
  }
  if (SALES_FLOOR_HQ_VISUAL_QC_RECORD.qc_result !== "PASS") {
    return fail(AFFILIATE_QC_TERMINATION_GATE, ["PRIOR_PROOF_INVALIDATED"]);
  }
  return pass(AFFILIATE_QC_TERMINATION_GATE, "PROOF_AND_TERMINATION_DISTINCT");
}

export function evaluateAffiliateCustomerPrivacyGate(): NamedAffiliateGate {
  const portal = qcAffiliatePortalFixture();
  return portalHidesCustomerPii(portal, JSON.stringify(portal))
    ? pass(AFFILIATE_CUSTOMER_PRIVACY_GATE, "NO_CUSTOMER_PII")
    : fail(AFFILIATE_CUSTOMER_PRIVACY_GATE, ["CUSTOMER_PII_EXPOSED"]);
}

export function evaluateAffiliatePublicPrivacyGate(): NamedAffiliateGate {
  const publicJson = JSON.stringify({ capability: "Affiliate & Referral", public_activity: "Developing affiliate channels" });
  return publicAffiliateIsSafe(publicJson) && !affiliatePiiPublic(publicJson)
    ? pass(AFFILIATE_PUBLIC_PRIVACY_GATE, "PUBLIC_SAFE")
    : fail(AFFILIATE_PUBLIC_PRIVACY_GATE, ["PUBLIC_PII"]);
}

export function evaluateAffiliateUnknownNotZeroGate(metric: number | "UNKNOWN", rendered: string): NamedAffiliateGate {
  if (metric === "UNKNOWN" && rendered === "0") return fail(AFFILIATE_UNKNOWN_NOT_ZERO_GATE, ["UNKNOWN_AS_ZERO"]);
  return pass(AFFILIATE_UNKNOWN_NOT_ZERO_GATE, "UNKNOWN_PRESERVED");
}

export function evaluateAffiliateNoFakeEvidenceGate(input: {
  fake_affiliates?: boolean;
  fake_referrals?: boolean;
  fake_commissions?: boolean;
  fake_payouts?: boolean;
}): NamedAffiliateGate {
  if (input.fake_affiliates || input.fake_referrals || input.fake_commissions || input.fake_payouts) {
    return fail(AFFILIATE_NO_FAKE_EVIDENCE_GATE, ["FAKE_AFFILIATE_EVIDENCE"]);
  }
  return pass(AFFILIATE_NO_FAKE_EVIDENCE_GATE, "NO_FAKE_PRODUCTION_EVIDENCE");
}

export function evaluateAffiliateCloudRuntimeReadinessGate(): NamedAffiliateGate {
  return !cloudRuntimeReadyForAutomaticPayout()
    ? pass(AFFILIATE_CLOUD_RUNTIME_READINESS_GATE, "ARCHITECTURE_READY_NOT_LIVE")
    : fail(AFFILIATE_CLOUD_RUNTIME_READINESS_GATE, ["FALSE_LIVE_CLOUD"]);
}

export function evaluateOccupancyNPVAffiliateProgramGate(): NamedAffiliateGate {
  const program = occupancyNpvAffiliateProgram();
  if (program.venture_id !== CRE_VENTURE_ID) return fail(OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE, ["WRONG_VENTURE"]);
  if (program.activated) return fail(OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE, ["BLIND_ACTIVATION"]);
  if (program.state !== "PENDING_ECONOMICS") return fail(OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE, ["UNEXPECTED_STATE"]);
  if (program.commission !== "PENDING_ECONOMICS") return fail(OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE, ["INVENTED_RATE"]);
  return pass(OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE, "CAPABILITY_BUILT_NOT_ACTIVATED");
}
