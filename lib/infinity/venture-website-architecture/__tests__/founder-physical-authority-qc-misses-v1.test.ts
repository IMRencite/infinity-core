import { describe, expect, it } from "vitest";
import { resolveVisualEvidenceConflict } from "../public-authority-standard/publishability";
import {
  evaluateHeroContentSeparation,
  evaluateSemanticNavigationRenderedQuality,
  FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE,
  FOUNDER_LEARN_NEXT_NAV_FIXTURE,
} from "../public-authority-standard/hero-content-separation";
import { evaluateSemanticNavigationQuality } from "../public-authority-standard/semantic-navigation-quality";
import { AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { AUTHORITY_FINAL_POLISH_CSS } from "../authority-final-polish-css";
import { semanticNavigationForRoute } from "../authority-final-polish-nav";

describe("Founder physical authority QC misses v1", () => {
  it("does not treat the current polish as founder-accepted", () => {
    expect(resolveVisualEvidenceConflict({
      founderPhysicalBrowser: "FAIL",
      servedScreenshot: "FAIL",
      computedGeometry: "PASS",
      compiledCss: "PASS",
      sourceCss: "PASS",
    })).toMatchObject({
      governingLayer: "FOUNDER_PHYSICAL_BROWSER_EVIDENCE",
      overall: "FAIL",
      automatedPassOverridden: true,
    });
  });

  it("fails the how-it-works hero overlap the previous live sample never measured", () => {
    expect(AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES).toContain("/how-it-works");
    const previousSampleMissedHowItWorks = [
      "/",
      "/commercial-lease-npv",
      "/pricing",
      "/resources",
      "/for/tenant-rep-brokers",
    ];
    expect(previousSampleMissedHowItWorks).not.toContain("/how-it-works");
    const gate = evaluateHeroContentSeparation(FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.overlapPx).toBeGreaterThan(2);
    expect(gate.mediaOverlapPx).toBeGreaterThan(2);
    expect(gate.failures).toContain("hero_media_intersects_body");
    expect(gate.initialContainingBlockRisk).toBe(true);
    expect(
      evaluateHeroContentSeparation({
        hero: { top: 0, height: 420 },
        following: { top: 460, height: 800 },
        media: { top: 0, height: 352 },
        firstBodyText: { top: 460, height: 40 },
        css: `header.pv-hero { position: relative; overflow: hidden; }
.pv-hero-photo { position: relative; overflow: hidden; }
.pv-hero-photo--article { position: relative; }
.pv-hero-photo--article .pv-hero-media { position: relative; }`,
      }).overall,
    ).toBe("PASS");
  });

  it("fails the Learn Next icon, height, orphan, and kicker defects that presence-only QC passed", () => {
    const presenceOnly = evaluateSemanticNavigationQuality({
      blocks: [
        {
          variant: "LEARN_NEXT",
          title: "Learn the ideas behind the steps",
          pageRoute: "/how-it-works",
          pageArchetype: "HOW_TO",
          cards: [
            { title: "Compare two leases", description: "Use one method on both offers.", href: "/compare-commercial-leases/", icon: "compare", relationship: "commercial-path" },
            { title: "What is NPV in a commercial lease", description: "NPV turns later lease costs into today's dollars so you can compare options fairly.", href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", icon: "question", relationship: "related" },
            { title: "What discount rate should be used", description: "The discount rate is the price of waiting.", href: "/commercial-lease-npv/what-discount-rate-should-you-use/", icon: "question", relationship: "related" },
          ],
        },
      ],
      pageArchetype: "HOW_TO",
    });
    expect(presenceOnly.overall).toBe("PASS");
    const rendered = evaluateSemanticNavigationRenderedQuality({
      ...FOUNDER_LEARN_NEXT_NAV_FIXTURE,
      css: `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_LEARN_NEXT_NAV_FIXTURE.css}`,
    });
    expect(rendered.overall).toBe("FAIL");
    expect(rendered.iconDistinctness).toBe("FAIL");
    expect(rendered.equalRowHeight).toBe("FAIL");
    expect(rendered.lastLineOrphan).toBe("FAIL");
    expect(rendered.kickerTitleRedundancy).toBe("FAIL");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HeroContentSeparationGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SemanticNavigationRenderedQualityGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedRouteClassCoverageGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("CardTextRhythmGate");
  });

  it("shows the frozen polish nav still emits the founder-visible icon mix", () => {
    const plan = semanticNavigationForRoute("/how-it-works");
    expect(plan?.variant).toBe("LEARN_NEXT");
    expect(plan?.title.toLowerCase().startsWith("learn")).toBe(true);
    const icons = (plan?.cards ?? []).map((card) => card.icon);
    expect(icons).toContain("compare");
    expect(icons.some((icon) => icon === "question" || icon === "topic")).toBe(true);
  });
});
