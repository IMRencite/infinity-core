import { describe, expect, it } from "vitest";
import {
  evaluateProductCollectionLifecycleGate,
  evaluateProductCollectionScalabilityGate,
  evaluateProductSubItemDiscoverabilityGate,
  occupancynpvWorkspaceCollectionContract,
  renderBoundedCollectionFixture,
  renderScenarioCollectionFixture,
  PRODUCT_COLLECTION_LIFECYCLE_GATE,
  PRODUCT_COLLECTION_SCALABILITY_GATE,
  PRODUCT_SUB_ITEM_DISCOVERABILITY_GATE,
} from "../rendered-interaction/product-collection";
import {
  evaluateOccupancynpvCollectionQc,
  persistOccupancynpvCollectionQcEvidence,
  persistOccupancynpvDashboardQcEvidence,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";
import { evaluateCalculationFixtures } from "@/lib/infinity/occupancynpv-product/fixtures";
import { evaluateOccupancynpvProductDashboardQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

describe("Product collection quality gates", () => {
  it("defines the OccupancyNPV workspace collection contract as archive-only", () => {
    const contract = occupancynpvWorkspaceCollectionContract();
    expect(contract.collectionItemType).toBe("DealWorkspace");
    expect(contract.subItems.type).toBe("LeaseScenario");
    expect(contract.destructiveAction).toBe("ARCHIVE_ONLY");
    expect(contract.entitlementOnArchive).toBe("UNCHANGED");
    expect(contract.defaultPageSize).toBe(10);
  });

  it("fails an unbounded 100-workspace dump and passes a bounded page", () => {
    const dump = evaluateProductCollectionScalabilityGate({
      html: `<section data-workspace-list="true">${"<article data-workspace-card>x</article>".repeat(100)}</section>`,
      evidence: [],
    });
    expect(dump.gate).toBe(PRODUCT_COLLECTION_SCALABILITY_GATE);
    expect(dump.result).toBe("FAIL");
    const page = renderBoundedCollectionFixture(100);
    expect(page.renderedItemCount).toBe(10);
    persistOccupancynpvCollectionQcEvidence();
    const bounded = evaluateProductCollectionScalabilityGate({
      html: `${page.html} Updated order("updated_at" Archive Restore`,
      evidence: persistOccupancynpvCollectionQcEvidence().samples,
    });
    expect(bounded.result).toBe("PASS");
  });

  it("requires archive/restore and fails entitlement restoration", () => {
    const pass = evaluateProductCollectionLifecycleGate({
      html: "Continue workspace Rename Archive Restore",
      entitlementUnchanged: true,
    });
    expect(pass.gate).toBe(PRODUCT_COLLECTION_LIFECYCLE_GATE);
    expect(pass.result).toBe("PASS");
    const fail = evaluateProductCollectionLifecycleGate({
      html: "Continue workspace",
      entitlementUnchanged: false,
    });
    expect(fail.result).toBe("FAIL");
  });

  it("fails hidden prior child records and passes discoverable scenario collections", () => {
    const hidden = evaluateProductSubItemDiscoverabilityGate({
      html: "<div>current scenario</div>",
      childCount: 5,
      renderedChildCount: 1,
    });
    expect(hidden.gate).toBe(PRODUCT_SUB_ITEM_DISCOVERABILITY_GATE);
    expect(hidden.result).toBe("FAIL");
    for (const count of [0, 1, 2, 5, 20]) {
      const html = renderScenarioCollectionFixture(count);
      const result = evaluateProductSubItemDiscoverabilityGate({ html, childCount: count, renderedChildCount: count });
      expect(result.result).toBe("PASS");
    }
  });

  it("passes composed OccupancyNPV collection QC and preserves calculations", () => {
    persistOccupancynpvDashboardQcEvidence();
    persistOccupancynpvCollectionQcEvidence();
    const qc = evaluateOccupancynpvCollectionQc();
    expect(qc.scalability.result).toBe("PASS");
    expect(qc.lifecycle.result).toBe("PASS");
    expect(qc.subItems.result).toBe("PASS");
    expect(evaluateOccupancynpvProductDashboardQc().result).toBe("PASS");
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
  });
});
