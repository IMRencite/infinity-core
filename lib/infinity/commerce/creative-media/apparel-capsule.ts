import { GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID, GELATO_OVERSIZED_HOODIE_TEMPLATE_ID, GELATO_STORE_ID } from "@/lib/infinity/commercialization/providers/gelato/founder-templates";
import { afterDarkCreativeDirections, type ApparelCreativeDirection } from "./apparel-creative-director";

export type CapsuleProductStatus = "PLANNED" | "GENERATING" | "REFINING" | "APPROVED";

export type CapsuleProduct = {
  id: string;
  name: string;
  territory: string;
  garment: "heavyweight tee" | "oversized hoodie";
  template_id: typeof GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID | typeof GELATO_OVERSIZED_HOODIE_TEMPLATE_ID;
  placeholders: ["front_art", "back_art"];
  status: CapsuleProductStatus;
  directions: number;
};

export const CLUB_THROTTLE_COLLECTION_PRINCIPLES = {
  palette: "asphalt black, warm paper, throttle red, chrome, sodium gold",
  print_character: "screenprint-aware, limited ink, readable silhouette",
  typographic_relationship: "display only as a small original mark, never text-on-polygon as the product",
  brand_marks: "Club Throttle language without manufacturer or race-team marks",
} as const;

function hoodie(name: string, territory: string, id: string): CapsuleProduct {
  return {
    id,
    name,
    territory,
    garment: "oversized hoodie",
    template_id: GELATO_OVERSIZED_HOODIE_TEMPLATE_ID,
    placeholders: ["front_art", "back_art"],
    status: "PLANNED",
    directions: 3,
  };
}

function tee(name: string, territory: string, id: string, status: CapsuleProductStatus = "PLANNED"): CapsuleProduct {
  return {
    id,
    name,
    territory,
    garment: "heavyweight tee",
    template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
    placeholders: ["front_art", "back_art"],
    status,
    directions: 3,
  };
}

export function clubThrottleCapsuleProducts(): CapsuleProduct[] {
  return [
    tee("After Dark", "After Dark", "after-dark", "GENERATING"),
    tee("Redline", "Redline", "redline"),
    hoodie("Open Road", "Open Road", "open-road"),
    hoodie("Garage Culture", "Garage Culture", "garage-culture"),
    tee("Throttle Core", "Throttle Core", "throttle-core"),
    tee("Last Light", "Last Light", "last-light"),
  ];
}

export function selectGelatoTemplateForCapsule(product: CapsuleProduct) {
  return {
    store_id: GELATO_STORE_ID,
    template_id: product.template_id,
    garment: product.garment,
    placeholders: product.placeholders,
    create_product: false,
    reason: GELATO_STORE_ID === "PENDING_FOUNDER" ? "STORE_ID_PENDING_NO_CREATE" : "HIDDEN_CANARY_ONLY_WHEN_ART_APPROVED",
  };
}

export function afterDarkCanaryDirections(): ApparelCreativeDirection[] {
  return afterDarkCreativeDirections();
}
