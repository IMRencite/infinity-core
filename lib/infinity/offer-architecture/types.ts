import type { ClassifiedValue } from "@/lib/infinity/venture-economics/types";

export const OFFER_ARCHITECTURE_CONTRACT = "OfferArchitectureContract" as const;
export const OFFER_EXPERIMENT_CONTRACT = "OfferExperimentContract" as const;
export const OFFER_ARCHITECTURE_ENGINE_V1 = "OFFER_DEAL_ARCHITECTURE_ENGINE_V1" as const;

export const OFFER_ARCHITECTURE_READINESS_GATE = "OfferArchitectureReadinessGate" as const;
export const OFFER_DISCLOSURE_QC_GATE = "OfferDisclosureQCGate" as const;
export const TRIAL_DISCLOSURE_QC_GATE = "TrialDisclosureQCGate" as const;
export const OFFER_ECONOMICS_QC_GATE = "OfferEconomicsQCGate" as const;
export const OFFER_FULFILLMENT_COMPATIBILITY_GATE = "OfferFulfillmentCompatibilityGate" as const;
export const OFFER_PAYMENT_COMPATIBILITY_GATE = "OfferPaymentCompatibilityGate" as const;
export const OFFER_ACTIVATION_GATE = "OfferActivationGate" as const;
export const FREE_OFFER_ECONOMIC_SAFETY_GATE = "FreeOfferEconomicSafetyGate" as const;

export const CANONICAL_VENTURE_BUILD_FLOW = [
  "Opportunity Discovery",
  "Research / Validation",
  "Preliminary Economics",
  "Venture Selection",
  "Competitive Intelligence",
  "Commercialization Economics",
  "OFFER + DEAL ARCHITECTURE",
  "Company Formation",
  "Venture Systems / Payment Architecture",
  "Organic Growth / Creative Media",
  "Product / Assets",
  "Production Artifact Handoff",
  "Governed Deployment Readiness",
  "Governed Deployment Execution",
  "Commercialization / Domain / DNS / Payments",
  "Venture-Specific Fulfillment",
  "Payment Activation",
  "Public Launch",
  "Active Evidence-Generating Growth",
  "Performance Monitoring / Learning",
  "Offer Optimization",
  "Product Improvement",
  "Customer Feedback / Suggestion Learning",
  "iteration",
] as const;

