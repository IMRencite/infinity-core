export function detectAffiliateFraud(input: {
  self_referral?: boolean;
  duplicate_account?: boolean;
  bot_traffic?: boolean;
  fake_signup?: boolean;
  cookie_abuse?: boolean;
  coupon_abuse?: boolean;
  refund_abuse?: boolean;
  chargeback_abuse?: boolean;
  stolen_attribution?: boolean;
  collusion?: boolean;
}): { hold: boolean; reasons: string[] } {
  const reasons = Object.entries(input)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase());
  return { hold: reasons.length > 0, reasons };
}

export function selfReferralBlockedByDefault(selfReferral: boolean): boolean {
  return selfReferral;
}

export function duplicateAttributionBlocked(duplicate: boolean): boolean {
  return duplicate;
}

export function fraudHoldBlocksPayout(hold: boolean): boolean {
  return hold;
}

export const AFFILIATE_MARKETING_PROHIBITIONS = [
  "false claims",
  "fake reviews",
  "spam",
  "impersonation",
  "misleading discounts",
  "fake urgency",
  "unauthorized brand bidding",
  "unauthorized claims",
  "unapproved coupons",
  "unapproved ads",
] as const;
