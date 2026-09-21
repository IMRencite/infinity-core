import { describe, expect, it } from "vitest";
import ts from "typescript";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "@/lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";
import { projectVentureOfferArchitectureHq } from "@/lib/infinity/offer-architecture/hq";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration/compile";
import { authorizedBuildCompileInput } from "@/lib/infinity/venture-build-orchestration/fixtures";
import {
  CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE,
  OCCUPANCYNPV_MATERIAL_PUBLIC_PAGES,
  OCCUPANCYNPV_PRICING_DEPTH_REFERENCE,
  RELATED_PATHS_WIDTH_DEFECT_CAUSE,
  evaluateBuyerDecisionSupportGate,
  evaluateCommercialPageLayoutConsistencyGate,
  evaluateCustomerPageThinnessGate,
  evaluateGeneralContentRedundancyGate,
  evaluateMaterialQuestionCoverageGate,
  evaluatePageDepthBundle,
  evaluatePageInformationGainGate,
  evaluateProductUnderstandingGate,
  evaluateSectionContainerAlignmentGate,
  expectedDepthClass,
  factoryRequiresDepthPlanBeforePageBuild,
  hqCustomerPageDepthFields,
  invalidateDepthOnRewrite,
  inventoryVentureCustomerPages,
  materialQuestionsFor,
  pageTypeDepthPolicy,
  planCustomerPageDepthBeforeBuild,
  relatedPathsAligned,
  relatedPathsStructuralDefect,
  scorecardFromBundle,
} from "..";
import { occupancynpvCustomerPageDepthVerification } from "@/lib/infinity/universal-venture-system-qc/occupancynpv";
import { evaluateRenderedVisualQualityGate } from "@/lib/infinity/universal-venture-system-qc/visual";
import { ensureOccupancyNpvCanonicalWork, GLOBAL_PAGE_DEPTH_QC_WORK_ID, listCanonicalWork, resetCanonicalWorkStore } from "@/lib/infinity/canonical-work";

function composed() {
  return composeOccupancynpvPaymentReactivationFiles();
}

function pricing() {
  return composed().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

function css() {
  return composed().files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
}

function parseDiagnostics(source: string): string[] {
  const file = ts.createSourceFile("app/pricing/page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diagnostics = (file as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return diagnostics.map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n"));
}

const alignedRect = { left: 123, right: 1243, width: 1120 };
const repairedGeometry = {
  section: "related_product_paths",
  container: alignedRect,
  background: alignedRect,
  content: { left: 139, right: 1227, width: 1088 },
  overflowX: false,
};

