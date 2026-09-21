import { describe, expect, it } from "vitest";
import { netRevenue, recordLedgerEntry, sumLedger } from "../ledger/engine";
import { recordCapitalContribution } from "../revenue/ingest";
import { TreasuryStore } from "../store";
import { actualAmount } from "../types";
import { ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-ledger", () => {
  it("records founder capital as CAPITAL_CONTRIBUTION and leaves revenue unchanged", () => {
    const store = new TreasuryStore();
    recordCapitalContribution(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 5000,
      idempotencyKey: "founder-5k",
    });
    const capital = sumLedger(store, ORG_A, "CAPITAL_CONTRIBUTION");
    const revenue = sumLedger(store, ORG_A, "REVENUE");
    expect(capital.amount.value).toBe(5000);
    expect(capital.amount.actuality).toBe("ACTUAL");
    expect(revenue.amount.actuality).toBe("UNKNOWN");
    expect([...store.ledger.values()][0]?.type).toBe("CAPITAL_CONTRIBUTION");
  });

  it("keeps gross revenue and records refund separately so net is $80", () => {
    const store = new TreasuryStore();
    recordLedgerEntry(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      type: "REVENUE",
      subtype: "GROSS_REVENUE",
      amount: actualAmount(100),
      idempotencyKey: "rev-100",
    });
    recordLedgerEntry(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      type: "REFUND",
      amount: actualAmount(20),
      idempotencyKey: "refund-20",
    });
    const gross = sumLedger(store, ORG_A, "REVENUE");
    const refunds = sumLedger(store, ORG_A, "REFUND");
    const net = netRevenue(store, ORG_A);
    expect(gross.amount.value).toBe(100);
    expect(refunds.amount.value).toBe(20);
    expect(net.value).toBe(80);
    expect(net.actuality).toBe("ACTUAL");
  });

  it("refuses to classify founder capital as revenue", () => {
    const store = new TreasuryStore();
    expect(() =>
      recordLedgerEntry(store, {
        organizationId: ORG_A,
        type: "REVENUE",
        subtype: "FOUNDER_CAPITAL",
        amount: actualAmount(1),
        idempotencyKey: "bad",
      }),
    ).toThrow(/CAPITAL_CONTRIBUTION_IS_NOT_REVENUE/);
  });
});
