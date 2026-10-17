export const GELATO_PROVIDER_CAPABILITY = {
  provider: "GELATO" as const,
  headless_fulfillment: true,
  provider_store_required: false,
  catalog_api: true,
  direct_order_api: true,
  mockup_api: "UNSUPPORTED" as const,
  standalone_mockup_endpoint: "NOT_FOUND" as const,
  template_based_product_visualization: "SUPPORTED" as const,
  webhooks: "UNSUPPORTED" as const,
  live_paid_orders: false,
};
