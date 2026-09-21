import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { getCanonicalActivePublicValidationState } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { reconstructCreSearchDepthSuccessor } from "../cre-search-depth-successor";
import { reconstructCreAuthorityWidthSuccessor } from "../cre-authority-width-successor";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { HARD_PUBLISHABILITY_GATES, CANONICAL_PUBLIC_FOOTER_ATTRIBUTION } from "../public-authority-standard/constants";
import { evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";
import {
  evaluateSectionSurfaceRhythm,
  evaluateSectionSurfaceContrast,
  AUTHORITY_SECTION_SURFACE_SYSTEM_CONTRACT,
} from "../public-authority-standard/section-surface-system";
import { DEPTH_QUESTION_PAGES, assertDepthCatalogLocks } from "../search-demand-depth-catalog";
import {
  searchDemandEvidenceRollup,
  rejectedQuotaPadding,
  topicDepthCoverageTable,
  currentStandaloneRoutesForTopic,
  promotionExamples,
} from "../search-demand-depth-research";
import { searchResearchSummary, TOPIC_IDS } from "../search-validated-question-graph";
import { searchDepthRouteManifest, authorityExpansionRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { evaluateHeroContentSeparation, FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE } from "../public-authority-standard/hero-content-separation";
import { pageContent } from "../answer-authority/page-inspect";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateSearchIntentConversionPath,
} from "../authority-expansion-gates";

function toStaticHtml(tsx: string): string {
  return tsx
    .replace(/className=/g, "class=")
    .replace(/width=\{(\d+)\}/g, 'width="$1"')
    .replace(/height=\{(\d+)\}/g, 'height="$1"')
    .replace(/fetchPriority="high"/g, "")
    .replace(/\{JSON\.stringify\(([^)]+)\)\}/g, '"$1"');
}

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
  };
}

function chunkCount(files: Array<{ path: string; content: string; encoding?: string }>): number {
  return files
    .filter((file) => file.encoding !== "base64")
    .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
}

