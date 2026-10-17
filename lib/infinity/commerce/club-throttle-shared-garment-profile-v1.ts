/** Shared verified garment facts — identical across Club Throttle seven-shirt PDPs. */
export const CLUB_THROTTLE_SHARED_GARMENT_PROFILE_ID = "gildan-5000-heavy-cotton-back-dtg-v1" as const;

export const CLUB_THROTTLE_SHARED_GARMENT_FACTS = {
  garment_profile_id: CLUB_THROTTLE_SHARED_GARMENT_PROFILE_ID,
  name: "Gildan 5000 Heavy Cotton tee",
  product_type: "Unisex short-sleeve t-shirt",
  materials: "100% cotton",
  fabric_weight: "5.4 oz/yd² (183 g/m²)",
  construction: "Classic fit. Taped neck and shoulders. Tear-away label.",
  fit: "Classic unisex — standard heavy cotton drape, not slim.",
  neckline: "Crew neck",
  sleeve: "Short sleeve",
  print_method: "Direct-to-garment (DTG) on the back — fulfilled via Club Throttle print partner",
  default_sizes: "S, M, L, XL, 2XL",
  care: "Wash inside out in cold water. Tumble dry low. Do not iron directly on the print. Do not dry clean.",
  evidence_sources: [
    "gildan-5000-public-spec",
    "club-throttle-size-chart-v1",
    "gelato-dtg-fulfillment-mapping",
  ],
} as const;
