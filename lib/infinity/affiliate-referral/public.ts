import type { AffiliatePublicProjection } from "./types";

const PRIVATE = /@|payout destination|routing number|ssn|tax id|customer email|deal value|\$\d|Mercury|Treasury|spend authority|candidate:/i;

export function projectPublicAffiliate(): AffiliatePublicProjection {
  return {
    capability: "Affiliate & Referral",
    public_activity: "Partnerships & Channel — Developing affiliate channels",
  };
}

export function publicAffiliateIsSafe(serialized: string): boolean {
  return !PRIVATE.test(serialized);
}

export function affiliatePiiPublic(serialized: string): boolean {
  return /affiliate@.+\.|payout destination|tax id/i.test(serialized);
}
