import { describe, expect, it } from "vitest";
import { netRevenue, sumLedger } from "../ledger/engine";
import {
  allocateVentureCapital,
  recordManualFunding,
  updateVentureBudget,
} from "../operator/manual-control";
import { INTERNAL_TREASURY_PROVIDER } from "../constants";
import { composeTreasuryState } from "../state/compose";
import { buildTreasuryHqReadModel } from "../hq/read-model";
import { loadTreasuryStore, persistTreasuryMutation } from "../persistence";
import { TreasuryStore } from "../store";
import { createGovernedStore, ORG_A, ORG_B, VENTURE_A } from "./fixtures";

const VENTURE_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("treasury manual control", () => {
  it("records manual funding as internal capital, not revenue and not a bank transaction", () => {
    const store = new TreasuryStore();
    const result = recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 5000,
      source: "founder_contribution",
      memo: "Owner injection",
      idempotencyKey: "fund-1",
    });
    expect(result.ok).toBe(true);
    const capital = sumLedger(store, ORG_A, "CAPITAL_CONTRIBUTION");
    const revenue = netRevenue(store, ORG_A);
    const state = composeTreasuryState(store, { organizationId: ORG_A });
    const model = buildTreasuryHqReadModel(store, ORG_A);

    expect(capital.amount.value).toBe(5000);
    expect(revenue.actuality).toBe("UNKNOWN");
    expect(state.internalCapital.value).toBe(5000);
    expect(state.totalCash.actuality).toBe("UNKNOWN");
    expect(state.providerFreshness).toBe("NOT_CONFIGURED");
    expect([...store.transactions.values()]).toHaveLength(0);
    expect([...store.ledger.values()][0]?.provider).toBe(INTERNAL_TREASURY_PROVIDER);
    expect([...store.requests.values()][0]?.economicJustification).toMatch(/NON-BANK/);
    expect(model.treasurySource).toBe("Internal manual ledger");
    expect(model.bankingProvider).toBe("Not configured");
    expect(model.cards.revenue.display).toBe("UNKNOWN");
    expect(model.cards.internalCapital.display).toContain("ACTUAL");
  });

  it("is idempotent for the same funding key", () => {
    const store = new TreasuryStore();
    const first = recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 1000,
      source: "operator_funding",
      idempotencyKey: "same",
    });
    const second = recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 1000,
      source: "operator_funding",
      idempotencyKey: "same",
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.entry.entryId).toBe(first.entry.entryId);
    }
    expect(sumLedger(store, ORG_A, "CAPITAL_CONTRIBUTION").amount.value).toBe(1000);
  });

  it("allocates capital to a venture and blocks overrun of available internal capital", () => {
    const store = new TreasuryStore();
    recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 1000,
      source: "founder_contribution",
      idempotencyKey: "pool",
    });
    const ok = allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 400,
      note: "Seed allocation",
      idempotencyKey: "alloc-1",
    });
    expect(ok.ok).toBe(true);
    const state = composeTreasuryState(store, { organizationId: ORG_A });
    expect(state.infinityAllocatedCapital.value).toBe(400);
    expect(state.availableCapital.value).toBe(600);
    expect(state.revenue.actuality).toBe("UNKNOWN");

    const blocked = allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 700,
      idempotencyKey: "alloc-over",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("INSUFFICIENT_AVAILABLE");
    expect(composeTreasuryState(store, { organizationId: ORG_A }).infinityAllocatedCapital.value).toBe(400);
  });

  it("blocks allocation when available capital is UNKNOWN", () => {
    const store = new TreasuryStore();
    const blocked = allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 10,
      idempotencyKey: "unknown",
    });
    expect(blocked).toEqual({ ok: false, reason: "AVAILABLE_UNKNOWN" });
  });

  it("updates a venture budget without changing allocation", () => {
    const store = new TreasuryStore();
    recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 2000,
      source: "manual_treasury_adjustment",
      idempotencyKey: "fund-budget",
    });
    allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 500,
      idempotencyKey: "alloc-budget",
    });
    const before = composeTreasuryState(store, { organizationId: ORG_A }).infinityAllocatedCapital.value;
    const budget = updateVentureBudget(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 250,
      period: "MONTHLY",
    });
    expect(budget.ok).toBe(true);
    if (budget.ok) {
      expect(budget.budget.allocated.value).toBe(250);
      expect(budget.budget.scope.scopeType).toBe("MONTHLY");
    }
    expect(composeTreasuryState(store, { organizationId: ORG_A }).infinityAllocatedCapital.value).toBe(before);
    const model = buildTreasuryHqReadModel(store, ORG_A);
    expect(model.ventures[0]?.allocated.display).toContain("500");
    expect(model.ventureBudgets.some((row) => row.allocated.display.includes("250"))).toBe(true);
  });

  it("does not leak org A capital into org B", () => {
    const store = new TreasuryStore();
    recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 8000,
      source: "founder_contribution",
      idempotencyKey: "a-only",
    });
    allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 1000,
      idempotencyKey: "a-alloc",
    });
    const b = composeTreasuryState(store, { organizationId: ORG_B });
    expect(b.internalCapital.actuality).toBe("UNKNOWN");
    expect(b.infinityAllocatedCapital.value).toBe(0);
    expect(buildTreasuryHqReadModel(store, ORG_B).ventures).toHaveLength(0);
    expect(buildTreasuryHqReadModel(store, ORG_A).ventures).toHaveLength(1);
  });

  it("rejects non-UUID ventures", () => {
    const { store } = createGovernedStore({ globalAllocated: 10_000, ventureAllocated: 0 });
    const result = allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: "not-a-uuid",
      amountUsd: 10,
      idempotencyKey: "bad",
    });
    expect(result).toEqual({ ok: false, reason: "INVALID_VENTURE" });
  });

  it("persists only the requested organization slice", async () => {
    const tables = new Map<string, Record<string, unknown>[]>();
    const client = {
      from(table: string) {
        return {
          select() {
            return {
              eq(_column: string, organizationId: string) {
                return Promise.resolve({
                  data: (tables.get(table) ?? []).filter((row) => row.organization_id === organizationId),
                  error: null,
                });
              },
            };
          },
          upsert(rows: Record<string, unknown>[] | Record<string, unknown>) {
            const list = Array.isArray(rows) ? rows : [rows];
            const current = tables.get(table) ?? [];
            for (const row of list) {
              const index = current.findIndex((existing) => existing.id === row.id);
              if (index >= 0) current[index] = row;
              else current.push(row);
            }
            tables.set(table, current);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    const store = new TreasuryStore();
    recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 300,
      source: "founder_contribution",
      idempotencyKey: "persist-a",
    });
    allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_B,
      amountUsd: 50,
      idempotencyKey: "persist-alloc",
    });
    const persisted = await persistTreasuryMutation(client, store, ORG_A);
    expect(persisted.ok).toBe(true);

    const loaded = await loadTreasuryStore(client, ORG_A);
    expect(sumLedger(loaded, ORG_A, "CAPITAL_CONTRIBUTION").amount.value).toBe(300);
    const foreign = await loadTreasuryStore(client, ORG_B);
    expect(sumLedger(foreign, ORG_B, "CAPITAL_CONTRIBUTION").amount.actuality).toBe("UNKNOWN");
    expect(foreign.allocations.size).toBe(0);
  });
});