describe("GLOBAL_PAGE_DEPTH_QC_OCCUPANCYNPV_LAYOUT_REPAIR_V1", () => {
  it("repairs related product paths width without an arbitrary offset", () => {
    const html = pricing();
    const styles = css();
    expect(RELATED_PATHS_WIDTH_DEFECT_CAUSE).toMatch(/pv-prose/);
    expect(RELATED_PATHS_WIDTH_DEFECT_CAUSE).toMatch(/52\/70/);
    expect(relatedPathsStructuralDefect(
      `<div className="vg-container pv-prose pv-authority-shell"><section data-section-type="SEMANTIC_NAVIGATION"><nav className="sn-block pv-wide-module"></nav></section></div>`,
      ".pv-prose .sn-block.pv-wide-module { width: var(--pv-authority-shell); }",
    )).toContain("RELATED_PATHS_NESTED_IN_PROSE_WITH_SHELL_BREAKOUT");
    expect(html).toContain("onpv-related-paths");
    expect(html).toContain("Related product paths");
    expect(html).not.toMatch(/onpv-related-paths[\s\S]{0,400}pv-wide-module/);
    expect(html).toMatch(/className="vg-container pv-authority-shell"/);
    expect(html.indexOf("onpv-related-paths")).toBeLessThan(html.indexOf("<VentureFooter"));
    expect(html.indexOf('className="vg-container pv-prose pv-authority-shell"')).toBeLessThan(html.indexOf("onpv-related-paths"));
    expect(relatedPathsAligned(html, styles)).toBe(true);
    expect(evaluateSectionContainerAlignmentGate([repairedGeometry]).result).toBe("PASS");
    expect(evaluateCommercialPageLayoutConsistencyGate({ related: repairedGeometry }).result).toBe("PASS");
    expect(evaluateSectionContainerAlignmentGate([{
      section: "related_product_paths",
      container: { left: 100, right: 932, width: 832 },
      background: { left: 100, right: 932, width: 832 },
      content: { left: 100, right: 1220, width: 1120 },
      overflowX: false,
    }]).result).toBe("FAIL");
    expect(evaluateRenderedVisualQualityGate({
      unstyled_controls: 0,
      layout_breaks: false,
      clipping: false,
      overflow: false,
      overlapping: false,
      hierarchy_ok: true,
      readable: true,
      buttons_malformed: false,
      related_paths_width_defect: true,
      section_alignment_fail: true,
    }).result).toBe("FAIL");
    expect(pricingUxReady(html)).toBe(true);
    expect(parseDiagnostics(html)).toEqual([]);
  });

  it("passes representative desktop and mobile section geometry without overflow", () => {
    for (const viewport of [
      { name: "1366x768", width: 1366 },
      { name: "1440x900", width: 1440 },
      { name: "mobile-390x844", width: 390 },
    ]) {
      const inset = viewport.width >= 1100 ? 123 : 16;
      const width = Math.min(viewport.width - inset * 2, 1120);
      const observation = {
        section: "related_product_paths",
        container: { left: inset, right: inset + width, width },
        background: { left: inset, right: inset + width, width },
        content: { left: inset + 16, right: inset + width - 16, width: width - 32 },
        overflowX: false,
      };
      expect(evaluateSectionContainerAlignmentGate([observation]).result).toBe("PASS");
      expect(observation.overflowX).toBe(false);
    }
  });

  it("locks customer-facing depth by intent and question coverage, not word count", () => {
    expect(CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE).toMatch(/NOT BY WORD COUNT/);
    expect(CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE).toMatch(/THIN PAGES FAIL QC/);
    expect(OCCUPANCYNPV_PRICING_DEPTH_REFERENCE).toBe("OCCUPANCYNPV_PRICING_DEPTH_PHILOSOPHY");
    const html = pricing();
    const bundle = evaluatePageDepthBundle({ route: "/pricing", html, pageType: "PRICING", archetype: "calculator" });
    expect(bundle.contract.word_count_sole_metric).toBe(false);
    expect(bundle.contract.status).toBe("PASS");
    expect(bundle.question.result).toBe("PASS");
    expect(bundle.gain.result).toBe("PASS");
    expect(bundle.decision.result).toBe("PASS");
    expect(bundle.understanding.result).toBe("PASS");
    expect(bundle.thinness.result).toBe("PASS");
    expect(bundle.redundancy.result).toBe("PASS");
    expect(occupancynpvCustomerPageDepthVerification({ html, css: css() }).status).toBe("PASS");
    const thin = "<h1>Pricing</h1><p>Buy OccupancyNPV.</p><button>Start Free Trial</button>";
    const thinBundle = evaluatePageDepthBundle({ route: "/pricing", html: thin, pageType: "PRICING" });
    expect(thinBundle.question.result).toBe("FAIL");
    expect(thinBundle.thinness.result).toBe("FAIL");
    expect(evaluateCustomerPageThinnessGate({
      html: thin,
      pageType: "PRICING",
      coverage: thinBundle.question,
      understanding: thinBundle.understanding,
      decision: thinBundle.decision,
    }).result).toBe("FAIL");
    const padded = `${html}<h2>How the 3-day free trial works</h2><p>lorem ipsum</p>`;
    expect(evaluatePageInformationGainGate(padded, "PRICING").result).toBe("FAIL");
    expect(evaluateGeneralContentRedundancyGate(`${html}${html}`).result).toBe("FAIL");
  });

  it("keeps page-type and archetype proportionality", () => {
    expect(expectedDepthClass("PRICING")).toBe("DEEP_RESOURCE");
    expect(expectedDepthClass("PRODUCT")).toBe("DEEP_RESOURCE");
    expect(expectedDepthClass("SERVICE")).toBe("DEEP_RESOURCE");
    expect(expectedDepthClass("RESOURCE", "/resources")).toBe("DEFINITIVE_RESOURCE");
    expect(expectedDepthClass("HOMEPAGE")).toBe("STANDARD_RESOURCE");
    expect(expectedDepthClass("LOGIN")).toBe("DIRECT_RESPONSE");
    expect(expectedDepthClass("NOT_FOUND")).toBe("DIRECT_RESPONSE");
    expect(expectedDepthClass("LEGAL")).toBe("DIRECT_RESPONSE");
    expect(pageTypeDepthPolicy("PRICING")).toBe("PASS");
    expect(evaluateMaterialQuestionCoverageGate({ html: "<h1>Sign in</h1><p>Use your account.</p>", pageType: "LOGIN" }).result).toBe("N/A");
    expect(evaluateMaterialQuestionCoverageGate({ html: "<h1>Privacy</h1><p>Complete legal copy.</p>", pageType: "LEGAL" }).result).toBe("N/A");
    expect(evaluateBuyerDecisionSupportGate("<h1>404</h1>", "NOT_FOUND").result).toBe("N/A");
    const ecommerceQuestions = materialQuestionsFor({ pageType: "PRICING", archetype: "ecommerce" });
    expect(ecommerceQuestions.some((row) => row.id === "saved_work")).toBe(false);
    expect(ecommerceQuestions.some((row) => row.id === "auto_bill")).toBe(false);
    const media = evaluateProductUnderstandingGate(
      "<h1>Weekly essays</h1><p>New episode every Friday. Subscribe to the channel.</p>",
      "HOMEPAGE",
      "creator_media",
    );
    expect(media.result).toBe("PASS");
    expect(evaluateBuyerDecisionSupportGate(
      "<h1>Store</h1><p>Buy the jacket. $80. Ships in 3 days. Add to cart. Returns accepted.</p>",
      "PRICING",
      "ecommerce",
    ).result).toBe("PASS");
  });

  it("inventories OccupancyNPV material pages and invalidates depth PASS on rewrite", () => {
    const html = pricing();
    const rows = inventoryVentureCustomerPages({
      pages: OCCUPANCYNPV_MATERIAL_PUBLIC_PAGES.map((route) => ({
        route,
        html: route === "/pricing"
          ? html
          : route.includes("login")
            ? "<h1>Sign in</h1><p>Use your OccupancyNPV account.</p>"
            : route.includes("privacy") || route.includes("terms")
              ? "<h1>Legal</h1><p>Complete legal copy.</p>"
              : undefined,
      })),
    });
    expect(rows).toHaveLength(OCCUPANCYNPV_MATERIAL_PUBLIC_PAGES.length);
    expect(rows.every((row) => ["PASS", "FAIL", "N/A", "UNVERIFIED"].includes(row.status))).toBe(true);
    expect(rows.find((row) => row.route === "/pricing")?.status).toBe("PASS");
    expect(rows.find((row) => row.route === "/occupancynpv/app/login")?.status).toBe("N/A");
    expect(rows.find((row) => row.route === "/privacy-policy")?.status).toBe("N/A");
    expect(rows.filter((row) => row.status === "UNVERIFIED").length).toBeGreaterThan(0);
    expect(invalidateDepthOnRewrite({
      previous_signature: "v1",
      current_signature: "v2",
      previous_status: "PASS",
    })).toBe("UNVERIFIED");
    expect(invalidateDepthOnRewrite({
      previous_signature: "v1",
      current_signature: "v1",
      previous_status: "PASS",
    })).toBe("PASS");
  });

  it("plans depth before page build and projects HQ scorecard fields", () => {
    expect(factoryRequiresDepthPlanBeforePageBuild()).toBe(true);
    const plan = planCustomerPageDepthBeforeBuild({
      routes: ["/", "/pricing", "/how-it-works"],
      archetype: "saas",
    });
    expect(plan.word_count_sole_metric).toBe(false);
    expect(plan.copy_occupancynpv_layout).toBe(false);
    expect(plan.pages[1]?.material_question_plan.length).toBeGreaterThan(5);
    expect(plan.pages[1]?.buyer_question_map.length).toBeGreaterThan(0);
    const compiled = compileExecutableVenturePlan(authorizedBuildCompileInput());
    expect(compiled.plan.phases.some((phase) => phase.phase === "CONTENT_ASSET_BUILD")).toBe(true);
    expect(compiled.plan.tasks.some((task) => task.expectedArtifact === "page_depth_plan")).toBe(true);
    const build = compiled.plan.tasks.find((task) => task.phase === "PRODUCT_BUILD")!;
    const depth = compiled.plan.tasks.find((task) => task.expectedArtifact === "page_depth_plan")!;
    expect(build.dependencies).toContain(depth.taskId);
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.page).toBe("/pricing");
    expect(view.information_depth).toBe("PASS");
    expect(view.question_coverage).toBe("PASS");
    expect(view.product_understanding).toBe("PASS");
    expect(view.buyer_decision_support).toBe("PASS");
    expect(view.information_gain).toBe("PASS");
    expect(view.thinness).toBe("PASS");
    expect(view.missing_material_questions).toBe(0);
    const scorecard = scorecardFromBundle("/pricing", evaluatePageDepthBundle({
      route: "/pricing",
      html: pricing(),
      pageType: "PRICING",
    }));
    expect(hqCustomerPageDepthFields(scorecard).question_coverage).toBe("PASS");
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === GLOBAL_PAGE_DEPTH_QC_WORK_ID && row.title.includes("Global Page Depth QC"))).toBe(true);
  });

  it("preserves OccupancyNPV pricing regression markers", () => {
    const html = pricing();
    expect(html).toContain("hero-building.webp");
    expect(html).toContain("Start Free Trial");
    expect(html).toContain("3-day");
    expect(html).toContain("$290");
    expect(html).toContain("$149");
    expect(html).toContain("How the 3-day free trial works");
    expect(html).toContain("Pricing questions");
    expect(html).toContain("Related product paths");
    expect(html).toContain("/api/checkout/start");
    expect(html.indexOf("Start Free Trial")).toBeLessThan(html.indexOf("How the 3-day free trial works"));
  });
});
