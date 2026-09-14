import { describe, expect, it } from "vitest";
import { ingestProviderTransaction } from "../ledger/engine";
import { TreasuryStore } from "../store";
import { actualAmount } from "../types";
import { ORG_A } from "./fixtures";

describe("treasury-idempotency", () => {
  it("ingesting the same provider transaction twice yields one transaction and one ledger effect", () => {
    const store = new TreasuryStore();
    const input = {
      organizationId: ORG_A,
      provider: "mock",
      providerTransactionId: "txn-dup",
      amount: actualAmount(15),
      classification: "EXPENSE" as const,
      occurredAt: "2026-08-18T00:00:00.000Z",
    };
    const first = ingestProviderTransaction(store, input);
    const second = ingestProviderTransaction(store, input);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.transaction.transactionId).toBe(first.transaction.transactionId);
    expect(store.transactions.size).toBe(1);
    expect(store.ledger.size).toBe(1);
    expect(second.ledger?.entryId).toBe(first.ledger?.entryId);
  });
});
