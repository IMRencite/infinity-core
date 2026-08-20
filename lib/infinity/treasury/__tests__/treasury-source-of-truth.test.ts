import { describe, expect, it } from "vitest";
import { MockFinancialProvider } from "../providers/mock-provider";
import { composeTreasuryState } from "../state/compose";
import { TreasuryStore } from "../store";
import { cacheBalanceSnapshot, syncFinancialProvider } from "../sync/provider-sync";
import { actualAmount } from "../types";
import { ORG_A } from "./fixtures";

describe("treasury-source-of-truth", () => {
  it("uses fresh provider balance, not stale cached $100,000", async () => {
    const store = new TreasuryStore();
    cacheBalanceSnapshot(store, { organizationId: ORG_A, accountId: "mock-acct-operating", currentUsd: 100_000 });
    const provider = new MockFinancialProvider({
      balances: [
        {
          accountId: "mock-acct-operating",
          available: actualAmount(92_500),
          current: actualAmount(92_500),
          asOf: "2026-08-18T00:00:00.000Z",
        },
      ],
    });
    const sync = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(sync.freshness).toBe("FRESH");
    const state = composeTreasuryState(store, {
      organizationId: ORG_A,
      providerCurrentBalanceUsd: 92_500,
      providerReadAt: sync.lastProviderSyncAt,
      freshnessOverride: "FRESH",
    });
    expect(state.totalCash.value).toBe(92_500);
    expect(state.totalCash.actuality).toBe("ACTUAL");
    expect(state.totalCash.value).not.toBe(100_000);
  });
});
