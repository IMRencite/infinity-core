import { describe, expect, it } from "vitest";
import { evaluateRenderedProductResultQualityGate, RENDERED_PRODUCT_RESULT_QUALITY_GATE } from "../rendered-interaction/product-result";
import { persistOccupancynpvResultQcEvidence, evaluateOccupancynpvProductResultQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { evaluateCalculationFixtures } from "@/lib/infinity/occupancynpv-product/fixtures";

const EVIDENCE = [375, 390, 768, 1280].map((viewportWidth) => ({
  route: "/occupancynpv/app/workspaces/:id",
  viewportWidth,
  overflowPx: 0,
  result: "PASS" as const,
}));

const RESULT = `
<div data-product-result="true" role="dialog" aria-modal="true" aria-labelledby="onpv-result-title">
  <h2 id="onpv-result-title">Lease Comparison Results</h2>
  <section data-result-outcome="true">Lower NPV at current assumptions</section>
  <div data-result-metric="true"><dt>NPV</dt><dd>$11,512.86</dd></div>
  <p>Lower NPV means the modeled occupancy cash flows have a lower present-value cost. This is not legal, accounting, or investment advice.</p>
  <button data-primary-action="compare-another">Compare Another</button>
  <button>Edit Inputs</button>
  <a href="/occupancynpv/app">Back to Dashboard</a>
  <button aria-label="Close results" onKey="Escape">Close</button>
</div>
`;

describe("RenderedProductResultQualityGate", () => {
  it("fails raw debug-style comparison output", () => {
    const result = evaluateRenderedProductResultQualityGate({
      html: `<h2>Client-facing comparison</h2><p>NPV difference (B − A): $12. Lower NPV scenario: lease_a</p>`,
      evidence: [],
    });
    expect(result.gate).toBe(RENDERED_PRODUCT_RESULT_QUALITY_GATE);
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toEqual(expect.arrayContaining(["RAW_DEBUG_OUTPUT", "POST_RESULT_ACTION_MISSING"]));
  });

  it("fails unlabeled numeric output and missing next actions", () => {
    const result = evaluateRenderedProductResultQualityGate({
      html: `<div>$11,512.86</div>`,
      evidence: EVIDENCE,
    });
    expect(result.result).toBe("FAIL");
    expect(result.metricsStructured).toBe(false);
  });

  it("passes a structured accessible result with next actions", () => {
    const result = evaluateRenderedProductResultQualityGate({ html: RESULT, evidence: EVIDENCE });
    expect(result.result).toBe("PASS");
    expect(result.nextActionsPresent).toBe(true);
    expect(result.accessibleInteraction).toBe(true);
  });

  it("passes composed OccupancyNPV workspace result source and preserves calculation fixtures", () => {
    persistOccupancynpvResultQcEvidence();
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const workspace = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/page.tsx")?.content ?? "";
    const dialog = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx")?.content ?? "";
    expect(workspace).toContain("ComparisonResultDialog");
    expect(workspace).not.toContain("Client-facing comparison");
    expect(dialog).toContain("Lease Comparison Results");
    expect(dialog).toContain("Compare Another");
    expect(dialog).toContain("Edit Inputs");
    expect(dialog).toContain("Back to Dashboard");
    expect(dialog).toContain('role="dialog"');
    expect(evaluateOccupancynpvProductResultQc().result).toBe("PASS");
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
    expect(fixtures.passed).toBeGreaterThanOrEqual(8);
  });
});
