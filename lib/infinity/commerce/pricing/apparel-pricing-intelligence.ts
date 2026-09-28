export const APPAREL_PRICING_INTELLIGENCE = "ApparelPricingIntelligence" as const;

export type ApparelPriceRecommendation = {
  garment: "tee" | "hoodie";
  provider_base_cost_usd: number | null;
  printing_cost_usd: number | null;
  fulfillment_cost_usd: number | null;
  payment_fee_usd: number | null;
  target_margin: number;
  market_low: number | null;
  market_median: number | null;
  market_upper: number | null;
  recommended_retail_usd: number | null;
  rationale: string;
  arbitrary_42_48_trusted: false;
  fake_discount: false;
  evidence: "RECORDED" | "MISSING";
};

export const COMPARABLE_TEE_BAND = { low: 28, median: 38, upper: 55, source: "pending_dataforseo_refresh" } as const;
export const COMPARABLE_HOODIE_BAND = { low: 48, median: 68, upper: 95, source: "pending_dataforseo_refresh" } as const;

export function recommendApparelPrice(input: {
  garment: "tee" | "hoodie";
  provider_base_cost_usd?: number | null;
  competitive?: { low: number; median: number; upper: number };
}): ApparelPriceRecommendation {
  const band = input.competitive ?? (input.garment === "tee" ? COMPARABLE_TEE_BAND : COMPARABLE_HOODIE_BAND);
  const provider = input.provider_base_cost_usd ?? null;
  const printing = provider == null ? null : 4.5;
  const fulfillment = provider == null ? null : 5.5;
  const landed = provider == null || printing == null || fulfillment == null ? null : provider + printing + fulfillment;
  const payment = landed == null ? null : Number((landed * 0.032 + 0.3).toFixed(2));
  const target_margin = 0.42;
  const floor = landed == null || payment == null ? null : Number(((landed + payment) / (1 - target_margin)).toFixed(2));
  const recommended = floor == null ? null : Number(Math.max(floor, band.median).toFixed(2));
  return {
    garment: input.garment,
    provider_base_cost_usd: provider,
    printing_cost_usd: printing,
    fulfillment_cost_usd: fulfillment,
    payment_fee_usd: payment,
    target_margin,
    market_low: band.low,
    market_median: band.median,
    market_upper: band.upper,
    recommended_retail_usd: recommended,
    rationale: provider == null
      ? "Provider cost unproven. Do not trust displayed $42/$48. Competitive band recorded pending DataForSEO refresh."
      : "Retail is max(economic floor at 42% contribution, market median). No invented discount.",
    arbitrary_42_48_trusted: false,
    fake_discount: false,
    evidence: provider == null ? "MISSING" : "RECORDED",
  };
}

export function evaluateArbitraryPrice(price: number): { result: "FAIL" | "PASS"; reasons: string[] } {
  if (price === 42 || price === 48) return { result: "FAIL", reasons: ["static_arbitrary_price_without_economics"] };
  return { result: "PASS", reasons: [] };
}