describe("CRE search-demand authority depth + section rhythm v1", () => {
  const clockBefore = inspectExperimentClock();
  const evidenceBefore = inspectRealMarketEvidence();
  const observerBefore = observerState();
  let successor: Awaited<ReturnType<typeof reconstructCreSearchDepthSuccessor>>;

  beforeAll(async () => {
    successor = await reconstructCreSearchDepthSuccessor();
  }, 180000);

  it("does not mutate the active width artifact", async () => {
    const width = await reconstructCreAuthorityWidthSuccessor();
    expect(width.artifactId).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(width.digest).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
  }, 180000);

  it("keeps 20+ research relationships while exposing >=10 standalone pages per topic", () => {
    assertDepthCatalogLocks();
    const research = searchResearchSummary();
    expect(research.canonicalUnique).toBe(109);
    expect(research.fabricatedSearchVolume).toBe(false);
    expect(research.newStandalone).toHaveLength(24);
    expect(DEPTH_QUESTION_PAGES).toHaveLength(36);
    const table = topicDepthCoverageTable();
    expect(table.every((row) => row.validatedQuestions >= 10)).toBe(true);
    expect(table.every((row) => row.finalStandalone >= 10)).toBe(true);
    expect(table.every((row) => row.targetMet)).toBe(true);
    expect(rejectedQuotaPadding().length).toBeGreaterThan(0);
    expect(searchDemandEvidenceRollup().fabricatedSearchVolume).toBe(0);
    expect(searchDemandEvidenceRollup().unverifiedCandidates).toBe(0);
    expect(searchDemandEvidenceRollup().freshResearchPerformed).toBe(true);
    expect(searchDemandEvidenceRollup().freshEvidenceRecords).toBeGreaterThan(0);
    expect(successor.demand.overall).toBe("PASS");
    for (const topic of TOPIC_IDS) {
      expect(currentStandaloneRoutesForTopic(topic).length).toBeGreaterThanOrEqual(10);
    }
    for (const example of promotionExamples()) {
      expect(example.monthlyVolume).toBeNull();
      expect(example.fabricatedSearchVolume).toBe(false);
      expect(example.decision).toBe("BUILD_STANDALONE");
    }
  });

  it("adds 36 topic-root routes without thinning or cannibalizing", () => {
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(searchDepthRouteManifest().previousCount).toBe(57);
    expect(searchDepthRouteManifest().intendedCount).toBe(93);
    expect(successor.routes).toBe(93);
    expect(successor.newStandaloneRoutes).toBe(36);
    expect(successor.demand.thinPages).toBe(0);
    expect(successor.cannibal.cannibalizingPages).toBe(0);
    const titles = new Set(DEPTH_QUESTION_PAGES.map((page) => page.title));
    const h1s = new Set(DEPTH_QUESTION_PAGES.map((page) => page.question));
    expect(titles.size).toBe(36);
    expect(h1s.size).toBe(36);
    for (const page of DEPTH_QUESTION_PAGES) {
      expect(page.route.startsWith(`${page.hub}/`)).toBe(true);
      const html = pageContent(successor.files, page.route);
      expect(html).toContain(`<h1`);
      expect(html).toContain(page.question);
      expect(html).toContain("canonical");
      expect(html).toMatch(/Request Pilot Access|early-access|how-it-works|compare-commercial-leases/);
    }
  });

  it("exposes hub discovery groups instead of hiding the graph", () => {
    expect(successor.discovery.overall).toBe("PASS");
    for (const count of Object.values(successor.discovery.visibleByTopic)) {
      expect(count).toBeGreaterThanOrEqual(10);
    }
    const npv = pageContent(successor.files, "/commercial-lease-npv");
    expect(npv).toContain("data-hub-question-discovery");
    expect(npv).toContain("Start here");
    expect(npv).not.toMatch(/sn-grid--count-1[0-5]/);
  });

  it("builds section surfaces with rhythm and contrast, not zebra or all-white pages", () => {
    expect(AUTHORITY_SECTION_SURFACE_SYSTEM_CONTRACT.mechanicalStripingRejected).toBe(true);
    expect(successor.rhythm.overall).toBe("PASS");
    expect(successor.rhythm.allWhiteMonotony).toBe(0);
    expect(successor.rhythm.mechanicalZebra).toBe(0);
    expect(successor.rhythm.adjacentHighEmphasis).toBe(0);
    expect(successor.contrast.overall).toBe("PASS");
    expect(successor.contrast.contrastFailures).toBe(0);
    expect(
      evaluateSectionSurfaceContrast({
        variants: ["EMPHASIS"],
        textOnEmphasisLight: true,
        cardsDistinctOnTinted: true,
        linksReadable: true,
        html: `<section data-surface="EMPHASIS"><section data-surface="SUBTLE"><strong class="sn-title">A closer look</strong></section></section>`,
        css: `[data-surface="EMPHASIS"] a { color: #d7e8ff; }`,
      }).overall,
    ).toBe("FAIL");
    expect(
      evaluateSectionSurfaceRhythm({
        surfaces: ["DEFAULT", "SUBTLE", "DEFAULT", "SUBTLE", "DEFAULT", "SUBTLE"],
        longPage: true,
      }).mechanicalZebra,
    ).toBe(1);
    expect(evaluateSectionSurfaceRhythm({ surfaces: Array(8).fill("DEFAULT"), longPage: true }).allWhiteMonotony).toBe(1);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain("--pv-surface-subtle");
    expect(css).toContain("[data-surface=\"TINTED\"] .sn-card");
    const sample = pageContent(successor.files, "/commercial-lease-npv/why-use-npv-when-comparing-leases");
    expect(sample).toContain('data-surface="SUBTLE"');
    expect(sample).toContain('data-surface="EMPHASIS"');
  });

  it("preserves width, hero, footer, SEO/GEO, and publishability", () => {
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.hard.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SearchDemandAuthoritySurfaceGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HubQuestionDiscoveryCoverageGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SearchIntentCannibalizationGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SectionSurfaceRhythmGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SectionSurfaceContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedTextContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedHeadingInkGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
      }).ready,
    ).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    const blob = successor.files.map((file) => file.content).join("\n");
    expect(blob).toContain(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION);
    expect(blob).not.toContain("An Infinite OS Venture");
    expect(evaluateHeroContentSeparation(FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE).overall).toBe("FAIL");
    expect(chunkCount(successor.files)).toBeGreaterThan(220);
    expect(successor.publishability.graph.orphans).toBe(0);
    expect(successor.publishability.graph.deadEnds).toBe(0);
    expect(successor.demand.overall).toBe("PASS");
    expect(successor.discovery.overall).toBe("PASS");
    expect(successor.cannibal.overall).toBe("PASS");
    const sitemap = successor.files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts")?.content ?? "";
    const schema = successor.files.find((file) => file.path.replace(/\\/g, "/") === "lib/site-schema.ts")?.content ?? "";
    for (const page of DEPTH_QUESTION_PAGES) {
      expect(sitemap).toContain(page.route);
      expect(schema).toContain(page.route);
      const html = pageContent(successor.files, page.route);
      expect(html).toMatch(/title:/);
      expect(html).toContain("canonical");
      expect(html).toMatch(/SiteBreadcrumb|breadcrumb/i);
      expect(html).toContain("data-answer-chunk-id=");
    }
    expect(successor.publishability.expansionReadability).toBe("PASS");
    expect(evaluateHumanReadabilityGate(pageContent(successor.files, "/commercial-lease-npv/why-use-npv-when-comparing-leases")).overall).toBe("PASS");
    const present = pageContent(successor.files, "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client");
    expect(present).not.toMatch(/AnswerChunk|Related page one|Hide the engine|Model-presentation intent/i);
    expect(evaluateHumanReadabilityGate(present).overall).toBe("PASS");
    expect(evaluateHumanReadabilityGate("A buried AnswerChunk cannot carry the worked walk.").overall).toBe("FAIL");
    expect(successor.contrast.contrastFailures).toBe(0);
    const occupancyEmphasis = pageContent(successor.files, "/occupancy-costs").match(/<section[^>]*data-surface="EMPHASIS"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
    expect(occupancyEmphasis).not.toMatch(/Trusted sources|sn-title|pv-source-board/i);
    expect(evaluateAboveFoldVisualCoverage(successor.files).overall).toBe("PASS");
    expect(evaluateSearchIntentConversionPath(successor.files).overall).toBe("PASS");
  });

  it("does not change experiment evidence, observer, or send outreach", () => {
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    const observer = observerState();
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(clock.restarted).toBe(false);
    expect(clock.evidenceStart).toBe(clockBefore.evidenceStart);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.counts).toEqual(evidenceBefore.counts);
    expect(observer.status).toBe(observerBefore.status);
    expect(observer.trackedConversationIds).toEqual(observerBefore.trackedConversationIds);
    expect(Number(observer.historyCheckpointId)).toBeGreaterThanOrEqual(Number(observerBefore.historyCheckpointId));
    expect(successor.deployed).toBe(false);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
  });

  it("captures clean-room screenshots at 1440, 1280, 1024, and 390 without deploying", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const footer = toStaticHtml(successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
    const routes = [
      "/",
      "/how-it-works",
      "/pricing",
      "/resources",
      "/for/tenant-rep-brokers",
      "/commercial-lease-npv",
      "/lease-comparison",
      "/effective-rent",
      "/occupancy-costs",
      "/lease-sensitivity-analysis",
      "/tenant-rep-analysis",
      "/lease-financial-modeling",
      "/commercial-lease-npv/why-use-npv-when-comparing-leases",
      "/commercial-lease-npv/npv-vs-total-lease-cost",
      "/lease-comparison/how-do-cfos-review-lease-comparisons",
      "/effective-rent/what-is-effective-rent",
      "/effective-rent/effective-rent-vs-asking-rent",
      "/occupancy-costs/base-rent-vs-occupancy-cost",
      "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk",
      "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis",
      "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking",
      "/tenant-rep-analysis/lease-abstract-vs-financial-analysis",
      "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary",
      "/lease-financial-modeling/what-is-a-commercial-lease-financial-model",
      "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
    ];
    const dir = path.join(tmpdir(), `cre-search-depth-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    const viewports = [
      ["wide", 1440, 900],
      ["desktop", 1280, 900],
      ["tablet", 1024, 900],
      ["mobile", 390, 844],
    ] as const;
    let overflow = 0;
    let shots = 0;
    try {
      for (const route of routes) {
        const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(successor.files, route))}${footer}</body></html>`;
        expect(html).toContain("An Infinity OS Venture");
        for (const [name, width, height] of viewports) {
          const page = await browser.newPage();
          await page.setViewportSize({ width, height });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          await page.screenshot({ path: path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${name}.png`), fullPage: false });
          shots += 1;
          const metrics = (await page.evaluate(`({ overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) })`)) as {
            overflowX: number;
          };
          overflow += metrics.overflowX > 1 ? 1 : 0;
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    expect(shots).toBe(routes.length * viewports.length);
    expect(overflow).toBe(0);
  }, 180000);

  it("builds the search-depth successor in a clean-room production build without deploying", async () => {
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
