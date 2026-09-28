export const COMMERCE_PRODUCT_LIFECYCLE = [
  "IDEA",
  "DESIGNING",
  "DESIGN_READY",
  "PROVIDER_VALIDATED",
  "MOCKUP_READY",
  "PRICED",
  "QC_PASSED",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "TESTING",
  "EMERGING_WINNER",
  "WINNER",
  "STABLE",
  "UNDERPERFORMING",
  "REFRESH_CANDIDATE",
  "RETIRE_CANDIDATE",
  "SEASONAL",
  "PAUSED",
  "RETIRED",
] as const;
export type CommerceProductLifecycle = (typeof COMMERCE_PRODUCT_LIFECYCLE)[number];

export const DESIGN_SUGGESTION_STATUSES = [
  "RECEIVED",
  "DUPLICATE",
  "UNDER_REVIEW",
  "BLOCK_IP_REVIEW",
  "CREATIVE_BRIEF_READY",
  "DESIGNING",
  "QC",
  "APPROVED",
  "PRODUCT_CREATED",
  "PUBLISHED",
  "REJECTED",
] as const;
export type DesignSuggestionStatus = (typeof DESIGN_SUGGESTION_STATUSES)[number];

export type CommerceStore = {
  store_id: string;
  venture_id: string;
  canonical_domain: string;
  storefront: "INFINITY_FIRST_PARTY";
  live_paid_orders: false;
};

export type CommerceProduct = {
  product_id: string;
  venture_id: string;
  store_id: string;
  title: string;
  slug: string;
  description: string;
  design_story: string;
  lifecycle: CommerceProductLifecycle;
  design_family_id: string | null;
  published: boolean;
};

export type CommerceVariant = {
  variant_id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  available: boolean;
};

export type ProviderProductMapping = {
  mapping_id: string;
  product_id: string;
  provider: "GELATO";
  provider_product_uid: string;
};

export type ProviderVariantMapping = {
  mapping_id: string;
  variant_id: string;
  provider: "GELATO";
  provider_variant_uid: string;
};

export type CommercePricingSnapshot = {
  snapshot_id: string;
  product_id: string;
  retail_usd: number;
  provider_base_cost_usd: number | null;
  print_cost_usd: number | null;
  shipping_usd: number | null;
  payment_fee_usd: number | null;
  refund_allowance_usd: number | null;
  gross_profit_usd: number | null;
  contribution_margin: number | null;
  quoted_at: string;
  provider_mapping_id: string | null;
  environment: "SANDBOX";
};

export type ProductEconomicsDecision = "PASS" | "BLOCK_MARGIN" | "BLOCK_COST_DRIFT";

export type DesignSuggestion = {
  id: string;
  venture_id: string;
  submitted_at: string;
  suggestion_text: string;
  submitter_name: string | null;
  submitter_email: string | null;
  product_preference: string | null;
  color_preference: string | null;
  notification_consent: boolean;
  source: "STOREFRONT";
  status: DesignSuggestionStatus;
  linked_product_opportunity_id: string | null;
  linked_design_family_id: string | null;
  linked_commerce_product_id: string | null;
  is_authorization_to_publish: false;
};

export type PodCommerceFinancialControls = {
  max_provider_cost_per_order_usd: number | null;
  max_units_per_order: number;
  daily_pod_spend_usd: number | null;
  cost_drift_threshold: number;
  minimum_contribution_margin: number;
  global_commerce_kill_switch: boolean;
  venture_commerce_kill_switch: boolean;
  provider_kill_switch: boolean;
  first_live_order_founder_authorization: false;
  live_paid_orders: false;
};

export const CLUB_THROTTLE_PRODUCT_VELOCITY = {
  concepts_per_day: { min: 10, max: 20 },
  qc_per_day: { min: 6, max: 12 },
  published_per_day: { min: 5, max: 10 },
  initial_catalog: { min: 30, max: 60 },
  forced_quota: false,
} as const;
