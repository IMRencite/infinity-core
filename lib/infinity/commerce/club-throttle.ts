import type { CommercialOfferContract, FulfillmentContract } from "@/lib/infinity/fulfillment/types";
import { assembleClubThrottleOperatingBundle } from "@/lib/infinity/autonomous-venture-operations/assemble";
import type { CommerceStore, PodCommerceFinancialControls } from "./types";

export const CLUB_THROTTLE_VENTURE_ID = "club-throttle";
export const CLUB_THROTTLE_CANONICAL_ORIGIN = "https://clubthrottle.com";

export function clubThrottleCommerceStore(): CommerceStore {
  return {
    store_id: "cstore_club_throttle_v1",
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    canonical_domain: "clubthrottle.com",
    storefront: "INFINITY_FIRST_PARTY",
    live_paid_orders: false,
  };
}

export function clubThrottlePodOffer(): CommercialOfferContract {
  return {
    offer_id: "POD_APPAREL",
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    canonical_name: "Club Throttle apparel",
    offer_version: "1",
    billing_model: "ONE_TIME",
    price_binding: { amount: 0, currency: "usd", price_id: "UNCONFIGURED", product_id: "UNCONFIGURED" },
    customer_promise: "Original Club Throttle apparel printed on demand and shipped to the address on the order.",
    fulfillment_contract_id: "ffc_club_throttle_pod_v1",
    entitlement_definition: "One physical print-on-demand order after verified payment. Payment confirmation is not shipment.",
    fulfillment_trigger: "PAYMENT_CONFIRMED",
    delivery_type: "PHYSICAL_GOOD",
    completion_criteria: "Provider reports shipped or delivered and Infinity reconciles the fulfillment order.",
    customer_access_policy: "Shipment tracking after fulfillment starts. Email is not authorization.",
    failure_policy: "CUSTOMER_SUPPORT_REQUIRED",
    cancellation_policy: "Cancellable only before provider production starts.",
    refund_policy_reference: "club_throttle_returns_v1",
    status: "DRAFT",
    evidence: ["gelato_sandbox_adapter", "club_throttle_operating_bundle"],
    traceability: "club_throttle_pod_v1",
  };
}

export function clubThrottlePodFulfillmentContract(): FulfillmentContract {
  return {
    contract_id: "ffc_club_throttle_pod_v1",
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    offer_id: "POD_APPAREL",
    fulfillment_type: "PHYSICAL_GOOD",
    trigger: "PAYMENT_CONFIRMED",
    required_inputs: ["shipping_address", "variant_id", "artwork_id"],
    entitlement_type: "PHYSICAL_GOOD_ORDER",
    quantity_or_scope: "order_line_items",
    delivery_executor: "GELATO",
    delivery_destination: "customer_shipping_address",
    customer_access_method: "shipment_tracking",
    completion_condition: "provider_reports_shipped_or_delivered",
    verification_method: "provider_order_reconciliation",
    retry_policy: "AUTOMATIC_RETRY_THEN_SUPPORT",
    failure_policy: "CUSTOMER_SUPPORT_REQUIRED",
    revocation_policy: "NONE_AFTER_PRODUCTION",
    expiration_policy: "NONE",
    support_path: "canonical_communication_support",
    version: "1",
    status: "DRAFT",
    evidence: ["gelato_sandbox_adapter"],
  };
}

export function clubThrottleFinancialControls(): PodCommerceFinancialControls {
  return {
    max_provider_cost_per_order_usd: null,
    max_units_per_order: 5,
    daily_pod_spend_usd: null,
    cost_drift_threshold: 0.15,
    minimum_contribution_margin: 0.35,
    global_commerce_kill_switch: true,
    venture_commerce_kill_switch: true,
    provider_kill_switch: true,
    first_live_order_founder_authorization: false,
    live_paid_orders: false,
  };
}

export function clubThrottleStorefrontRoutes(): Array<{ path: string; canonical: string }> {
  const paths = [
    "/",
    "/shop",
    "/collections",
    "/products",
    "/journal",
    "/blog",
    "/suggest-a-design",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/sitemap",
  ];
  return paths.map((path) => ({
    path,
    canonical: path === "/" ? `${CLUB_THROTTLE_CANONICAL_ORIGIN}/` : `${CLUB_THROTTLE_CANONICAL_ORIGIN}${path}/`,
  }));
}

export function clubThrottleOperatingTruth() {
  const bundle = assembleClubThrottleOperatingBundle();
  return {
    bundle,
    store: clubThrottleCommerceStore(),
    offer: clubThrottlePodOffer(),
    fulfillment: clubThrottlePodFulfillmentContract(),
    financial_controls: clubThrottleFinancialControls(),
    live_paid_orders: false as const,
  };
}