export const OFFER_TYPES = [
  "PAID_FIRST",
  "FREE_TRIAL",
  "CARD_REQUIRED_TRIAL",
  "NO_CARD_TRIAL",
  "FREEMIUM",
  "FREE_FIRST_USE",
  "FREE_FIRST_TRANSACTION",
  "FREE_FIRST_DEAL",
  "PAID_PILOT",
  "FREE_PILOT",
  "DISCOUNTED_FIRST_PURCHASE",
  "EARLY_ADOPTER",
  "ANNUAL_DISCOUNT",
  "MONTHLY_SUBSCRIPTION",
  "ANNUAL_SUBSCRIPTION",
  "USAGE_BASED",
  "PER_SEAT",
  "PER_TRANSACTION",
  "CREDIT_BUNDLE",
  "PRODUCT_BUNDLE",
  "MONEY_BACK_GUARANTEE",
  "DEMO_FIRST",
  "CONSULTATION_FIRST",
  "WAITLIST",
  "LIMITED_BETA",
  "REFERRAL_INCENTIVE",
  "COUPON",
  "OTHER",
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const VENTURE_ARCHETYPES = [
  "SAAS",
  "WEB_UTILITY",
  "CALCULATOR",
  "ECOMMERCE",
  "MERCH",
  "CREATOR",
  "YOUTUBE_MEDIA",
  "NEWSLETTER",
  "AFFILIATE_CONTENT",
  "DIGITAL_PRODUCT",
  "MARKETPLACE",
  "LEAD_GEN",
  "SERVICE",
  "SUBSCRIPTION",
  "TRANSACTIONAL_TOOL",
] as const;
export type VentureArchetype = (typeof VENTURE_ARCHETYPES)[number];

export const OFFER_STATUSES = [
  "DRAFT",
  "ANALYSIS_ONLY",
  "LIVE_PROJECTION",
  "NEEDS_RESEARCH",
  "DEFERRED",
  "REJECTED",
  "TEST_CANDIDATE",
  "ACTIVATED",
  "SUPERSEDED",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_DECISIONS = ["ACTIVATE", "TEST", "DEFER", "REJECT", "NEEDS_RESEARCH"] as const;
export type OfferDecision = (typeof OFFER_DECISIONS)[number];

export const TIME_TO_VALUE_TYPES = [
  "TIME_BASED",
  "EVENT_BASED",
  "TRANSACTION_BASED",
  "USAGE_BASED",
  "OUTCOME_BASED",
  "SERVICE_BASED",
] as const;
export type TimeToValueType = (typeof TIME_TO_VALUE_TYPES)[number];

export const FRICTION_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type FrictionLevel = (typeof FRICTION_LEVELS)[number];

export const UNKNOWN = "UNKNOWN" as const;
export const NOT_APPLICABLE = "NOT_APPLICABLE" as const;

export type OfferUnknown = typeof UNKNOWN | typeof NOT_APPLICABLE;

export type NamedOfferGate = {
  gate: string;
  result: "PASS" | "FAIL" | "N/A";
  reasons: string[];
};

export type BinaryOfferGateResult = "PASS" | "FAIL";

/** HQ commercial fields are binary. N/A cannot prove PASS. */
export function binaryOfferResult(result: NamedOfferGate["result"]): BinaryOfferGateResult {
  return result === "PASS" ? "PASS" : "FAIL";
}

export type TrialPolicy = {
  enabled: boolean;
  kind: "NONE" | "FREE_TRIAL" | "CARD_REQUIRED_TRIAL" | "NO_CARD_TRIAL" | typeof NOT_APPLICABLE;
  duration: string;
  post_trial_price: string;
  billing_date: string;
  billing_frequency: string;
  cancellation_path: string;
  explicit_customer_authorization: boolean | typeof UNKNOWN | typeof NOT_APPLICABLE;
  auto_convert: boolean;
};

export type PolicyField = string | typeof UNKNOWN | typeof NOT_APPLICABLE;

export type OfferArchitectureContract = {
  contract: typeof OFFER_ARCHITECTURE_CONTRACT;
  venture_id: string;
  offer_id: string;
  offer_version: number;
  offer_name: string;
  offer_type: OfferType;
  target_segment: string;
  primary_product: string;
  pricing_model: string;
  price: ClassifiedValue;
  billing_frequency: PolicyField;
  trial_policy: TrialPolicy;
  pilot_policy: PolicyField;
  discount_policy: PolicyField;
  guarantee_policy: PolicyField;
  freemium_policy: PolicyField;
  first_use_incentive: PolicyField;
  bundle_configuration: PolicyField;
  seat_configuration: PolicyField;
  usage_configuration: PolicyField;
  conversion_path: string;
  fulfillment_requirements: string;
  payment_requirements: string;
  capital_requirements: string;
  expected_conversion_effect: ClassifiedValue;
  expected_margin_effect: ClassifiedValue;
  expected_support_cost_effect: ClassifiedValue;
  abuse_risk: FrictionLevel | typeof UNKNOWN;
  refund_risk: FrictionLevel | typeof UNKNOWN;
  time_to_value: TimeToValueType | typeof UNKNOWN;
  purchase_friction: FrictionLevel;
  evidence_basis: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  supersedes_offer_id: string | null;
  monetization_plan_id: string | null;
  commercialization_economics_id: string | null;
  experiment_id: string | null;
  activation: "NOT_ACTIVATED" | "LIVE_PROJECTION" | "ACTIVATED";
};

export type OfferExperimentContract = {
  contract: typeof OFFER_EXPERIMENT_CONTRACT;
  experiment_schema: "market_validation_experiment_v1" | "growth_experiment_v1";
  experiment_id: string;
  venture_id: string;
  offer_variants: string[];
  hypothesis: string;
  primary_metric: string;
  secondary_metrics: string[];
  guardrails: string[];
  sample_requirement: string;
  allocation: string;
  start_time: string | typeof UNKNOWN;
  end_condition: string;
  status: "DRAFT" | "READY" | "RUNNING" | "COMPLETED" | "BLOCKED";
  results: string | typeof UNKNOWN;
  decision: OfferDecision | typeof UNKNOWN;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
};

export type OfferFeedbackSignal = {
  category:
    | "too_expensive"
    | "need_trial"
    | "want_monthly_option"
    | "want_demo"
    | "pricing_confusing"
    | "unwilling_to_enter_card"
    | "need_lower_risk_first_use"
    | "prefer_one_time_purchase"
    | "want_team_pricing"
    | "want_pilot"
    | "other";
  real_count: number;
  synthetic_count: number;
  evidence_ids: string[];
  automatic_price_change: false;
  automatic_economics_bypass: false;
};

export type OfferArchitectureHqView = {
  venture_id: string;
  pricing_architecture: string;
  purchase_model: string;
  promotional_offer: string;
  promotional_offer_status: "NONE" | "NOT_ACTIVE" | "ACTIVE" | "TESTING";
  offer_optimization: "PASS" | "PENDING" | "BLOCKED" | "NEEDS_RESEARCH";
  conversion_ux: "PASS" | "FAIL";
  above_fold_cta: "PASS" | "FAIL";
  panel_spacing: "PASS" | "FAIL";
  card_required: "NO" | "YES" | typeof UNKNOWN;
  auto_convert: "NO" | "YES" | typeof UNKNOWN;
  pricing_content_depth: "PASS" | "FAIL";
  page: string;
  information_depth: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  question_coverage: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  product_understanding: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  buyer_decision_support: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  information_gain: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  thinness: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  missing_material_questions: number;
  page_depth_total: number;
  page_depth_passed: number;
  page_depth_failed: number;
  page_depth_thin: number;
  page_depth_unverified: number;
  page_depth_summary: string;
  page_depth_thin_pages: string;
  page_depth_missing_questions: string;
  page_depth_rows: Array<{
    route: string;
    page_type: string;
    depth_class: string;
    question_coverage: string;
    product_understanding: string;
    buyer_decision_support: string;
    information_gain: string;
    thinness: string;
    visual_quality: string;
    status: string;
  }>;
  whitespace: "PASS" | "FAIL";
  current_offer: string;
  offer_type: OfferType | typeof UNKNOWN;
  offer_status: OfferStatus | typeof UNKNOWN;
  price: string;
  billing: string;
  trial_pilot: string;
  purchase_friction: FrictionLevel | typeof UNKNOWN;
  time_to_value: TimeToValueType | typeof UNKNOWN;
  primary_cta: string;
  offer_exposure: string;
  offer_starts: string;
  meaningful_uses: string;
  checkout_starts: string;
  paid_conversions: string;
  conversion_rate: string;
  offer_cost: string;
  contribution_impact: string;
  evidence_sufficiency: string;
  experiment_status: string;
  offer_confidence: string;
  expected_conversion_impact: string;
  margin_impact: string;
  support_cost_impact: string;
  abuse_risk: string;
  current_experiment: string;
  winning_variant: string;
  evidence: string[];
  customer_suggestion_signals: string;
  last_updated: string;
  history: Array<{ offer_id: string; version: number; status: OfferStatus; offer_name: string }>;
};

export type OfferArchitectureState = {
  offers: OfferArchitectureContract[];
  experiments: OfferExperimentContract[];
};
