import { describe, expect, it } from "vitest";
import { authorizeFinancialAction, createFinancialActionRequest, executeAuthorizedAction } from "../actions/engine";
import { DEFAULT_TREASURY_POLICY } from "../config";
import { setEmergencyFinancialFreeze, setFinancialAutonomy } from "../freeze/control";
import { MockFinancialProvider } from "../providers/mock-provider";
import { actualAmount } from "../types";
import { createGovernedStore, ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-freeze", () => {
  it("defaults autonomy disabled and emergency freeze false", () => {
    expect(DEFAULT_TREASURY_POLICY.financialAutonomyEnabledDefault).toBe(false);
    expect(DEFAULT_TREASURY_POLICY.emergencyFinancialFreezeDefault).toBe(false);
  });

  it("emergency freeze blocks otherwise valid actions and performs no provider mutation", () => {
    const { store } = createGovernedStore({ autonomy: true });
    setEmergencyFinancialFreeze(store, ORG_A, true);
    const provider = new MockFinancialProvider();
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Valid hosting",
      category: "HOSTING",
      actionType: "HOSTING_PURCHASE",
      amount: actualAmount(10),
      idempotencyKey: "freeze-block",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).toBe("BLOCK");
    expect(result.evaluation.reasonCodes).toContain("EMERGENCY_FINANCIAL_FREEZE");
    const executed = executeAuthorizedAction(store, {
      requestId: request.requestId,
      authorizationId: "missing",
      idempotencyKey: "freeze-exec",
    });
    expect(executed.ok).toBe(false);
    expect(provider.mutationCount).toBe(0);
  });

  it("disabled autonomy blocks mutations while allowing read-only sync conceptually", () => {
    const { store } = createGovernedStore({ autonomy: false });
    expect(store.controlFor(ORG_A).financialAutonomyEnabled).toBe(false);
    const request = createFinancialActionRequest(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      purpose: "Host",
      category: "HOSTING",
      actionType: "HOSTING_PURCHASE",
      amount: actualAmount(10),
      idempotencyKey: "disabled-auto",
    });
    const result = authorizeFinancialAction(store, request.requestId);
    expect(result.evaluation.decision).toBe("BLOCK");
    expect(result.evaluation.reasonCodes).toContain("FINANCIAL_AUTONOMY_DISABLED");
    setFinancialAutonomy(store, ORG_A, false);
    expect(store.controlFor(ORG_A).financialAutonomyEnabled).toBe(false);
  });
});
