import type { MarketplaceMoneyFlow } from "./types";

export type MarketplaceTreasurySemantics = {
  platformRevenueUsd: number;
  processorFeesUsd: number;
  sellerLiabilitiesUsd: number;
  refundReserveUsd: number;
  disputeReserveUsd: number;
  payoutObligationsUsd: number;
  externalBankMovementAuthorized: false;
};

export function marketplaceTreasurySemantics(flow: MarketplaceMoneyFlow): MarketplaceTreasurySemantics {
  return {
    platformRevenueUsd: flow.platformRevenueUsd,
    processorFeesUsd: flow.processorFeeUsd,
    sellerLiabilitiesUsd: flow.sellerEarningsUsd,
    refundReserveUsd: flow.refundAmountUsd,
    disputeReserveUsd: flow.disputeAmountUsd,
    payoutObligationsUsd: flow.payoutStatus === "PAID" ? 0 : flow.sellerEarningsUsd,
    externalBankMovementAuthorized: false,
  };
}
