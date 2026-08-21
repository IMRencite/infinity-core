import type { MarketplaceMoneyFlow } from "./types";

export type MarketplaceSettlementInput = {
  gmvUsd: number;
  takeRatePercent: number;
  processorFeeUsd?: number;
  refundAmountUsd?: number;
  disputeAmountUsd?: number;
};

export function allocateMarketplaceSettlement(input: MarketplaceSettlementInput): MarketplaceMoneyFlow {
  const gmvUsd = Number(input.gmvUsd) || 0;
  const takeRatePercent = Number(input.takeRatePercent) || 0;
  const processorFeeUsd = Math.max(0, Number(input.processorFeeUsd) || 0);
  const refundAmountUsd = Math.max(0, Number(input.refundAmountUsd) || 0);
  const disputeAmountUsd = Math.max(0, Number(input.disputeAmountUsd) || 0);
  const netGmv = Math.max(0, gmvUsd - refundAmountUsd - disputeAmountUsd);
  const platformRevenueUsd = Number(((netGmv * takeRatePercent) / 100).toFixed(2));
  const sellerEarningsUsd = Number((netGmv - platformRevenueUsd - processorFeeUsd).toFixed(2));
  return {
    gmvUsd,
    platformRevenueUsd,
    sellerEarningsUsd: Math.max(0, sellerEarningsUsd),
    processorFeeUsd,
    refundAmountUsd,
    disputeAmountUsd,
    payoutStatus: "NOT_STARTED",
  };
}
