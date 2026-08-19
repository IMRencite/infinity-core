import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { buildTreasuryHqArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import { buildTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { recordManualFunding, allocateVentureCapital, updateVentureBudget } from "@/lib/infinity/treasury/operator/manual-control";
import { TreasuryStore } from "@/lib/infinity/treasury/store";
import { ORG_A, VENTURE_A } from "@/lib/infinity/treasury/__tests__/fixtures";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");
const API = join(process.cwd(), "app/api/operator-console/treasury/route.ts");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("HQ treasury control center", () => {
  it("renders fund, overview, allocate, budget, and venture allocation controls", () => {
    const center = readSource("treasury-control-center.tsx");
    const consoleSource = readSource("venture-operator-console.tsx");
    const strip = readSource("treasury-capital-strip.tsx");
    expect(center).toContain("Fund Treasury");
    expect(center).toContain("Capital Overview");
    expect(center).toContain("Allocate Capital");
    expect(center).toContain("Budget Controls");
    expect(center).toContain("Venture Allocations");
    expect(center).toContain("INTERNAL / MANUAL / NON-BANK");
    expect(center).toContain("Treasury source");
    expect(center).toContain("Banking provider");
    expect(center).toContain("Record manual funding");
    expect(center).toContain("Allocate to venture");
    expect(center).toContain("Update budget limit");
    expect(center).toContain("Spending limit");
    expect(center).not.toMatch(/Mercury|wire transfer|Deposit completed by bank/i);
    expect(center).not.toMatch(/\bACH\b/);
    expect(center).toContain('role={onInspect ? "button"');
    expect(center).not.toMatch(/drawer|dialog|modal/i);
    expect(consoleSource).toContain("TreasuryControlCenter");
    expect(consoleSource).toContain("ArtifactInspectorModal");
    expect(consoleSource).not.toContain("TreasuryVentureAllocationsPanel");
    expect(strip).toContain("Internal capital");
    expect(strip).toContain("Bank cash");
  });

  it("keeps allocation cards outside nested interactive shells and reuses the inspector", () => {
    const center = readSource("treasury-control-center.tsx");
    const cardStart = center.indexOf("function AllocationCard");
    const card = center.slice(cardStart);
    expect(card).toContain('role={onInspect ? "button"');
    expect(card).not.toContain("<button");
    expect(card).toContain("handleCardKeyboardInspect");
    expect(center).toContain("openInspector");
  });

  it("opens treasury detail from allocation artifacts with truthful capital fields", () => {
    const store = new TreasuryStore();
    recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 2000,
      source: "founder_contribution",
      idempotencyKey: "ui-fund",
    });
    allocateVentureCapital(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 250,
      idempotencyKey: "ui-alloc",
    });
    updateVentureBudget(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      amountUsd: 80,
    });
    const model = buildTreasuryHqReadModel(store, ORG_A);
    const artifacts = Object.values(buildTreasuryHqArtifacts(model)).flat();
    const allocation = artifacts.find((artifact) => artifact.artifactType === "venture_capital_allocation");
    expect(allocation).toBeTruthy();
    const inspector = buildArtifactInspectorModel(allocation!, artifacts, {
      treasury: {
        treasurySource: "Internal manual ledger",
        bankingProvider: "Not configured",
        fundingClass: "INTERNAL / MANUAL / NON-BANK",
        allocated: model.ventures[0]!.allocated.display,
        reserved: model.ventures[0]!.reserved.display,
        committed: model.ventures[0]!.committed.display,
        spent: model.ventures[0]!.spent.display,
        available: model.ventures[0]!.available.display,
        expectedRevenue: model.ventures[0]!.expectedRevenue.display,
        actualRevenue: model.ventures[0]!.actualRevenue.display,
        expectedProfit: model.ventures[0]!.expectedProfit.display,
        actualProfit: model.ventures[0]!.actualProfit.display,
        budgetConstraints: [{ label: "VENTURE", allocated: "$80.00 ACTUAL", available: "$80.00 ACTUAL", scope: "VENTURE" }],
        recentFunding: [],
        recentAllocations: [],
        relatedActions: [],
      },
    });
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["overview", "system"]));
    expect(inspector.sections.some((section) => section.rows.some((row) => row.value.includes("NON-BANK")))).toBe(true);
    expect(inspector.sections.some((section) => section.rows.some((row) => /Mercury|bank transfer completed/i.test(row.value)))).toBe(
      false,
    );
  });

  it("routes mutations through org-scoped treasury API without body organizationId", () => {
    const route = readFileSync(API, "utf8");
    expect(route).toContain("getOperatorOrgContext");
    expect(route).toContain("recordManualFunding");
    expect(route).toContain("allocateVentureCapital");
    expect(route).toContain("updateVentureBudget");
    expect(route).toContain("persistTreasuryMutation");
    expect(route).not.toMatch(/body\.organizationId|body\.orgId/);
    expect(route).toContain("organizationIdFromAuth");
  });

  it("contains tablet and mobile treasury layout rules without horizontal overflow", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".hq-treasury-console");
    expect(css).toContain("@media (max-width: 1024px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("overflow-x: hidden");
    expect(readSource("venture-operator-console.tsx")).toContain("overflow-x-hidden");
    expect(readSource("venture-operator-console.tsx")).not.toMatch(/md:order-|order-\d/);
  });
});
