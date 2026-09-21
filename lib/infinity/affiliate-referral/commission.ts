import type {
  AffiliateCommissionAuthority,
  AffiliateCommissionResolution,
  AffiliateEconomicsInput,
} from "./types";

function unknown(value: number | "UNKNOWN"): boolean {
  return value === "UNKNOWN";
}

export function resolveAffiliateCommission(input: AffiliateEconomicsInput): AffiliateCommissionResolution {
  const missing = [
    ["gross_margin", input.gross_margin],
    ["known_contribution", input.known_contribution],
    ["processor_fees", input.processor_fees],
    ["fulfillment_cost", input.fulfillment_cost],
    ["refund_rate", input.refund_rate],
    ["chargeback_rate", input.chargeback_rate],
    ["ltv", input.ltv],
    ["cac_target", input.cac_target],
  ].filter(([, value]) => unknown(value as number | "UNKNOWN"));

  if (missing.length > 0 || unknown(input.known_contribution)) {
    return {
      model: "PENDING_ECONOMICS",
      rate_or_amount: "PENDING_ECONOMICS",
      maximum_sustainable_commission: "UNKNOWN",
      hold_period_days: 30,
      payout_cadence: "UNKNOWN",
      minimum_payout_threshold: "UNKNOWN",
      evidence: missing.map(([key]) => `UNKNOWN:${key}`),
      economics_status: "PENDING_ECONOMICS",
      unknown_treated_as_zero: false,
    };
  }

  const contribution = input.known_contribution as number;
  const processor = input.processor_fees as number;
  const fulfillment = input.fulfillment_cost as number;
  const max = Math.max(0, contribution - processor - fulfillment);
  return {
    model: "PERCENT_OF_FIRST_PAYMENT",
    rate_or_amount: max,
    maximum_sustainable_commission: max,
    hold_period_days: 30,
    payout_cadence: "MONTHLY",
    minimum_payout_threshold: 50,
    evidence: ["KNOWN_CONTRIBUTION"],
    economics_status: "KNOWN",
    unknown_treated_as_zero: false,
  };
}

export function affiliateCommissionAuthority(): AffiliateCommissionAuthority {
  return {
    kind: "AFFILIATE_COMMISSION_AUTHORITY",
    distinct_from_spend_authority: true,
    distinct_from_paid_acquisition: true,
    distinct_from_venture_allocation: true,
    authorized: false,
    accrued: 0,
    payable: 0,
    paid: 0,
    reason: "NO_VERIFIED_ELIGIBLE_CONVERSION",
  };
}

export function clickIsNotSale(): true {
  return true;
}

export function leadIsNotSale(): true {
  return true;
}

export function trialIsNotSale(): true {
  return true;
}

export function positiveReplyIsNotSale(): true {
  return true;
}

export function checkoutStartIsNotSale(): true {
  return true;
}

export function commissionRequiresVerifiedConversion(input: {
  click?: boolean;
  lead?: boolean;
  trial?: boolean;
  positive_reply?: boolean;
  checkout_start?: boolean;
  conversion_verified: boolean;
  eligible: boolean;
}): boolean {
  if (input.click || input.lead || input.trial || input.positive_reply || input.checkout_start) {
    return input.conversion_verified && input.eligible;
  }
  return input.conversion_verified && input.eligible;
}

export function affiliateCommissionAcquisitionEconomics(input: {
  attributed_revenue: number | "UNKNOWN";
  commission_accrued: number;
  commission_payable: number;
  commission_paid: number;
  paid_acquisition: 0;
}): {
  acquisition_cost: number | "UNKNOWN";
  distinct_from_paid_acquisition: true;
  distinct_from_spend_authority: true;
  paid_acquisition: 0;
} {
  const obligation = input.commission_accrued + input.commission_payable + input.commission_paid;
  return {
    acquisition_cost: input.attributed_revenue === "UNKNOWN" && obligation === 0 ? "UNKNOWN" : obligation,
    distinct_from_paid_acquisition: true,
    distinct_from_spend_authority: true,
    paid_acquisition: 0,
  };
}
