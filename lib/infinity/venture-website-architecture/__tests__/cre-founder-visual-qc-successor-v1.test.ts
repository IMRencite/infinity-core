import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { getCanonicalActivePublicValidationState } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { reconstructCreFounderVisualQcSuccessor } from "../cre-founder-visual-qc-successor";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import {
  evaluateHeroContentSeparation,
  evaluateSemanticNavigationRenderedQuality,
  FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE,
  FOUNDER_LEARN_NEXT_NAV_FIXTURE,
  GOOD_SEMANTIC_NAV_RENDERED_FIXTURE,
} from "../public-authority-standard/hero-content-separation";
import { evaluateCardTextRhythm } from "../public-authority-standard/card-text-rhythm";
import { evaluateRenderedRouteClassCoverage } from "../public-authority-standard/rendered-route-class-coverage";
import { evaluateSemanticNavigationQuality } from "../public-authority-standard/semantic-navigation-quality";
import {
  evaluateSemanticContentRedundancy,
  evaluateSemanticNavSurfaceRedundancy,
  extractRedundancyBlocks,
  extractSemanticNavSurfaces,
} from "../public-authority-standard/semantic-content-redundancy";
import { evaluateVisualDeadSpace } from "../visual-quality-gates";
import { evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { pageContent } from "../answer-authority/page-inspect";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateExpandedPublicAuthorityPublishability,
  evaluateSearchIntentConversionPath,
  evaluateTopicGraphConnectivity,
} from "../authority-expansion-gates";
import { VISUAL_COMPOSITION_VIEWPORTS } from "../visual-composition-browser";
import {
  FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
  authorityExpansionRouteManifest,
} from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { REJECTED_CIRCLE_ONLY_ICON, REJECTED_PAUSE_COMPARE_ICON } from "../founder-visual-qc-icons";
import { AUTHORITY_FINAL_POLISH_CSS } from "../authority-final-polish-css";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    lastInboundProcessed: string | null;
    mode: string;
  };
}

function toStaticHtml(tsx: string): string {
  return tsx
    .replace(/className=/g, "class=")
    .replace(/width=\{(\d+)\}/g, 'width="$1"')
    .replace(/height=\{(\d+)\}/g, 'height="$1"')
    .replace(/fetchPriority="high"/g, "")
    .replace(/\{JSON\.stringify\(([^)]+)\)\}/g, '"$1"');
}

function chunkCount(files: Array<{ path: string; content: string; encoding?: string }>): number {
  return files
    .filter((file) => file.encoding !== "base64")
    .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
}

