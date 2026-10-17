/** Gelato Gildan 5000 white DTG template variants (from template geometry probe). */
export const CLUB_THROTTLE_GELATO_WHITE_TEMPLATE_VARIANT_IDS = {
  S: "221cc2e8-c511-40ff-a81a-94c7d66ca644",
  M: "1217f0b5-30d9-416f-83c2-bb83e19ae66a",
  L: "86a1efa7-38e1-4906-8130-dc2700a58278",
  XL: "686ddb41-9e25-45cd-8457-ad3f269957de",
  "2XL": "d8b20f1e-d5c8-425f-b4fe-dc9a217cd231",
} as const;

/** Gelato catalog productUid per white size (Gildan 5000 template geometry probe). */
export const CLUB_THROTTLE_GELATO_WHITE_CATALOG_PRODUCT_UID_BY_SIZE = {
  S: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_s_gco_white_gpr_4-4_gildan_5000",
  M: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_m_gco_white_gpr_4-4_gildan_5000",
  L: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_l_gco_white_gpr_4-4_gildan_5000",
  XL: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_xl_gco_white_gpr_4-4_gildan_5000",
  "2XL": "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_2xl_gco_white_gpr_4-4_gildan_5000",
} as const;

export const CLUB_THROTTLE_LAUNCH_SIZE_PROFILE = {
  /** Common launch sizes supported on Gildan 5000 white template. */
  checkout_sizes: ["S", "M", "L", "XL", "2XL"] as const,
  /** Available on template but not auto-exposed at launch. */
  extended_sizes_report_only: ["3XL", "4XL", "5XL"] as const,
  color: "white" as const,
} as const;

export type ClubThrottleLaunchSize = (typeof CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes)[number];
