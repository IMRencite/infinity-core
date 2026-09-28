export const COMMERCE_DENSITY_GATE = "CommerceDensityGate" as const;
export const COMMERCE_DENSITY_CONTRACT = "commerce-density-v1" as const;

export const CLUB_THROTTLE_GIANT_CARDS_KNOWN_BAD = {
  id: "FOUNDER_CT_GIANT_PRODUCT_CARDS_2026-09-26",
  viewport_width: 1920,
  visible_cards: 2,
  card_width_ratio: 0.48,
  source: "founder_live_screenshot",
} as const;

export function commerceProductGridCss(): string {
  return `
.tiles,.grid,.releases{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;justify-content:start;width:100%;--commerce-density:${COMMERCE_DENSITY_CONTRACT}}
.card,.tile,.release-card{max-width:18rem}
.card .pad h2,.release-card .pad h2{font-size:1.05rem;margin:.35rem 0}
.card .pad p,.release-card .pad p{margin:.2rem 0}
@media(max-width:1440px){.tiles,.grid,.releases{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1024px){.tiles,.grid,.releases{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.tiles,.grid,.releases{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.tiles,.grid,.releases{grid-template-columns:1fr}}
`;
}

export function evaluateCommerceDensity(input: {
  viewport_width: number;
  column_count: number;
  card_width_px: number;
  visible_cards: number;
  product_image_height_px?: number;
}): { gate: typeof COMMERCE_DENSITY_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.viewport_width >= 1440 && input.column_count < 3) reasons.push("desktop_columns_too_few");
  if (input.viewport_width >= 1440 && input.card_width_px / input.viewport_width > 0.34) reasons.push("card_too_wide_for_retail_density");
  if (input.viewport_width >= 1440 && input.visible_cards < 3) reasons.push("too_few_products_visible");
  if (input.viewport_width === 1920 && input.visible_cards <= 2 && input.card_width_px / input.viewport_width >= 0.4) {
    reasons.push("known_bad_two_giant_panels");
  }
  if ((input.product_image_height_px ?? 0) > input.viewport_width * 0.35) reasons.push("product_image_fills_viewport");
  return { gate: COMMERCE_DENSITY_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateKnownBadGiantProductCards(): { gate: typeof COMMERCE_DENSITY_GATE; result: "FAIL"; reasons: string[] } {
  return evaluateCommerceDensity({
    viewport_width: CLUB_THROTTLE_GIANT_CARDS_KNOWN_BAD.viewport_width,
    column_count: 2,
    card_width_px: 1920 * CLUB_THROTTLE_GIANT_CARDS_KNOWN_BAD.card_width_ratio,
    visible_cards: 2,
    product_image_height_px: 900,
  }) as { gate: typeof COMMERCE_DENSITY_GATE; result: "FAIL"; reasons: string[] };
}
