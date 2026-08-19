import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { ingestProviderTransaction } from "../ledger/engine";
import { buildTreasuryHqArtifacts } from "../hq/artifacts";
import { buildTreasuryHqReadModel } from "../hq/read-model";
import { actualAmount } from "../types";
import { createGovernedStore, ORG_A } from "./fixtures";

describe("treasury-hq", () => {
  it("builds Treasury & Capital cards without inventing balances", () => {
    const { store } = createGovernedStore();
    const started = Date.now();
    const model = buildTreasuryHqReadModel(store, ORG_A);
    const elapsed = Date.now() - started;
    expect(model.cards.totalCash.display).toMatch(/UNKNOWN|STALE|NOT CONFIGURED|ACTUAL|ESTIMATE/);
    expect(model.cards.internalCapital.display).toMatch(/UNKNOWN|ACTUAL|ESTIMATE/);
    expect(model.treasurySource).toBe("Internal manual ledger");
    expect(model.bankingProvider).toBe("Not configured");
    expect(model.cards.totalCash.display).not.toBe("$0");
    expect(model.cards.netProfit.display).toBe("UNKNOWN");
    expect(model.constraints.length).toBeGreaterThan(5);
    expect(model.ventures[0]?.status).toBe("NOT YET MEASURED");
    expect(model.ventures[0]?.profit.display).toBe("UNKNOWN");
    expect(model.queryCount).toBeLessThan(40);
    expect(elapsed).toBeLessThan(250);

    const artifacts = buildTreasuryHqArtifacts(model);
    expect(artifacts.executive_office?.some((a) => a.artifactType === "treasury_state")).toBe(true);
    expect(artifacts.strategy_finance?.some((a) => a.artifactType === "venture_capital_allocation")).toBe(true);
  });

  it("reuses HQOutputDetail tabs for financial action detail", () => {
    const { store } = createGovernedStore();
    ingestProviderTransaction(store, {
      organizationId: ORG_A,
      provider: "mock",
      providerTransactionId: "hq-txn",
      amount: actualAmount(5),
      classification: "EXPENSE",
      merchant: "Vercel",
      occurredAt: "2026-08-18T00:00:00.000Z",
    });
    const model = buildTreasuryHqReadModel(store, ORG_A);
    const artifacts = buildTreasuryHqArtifacts(model);
    const action = artifacts.executive_office?.find((a) => a.artifactType === "treasury_state");
    expect(action).toBeTruthy();
    const inspector = buildArtifactInspectorModel(action!, Object.values(artifacts).flat());
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["overview", "system"]));
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["evidence"]));
  });

  it("does not introduce a new modal/drawer and reuses holographic HQOutputDetail", () => {
    const strip = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/treasury-capital-strip.tsx"),
      "utf8",
    );
    const consoleSource = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"),
      "utf8",
    );
    expect(strip).toContain("Treasury &");
    expect(strip).toContain("Budget Constraints");
    expect(strip).toContain("Venture Allocations");
    expect(strip).toContain("Transactions");
    expect(strip).toContain("Commitments");
    expect(strip).not.toMatch(/drawer|dialog|modal/i);
    expect(consoleSource).toContain("TreasuryCapitalStrip");
    expect(consoleSource).toContain("TreasuryControlCenter");
    expect(consoleSource).toContain("ArtifactInspectorModal");
    const modal = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/artifact-inspector-modal.tsx"),
      "utf8",
    );
    expect(modal).toContain("HQOutputDetail");
    expect(modal).not.toContain("drawer");
  });
});