describe("CRE founder visual QC primitives", () => {
  it("reproduces the how-it-works hero overlap the previous 900px sample missed", () => {
    const gate = evaluateHeroContentSeparation(FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.mediaOverlapPx).toBeGreaterThan(0);
    expect(gate.initialContainingBlockRisk).toBe(true);
  });

  it("requires stacked hero/media non-intersection and breathing room", () => {
    expect(
      evaluateHeroContentSeparation({
        hero: { top: 0, height: 640 },
        media: { top: 0, height: 352 },
        following: { top: 700, height: 900 },
        firstBodyText: { top: 700, height: 40 },
        css: `header.pv-hero { position: relative; }
.pv-hero-photo--article { position: relative; }
.pv-hero-photo--article .pv-hero-media { position: relative; }`,
      }),
    ).toMatchObject({ overall: "PASS", overlapPx: 0, mediaOverlapPx: 0 });
  });

  it("proves presence-only semantic nav can pass while rendered quality fails", () => {
    const presence = evaluateSemanticNavigationQuality({
      blocks: [
        {
          variant: "LEARN_NEXT",
          title: "Learn the ideas behind the steps",
          pageRoute: "/how-it-works",
          pageArchetype: "HOW_TO",
          cards: [
            { title: "Compare two leases", description: "Use one method on both offers.", href: "/compare-commercial-leases/", icon: "compare", relationship: "related" },
            { title: "What is NPV", description: "NPV turns later costs into today's dollars.", href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", icon: "question", relationship: "related" },
            { title: "Discount rate", description: "The discount rate is the price of waiting.", href: "/commercial-lease-npv/what-discount-rate-should-you-use/", icon: "question", relationship: "related" },
          ],
        },
      ],
      pageArchetype: "HOW_TO",
    });
    expect(presence.overall).toBe("PASS");
    const rendered = evaluateSemanticNavigationRenderedQuality({
      ...FOUNDER_LEARN_NEXT_NAV_FIXTURE,
      css: `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_LEARN_NEXT_NAV_FIXTURE.css}`,
    });
    expect(rendered.overall).toBe("FAIL");
    expect(rendered.iconDistinctness).toBe("FAIL");
    expect(rendered.equalRowHeight).toBe("FAIL");
    expect(rendered.lastLineOrphan).toBe("FAIL");
    expect(rendered.kickerTitleRedundancy).toBe("FAIL");
  });

  it("rejects circle-only, missing glyph, mixed family, LEARN+Learn, and orphans", () => {
    expect(
      evaluateSemanticNavigationRenderedQuality({
        css: FOUNDER_LEARN_NEXT_NAV_FIXTURE.css,
        iconPaths: [REJECTED_CIRCLE_ONLY_ICON],
        cardHeights: [100],
        lastLineWordCounts: [2],
      }).failures,
    ).toContain("undifferentiated_circle_icon");
    expect(
      evaluateSemanticNavigationRenderedQuality({
        css: FOUNDER_LEARN_NEXT_NAV_FIXTURE.css,
        iconPaths: [""],
        cardHeights: [100],
        lastLineWordCounts: [2],
      }).failures,
    ).toContain("missing_icon_glyph");
    expect(
      evaluateSemanticNavigationRenderedQuality({
        css: FOUNDER_LEARN_NEXT_NAV_FIXTURE.css,
        iconPaths: [REJECTED_PAUSE_COMPARE_ICON, REJECTED_CIRCLE_ONLY_ICON],
        cardHeights: [100, 120],
        lastLineWordCounts: [2, 2],
      }).failures,
    ).toContain("inconsistent_pause_vs_dot_icons");
    expect(evaluateSemanticNavSurfaceRedundancy([{ kicker: "LEARN NEXT", heading: "Learn the ideas" }]).overall).toBe("FAIL");
    expect(evaluateCardTextRhythm({ lastLineWordCounts: [1, 3] }).overall).toBe("FAIL");
  });

  it("passes the good semantic-nav rendered fixture on both gates", () => {
    const presence = evaluateSemanticNavigationQuality({
      blocks: [
        {
          variant: "LEARN_NEXT",
          title: GOOD_SEMANTIC_NAV_RENDERED_FIXTURE.title,
          pageRoute: "/how-it-works",
          pageArchetype: "HOW_TO",
          cards: GOOD_SEMANTIC_NAV_RENDERED_FIXTURE.titles.map((title, index) => ({
            title,
            description: GOOD_SEMANTIC_NAV_RENDERED_FIXTURE.descriptions[index] ?? "",
            href: `/related-${index}/`,
            icon: "question",
            relationship: "related",
          })),
        },
      ],
      pageArchetype: "HOW_TO",
    });
    expect(presence.overall).toBe("PASS");
    expect(evaluateSemanticNavigationRenderedQuality(GOOD_SEMANTIC_NAV_RENDERED_FIXTURE).overall).toBe("PASS");
    expect(evaluateVisualDeadSpace(GOOD_SEMANTIC_NAV_RENDERED_FIXTURE.html).overall).toBe("PASS");
  });

  it("requires how-it-works and every material route class in the visual sample", () => {
    expect(FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES).toContain("/how-it-works");
    const coverage = evaluateRenderedRouteClassCoverage({
      sampledRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
      requiredRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
    });
    expect(coverage.overall).toBe("PASS");
    expect(coverage.howItWorksSampled).toBe(true);
    expect(coverage.missingClasses).toEqual([]);
    expect(
      evaluateRenderedRouteClassCoverage({
        sampledRoutes: ["/", "/pricing"],
        requiredRoutes: ["/how-it-works"],
      }).overall,
    ).toBe("FAIL");
  });
});

describe("CRE founder visual QC successor v1", () => {
  const clockBefore = inspectExperimentClock();
  const evidenceBefore = inspectRealMarketEvidence();
  const observerBefore = observerState();
  let successor: Awaited<ReturnType<typeof reconstructCreFounderVisualQcSuccessor>>;
  let screenshotCount = 0;
  let measurementCount = 0;

  beforeAll(async () => {
    successor = await reconstructCreFounderVisualQcSuccessor();
  }, 180000);

  it("builds a successor from the locked polish artifact without deploying", () => {
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(successor.routes).toBe(57);
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).not.toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID);
  });

  it("repairs how-it-works hero containment and semantic nav rendered quality", () => {
    const how = pageContent(successor.files, "/how-it-works");
    expect(how).toContain("pv-hero-photo--article");
    expect(how).toContain("pv-hero-media");
    expect(how).not.toContain(REJECTED_CIRCLE_ONLY_ICON);
    expect(how).not.toContain(REJECTED_PAUSE_COMPARE_ICON);
    expect(how).not.toMatch(/LEARN NEXT[\s\S]{0,120}Learn /);
    expect(how).toContain("Explore the ideas behind the steps");
    expect(how).toContain("improvement");
    expect(how).toContain("ranked");
    expect(how).toContain("adding");
    expect(how).toContain("number");
    expect(successor.hero.overall).toBe("PASS");
    expect(successor.navigation.rendered.overall).toBe("PASS");
    expect(successor.navigation.rhythm.overall).toBe("PASS");
    expect(successor.routeCoverage.overall).toBe("PASS");
    expect(successor.routeCoverage.howItWorksSampled).toBe(true);
    const surfaces = extractSemanticNavSurfaces(how);
    expect(evaluateSemanticNavSurfaceRedundancy(surfaces).overall).toBe("PASS");
  });

  it("keeps footer, 57 routes, readability, SEO/GEO, and no content-scale change", () => {
    const blob = successor.files.filter((file) => file.encoding !== "base64").map((file) => file.content).join("\n");
    expect(blob).toContain("An Infinity OS Venture");
    expect(blob).not.toContain("An Infinite OS Venture");
    expect(successor.footerAttribution.ok).toBe(true);
    const pub = evaluateExpandedPublicAuthorityPublishability(successor.files);
    expect(pub.failures, pub.failures.join(",")).toEqual([]);
    expect(pub.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(evaluateTopicGraphConnectivity(successor.files).overall).toBe("PASS");
    expect(evaluateSearchIntentConversionPath(successor.files).overall).toBe("PASS");
    expect(evaluateAboveFoldVisualCoverage(successor.files).overall).toBe("PASS");
    expect(chunkCount(successor.files)).toBe(220);
    const cardCopy = [...new Set([...blob.matchAll(/sn-desc">([\s\S]*?)</g)].map((item) => item[1] ?? "").filter(Boolean))].join(" ");
    const read = evaluateHumanReadabilityGate(cardCopy);
    expect(read.failures, read.failures.join(",")).toEqual([]);
    expect(read.overall).toBe("PASS");
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
      }).ready,
    ).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    const cam = pageContent(successor.files, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
    expect(cam).not.toMatch(/The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/);
    expect(evaluateSemanticContentRedundancy({
      blocks: extractRedundancyBlocks(pageContent(successor.files, "/how-it-works")),
      html: pageContent(successor.files, "/how-it-works"),
    }).kickerHeadingRedundant).toBe(0);
  });

  it("preserves the CRE experiment clock, evidence, and Gmail observer checkpoint", () => {
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe(observerBefore.mode);
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
    expect(observerAfter.lastInboundProcessed).toBe(observerBefore.lastInboundProcessed);
  });

  it("captures hero geometry and semantic-nav screenshots at 1440, 1280, and 390", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const routes = [
      "/",
      "/how-it-works",
      "/commercial-lease-npv",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
      "/effective-rent/effective-rent-vs-npv",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease",
      "/for/tenant-rep-brokers",
      "/pricing",
      "/resources",
    ];
    const dir = path.join(tmpdir(), `cre-founder-visual-qc-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    const measurements: Array<Record<string, unknown>> = [];
    let overflow = 0;
    try {
      for (const route of routes) {
        const footer = toStaticHtml(successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
        const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(successor.files, route))}${footer}</body></html>`;
        expect(html).toContain("An Infinity OS Venture");
        expect(html).not.toContain("An Infinite OS Venture");
        for (const [name, width] of Object.entries(VISUAL_COMPOSITION_VIEWPORTS)) {
          const page = await browser.newPage();
          const tall = route === "/how-it-works" && name !== "mobile";
          await page.setViewportSize({ width, height: name === "mobile" ? 844 : tall ? 1600 : 900 });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          const file = path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${name}.png`);
          await page.screenshot({ path: file, fullPage: false });
          screenshotCount += 1;
          const metrics = await page.evaluate(`(() => {
            const box = (el) => {
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, height: r.height, width: r.width };
            };
            const hero = document.querySelector("header.pv-hero, .pv-hero");
            const media = document.querySelector(".pv-hero-media");
            const next = hero ? hero.nextElementSibling : null;
            const first = next ? next.querySelector("h2, p") : null;
            const heading = [...document.querySelectorAll("h2")].find((el) => /Term normalization and cash-flow generation/i.test(el.textContent || ""));
            const cards = [...document.querySelectorAll(".sn-card")];
            const heights = cards.map((card) => card.getBoundingClientRect().height);
            const rows = [];
            for (const card of cards) {
              const top = Math.round(card.getBoundingClientRect().top);
              let row = rows.find((item) => Math.abs(item.top - top) < 8);
              if (!row) {
                row = { top, heights: [] };
                rows.push(row);
              }
              row.heights.push(card.getBoundingClientRect().height);
            }
            const rowSpread = rows.reduce((max, row) => {
              if (row.heights.length < 2) return max;
              return Math.max(max, Math.max(...row.heights) - Math.min(...row.heights));
            }, 0);
            const icons = [...document.querySelectorAll(".sn-icon svg")].map((el) => el.getBoundingClientRect());
            return {
              overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
              footer: document.body.innerText.includes("An Infinity OS Venture"),
              hero: box(hero),
              media: box(media),
              nextSection: box(next),
              firstBody: box(first),
              termHeading: box(heading || null),
              mediaNextOverlap: box(media) && box(next) ? Math.max(0, box(media).bottom - box(next).top) : 0,
              mediaHeadingOverlap: box(media) && box(heading || null) ? Math.max(0, box(media).bottom - box(heading).top) : 0,
              cardHeights: heights,
              iconCount: icons.length,
              emptyIcons: icons.filter((el) => el.width < 8 || el.height < 8).length,
              rowSpread,
              nav: Boolean(document.querySelector(".sn-block")),
              kicker: (document.querySelector(".sn-kicker") || {}).textContent || "",
              title: (document.querySelector(".sn-title") || {}).textContent || "",
            };
          })()`) as Record<string, unknown>;
          measurementCount += 1;
          measurements.push({ route, viewport: name, ...metrics });
          if ((metrics.overflowX as number) > 1) overflow += 1;
          expect(metrics.footer, `${route}:${name}`).toBe(true);
          if (route === "/how-it-works") {
            expect(metrics.mediaNextOverlap, `${route}:${name}`).toBe(0);
            expect(metrics.mediaHeadingOverlap, `${route}:${name}`).toBe(0);
          }
          if (metrics.nav) {
            expect(metrics.emptyIcons, `${route}:${name}`).toBe(0);
            expect(metrics.rowSpread as number, `${route}:${name}`).toBeLessThanOrEqual(8);
            expect(String(metrics.kicker).split(/\s+/)[0]?.toLowerCase()).not.toBe(
              String(metrics.title).split(/\s+/)[0]?.toLowerCase(),
            );
          }
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    writeFileSync(path.join(dir, "measurements.json"), `${JSON.stringify(measurements, null, 2)}\n`);
    writeFileSync(path.join(process.cwd(), ".infinity", "cre-founder-visual-qc-measurements.json"), `${JSON.stringify({ screenshotCount, measurementCount, overflow, measurements }, null, 2)}\n`);
    expect(overflow).toBe(0);
    expect(screenshotCount).toBe(routes.length * 3);
    expect(measurementCount).toBe(routes.length * 3);
  }, 180000);

  it("builds the founder visual QC successor in a clean-room production build without deploying", async () => {
    const gate = await runProviderEquivalentArtifactBuildGate({
      artifactId: successor.artifactId,
      files: successor.files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content })),
      mode: "full",
      freeze: false,
      keepRoot: false,
    });
    expect(gate.nextBuild).toBe("PASS");
  }, 600000);
});
