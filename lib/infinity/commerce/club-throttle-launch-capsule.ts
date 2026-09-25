export type LaunchCapsuleProduct = {
  venture_id: "club-throttle";
  product_id: string;
  title: string;
  collection: string;
  opportunity_id: string | null;
  garment_family: "heavyweight-tee";
  fit: "classic unisex";
  base_color: "black";
  sizes: string[];
  front_print: "SMALL_FRONT";
  back_print: "LARGE_BACK";
  creative_status: "BRIEFED" | "GEOMETRY_BLOCKED";
  commercial_qc_status: "FAIL_GEOMETRY" | "PENDING";
  template_status: "PROVIDER_PENDING";
  provider_product_id: null;
  provider_preview: null;
  state: "PLANNED" | "PROVIDER_PENDING";
  public_availability: "NOT_AVAILABLE";
  modeled_cost: null;
  retail_price: number;
  margin: null;
};

export function clubThrottleLaunchCapsule(): LaunchCapsuleProduct[] {
  const sizes = ["S", "M", "L", "XL", "2XL"];
  return [
    { product_id: "cprod_ct_after_dark_tee_v1", title: "After Dark heavyweight tee", collection: "after-dark", opportunity_id: "pop:club-throttle:after-dark-heavyweight-v1" },
    { product_id: "cprod_ct_vintage_racing_tee_v1", title: "Vintage racing abstract tee", collection: "redline", opportunity_id: "pop:club-throttle:vintage-racing-abstract-v1" },
    { product_id: "cprod_ct_throttle_core_tee_v1", title: "Throttle Core mark tee", collection: "throttle-core", opportunity_id: null },
    { product_id: "cprod_ct_garage_hour_tee_v1", title: "Garage hour tee", collection: "garage-culture", opportunity_id: null },
    { product_id: "cprod_ct_open_road_tee_v1", title: "Open road tee", collection: "open-road", opportunity_id: null },
    { product_id: "cprod_ct_bike_night_tee_v1", title: "Bike-night tee", collection: "throttle-core", opportunity_id: null },
  ].map((row) => ({
    venture_id: "club-throttle",
    ...row,
    garment_family: "heavyweight-tee",
    fit: "classic unisex",
    base_color: "black",
    sizes,
    front_print: "SMALL_FRONT",
    back_print: "LARGE_BACK",
    creative_status: "GEOMETRY_BLOCKED",
    commercial_qc_status: "FAIL_GEOMETRY",
    template_status: "PROVIDER_PENDING",
    provider_product_id: null,
    provider_preview: null,
    state: "PLANNED",
    public_availability: "NOT_AVAILABLE",
    modeled_cost: null,
    retail_price: 48,
    margin: null,
  }));
}
