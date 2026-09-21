import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { evaluateAffiliateProgramEligibility } from "./eligibility";
import { affiliateCommissionAuthority, resolveAffiliateCommission } from "./commission";
import { authorizeAffiliatePayout, cloudRuntimeReadyForAutomaticPayout, unconfiguredPayoutProvider } from "./payout";
import { occupancyNpvRecruitmentCategories } from "./recruitment";
import type { AffiliateProgram } from "./types";

export const OCCUPANCYNPV_AFFILIATE_PROGRAM_ID = "affiliate-program:occupancynpv" as const;

export function occupancyNpvEconomicsInput() {
  return {
    price: 290,
    gross_margin: "UNKNOWN" as const,
    known_contribution: "UNKNOWN" as const,
    processor_fees: "UNKNOWN" as const,
    fulfillment_cost: "UNKNOWN" as const,
    refund_rate: "UNKNOWN" as const,
    chargeback_rate: "UNKNOWN" as const,
    ltv: "UNKNOWN" as const,
    cac_target: "UNKNOWN" as const,
    sales_costs: "UNKNOWN" as const,
    existing_channel_costs: "UNKNOWN" as const,
  };
}

export function occupancyNpvEligibilityInput() {
  return {
    venture_id: CRE_VENTURE_ID,
    commercial: true,
    venture_type: "B2B_SAAS_CALCULATOR",
    regulatory_context: "COMMERCIAL_REAL_ESTATE_SOFTWARE_NOT_SECURITIES",
    legal_restrictions: [] as string[],
    business_model: "PROFESSIONAL_290_YEAR_AND_PER_DEAL_149_WITH_NO_CARD_TRIAL",
    customer_type: "TENANT_REP_AND_CRE_PROFESSIONALS",
    referral_compensation_suitable: true,
    tracking_ready: true,
    payment_ready: true,
    payout_ready: false,
    contribution_known: false,
  };
}

export function occupancyNpvAffiliateProgram(): AffiliateProgram {
  const eligibility = evaluateAffiliateProgramEligibility(occupancyNpvEligibilityInput());
  const commission = resolveAffiliateCommission(occupancyNpvEconomicsInput());
  return {
    program_id: OCCUPANCYNPV_AFFILIATE_PROGRAM_ID,
    venture_id: CRE_VENTURE_ID,
    display_name: "OccupancyNPV Affiliate Program",
    state: eligibility.program_state,
    commercial: true,
    capability_provisioned: true,
    activated: false,
    eligibility_reason: eligibility.reason,
    commission_model: commission.model,
    commission: commission.rate_or_amount,
    payout_state: "PENDING_ECONOMICS",
    public_path: "/occupancynpv/affiliates",
    portal_path: "/occupancynpv/affiliates/portal",
    terms_path: "/occupancynpv/affiliates/terms",
  };
}

export function occupancyNpvAffiliateNow(): string {
  return "Building OccupancyNPV's affiliate program and preparing qualified affiliate recruitment channels.";
}

export function occupancyNpvPayoutBlockers(): string[] {
  return authorizeAffiliatePayout({
    economics_known: false,
    program_authorized: false,
    affiliate_eligible: false,
    destination_verified: false,
    provider_authorized: unconfiguredPayoutProvider().authorized,
    scoped_server_credential: false,
    hold_period_complete: false,
    fraud_clear: true,
    compliance_clear: false,
    within_limits: false,
    idempotent: true,
    reconciliation_ready: true,
    cloud_runtime_ready: cloudRuntimeReadyForAutomaticPayout(),
    financial_mutation_allowed: false,
    qc_mode: true,
  }).blockers;
}

export function askReviewAffiliateProgram(): AffiliateProgram {
  const eligibility = evaluateAffiliateProgramEligibility({
    venture_id: ASKREVIEW_VENTURE_ID,
    commercial: true,
    venture_type: "B2B_SAAS",
    regulatory_context: "REVIEW_AUTOMATION",
    legal_restrictions: [],
    business_model: "NOT_PUBLICLY_OFFERED",
    customer_type: "SMALL_BUSINESS",
    referral_compensation_suitable: true,
    tracking_ready: false,
    payment_ready: false,
    payout_ready: false,
    contribution_known: false,
  });
  return {
    program_id: "affiliate-program:askreview",
    venture_id: ASKREVIEW_VENTURE_ID,
    display_name: "AskReview Affiliate Program",
    state: eligibility.program_state,
    commercial: true,
    capability_provisioned: true,
    activated: false,
    eligibility_reason: eligibility.reason,
    commission_model: "PENDING_ECONOMICS",
    commission: "PENDING_ECONOMICS",
    payout_state: "PENDING_ECONOMICS",
    public_path: "/askreview/affiliates",
    portal_path: "/askreview/affiliates/portal",
    terms_path: "/askreview/affiliates/terms",
  };
}

export function occupancyNpvFinancialLock() {
  return {
    verified_cash: 50,
    founder_authorized_capital: 50,
    portfolio_ceiling: 50,
    occupancynpv_allocation: 25,
    spend_authority: 5,
    committed: 0,
    actual_spend: 0,
    paid_acquisition: 0,
    affiliate_commission_authority: affiliateCommissionAuthority(),
    mercury: "READ_ONLY" as const,
    general_money_movement: "DISABLED" as const,
  };
}

export { occupancyNpvRecruitmentCategories };
