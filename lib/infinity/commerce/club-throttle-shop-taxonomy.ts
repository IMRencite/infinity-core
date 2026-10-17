import type { ClubThrottleLaunchSize } from "./club-throttle-launch-size-profile.ts";

export type ClubThrottleShopCategorySlug =
  | "all-tees"
  | "sport-track"
  | "adventure-dualsport"
  | "garage-culture"
  | "street-night"
  | "bagger-cruiser";

export type ClubThrottleShopCategory = {
  slug: ClubThrottleShopCategorySlug;
  name: string;
  nav_label: string;
  headline: string;
  blurb: string;
  skus: string[];
  riding_style: string;
  search_keywords: string[];
};

export const CLUB_THROTTLE_SHOP_CATEGORIES: ClubThrottleShopCategory[] = [
  {
    slug: "all-tees",
    name: "All Tees",
    nav_label: "All Tees",
    headline: "Club Throttle Originals",
    blurb: "Seven founder-approved back prints on white Gildan 5000 heavyweight cotton.",
    skus: ["LOT_LINE", "CLEAN_RPM", "DUALSPORT_DUST", "KNEE_DOWN", "ZERO_CHILL_GARAGE", "APEX_LINE", "BAGGER_SEND"],
    riding_style: "all",
    search_keywords: ["tee", "shirt", "apparel", "original"],
  },
  {
    slug: "sport-track",
    name: "Sport & Track",
    nav_label: "Sport & Track",
    headline: "Sport & Track",
    blurb: "Lean-in line work and sportbike illustration for the redline hour.",
    skus: ["KNEE_DOWN", "APEX_LINE"],
    riding_style: "sport",
    search_keywords: ["sportbike", "track", "racing", "knee down", "apex", "sport"],
  },
  {
    slug: "adventure-dualsport",
    name: "Adventure & Dualsport",
    nav_label: "Adventure",
    headline: "Adventure & Dualsport",
    blurb: "Dust, gravel, and the line where pavement ends.",
    skus: ["DUALSPORT_DUST"],
    riding_style: "adventure",
    search_keywords: ["dual sport", "dualsport", "adventure", "gravel", "trail"],
  },
  {
    slug: "garage-culture",
    name: "Garage & Culture",
    nav_label: "Garage",
    headline: "Garage & Culture",
    blurb: "Phrase-first marks for the crew that treats the garage like church.",
    skus: ["CLEAN_RPM", "ZERO_CHILL_GARAGE"],
    riding_style: "garage",
    search_keywords: ["garage", "culture", "typography", "rpm", "zero chill"],
  },
  {
    slug: "street-night",
    name: "Street & Night",
    nav_label: "Street & Night",
    headline: "Street & Night",
    blurb: "Wet asphalt, amber light, and the ride home.",
    skus: ["LOT_LINE"],
    riding_style: "street",
    search_keywords: ["night", "street", "lot", "after dark", "city"],
  },
  {
    slug: "bagger-cruiser",
    name: "Bagger & Cruiser",
    nav_label: "Bagger & Cruiser",
    headline: "Bagger & Cruiser",
    blurb: "Long-roll cruiser energy without the cliché poster.",
    skus: ["BAGGER_SEND"],
    riding_style: "cruiser",
    search_keywords: ["bagger", "cruiser", "touring", "send"],
  },
];

export const CLUB_THROTTLE_LAUNCH_GARMENT = {
  color: "White" as const,
  color_slug: "white" as const,
  name: "Gildan 5000 Heavy Cotton",
  summary: "Gildan 5000 Heavy Cotton · White",
  sizes: ["S", "M", "L", "XL", "2XL"] as ClubThrottleLaunchSize[],
  size_range_label: "S–2XL",
} as const;

export function shopCategoryBySlug(slug: string): ClubThrottleShopCategory | null {
  return CLUB_THROTTLE_SHOP_CATEGORIES.find((row) => row.slug === slug) ?? null;
}

export function categoriesForSku(sku: string): ClubThrottleShopCategory[] {
  return CLUB_THROTTLE_SHOP_CATEGORIES.filter((row) => row.slug !== "all-tees" && row.skus.includes(sku));
}
