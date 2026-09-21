import { describe, expect, it } from "vitest";
import { evaluateCreativeMediaBudget } from "../integrations";
import { actualAmount } from "../types";
import { createGovernedStore, ORG_A, VENTURE_A } from "./fixtures";

describe("treasury-creative-media-budget", () => {
  it("blocks paid generation when creative media budget remaining is $10 and estimated cost is $25", () => {
    const { store } = createGovernedStore({
      autonomy: true,
      creativeAllocated: 10,
    });
    let providerCalled = false;
    const gate = evaluateCreativeMediaBudget(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      mediaRequirementId: "media-req-1",
      purpose: "Hero image",
      estimatedCost: actualAmount(25),
      provider: "mock_media",
    });
    if (gate.allowed) {
      providerCalled = true;
    }
    expect(gate.allowed).toBe(false);
    expect(gate.request.status).toMatch(/BLOCKED|ESCALATED/);
    expect(gate.providerCalled).toBe(false);
    expect(providerCalled).toBe(false);
  });
});
