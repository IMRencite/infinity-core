import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  inventoryOccupancynpvVenturePageDepth,
  occupancynpvRelatedPathsSection,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-venture-page-depth";
import {
  classifyRoute,
  displayPageType,
  evaluatePageDepthBundle,
  factoryRequiresDepthPlanBeforePageBuild,
  planCustomerPageDepthBeforeBuild,
} from "@/lib/infinity/customer-page-depth";
import { projectVentureOfferArchitectureHq } from "@/lib/infinity/offer-architecture/hq";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";

function composed() {
  return composeOccupancynpvPaymentReactivationFiles();
}

function page(path: string): string {
  return composed().files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

describe("OCCUPANCYNPV_VENTURE_WIDE_PAGE_DEPTH_UPLIFT_V1", () => {
  it("classifies OccupancyNPV routes by page type rather than word count", () => {
    expect(classifyRoute("/")).toBe("HOMEPAGE");
    expect(classifyRoute("/pricing")).toBe("PRICING");
    expect(classifyRoute("/how-it-works")).toBe("WORKFLOW");
    expect(classifyRoute("/compare-commercial-leases")).toBe("COMPARISON");
    expect(classifyRoute("/faq")).toBe("FAQ");
    expect(classifyRoute("/suggest-improvement")).toBe("FEEDBACK");
    expect(classifyRoute("/occupancynpv/app/login")).toBe("LOGIN");
    expect(classifyRoute("/occupancynpv/app")).toBe("ACCOUNT");
    expect(classifyRoute("/occupancynpv/app/workspaces/:id")).toBe("RESULT");
    expect(classifyRoute("/occupancynpv/app/checkout/complete")).toBe("UTILITY");
    expect(classifyRoute("/lease-comparison/example")).toBe("RESOURCE");
    expect(classifyRoute("/privacy-policy")).toBe("LEGAL");
    expect(classifyRoute("/lease-comparison/lease-terms")).toBe("RESOURCE");
    expect(displayPageType("HOMEPAGE")).toBe("HOME");
    expect(displayPageType("LOGIN")).toBe("AUTH");
    expect(factoryRequiresDepthPlanBeforePageBuild()).toBe(true);
    expect(planCustomerPageDepthBeforeBuild({ routes: ["/faq", "/how-it-works"] }).word_count_sole_metric).toBe(false);
  });

  it("accounts for every material composed customer page with no UNKNOWN or UNVERIFIED", () => {
    const summary = inventoryOccupancynpvVenturePageDepth(composed().files);
    expect(summary.total_material_pages).toBeGreaterThan(10);
    expect(summary.unverified).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.thin).toBe(0);
    expect(summary.pages.every((row) => row.status === "PASS" || row.status === "N/A")).toBe(true);
    expect(summary.pages.some((row) => row.route === "/")).toBe(true);
    expect(summary.pages.some((row) => row.route === "/not-found")).toBe(true);
    expect(summary.pages.some((row) => row.route === "/sitemap.xml")).toBe(true);
  });

  it("repairs homepage, workflow, compare, resources, FAQ, and feedback without copying pricing layout", () => {
    const home = page("app/page.tsx");
    const how = page("app/how-it-works/page.tsx");
    const compare = page("app/compare-commercial-leases/page.tsx");
    const resources = page("app/resources/page.tsx");
    const faq = page("app/faq/page.tsx");
    const suggest = page("app/suggest-improvement/page.tsx");
    const pricing = page("app/pricing/page.tsx");
    expect(home).toMatch(/3-day|Start Free Trial/);
    expect(home).toContain("Related product paths");
    expect((home.match(/<h2[^>]*>\s*Who (?:OccupancyNPV is not for|should not use it|is this not for)/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect(how).toContain("Current OccupancyNPV workflow");
    expect(how).toContain("Rename or archive");
    expect(compare).toContain("What OccupancyNPV compares");
    expect(compare).toContain("discount-rate sensitivity");
    expect(resources).toContain("How to use these resources");
    expect(faq).toContain("Getting Started");
    expect(faq).toContain("does not automatically convert");
    expect(suggest).toContain("After you submit");
    expect(suggest).toContain("not a promise");
    expect(suggest).toContain("OccupancynpvPublicImprovementForm");
    expect(pricing).toContain("onpv-pricing-hero");
    expect(how).not.toContain("onpv-pricing-hero");
    expect(occupancynpvRelatedPathsSection()).toContain("/compare-commercial-leases");
    expect(occupancynpvRelatedPathsSection()).not.toContain("http://");
  });

  it("keeps auth concise and app pages task-oriented", () => {
    const login = page("app/occupancynpv/app/login/page.tsx");
    const app = page("app/occupancynpv/app/page.tsx");
    const workspace = page("app/occupancynpv/app/workspaces/[id]/page.tsx");
    expect(login).toContain("3-day free trial uses the same sign-in path");
    expect(login.length).toBeLessThan(4000);
    expect(app).toContain("Rename or archive saved work");
    expect(workspace).toContain("not legal or investment advice");
    expect(evaluatePageDepthBundle({ route: "/occupancynpv/app", html: app }).understanding.result).toBe("PASS");
    expect(evaluatePageDepthBundle({ route: "/occupancynpv/app/workspaces/:id", html: workspace }).understanding.result).toBe("PASS");
  });

  it("projects HQ page depth summary and completed mission work", () => {
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.page_depth_total).toBeGreaterThan(10);
    expect(view.page_depth_failed).toBe(0);
    expect(view.page_depth_unverified).toBe(0);
    expect(view.page_depth_thin_pages).toBe("NONE");
    expect(view.page_depth_rows.length).toBe(view.page_depth_total);
    expect(view.page_depth_summary).toMatch(/total/);
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_VENTURE_PAGE_DEPTH_UPLIFT_ID && row.status === "COMPLETED")).toBe(true);
  });

  it("preserves OccupancyNPV offer and checkout regression", () => {
    const pricing = page("app/pricing/page.tsx");
    expect(pricing).toContain("Start Free Trial");
    expect(pricing).toContain("$290");
    expect(pricing).toContain("$149");
    expect(pricing).toContain("3-day");
    expect(pricing.indexOf("Start Free Trial")).toBeLessThan(pricing.indexOf("How the 3-day free trial works"));
    expect(composed().files.some((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts")).toBe(true);
  });
});
