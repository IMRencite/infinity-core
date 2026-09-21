import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  contrastRatio,
  evaluateFAQCompletenessGate,
  evaluateFounderRenderedCommercialContradictionGate,
  evaluateHeroCompositionGate,
  evaluateInteractiveTextContrastGate,
  evaluatePageDepthBundle,
  faqEvidenceGapCount,
  factoryRequiresDepthPlanBeforePageBuild,
  planCustomerPageDepthBeforeBuild,
} from "@/lib/infinity/customer-page-depth";
import { evaluateCommercialVisualHierarchyGate } from "@/lib/infinity/offer-architecture/founder-viewport-commercial-qc";
import { evaluateHeroTextReadabilityGate } from "@/lib/infinity/offer-architecture/pricing-page-quality";
import {
  OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";

function page(path: string): string {
  return composeOccupancynpvPaymentReactivationFiles().files
    .find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

describe("OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_QC_HARDENING_V1", () => {
  it("supersedes prior homepage and FAQ automated PASS when founder evidence contradicts", () => {
    const home = evaluateFounderRenderedCommercialContradictionGate({
      gate: "RenderedVisualQualityGate",
      automation_result: "PASS",
      founder_observes_failure: true,
      miss_reason: "SOURCE_QC_IGNORED_HERO_DENSITY_AND_PHOTO_CONTRAST",
    });
    const faq = evaluateFounderRenderedCommercialContradictionGate({
      gate: "MaterialQuestionCoverageGate",
      automation_result: "PASS",
      founder_observes_failure: true,
      miss_reason: "FAQ_MARKERS_TOO_SHALLOW_FOR_BUYER_CLUSTERS",
    });
    expect(home.result).toBe("FAIL");
    expect(home.automation_historical).toBe("PASS");
    expect(home.automation_is_current_truth).toBe(false);
    expect(faq.result).toBe("FAIL");
    expect(faq.automation_historical).toBe("PASS");
  });

  it("recomposes the homepage hero and makes See pricing readable", () => {
    const html = page("app/page.tsx");
    const css = page("styles/globals.css");
    const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
    expect(html).toContain("onpv-home-hero");
    expect(html).toContain("onpv-home-title");
    expect(html).toContain("Compare commercial lease economics without rebuilding the spreadsheet.");
    expect(html).toContain("Start Free Trial");
    expect(html).toContain("onpv-see-pricing");
    expect(html).toContain("$290");
    expect(html).toContain("$149");
    expect(html).toContain("3-day");
    expect(header).not.toContain("AnswerFirst");
    expect(header).not.toMatch(/>Request Pilot Access</);
    expect(header).not.toContain("vg-cta--secondary");
    expect(html).toContain("onpv-home-support");
    expect(css).toContain(".onpv-see-pricing");
    expect(css).toContain(".onpv-faq h2");
    expect(evaluateHeroCompositionGate({ html }).result).toBe("PASS");
    expect(evaluateInteractiveTextContrastGate({
      html,
      samples: [{
        selector: ".onpv-see-pricing",
        foreground: { r: 247, g: 251, b: 255 },
        background: { r: 11, g: 21, b: 32 },
        onImageBackground: true,
      }],
    }).result).toBe("PASS");
    expect(contrastRatio({ r: 247, g: 251, b: 255 }, { r: 11, g: 21, b: 32 })).toBeGreaterThan(4.5);
    expect(evaluateCommercialVisualHierarchyGate(html).result).toBe("PASS");
    expect(evaluateInteractiveTextContrastGate({
      html: '<header className="pv-hero-photo"><a className="vg-cta vg-cta--secondary" href="/pricing">See pricing</a></header>',
    }).result).toBe("FAIL");
  });

  it("expands FAQ by cluster and no longer treats shallow marker coverage as enough", () => {
    const html = page("app/faq/page.tsx");
    const bundle = evaluatePageDepthBundle({ route: "/faq", html, pageType: "FAQ", archetype: "calculator" });
    expect(html).toContain("Getting Started");
    expect(html).toContain("Using OccupancyNPV");
    expect(html).toContain("Lease Analysis");
    expect(html).toContain("Accounts");
    expect(html).toContain("Billing");
    expect(html).toContain("Limitations");
    expect(html).not.toContain("Pricing-page FAQ already covers");
    expect(evaluateFAQCompletenessGate(html).result).toBe("PASS");
    expect(bundle.question.result).toBe("PASS");
    expect(bundle.thinness.result).toBe("PASS");
    expect(bundle.gain.result).toBe("PASS");
    expect(faqEvidenceGapCount(html)).toBe(3);
    expect(evaluateFAQCompletenessGate("<h1>FAQ</h1><h3>Price?</h3><p>See pricing.</p>").result).toBe("FAIL");
  });

  it("keeps pricing hero readability and factory inheritance", () => {
    const pricing = page("app/pricing/page.tsx");
    expect(evaluateHeroTextReadabilityGate(pricing).result).toBe("PASS");
    expect(pricing).toContain("$290");
    expect(page("app/how-it-works/page.tsx")).toContain("Current OccupancyNPV workflow");
    expect(page("app/compare-commercial-leases/page.tsx")).toContain("What OccupancyNPV compares");
    expect(page("app/resources/page.tsx")).toContain("How to use these resources");
    expect(factoryRequiresDepthPlanBeforePageBuild()).toBe(true);
    expect(planCustomerPageDepthBeforeBuild({ routes: ["/faq"] }).inherited_qc_gates).toEqual([
      "HeroCompositionGate",
      "InteractiveTextContrastGate",
      "FAQCompletenessGate",
      "FounderRenderedCommercialContradictionGate",
      "H1WidthUtilizationGate",
      "H1WrapQualityGate",
      "UnusedHeroSpaceBalanceGate",
      "PrimaryActionDiscoverabilityGate",
      "AppActionHierarchyGate",
      "InteractiveControlVisualHierarchyGate",
      "FounderRenderedUXContradictionGate",
      "VentureFaviconGate",
    ]);
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_FOUNDER_VISUAL_FAQ_REPAIR_ID && row.status === "COMPLETED")).toBe(true);
  });
});
