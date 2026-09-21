import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  articleHeadingStillChConstrained,
  evaluateFAQCompletenessGate,
  evaluateFounderRenderedCommercialContradictionGate,
  evaluateH1WidthUtilizationGate,
  evaluateH1WrapQualityGate,
  evaluateHeroCompositionGate,
  evaluateInteractiveTextContrastGate,
  evaluatePageDepthBundle,
  evaluateUnusedHeroSpaceBalanceGate,
  faqEvidenceGapCount,
  planCustomerPageDepthBeforeBuild,
} from "@/lib/infinity/customer-page-depth";
import {
  OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID,
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

const CRUSHED: Parameters<typeof evaluateH1WidthUtilizationGate>[0]["observation"] = {
  viewportWidth: 1440,
  containerWidth: 1120,
  h1Width: 286,
  h1Height: 280,
  availableTitleWidth: 1120,
  adjacentOccupiedWidth: 0,
  unusedHorizontalWidth: 834,
  lineCount: 5,
  headingLength: 72,
  fontSize: 34,
  lineHeight: 40,
  layout: "ARTICLE_INTRO",
  lastLineRatio: 0.22,
};

describe("OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_HARDENING_V1", () => {
  it("supersedes prior Resources and How It Works visual PASS", () => {
    const resources = evaluateFounderRenderedCommercialContradictionGate({
      gate: "HeroCompositionGate",
      automation_result: "PASS",
      founder_observes_failure: true,
      miss_reason: "H1_WIDTH_NOT_COMPARED_TO_AVAILABLE_LAYOUT",
    });
    const how = evaluateFounderRenderedCommercialContradictionGate({
      gate: "HeroCompositionGate",
      automation_result: "PASS",
      founder_observes_failure: true,
      miss_reason: "FIXED_CH_WIDTH_ACCEPTED_AS_COMPOSITION",
    });
    expect(resources.result).toBe("FAIL");
    expect(resources.automation_is_current_truth).toBe(false);
    expect(how.result).toBe("FAIL");
    expect(evaluateH1WidthUtilizationGate({ observation: CRUSHED }).result).toBe("FAIL");
    expect(evaluateH1WrapQualityGate({ observation: CRUSHED }).result).toBe("FAIL");
    expect(evaluateUnusedHeroSpaceBalanceGate({ observation: CRUSHED }).result).toBe("FAIL");
  });

  it("removes universal ch crush from article H1s without widening the homepage photo title to 100%", () => {
    const css = page("styles/globals.css");
    const resources = page("app/resources/page.tsx");
    const how = page("app/how-it-works/page.tsx");
    const home = page("app/page.tsx");
    expect(css).toContain(".onpv-article-h1");
    expect(css).toContain("max-width: min(42rem, 100%)");
    expect(articleHeadingStillChConstrained(resources, css)).toBe(false);
    expect(articleHeadingStillChConstrained(how, css)).toBe(false);
    expect(evaluateHeroCompositionGate({ html: resources, css }).result).toBe("PASS");
    expect(evaluateHeroCompositionGate({ html: how, css }).result).toBe("PASS");
    expect(home).toContain("onpv-home-title");
    expect(css).toMatch(/\.onpv-home-title[\s\S]{0,180}max-width:\s*28ch/);
    expect(resources).toContain("Commercial lease economics, grouped by how decisions are made");
    expect(how).toMatch(/From scattered terms to a .+ comparison without rebuilding the spreadsheet/);
    const articlePages = composed().files.filter((file) => {
      const path = file.path.replace(/\\/g, "/");
      return path.endsWith("/page.tsx") && /pv-article-hero|pv-hero-photo--article/.test(file.content);
    });
    expect(articlePages.length).toBeGreaterThan(8);
    expect(articlePages.every((file) => !articleHeadingStillChConstrained(file.content, css))).toBe(true);
  });

  it("keeps homepage conversion and FAQ depth after shared H1 CSS changes", () => {
    const home = page("app/page.tsx");
    const faq = page("app/faq/page.tsx");
    const bundle = evaluatePageDepthBundle({ route: "/faq", html: faq, pageType: "FAQ", archetype: "calculator" });
    expect(home).toContain("Start Free Trial");
    expect(home).toContain("onpv-see-pricing");
    expect(home).toContain("3-day");
    expect(evaluateInteractiveTextContrastGate({
      html: home,
      samples: [{ selector: ".onpv-see-pricing", foreground: { r: 247, g: 251, b: 255 }, background: { r: 11, g: 21, b: 32 }, onImageBackground: true }],
    }).result).toBe("PASS");
    expect(evaluateFAQCompletenessGate(faq).result).toBe("PASS");
    expect(bundle.question.result).toBe("PASS");
    expect(bundle.thinness.result).toBe("PASS");
    expect(bundle.gain.result).toBe("PASS");
    expect(faqEvidenceGapCount(faq)).toBe(3);
    expect(faq).toContain("Getting Started");
    expect([...faq.matchAll(/<h2/g)].length).toBeGreaterThanOrEqual(7);
  });

  it("inherits width gates globally and records the HQ mission", () => {
    const plan = planCustomerPageDepthBeforeBuild({ routes: ["/", "/resources"], archetype: "saas" });
    expect(plan.inherited_qc_gates).toEqual(expect.arrayContaining([
      "H1WidthUtilizationGate",
      "H1WrapQualityGate",
      "UnusedHeroSpaceBalanceGate",
      "HeroCompositionGate",
    ]));
    expect(plan.copy_occupancynpv_layout).toBe(false);
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_GLOBAL_H1_COMPOSITION_REPAIR_ID && row.status === "COMPLETED")).toBe(true);
  });
});
