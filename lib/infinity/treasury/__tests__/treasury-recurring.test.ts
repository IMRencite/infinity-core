import { describe, expect, it } from "vitest";
import { authorizeFinancialAction, createFinancialActionRequest } from "../actions/engine";
import { annualEquivalentOf, monthlyEquivalentOf } from "../commitments/recurring";
import { actualAmount } from "../types";
import { createGovernedStore, ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-recurring", () => {
  it("evaluates a $49/month subscription as monthly and annual commitment, not a one-time $49", () => {
    expect(monthlyEquivalentOf(49, "MONTHLY")).toBe(49);
    expect(annualEquivalentOf(49, "MONTHLY")).toBe(588);
    const { store } = createGovernedStore({ autonomy: true, monthlyCeiling: 40, monthlyAllocated: 40 });
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "SaaS subscription",
      category: "SOFTWARE_TOOLS",
      actionType: "SUBSCRIPTION",
      amount: actualAmount(49),
      recurring: true,
      recurrence: {
        frequency: "MONTHLY",
        monthlyEquivalent: actualAmount(49),
        annualEquivalent: actualAmount(588),
      },
      idempotencyKey: "sub-49",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).toBe("BLOCK");
    expect(result.evaluation.reasonCodes.some((code) => code.includes("MONTHLY") || code.includes("RECURRING"))).toBe(true);
  });
});
