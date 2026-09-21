import { describe, expect, it } from "vitest";
import {
  evaluateProductEmptyStateQualityGate,
  evaluateRenderedProductDashboardQualityGate,
  PRODUCT_EMPTY_STATE_QUALITY_GATE,
  PRODUCT_DASHBOARD_ROUTE_CLASS,
  RENDERED_PRODUCT_DASHBOARD_QUALITY_GATE,
} from "../rendered-interaction/product-dashboard";
import { classifyCustomerFacingRoute } from "../rendered-layout/customer-facing-gutter";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  evaluateOccupancynpvEmptyStateQc,
  evaluateOccupancynpvProductDashboardQc,
  persistOccupancynpvDashboardQcEvidence,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

const EVIDENCE = [
  ...[375, 390, 768, 1280].map((viewportWidth) => ({
    route: "/occupancynpv/app",
    state: "source",
    viewportWidth,
    overflowPx: 0,
    result: "PASS" as const,
  })),
  ...[25, 100].flatMap((fixtureCount) => [375, 390, 768, 1280].map((viewportWidth) => ({
    route: "/occupancynpv/app",
    state: `heavy-${fixtureCount}`,
    viewportWidth,
    overflowPx: 0,
    result: "PASS" as const,
    fixtureCount,
    renderedItemCount: 10,
    pageSize: 10,
  }))),
];

const DASHBOARD = `
<main data-product-dashboard="occupancynpv" data-dashboard-state="populated">
  <header data-product-context="true"><h1>Lease Comparison Workspace</h1><p>Compare lease options using cash flow, NPV, occupancy costs, and sensitivity analysis.</p></header>
  <section data-access-summary="true"><strong>Professional Access</strong><span>Active</span></section>
  <form data-primary-action="create-workspace"><button class="onpv-btn-primary" type="submit">Create New Deal Workspace</button></form>
  <section data-workspace-list="true" data-collection="workspaces" data-collection-bounded="true" data-collection-page-size="10"><button class="onpv-tab">Active</button><button class="onpv-tab">Archived</button><article data-workspace-card="true"><h3>Deal A</h3><a class="onpv-btn-secondary" href="/occupancynpv/app/workspaces/1">Continue workspace</a><button class="onpv-btn-tertiary">Rename</button><button class="onpv-btn-tertiary">Archive</button></article></section>
  <section data-support="true">Help and support infinitemediaresources@gmail.com</section>
</main>
`;

const EMPTY = `
<main data-product-dashboard="occupancynpv" data-dashboard-state="empty" data-empty-state="true">
  <header data-product-context="true"><h1>Lease Comparison Workspace</h1><p>Compare lease options using cash flow, NPV, occupancy costs, and sensitivity analysis.</p></header>
  <section data-access-summary="true"><strong>Per-Deal Access</strong><span>1 workspace remaining</span></section>
  <form data-primary-action="create-workspace"><button class="onpv-btn-primary" type="submit">Create New Deal Workspace</button></form>
  <section data-empty-state="true"><h2>Getting started</h2><ol><li>Create a workspace</li><li>Add lease scenarios</li><li>Enter economic terms</li><li>Review NPV and sensitivity results</li></ol></section>
  <section data-support="true">Help and support infinitemediaresources@gmail.com</section>
</main>
`;

