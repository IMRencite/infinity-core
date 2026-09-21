import { describe, expect, it } from "vitest";
import { CommercializationStore } from "@/lib/infinity/commercialization/store";
import { createSpendIntent, ensureVentureBudget } from "@/lib/infinity/commercialization/treasury/spend-authority";
import { routeSpendIntentThroughTreasury } from "../integrations";
import { resolveFinancialLineage } from "../observability/lineage";
import { ORG_A, VENTURE_A, createGovernedStore } from "./fixtures";

describe("treasury-commercialization-integration", () => {
  it("routes a mock domain SpendIntent through Treasury without a duplicate policy system", () => {
    const { store } = createGovernedStore({
      autonomy: true,
      globalAllocated: 10_000,
      ventureAllocated: 500,
      domainAllocated: 40,
    });
    const commercial = new CommercializationStore();
    ensureVentureBudget(commercial, { organizationId: ORG_A, ventureId: VENTURE_A, authorizedBudgetUsd: 500 });
    const intent = createSpendIntent(commercial, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      category: "DOMAIN_REGISTRATION",
      provider: "mock_registrar",
      capability: "domain.register",
      purpose: "Register opsflow.com",
      requestedAmountUsd: 12.99,
      reversibility: "PARTIALLY_REVERSIBLE",
      idempotencyKey: "intent:venture-domain-opsflow",
    });

    const routed = routeSpendIntentThroughTreasury(store, intent, { simulateProvider: true });
    expect(routed.blocked).toBe(false);
    expect(routed.request.spendIntentId).toBe(intent.id);
    expect(routed.request.category).toBe("DOMAINS");
    expect(routed.lineage.financialActionRequestId).toBe(routed.request.requestId);
    expect(routed.lineage.authorizationId).toBeTruthy();
    expect(routed.lineage.externalActionId).toBeTruthy();
    expect(routed.lineage.ledgerEntryId).toBeTruthy();
    expect(routed.providerMutations).toBe(0);

    const lineage = resolveFinancialLineage(store, routed.request.requestId);
    expect(lineage?.ventureId).toBe(VENTURE_A);
    expect(lineage?.authorizationId).toBeTruthy();
    expect(lineage?.externalActionId).toBeTruthy();
    expect(lineage?.ledgerEntryId).toBeTruthy();

    const replay = routeSpendIntentThroughTreasury(store, intent, { simulateProvider: true });
    expect(replay.request.requestId).toBe(routed.request.requestId);
    expect(store.ledger.size).toBe(1);
  });
});
