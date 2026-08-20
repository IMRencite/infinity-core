import { describe, expect, it } from "vitest";
import { MockFinancialProvider } from "../providers/mock-provider";
import { composeTreasuryState } from "../state/compose";
import { TreasuryStore } from "../store";
import { cacheBalanceSnapshot, syncFinancialProvider } from "../sync/provider-sync";
import { actualAmount } from "../types";
import { ORG_A } from "./fixtures";

describe("treasury-provider-sync", () => {
  it("syncs mock provider accounts, balances, transactions, and commitments idempotently", async () => {
    const store = new TreasuryStore();
    const provider = new MockFinancialProvider({
      transactions: [
        {
          providerTransactionId: "txn-1",
          accountId: "mock-acct-operating",
          amount: actualAmount(12),
          classification: "EXPENSE",
          merchant: "Namecheap",
          description: "domain",
          occurredAt: "2026-08-18T00:00:00.000Z",
          status: "POSTED",
        },
      ],
      commitments: [
        {
          commitmentId: "sub-1",
          vendor: "Vercel",
          amount: actualAmount(20),
          frequency: "MONTHLY",
          nextExpectedCharge: "2026-09-01T00:00:00.000Z",
          status: "ACTIVE",
        },
      ],
    });
    const first = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    const second = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(first.accountsUpserted).toBeGreaterThan(0);
    expect(first.transactionsIngested).toBe(1);
    expect(second.transactionsDuplicate).toBe(1);
    expect(store.transactions.size).toBe(1);
  });

  it("labels cached balance STALE/DEGRADED when provider is unavailable", async () => {
    const store = new TreasuryStore();
    cacheBalanceSnapshot(store, { organizationId: ORG_A, accountId: "mock-acct-operating", currentUsd: 92_500 });
    const provider = new MockFinancialProvider();
    provider.setAvailable(false);
    const sync = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(sync.freshness).toBe("UNAVAILABLE");
    const state = composeTreasuryState(store, {
      organizationId: ORG_A,
      freshnessOverride: "UNAVAILABLE",
      providerAccountId: "mock-acct-operating",
    });
    expect(state.totalCash.value).toBe(92_500);
    expect(state.totalCash.actuality).not.toBe("ACTUAL");
    expect(state.providerFreshness).toBe("UNAVAILABLE");
  });

  it("read-only sync remains allowed while autonomy is disabled", async () => {
    const store = new TreasuryStore();
    expect(store.controlFor(ORG_A).financialAutonomyEnabled).toBe(false);
    const provider = new MockFinancialProvider();
    const sync = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(sync.freshness).toBe("FRESH");
    expect(sync.degraded).toBe(false);
  });
});
