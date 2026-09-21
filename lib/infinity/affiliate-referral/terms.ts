import { REQUIRED_AFFILIATE_TERM_SECTIONS } from "./contract";

export const AFFILIATE_PROGRAM_TERMS = `# Affiliate Program Terms

These Affiliate Program Terms ("Terms") govern participation in an Infinity-provisioned Affiliate & Referral Program operated by the applicable commercial venture ("Program"). By applying or promoting a referral link or code, you agree to these Terms.

## 1. Eligibility
The Program is available only to individuals and organizations that can lawfully enter a contract, are not prohibited from receiving referral compensation in their jurisdiction, and pass eligibility, fraud, and compliance review. Employees of Infinity or the venture, and anyone who would create a self-referral, are not eligible unless expressly authorized in writing. Capability to operate an affiliate program does not mean a Program is active.

## 2. Application
Applicants must provide accurate name, email, organization (if any), website or social profile, audience or channel description, promotion method, and country, and must accept these Terms. We may request additional information. We do not require unnecessary sensitive information such as bank credentials in the application. Submission of an application does not create an approved affiliate account.

## 3. Approval
We may approve, reject, delay, or condition any application. Approval may be withheld for audience mismatch, compliance risk, fraud risk, incomplete information, or because the Program is not yet activated. We may place new affiliates on a hold period before any payout.

## 4. Commissions
No commission is earned from a click, lead, trial start, demo request, or positive reply. A commission may accrue only after a verified eligible conversion under the Program's published commission rule. If sustainable commission economics cannot be determined, the Program remains PENDING_ECONOMICS and no commission rate is authorized. Unknown cost is not treated as zero.

## 5. Attribution
Referrals are attributed through unique tracking links, affiliate codes, campaign identifiers, and timestamps within the stated attribution window. Conflicting, duplicate, or stolen attribution is void. Self-referrals are blocked by default. Cookie or code abuse does not create a valid attribution.

## 6. Hold Periods
Verified conversions enter a hold period before a commission can become payable. The hold period exists to allow refund, chargeback, fraud, and compliance review. A commission in hold is not payable and is not paid.

## 7. Refunds
If a purchaser receives a refund of the attributed conversion, the related commission is voided or reversed. A refunded conversion cannot remain payable.

## 8. Chargebacks
A chargeback or payment dispute on an attributed conversion voids or reverses the related commission. Chargeback abuse is grounds for suspension and forfeiture.

## 9. Fraud
We may reject, hold, or forfeit commissions and may suspend or terminate accounts for self-referrals, duplicate accounts, bot traffic, fake signups, cookie abuse, coupon abuse, refund abuse, chargeback abuse, stolen attribution, collusion, or other abuse. Fraud holds block payout.

## 10. Prohibited Behavior
Affiliates may not use false claims, fake reviews, spam, impersonation, misleading discounts, fake urgency, unauthorized brand bidding, unauthorized claims, unapproved coupons, or unapproved ads. Affiliates may not collect or expose purchaser or customer personal information.

## 11. Advertising Disclosures
Affiliates must clearly disclose the compensated relationship whenever they promote the Program, including on websites, social posts, videos, newsletters, and paid placements, in a manner consistent with applicable advertising-disclosure rules.

## 12. Brand Use
Affiliates may use only approved marketing assets and may not alter logos, product claims, pricing, or trial terms. Brand use may be revoked at any time.

## 13. Intellectual Property
The venture and Infinity retain all intellectual property in the product, marks, site, tracking technology, and Program materials. These Terms grant only a limited, revocable license to use approved assets to promote the Program.

## 14. Payment Eligibility
Payment eligibility requires an approved affiliate account, a verified eligible conversion, completed hold period, cleared fraud and compliance checks, a verified payout destination, an authorized payout provider, and a Program that is authorized to pay. Automatic payout, when enabled, is policy-authorized and is not unrestricted access to bank or treasury accounts.

## 15. Tax Responsibility
Affiliates are responsible for their own tax reporting and tax obligations. We may require tax documentation before payout and may withhold or decline payout where tax compliance is incomplete.

## 16. Payout Timing
Payouts, when authorized, follow the Program cadence and only after hold, fraud, compliance, limit, idempotency, and reconciliation checks. Provider confirmation is required before a payout is marked paid. Provider failure cannot mark a payout paid.

## 17. Thresholds
A minimum payout threshold, per-affiliate, per-payout, batch, daily, weekly, monthly, commission-percentage, and venture-specific ceilings may apply. Amounts below threshold remain accrued until the threshold is met or the Program says otherwise.

## 18. Suspension
We may suspend an affiliate immediately for suspected fraud, compliance issues, prohibited marketing, or Program risk. Suspended accounts do not receive new payouts.

## 19. Termination
Either party may terminate participation. We may terminate a Program or an affiliate account for convenience or cause. After termination, unpaid commissions remain subject to hold, refund, chargeback, fraud, and forfeiture rules.

## 20. Forfeiture Conditions
Commissions may be forfeited for fraud, self-referral, duplicate attribution, prohibited marketing, refund, chargeback, incomplete tax or compliance documentation, or material breach of these Terms.

## 21. Program Changes
We may change commission rules, attribution windows, hold periods, thresholds, or these Terms. Material changes apply prospectively unless a change is required for fraud, legal, or safety reasons.

## 22. Disclaimers
The Program is provided as a capability that may remain inactive, pending economics, pending payout infrastructure, or pending compliance review. We do not guarantee approval, traffic, conversions, commissions, or payouts. Infinity does not grant AI systems raw bank credentials or unrestricted money movement.

## 23. Contact
Questions about the Program, these Terms, privacy, or a specific application should be sent to the venture's published affiliate contact or to the founder-operated Infinity HQ affiliate operations channel for the relevant commercial venture.

Privacy: Affiliates will not receive purchaser or customer personal information. Public operations surfaces will not publish affiliate personal information, payout destinations, tax data, or private pipeline values.
`;

