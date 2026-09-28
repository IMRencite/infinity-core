export const APPAREL_PERFORMANCE_LEARNING = "ApparelPerformanceLearning" as const;

export type ApparelPerformanceEvent = {
  impression?: number;
  pdp_view?: number;
  product_image_interaction?: number;
  color_size_interaction?: number;
  cart_add?: number;
  save?: number;
  checkout?: number;
  purchase?: number;
  return?: number;
  creative_territory: string;
  design_family: string;
  garment_type: "heavyweight tee" | "oversized hoodie";
  price_usd?: number;
};

export function weightFirstPartyOverMarket(input: {
  first_party_events: number;
  market_signals: number;
}): { first_party_weight: number; market_weight: number } {
  if (input.first_party_events <= 0) return { first_party_weight: 0, market_weight: 1 };
  const first = Math.min(0.85, 0.25 + input.first_party_events / 200);
  return { first_party_weight: first, market_weight: Number((1 - first).toFixed(2)) };
}

export function feedApparelPerformanceIntoBrief(events: ApparelPerformanceEvent[]): {
  preferred_territories: string[];
  preferred_garments: string[];
  next_brief_bias: string;
} {
  const territories = events.filter((row) => (row.purchase ?? 0) + (row.cart_add ?? 0) > 0).map((row) => row.creative_territory);
  const garments = events.filter((row) => (row.purchase ?? 0) > 0).map((row) => row.garment_type);
  return {
    preferred_territories: [...new Set(territories)],
    preferred_garments: [...new Set(garments)],
    next_brief_bias: territories.length
      ? "First-party Club Throttle behavior outweighs generic market signals."
      : "No first-party Club Throttle behavior yet. Market grammar only. Do not copy artwork.",
  };
}