describe("RenderedProductDashboardQualityGate", () => {
  it("classifies authenticated app home as PRODUCT_DASHBOARD", () => {
    expect(PRODUCT_DASHBOARD_ROUTE_CLASS).toBe("PRODUCT_DASHBOARD");
    expect(classifyCustomerFacingRoute("/occupancynpv/app")).toBe("PRODUCT_DASHBOARD");
    expect(classifyCustomerFacingRoute("/future-venture/app")).toBe("PRODUCT_DASHBOARD");
    expect(classifyCustomerFacingRoute("/occupancynpv/app/login")).toBe("AUTH");
    expect(classifyCustomerFacingRoute("/occupancynpv/app/workspaces/ws_1")).toBe("PRODUCT_WORKSPACE");
  });

  it("requires visible purpose, primary action, product context, and support", () => {
    const result = evaluateRenderedProductDashboardQualityGate({
      html: DASHBOARD,
      css: ".onpv-btn-primary { min-height: 2.75rem; }",
      state: "populated",
      evidence: EVIDENCE,
    });
    expect(result.gate).toBe(RENDERED_PRODUCT_DASHBOARD_QUALITY_GATE);
    expect(result.reasons).toEqual([]);
    expect(result.result).toBe("PASS");
    expect(result.primaryPurposeVisible).toBe(true);
    expect(result.primaryNextActionVisible).toBe(true);
    expect(result.productContextPresent).toBe(true);
    expect(result.existingWorkDiscoverable).toBe(true);
    expect(result.supportDiscoverable).toBe(true);
  });

  it("passes a useful empty state and fails a lone-button blank page", () => {
    const empty = evaluateProductEmptyStateQualityGate({ html: EMPTY, hasExistingWork: false });
    expect(empty.gate).toBe(PRODUCT_EMPTY_STATE_QUALITY_GATE);
    expect(empty.result).toBe("PASS");
    const blank = evaluateProductEmptyStateQualityGate({
      html: `<main><button type="submit">Create</button></main>`,
      hasExistingWork: false,
    });
    expect(blank.result).toBe("FAIL");
    expect(blank.reasons).toEqual(expect.arrayContaining(["EMPTY_STATE_GUIDANCE_MISSING"]));
  });

  it("fails raw browser controls and extreme under-utilization", () => {
    const raw = evaluateRenderedProductDashboardQualityGate({
      html: `<main data-product-dashboard="x"><h1>Lease Comparison Workspace</h1><p>NPV cash flow occupancy costs sensitivity analysis</p><div data-access-summary="true">Professional Access</div><form data-primary-action="x"><button type="submit">Create New Deal Workspace</button></form><div data-workspace-list="true">Continue workspace</div><p>infinitemediaresources@gmail.com</p></main>`,
      state: "populated",
      evidence: EVIDENCE,
    });
    expect(raw.rawBrowserControls).toBe(true);
    expect(raw.result).toBe("FAIL");
    const tiny = evaluateRenderedProductDashboardQualityGate({
      html: "<main>App</main>",
      state: "empty",
      evidence: [],
    });
    expect(tiny.reasons).toEqual(expect.arrayContaining(["EXTREME_UNDER_UTILIZATION", "MISSING_RENDERED_EVIDENCE"]));
    expect(tiny.result).toBe("FAIL");
  });

  it("passes composed OccupancyNPV dashboard source after evidence persist", () => {
    persistOccupancynpvDashboardQcEvidence();
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const dashboard = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/page.tsx")?.content ?? "";
    const layout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
    expect(dashboard).toContain("Lease Comparison Workspace");
    expect(dashboard).toContain("Create New Deal Workspace");
    expect(dashboard).toContain("data-empty-state");
    expect(dashboard).toContain("Continue workspace");
    expect(dashboard).toContain("Internal QA Access");
    expect(dashboard).toContain("Professional Access");
    expect(dashboard).toContain("Per-Deal Access");
    expect(dashboard).not.toContain("Your OccupancyNPV workspace");
    expect(layout).toContain("onpv-appbar");
    expect(layout).toContain("body:has(.onpv-customer-shell) > nav.pv-nav");
    expect(evaluateOccupancynpvProductDashboardQc().result).toBe("PASS");
    expect(evaluateOccupancynpvEmptyStateQc().result).toBe("PASS");
    expect(evaluateRenderedProductDashboardQualityGate({
      html: dashboard,
      css: layout,
      state: "source",
      evidence: EVIDENCE,
    }).result).toBe("PASS");
  });
});
