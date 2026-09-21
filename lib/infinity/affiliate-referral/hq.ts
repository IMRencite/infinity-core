import { occupancyNpvAffiliateNow, occupancyNpvAffiliateProgram } from "./occupancy";
import type { AffiliateHqView } from "./types";

export function buildAffiliateHqView(): AffiliateHqView {
  const program = occupancyNpvAffiliateProgram();
  return {
    floor: "Sales Floor",
    room: "Partnerships & Channel Sales",
    capability: "Affiliate & Referral",
    programs: [program],
    applications: 0,
    approved_affiliates: 0,
    clicks: 0,
    verified_referrals: 0,
    conversions: 0,
    pending_commissions: 0,
    payable_commissions: 0,
    paid_commissions: 0,
    attributed_revenue: "UNKNOWN",
    acquisition_cost: "UNKNOWN",
    fraud_holds: 0,
    next_action: "Keep OccupancyNPV affiliate capability built without activating commissions or payouts",
    now: occupancyNpvAffiliateNow(),
  };
}

export function commercializationPathIncludesAffiliate(path: readonly string[] = AFFILIATE_BUILD_PATH): boolean {
  const required = ["SALES_FLOOR", "AFFILIATE_PROGRAM_PROVISIONING", "AFFILIATE_ELIGIBILITY", "PAYOUT", "LEARNING"];
  return required.every((step) => path.includes(step));
}

export const AFFILIATE_BUILD_PATH = [
  "OPPORTUNITY",
  "VALIDATION",
  "ECONOMICS",
  "SELECTION",
  "BUILD",
  "QC",
  "PAYMENT",
  "FULFILLMENT",
  "GROWTH",
  "SALES_FLOOR",
  "AFFILIATE_PROGRAM_PROVISIONING",
  "AFFILIATE_ELIGIBILITY",
  "COMMISSION_ECONOMICS",
  "TRACKING",
  "AFFILIATE_TERMS",
  "PORTAL",
  "ACTIVATION",
  "RECRUITMENT",
  "CONVERSIONS",
  "PAYOUT",
  "LEARNING",
  "OPTIMIZATION",
] as const;
