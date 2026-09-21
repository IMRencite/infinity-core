import { describe, expect, it } from "vitest";
import { authorizeFinancialAction, createFinancialActionRequest } from "../actions/engine";
import { evaluateFinancialPolicy, isUnknownOrUnboundedCost } from "../policy/evaluate";
import { actualAmount, unknownAmount } from "../types";
import { createGovernedStore, ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-policy", () => {
  it("unknown cost never AUTO_AUTHORIZE", () => {
    expect(isUnknownOrUnboundedCost(unknownAmount())).toBe(true);
    const { store } = createGovernedStore({ autonomy: true });
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Unknown external purchase",
      category: "SOFTWARE_TOOLS",
      actionType: "PURCHASE",
      amount: unknownAmount(),
      idempotencyKey: "unknown-cost",
    });
    const evaluation = evaluateFinancialPolicy(store, { organizationId: ORG_A, request });
    expect(evaluation.decision).not.toBe("AUTO_AUTHORIZE");
    expect(["BLOCK", "REQUIRE_POLICY_ESCALATION"]).toContain(evaluation.decision);
  });

  it("blocks a $30 domain action when domain category remaining is $20 even if venture allocation is larger", () => {
    const { store } = createGovernedStore({
      autonomy: true,
      ventureAllocated: 500,
      domainAllocated: 20,
    });
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Register domain",
      category: "DOMAINS",
      actionType: "DOMAIN_PURCHASE",
      amount: actualAmount(30),
      idempotencyKey: "domain-30",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).not.toBe("AUTO_AUTHORIZE");
    expect(result.evaluation.reasonCodes).toContain("CATEGORY_BUDGET_EXCEEDED");
  });

  it("respects daily and monthly ceilings including reserved amounts", () => {
    const { store } = createGovernedStore({
      autonomy: true,
      dailyAllocated: 20,
      monthlyAllocated: 40,
    });
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Over daily ceiling",
      category: "SOFTWARE_TOOLS",
      actionType: "PURCHASE",
      amount: actualAmount(25),
      idempotencyKey: "daily-limit",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).toBe("BLOCK");
    expect(result.evaluation.reasonCodes).toContain("DAILY_BUDGET_EXCEEDED");
  });
});
