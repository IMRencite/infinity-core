import type { CommercePricingSnapshot, ProductEconomicsDecision } from "./types";

export const DEFAULT_POD_MARGIN_FLOOR = 0.35;
export const DEFAULT_COST_DRIFT_THRESHOLD = 0.15;

export function evaluateProductEconomics(input: {
  snapshot: CommercePricingSnapshot;
  minimum_contribution_margin?: number;
  prior_provider_cost_usd?: number | null;
  cost_drift_threshold?: number;
}): ProductEconomicsDecision {
  const margin = input.snapshot.contribution_margin;
  const floor = input.minimum_contribution_margin ?? DEFAULT_POD_MARGIN_FLOOR;
  if (margin == null || !Number.isFinite(margin) || margin < floor) return "BLOCK_MARGIN";
  const prior = input.prior_provider_cost_usd;
  const current = input.snapshot.provider_base_cost_usd;
  if (prior != null && current != null && prior > 0) {
    const drift = Math.abs(current - prior) / prior;
    if (drift > (input.cost_drift_threshold ?? DEFAULT_COST_DRIFT_THRESHOLD)) return "BLOCK_COST_DRIFT";
  }
  return "PASS";
}

export function snapshotContributionMargin(input: {
  retail_usd: number;
  provider_base_cost_usd: number;
  print_cost_usd?: number;
  shipping_usd?: number;
  payment_fee_usd?: number;
  refund_allowance_usd?: number;
}): { gross_profit_usd: number; contribution_margin: number } {
  const costs =
    input.provider_base_cost_usd +
    (input.print_cost_usd ?? 0) +
    (input.shipping_usd ?? 0) +
    (input.payment_fee_usd ?? 0) +
    (input.refund_allowance_usd ?? 0);
  const gross = input.retail_usd - costs;
  return {
    gross_profit_usd: Number(gross.toFixed(2)),
    contribution_margin: input.retail_usd > 0 ? Number((gross / input.retail_usd).toFixed(4)) : 0,
  };
}
