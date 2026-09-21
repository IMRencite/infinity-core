import { describe, it, expect } from "vitest";
import { CycleBudgetGovernor } from "../budget-governor";

describe("CycleBudgetGovernor", () => {
  it("warns at $8 and blocks at $10 hard cap", () => {
    const gov = new CycleBudgetGovernor();
    gov.record({ stage: "a", costUsd: 4, known: true });
    gov.record({ stage: "b", costUsd: 4, known: true });
    expect(gov.budgetWarning).toBe(true);
    expect(gov.budgetExceeded).toBe(false);
    gov.record({ stage: "c", costUsd: 2, known: true });
    expect(gov.budgetExceeded).toBe(true);
    expect(() => gov.assertRoom("blocked")).toThrow(/budget exhausted/);
  });

  it("tracks unknown provider cost without treating it as zero", () => {
    const gov = new CycleBudgetGovernor();
    gov.record({ stage: "venture_selection", costUsd: null, known: false });
    expect(gov.knownTotalUsdValue).toBe(0);
    expect(gov.hasUnknownCosts).toBe(true);
    expect(gov.budgetExceeded).toBe(false);
  });

  it("rejects spend that would exceed cap", () => {
    const gov = new CycleBudgetGovernor();
    gov.record({ stage: "a", costUsd: 9.5, known: true });
    expect(() => gov.assertRoom("expensive", 1)).toThrow(/would exceed/);
  });
});