export function affiliateTermsCoverRequiredSections(text: string = AFFILIATE_PROGRAM_TERMS): boolean {
  const hay = text.toLowerCase();
  return REQUIRED_AFFILIATE_TERM_SECTIONS.every((section) => hay.includes(section));
}

export function affiliateTermsAreSubstantive(text: string = AFFILIATE_PROGRAM_TERMS): boolean {
  return text.trim().length > 2500 && affiliateTermsCoverRequiredSections(text) && !/lorem ipsum|todo legal|placeholder/i.test(text);
}

export const OCCUPANCYNPV_AFFILIATE_TERMS = `${AFFILIATE_PROGRAM_TERMS}

# OccupancyNPV Affiliate Program Terms

These venture-specific terms apply to the OccupancyNPV Affiliate Program operated for occupancynpv.com. They supplement the reusable Affiliate Program Terms and control if there is a conflict for OccupancyNPV.

## OccupancyNPV product
OccupancyNPV compares commercial lease cash flows and NPV so tenant-rep brokers and occupiers can choose the lower-cost deal. Current public offers are Professional at $290 per year and Per-Deal at $149 one-time. The current acquisition offer is a 3-day free trial that does not collect a card and does not automatically convert.

## OccupancyNPV eligibility and audience
The OccupancyNPV program is intended for commercial real-estate consultants, tenant-rep professionals, CRE educators, CRE newsletters, commercial brokerage professionals, commercial property creators, finance and modeling educators, and industry communities. Quantity of followers is not a qualification by itself.

## OccupancyNPV commissions and economics
No OccupancyNPV commission rate is authorized while contribution, processor cost, fulfillment cost, refund rate, chargeback rate, LTV, or CAC remain UNKNOWN. Unknown cost is not treated as zero. The program may remain PENDING_ECONOMICS while the signup page, tracking, portal, and terms are fully built. A click, lead, trial start, checkout start, or positive reply is not an OccupancyNPV sale.

## OccupancyNPV payout
Automatic payout architecture exists and is policy-authorized. Live automatic payout is disabled while economics, an authorized payout provider, scoped server credentials, tax and compliance state, payout limits, idempotency, reconciliation, Cloud Runtime productionization, and financial mutation policy are incomplete. Mercury remains read-only. Unrestricted money movement remains disabled. AI systems do not receive raw bank credentials.

## OccupancyNPV contact
Affiliate questions for OccupancyNPV may be sent through the OccupancyNPV affiliate application channel or Infinity HQ Partnerships & Channel Sales. Do not send purchaser personal information to affiliates.
`;

export function legalRouteIsNotLegalCoverage(input: { route_exists: boolean; terms_text: string }): boolean {
  return input.route_exists && !affiliateTermsAreSubstantive(input.terms_text);
}
