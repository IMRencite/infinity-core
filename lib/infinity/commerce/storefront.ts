import { CLUB_THROTTLE_CANONICAL_ORIGIN, clubThrottleStorefrontRoutes } from "./club-throttle";

export type ClubThrottleDraftProduct = {
  product_id: string;
  slug: string;
  title: string;
  description: string;
  design_story: string;
  price_usd: number | null;
  sizes: string[];
  colors: string[];
  available: boolean;
  published: false;
  design_family: string;
};

export const CLUB_THROTTLE_DRAFT_CATALOG: ClubThrottleDraftProduct[] = [];

export function clubThrottleProductCanonical(slug: string): string {
  return `${CLUB_THROTTLE_CANONICAL_ORIGIN}/products/${slug}/`;
}

export function clubThrottleFoundationRoutes() {
  return clubThrottleStorefrontRoutes();
}
