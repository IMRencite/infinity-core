import { describe, expect, it } from "vitest";
import {
  evaluateRenderedSelectedItemStateQualityGate,
  renderSelectedScenarioFixture,
  selectedItemMatchesEditor,
  RENDERED_SELECTED_ITEM_STATE_QUALITY_GATE,
} from "../rendered-interaction/selected-item-state";
import { evaluateProductSubItemDiscoverabilityGate } from "../rendered-interaction/product-collection";
import { evaluateCalculationFixtures } from "@/lib/infinity/occupancynpv-product/fixtures";
import {
  evaluateOccupancynpvProductResultQc,
  evaluateOccupancynpvSelectedItemQc,
  persistOccupancynpvResultQcEvidence,
  persistOccupancynpvSelectedItemQcEvidence,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

const EVIDENCE = [375, 390, 768, 1280].map((viewportWidth) => ({
  route: "/occupancynpv/app/workspaces/:id",
  viewportWidth,
  overflowPx: 0,
  selectedVisible: true,
  result: "PASS" as const,
}));

const CSS = `
.onpv-scenario-item { border: 1px solid #d4d4d8; background: #fff; }
.onpv-scenario-item--active { border: 2px solid var(--onpv-accent); background: #e8eef4; }
.onpv-badge--editing { color: var(--onpv-accent); border: 1px solid var(--onpv-accent); }
`;

describe("RenderedSelectedItemStateQualityGate", () => {
  it("fails identical cards and color-only selection", () => {
    const identical = evaluateRenderedSelectedItemStateQualityGate({
      html: `<li data-scenario-item="true"><h3>Lease A</h3></li><li data-scenario-item="true"><h3>Lease B</h3></li>`,
      evidence: [],
    });
    expect(identical.gate).toBe(RENDERED_SELECTED_ITEM_STATE_QUALITY_GATE);
    expect(identical.result).toBe("FAIL");
    expect(identical.reasons).toEqual(expect.arrayContaining(["SELECTED_ITEM_AMBIGUOUS"]));
    const colorOnly = evaluateRenderedSelectedItemStateQualityGate({
      html: `<li class="onpv-scenario-item--active" data-scenario-item="true"></li>`,
      css: ".onpv-scenario-item--active { border-color: var(--onpv-accent); }",
      evidence: EVIDENCE,
    });
    expect(colorOnly.result).toBe("FAIL");
    expect(colorOnly.reasons).toEqual(expect.arrayContaining(["COLOR_ONLY_SELECTION"]));
  });

  it("selects Lease A or Lease B and keeps the editor synchronized", () => {
    const leaseA = renderSelectedScenarioFixture({ names: ["Lease A", "Lease B"], selectedIndex: 0 });
    const leaseB = renderSelectedScenarioFixture({ names: ["Lease A", "Lease B"], selectedIndex: 1 });
    expect(selectedItemMatchesEditor("Lease A", "Lease A")).toBe(true);
    expect(selectedItemMatchesEditor("Lease A", "Lease B")).toBe(false);
    const a = evaluateRenderedSelectedItemStateQualityGate({
      html: leaseA,
      css: CSS,
      selectedId: "Lease A",
      editorId: "Lease A",
      evidence: EVIDENCE,
    });
    const b = evaluateRenderedSelectedItemStateQualityGate({
      html: leaseB,
      css: CSS,
      selectedId: "Lease B",
      editorId: "Lease B",
      evidence: EVIDENCE,
    });
    expect(a.result).toBe("PASS");
    expect(b.result).toBe("PASS");
    expect(leaseA).toContain("Edit Lease A");
    expect(leaseA).toContain("data-active=\"true\"");
    expect(leaseA.match(/data-active="true"/g)).toHaveLength(1);
    expect(leaseB).toContain("Edit Lease B");
    expect(leaseB).toContain(">Lease A<");
    expect(leaseB.match(/data-selected-badge/g)).toHaveLength(1);
    expect(leaseB).toMatch(/Lease B[\s\S]*data-selected-badge="true">Editing/);
  });

  it("keeps a single active card across 1, 2, 5, and 20 scenarios", () => {
    for (const count of [1, 2, 5, 20]) {
      const names = Array.from({ length: count }, (_, index) => (index < 2 ? `Lease ${index === 0 ? "A" : "B"}` : `Scenario ${index + 1}`));
      const html = renderSelectedScenarioFixture({ names, selectedIndex: count - 1 });
      const result = evaluateRenderedSelectedItemStateQualityGate({
        html,
        css: CSS,
        selectedId: names[count - 1],
        editorId: names[count - 1],
        evidence: EVIDENCE,
      });
      expect(result.result).toBe("PASS");
      expect(html.match(/data-active="true"/g)).toHaveLength(1);
      expect(html.match(/data-selected-badge/g)).toHaveLength(1);
      expect(evaluateProductSubItemDiscoverabilityGate({ html, childCount: count, renderedChildCount: count }).result).toBe("PASS");
    }
  });

  it("requires accessible selected state at mobile and desktop widths", () => {
    const html = renderSelectedScenarioFixture({ names: ["Lease A", "Lease B"], selectedIndex: 0 });
    const result = evaluateRenderedSelectedItemStateQualityGate({ html, css: CSS, selectedId: "Lease A", editorId: "Lease A", evidence: EVIDENCE });
    expect(result.accessibleSelectedState).toBe(true);
    expect(result.renderedEvidencePresent).toBe(true);
    expect(html).toContain("aria-current");
    expect(html).toContain("aria-pressed");
    expect(html).toContain("Editing");
    expect(EVIDENCE.map((row) => row.viewportWidth)).toEqual([375, 390, 768, 1280]);
  });

  it("passes composed OccupancyNPV selected-item source and preserves calculations", () => {
    persistOccupancynpvSelectedItemQcEvidence();
    persistOccupancynpvResultQcEvidence();
    expect(evaluateOccupancynpvSelectedItemQc().result).toBe("PASS");
    expect(evaluateOccupancynpvProductResultQc().result).toBe("PASS");
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
  });
});
