import type { AffiliateAttributionState } from "./contract";
import type { AffiliateAttribution } from "./types";

export function resolveAffiliateAttribution(input: {
  affiliate_id: string;
  link_id?: string;
  code?: string;
  campaign_id?: string;
  clicked_at: string;
  conversion_at?: string;
  attribution_window_days: number;
  self_referral?: boolean;
  existing_attribution_id?: string;
  conversion_verified?: boolean;
}): AffiliateAttribution {
  const state: AffiliateAttributionState = input.conversion_verified
    ? "CONVERSION_VERIFIED"
    : input.conversion_at
      ? "CONVERSION_PENDING"
      : "CLICK";
  return {
    attribution_id: input.existing_attribution_id
      ? `dup:${input.existing_attribution_id}`
      : `attr:${input.affiliate_id}:${input.link_id ?? input.code ?? "none"}:${input.clicked_at}`,
    affiliate_id: input.affiliate_id,
    link_id: input.link_id,
    code: input.code,
    campaign_id: input.campaign_id,
    state: input.self_referral ? "FRAUD_REJECTED" : input.existing_attribution_id ? "VOIDED" : state,
    conversion_verified: Boolean(input.conversion_verified) && !input.self_referral && !input.existing_attribution_id,
    self_referral: Boolean(input.self_referral),
    duplicate: Boolean(input.existing_attribution_id),
    at: input.clicked_at,
  };
}

export function attributionInsideWindow(clickedAt: string, conversionAt: string, windowDays: number): boolean {
  const start = Date.parse(clickedAt);
  const end = Date.parse(conversionAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end >= start && end - start <= windowDays * 24 * 60 * 60 * 1000;
}

export function clickCreatesNoCommission(state: AffiliateAttributionState): boolean {
  return state === "CLICK" || state === "REFERRED" || state === "LEAD";
}

export function unverifiedCannotBecomePayable(state: AffiliateAttributionState, verified: boolean): boolean {
  if (!verified) return !["PAYABLE", "QUEUED_FOR_PAYOUT", "PROCESSING", "PAID"].includes(state);
  return true;
}

export function holdPeriodEnforced(input: {
  verified_at: string;
  now: string;
  hold_period_days: number;
  requested_state: AffiliateAttributionState;
}): boolean {
  const elapsed = Date.parse(input.now) - Date.parse(input.verified_at);
  const required = input.hold_period_days * 24 * 60 * 60 * 1000;
  if (Number.isNaN(elapsed)) return false;
  const payable = ["PAYABLE", "QUEUED_FOR_PAYOUT", "PROCESSING", "PAID"].includes(input.requested_state);
  if (elapsed < required) return !payable;
  return true;
}

export function holdBlocksPayable(input: {
  verified_at: string;
  now: string;
  hold_period_days: number;
}): boolean {
  return !holdPeriodEnforced({
    ...input,
    requested_state: "PAYABLE",
  });
}

export function refundAffectsCommission(state: AffiliateAttributionState): AffiliateAttributionState {
  return "REFUNDED";
}

export function chargebackAffectsCommission(state: AffiliateAttributionState): AffiliateAttributionState {
  return "CHARGEBACK";
}
