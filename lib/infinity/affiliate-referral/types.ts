import type {
  AffiliateApplicationState,
  AffiliateAttributionState,
  AffiliateCommissionModel,
  AffiliatePayoutProcessingState,
  AffiliatePayoutState,
  AffiliateProgramState,
} from "./contract";

export type UnknownOrNumber = number | "UNKNOWN";

export type AffiliateProgram = {
  program_id: string;
  venture_id: string;
  display_name: string;
  state: AffiliateProgramState;
  commercial: boolean;
  capability_provisioned: true;
  activated: boolean;
  eligibility_reason: string;
  commission_model: AffiliateCommissionModel | "PENDING_ECONOMICS";
  commission: UnknownOrNumber | "PENDING_ECONOMICS";
  payout_state: AffiliatePayoutState;
  public_path: string;
  portal_path: string;
  terms_path: string;
};

export type AffiliateApplication = {
  application_id: string;
  program_id: string;
  name: string;
  email: string;
  organization?: string;
  website?: string;
  social_url?: string;
  audience?: string;
  promotion_method?: string;
  country?: string;
  agreement_accepted: boolean;
  status: AffiliateApplicationState;
  fixture: boolean;
  production: false;
};

export type AffiliateAccount = {
  affiliate_id: string;
  program_id: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "CLOSED";
  fixture: boolean;
};

export type AffiliateLink = {
  link_id: string;
  affiliate_id: string;
  code: string;
  url: string;
};

export type AffiliateClick = {
  click_id: string;
  link_id: string;
  affiliate_id: string;
  at: string;
};

export type AffiliateAttribution = {
  attribution_id: string;
  affiliate_id: string;
  link_id?: string;
  code?: string;
  campaign_id?: string;
  state: AffiliateAttributionState;
  conversion_verified: boolean;
  self_referral: boolean;
  duplicate: boolean;
  at: string;
};

export type AffiliateCommissionRule = {
  rule_id: string;
  program_id: string;
  model: AffiliateCommissionModel | "PENDING_ECONOMICS";
  amount: UnknownOrNumber | "PENDING_ECONOMICS";
  hold_period_days: number;
  minimum_payout: UnknownOrNumber;
  economics_status: "KNOWN" | "PENDING_ECONOMICS";
};

export type AffiliateCommission = {
  commission_id: string;
  attribution_id: string;
  amount: UnknownOrNumber;
  state: AffiliateAttributionState;
};

export type AffiliatePayout = {
  payout_id: string;
  commission_id: string;
  amount: number;
  state: AffiliatePayoutProcessingState;
  provider_reference: string | null;
  idempotency_key: string;
};

export type AffiliateCommissionAuthority = {
  kind: "AFFILIATE_COMMISSION_AUTHORITY";
  distinct_from_spend_authority: true;
  distinct_from_paid_acquisition: true;
  distinct_from_venture_allocation: true;
  authorized: false;
  accrued: 0;
  payable: 0;
  paid: 0;
  reason: string;
};

export type AffiliateEconomicsInput = {
  price: UnknownOrNumber;
  gross_margin: UnknownOrNumber;
  known_contribution: UnknownOrNumber;
  processor_fees: UnknownOrNumber;
  fulfillment_cost: UnknownOrNumber;
  refund_rate: UnknownOrNumber;
  chargeback_rate: UnknownOrNumber;
  ltv: UnknownOrNumber;
  cac_target: UnknownOrNumber;
  sales_costs: UnknownOrNumber;
  existing_channel_costs: UnknownOrNumber;
};

export type AffiliateCommissionResolution = {
  model: AffiliateCommissionModel | "PENDING_ECONOMICS";
  rate_or_amount: UnknownOrNumber | "PENDING_ECONOMICS";
  maximum_sustainable_commission: UnknownOrNumber;
  hold_period_days: number;
  payout_cadence: "UNKNOWN" | "MONTHLY";
  minimum_payout_threshold: UnknownOrNumber;
  evidence: string[];
  economics_status: "KNOWN" | "PENDING_ECONOMICS";
  unknown_treated_as_zero: false;
};

export type AffiliateEligibilityInput = {
  venture_id: string;
  commercial: boolean;
  venture_type: string;
  regulatory_context: string;
  legal_restrictions: string[];
  business_model: string;
  customer_type: string;
  referral_compensation_suitable: boolean;
  tracking_ready: boolean;
  payment_ready: boolean;
  payout_ready: boolean;
  contribution_known: boolean;
  explicitly_non_commercial?: boolean;
  regulated_auto_activate?: boolean;
};

export type AffiliateEligibilityResult = {
  eligible_for_capability: boolean;
  eligible_for_activation: boolean;
  program_state: AffiliateProgramState;
  reason: string;
};

export type AffiliatePayoutLimits = {
  per_affiliate_maximum: number | "UNKNOWN";
  per_payout_maximum: number | "UNKNOWN";
  batch_maximum: number | "UNKNOWN";
  daily_maximum: number | "UNKNOWN";
  weekly_maximum: number | "UNKNOWN";
  monthly_maximum: number | "UNKNOWN";
  commission_percentage_ceiling: number | "UNKNOWN";
  venture_specific_ceiling: number | "UNKNOWN";
  new_affiliate_hold: boolean;
  fraud_hold: boolean;
  manual_escalation_threshold: number | "UNKNOWN";
};

export type AffiliatePayoutProvider = {
  provider_id: string;
  kind: "STRIPE_CONNECT" | "PAYPAL" | "BANK_API" | "UNCONFIGURED";
  authorized: boolean;
  mercury_mutation: false;
};

export type AffiliateHqView = {
  floor: "Sales Floor";
  room: "Partnerships & Channel Sales";
  capability: "Affiliate & Referral";
  programs: AffiliateProgram[];
  applications: number;
  approved_affiliates: number;
  clicks: number;
  verified_referrals: number;
  conversions: number;
  pending_commissions: UnknownOrNumber;
  payable_commissions: UnknownOrNumber;
  paid_commissions: UnknownOrNumber;
  attributed_revenue: UnknownOrNumber;
  acquisition_cost: UnknownOrNumber;
  fraud_holds: number;
  next_action: string;
  now: string;
};

export type AffiliatePortalView = {
  program_state: AffiliateProgramState;
  affiliate_id: string;
  tracking_link: string;
  referral_code: string;
  approved_assets: string[];
  clicks: number;
  verified_conversions: number;
  pending_commissions: UnknownOrNumber;
  approved_commissions: UnknownOrNumber;
  payable_commissions: UnknownOrNumber;
  paid_commissions: UnknownOrNumber;
  payout_history: Array<{ payout_id: string; amount: UnknownOrNumber; state: string }>;
  terms_path: string;
  disclosure_rules: string[];
  prohibited_practices: string[];
  customer_pii_exposed: false;
};

export type AffiliatePublicProjection = {
  capability: "Affiliate & Referral";
  public_activity: string;
};

export type NamedAffiliateGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };
