import { occupancyNpvAffiliateProgram } from "./occupancy";
import type { AffiliatePortalView } from "./types";

export function qcAffiliatePortalFixture(): AffiliatePortalView {
  const program = occupancyNpvAffiliateProgram();
  return {
    program_state: program.state,
    affiliate_id: "fixture:affiliate:qc",
    tracking_link: "https://occupancynpv.com/?via=qc-fixture",
    referral_code: "QC-FIXTURE",
    approved_assets: ["OccupancyNPV product description", "Approved disclosure language"],
    clicks: 0,
    verified_conversions: 0,
    pending_commissions: 0,
    approved_commissions: 0,
    payable_commissions: 0,
    paid_commissions: 0,
    payout_history: [],
    terms_path: program.terms_path,
    disclosure_rules: [
      "Disclose the compensated relationship on every promotion.",
      "Do not hide affiliate status in videos, newsletters, or paid posts.",
    ],
    prohibited_practices: [
      "false claims",
      "fake reviews",
      "spam",
      "impersonation",
      "misleading discounts",
      "unapproved coupons",
    ],
    customer_pii_exposed: false,
  };
}

export function portalHidesCustomerPii(view: AffiliatePortalView, serialized: string): boolean {
  return view.customer_pii_exposed === false
    && !/customer@|purchaser|cardholder|billing address/i.test(serialized);
}
