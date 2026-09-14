import { describe, expect, it } from "vitest";
import { authorizeFinancialAction, createFinancialActionRequest } from "../actions/engine";
import { actualAmount } from "../types";
import { createGovernedStore, ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-venture-allocation", () => {
  it("blocks a $700 venture spend against a $500 allocation even when global cash is $10,000", () => {
    const { store } = createGovernedStore({
      autonomy: true,
      globalAllocated: 10_000,
      ventureAllocated: 500,
    });
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Over-allocation spend",
      category: "HOSTING",
      actionType: "HOSTING_PURCHASE",
      amount: actualAmount(700),
      idempotencyKey: "venture-700",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).not.toBe("AUTO_AUTHORIZE");
    expect(["BLOCK", "REQUIRE_POLICY_ESCALATION"]).toContain(result.evaluation.decision);
    expect(result.evaluation.reasonCodes).toContain("VENTURE_ALLOCATION_EXCEEDED");
  });
});
