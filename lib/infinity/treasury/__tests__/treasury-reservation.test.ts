import { describe, expect, it } from "vitest";
import { createBudget, reserveBudget } from "../budgets/engine";
import { TreasuryStore } from "../store";
import { actualAmount } from "../types";
import { ORG_A } from "./fixtures";

describe("treasury-reservation", () => {
  it("prevents concurrent double-spend of the same available budget", async () => {
    const store = new TreasuryStore();
    const budget = createBudget(store, {
      scope: { scopeType: "GLOBAL", organizationId: ORG_A, currency: "USD" },
      allocated: actualAmount(100),
    });

    const [a, b] = await Promise.all([
      Promise.resolve(
        reserveBudget(store, {
          organizationId: ORG_A,
          budgetId: budget.budgetId,
          financialActionRequestId: "action-a",
          amountUsd: 80,
        }),
      ),
      Promise.resolve(
        reserveBudget(store, {
          organizationId: ORG_A,
          budgetId: budget.budgetId,
          financialActionRequestId: "action-b",
          amountUsd: 80,
        }),
      ),
    ]);

    const successes = [a, b].filter((result) => result.ok);
    const failures = [a, b].filter((result) => !result.ok);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(store.budgets.get(budget.budgetId)?.reserved.value).toBe(80);
    expect(store.budgets.get(budget.budgetId)?.available.value).toBe(20);
  });
});
