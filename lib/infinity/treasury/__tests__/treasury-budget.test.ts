import { describe, expect, it } from "vitest";
import { computeAvailable, createBudget, refreshBudgetAvailable } from "../budgets/engine";
import { TreasuryStore } from "../store";
import { actualAmount, unknownAmount } from "../types";
import { ORG_A } from "./fixtures";

describe("treasury-budget", () => {
  it("available = allocated - spent - reserved - committed", () => {
    const available = computeAvailable(actualAmount(1000), actualAmount(300), actualAmount(150), actualAmount(200));
    expect(available.value).toBe(350);
    expect(available.actuality).toBe("ACTUAL");
  });

  it("available is UNKNOWN when any required component is unknown", () => {
    const available = computeAvailable(actualAmount(1000), unknownAmount(), actualAmount(0), actualAmount(0));
    expect(available.value).toBeNull();
    expect(available.actuality).toBe("UNKNOWN");
  });

  it("does not treat forecast revenue as available capital", () => {
    const store = new TreasuryStore();
    const budget = createBudget(store, {
      scope: { scopeType: "GLOBAL", organizationId: ORG_A, currency: "USD" },
      allocated: actualAmount(1000),
      spent: actualAmount(300),
      reserved: actualAmount(150),
      committed: actualAmount(200),
    });
    expect(refreshBudgetAvailable(budget).available.value).toBe(350);
    expect(budget.available.value).not.toBe(1350);
  });
});
