import type { StripeBalanceTxn, StripePayoutRecord } from "./types";

const INFINITY_MARK = /occupancynpv|infinity_offer|infinity_venture|infinity hq/i;
const FOREIGN_MARK = /sell more live more/i;

export function isInfinityAttributedStripeTxn(txn: StripeBalanceTxn): boolean {
  if (FOREIGN_MARK.test(txn.description ?? "")) return false;
  return INFINITY_MARK.test(`${txn.description ?? ""} ${txn.source ?? ""}`);
}

export function isStripePayoutTxn(txn: StripeBalanceTxn): boolean {
  return txn.type === "payout" || txn.reporting_category === "payout";
}

export function infinityAttributedPayouts(
  payouts: StripePayoutRecord[],
  txns: StripeBalanceTxn[],
): StripePayoutRecord[] {
  const attributedPayoutIds = new Set(
    txns
      .filter((row) => isInfinityAttributedStripeTxn(row) && (isStripePayoutTxn(row) || Boolean(row.payout_id)))
      .map((row) => (isStripePayoutTxn(row) ? row.source ?? row.payout_id : row.payout_id))
      .filter((id): id is string => Boolean(id)),
  );
  if (attributedPayoutIds.size === 0) return [];
  return payouts.filter((payout) => attributedPayoutIds.has(payout.safe_id));
}
