import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import {
  getCanonicalActivePublicValidationState,
  isVisualHomepageFoldSuccessorPublicActive,
} from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { reconstructCreAuthorityExpansionSuccessor } from "../cre-authority-expansion-successor";
import { reconstructCreVisualHomepageFoldSuccessor } from "../cre-visual-homepage-fold-successor";
import { EXPANSION_QUESTION_PAGES } from "../authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS, seoGeoPageRouteManifest } from "../digital-real-estate-catalog";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { extractInternalHrefsInBody, pageContent } from "../answer-authority/page-inspect";
import { evaluateAuthorityPageDepth } from "../answer-authority/depth-and-direct-response";
import { wordCountOf } from "../quality-gates";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateAnswerSurfaceCoverage,
  evaluateExpandedPublicAuthorityPublishability,
  evaluateSearchIntentConversionPath,
  evaluateSemanticInternalLinkDensity,
  evaluateTopicGraphConnectivity,
  evaluateTopicalCompleteness,
} from "../authority-expansion-gates";
import {
  buildSearchValidatedQuestionGraph,
  searchResearchSummary,
  uniqueCanonicalQuestions,
} from "../search-validated-question-graph";
import { evaluateRenderedCompositionQuality, evaluateRenderedTableQuality } from "../visual-quality-gates";
import { VISUAL_COMPOSITION_VIEWPORTS } from "../visual-composition-browser";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    cadenceMs: number;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

function metadataField(content: string, field: "title" | "description"): string {
  const match = content.match(new RegExp(`${field}:\\s*"([^"]+)"`));
  return match?.[1] ?? "";
}

function toStaticHtml(tsx: string): string {
  const header = tsx.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  const firstSection = tsx.match(/<section[\s\S]*?<\/section>/)?.[0] ?? "";
  return `${header}\n${firstSection}`
    .replace(/className=/g, "class=")
    .replace(/width=\{(\d+)\}/g, 'width="$1"')
    .replace(/height=\{(\d+)\}/g, 'height="$1"')
    .replace(/fetchPriority="high"/g, "")
    .replace(/\{JSON\.stringify\(([^)]+)\)\}/g, '"$1"')
    .replace(/<[A-Z][A-Za-z0-9]*[^>]*\/>/g, "")
    .replace(/<[A-Z][A-Za-z0-9]*(?:\s[^>]*)?>[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, "");
}

describe("CRE search-validated top-20-per-topic authority expansion v1", () => {
  let successor: Awaited<ReturnType<typeof reconstructCreAuthorityExpansionSuccessor>>;
  let observerBefore: ReturnType<typeof observerState>;
  let clockBefore: ReturnType<typeof inspectExperimentClock>;
  let evidenceBefore: ReturnType<typeof inspectRealMarketEvidence>;
  let screenshotCount = 0;

  beforeAll(async () => {
    observerBefore = observerState();
    clockBefore = inspectExperimentClock();
    evidenceBefore = inspectRealMarketEvidence();
    successor = await reconstructCreAuthorityExpansionSuccessor();
  }, 180000);

  it("locks a successor identity without mutating the homepage-fold predecessor or live artifact", async () => {
    const predecessor = await reconstructCreVisualHomepageFoldSuccessor();
    expect(predecessor.artifactId).toBe(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID);
    expect(predecessor.digest).toBe(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST);
    expect(predecessor.digest).toBe("3c1840108487827233e48c2f12011f0fa7b3922a606f1e5191119cff28a1275c");
    expect(successor.artifactId).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_00cd1821c5a178bf2487");
    expect(successor.digest).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823");
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.immutable).toBe(true);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isVisualHomepageFoldSuccessorPublicActive()).toBe(false);
    expect(seoGeoPageRouteManifest().pageRoutes).toHaveLength(33);
    expect(successor.previousRouteCount).toBe(33);
    expect(successor.newRouteCount).toBe(57);
    expect(successor.newAuthorityPages).toBe(24);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.secretScan).toBe("PASS");
  }, 180000);

  it("validates at least 20 real search questions per hub without fabricated volume", () => {
    const research = searchResearchSummary();
    const graph = buildSearchValidatedQuestionGraph();
    expect(research.topicsResearched).toBe(7);
    expect(research.rawValidatedQuestionCandidates).toBe(154);
    expect(research.minimumTwentyPerTopic).toBe(true);
    expect(research.fabricatedSearchVolume).toBe(false);
    expect(graph.every((row) => row.monthlyVolume === null && row.fabricatedSearchVolume === false)).toBe(true);
    expect(research.evidence.AUTOCOMPLETE_OBSERVED).toBe(0);
    expect(research.canonicalUnique).toBe(109);
    expect(research.duplicatesMerged).toBe(45);
    expect(uniqueCanonicalQuestions(graph).every((row) => row.primaryTopic && row.clusterId)).toBe(true);
    for (const row of research.coverage) {
      expect(row.rawValidated, row.topic).toBeGreaterThanOrEqual(20);
      expect(row.meaningfulRelationships, row.topic).toBeGreaterThanOrEqual(20);
    }
    expect(research.decisions.BUILD_STANDALONE).toBeGreaterThanOrEqual(18);
    expect(research.newStandalone).toHaveLength(24);
  });

  it("builds 24 standalone 2000-word pages at 4th-grade readability with topic-root URLs", () => {
    expect(EXPANSION_QUESTION_PAGES).toHaveLength(24);
    const thin: string[] = [];
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const canonicals = new Set<string>();
    const h1s = new Set<string>();
    for (const page of EXPANSION_QUESTION_PAGES) {
      expect(page.route).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
      const content = pageContent(successor.files, page.route);
      const words = wordCountOf(content);
      if (words < 2000) thin.push(`${page.route}:${words}`);
      const read = evaluateHumanReadabilityGate(content);
      expect(read.overall, `${page.route}:${read.failures.join(",")}`).toBe("PASS");
      expect(read.activeVoice).toBe("PASS");
      expect(read.paragraphLength).toBe("PASS");
      expect(read.jargonExplained).toBe("PASS");
      expect(read.keywordStuffing).toBe(false);
      expect(content).toContain("AnswerFirst");
      expect(content).toContain("SiteBreadcrumb");
      expect(content).toContain("Trusted sources");
      expect(content).toMatch(/investopedia|bls\.gov|naiop|boma|fasb/i);
      expect(content).not.toMatch(/lextract\.com|accomplicere|costar\.com/i);
      expect(content).toMatch(/not generally available|validation \/ pilot/i);
      expect(content).toContain("<h1");
      expect(content).toContain("pv-hero-photo");
      expect(content).toMatch(/<header[\s\S]*<img\b/);
      expect(extractInternalHrefsInBody(content).length).toBeGreaterThanOrEqual(4);
      expect(
        evaluateAuthorityPageDepth({
          route: page.route,
          role: "QUESTION_PAGE",
          content,
          topicComplexity: "HIGH",
        }).approxWords,
      ).toBeGreaterThanOrEqual(2000);
      const title = metadataField(content, "title");
      const description = metadataField(content, "description");
      expect(title.length).toBeGreaterThan(8);
      expect(description.length).toBeGreaterThan(20);
      titles.add(title);
      descriptions.add(description);
      canonicals.add(content.match(/canonical:\s*"([^"]+)"/)?.[1] ?? "");
      h1s.add(content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "");
      expect(content).toMatch(/robots:\s*\{\s*index:\s*true/);
    }
    expect(thin).toEqual([]);
    expect(titles.size).toBe(24);
    expect(descriptions.size).toBe(24);
    expect(canonicals.size).toBe(24);
    expect(h1s.size).toBe(24);
    expect([...canonicals].every((item) => item.endsWith("/"))).toBe(true);
  });

  it("passes expansion QC gates, graph connectivity, GEO surfaces, and conversion paths", () => {
    const pub = evaluateExpandedPublicAuthorityPublishability(successor.files);
    expect(pub.failures, pub.failures.join(",")).toEqual([]);
    expect(pub.overall).toBe("PASS");
    expect(pub.aboveFoldVisualCoverage).toBe("PASS");
    expect(pub.semanticInternalLinkDensity).toBe("PASS");
    expect(pub.topicGraphConnectivity).toBe("PASS");
    expect(pub.answerSurfaceCoverage).toBe("PASS");
    expect(pub.searchIntentConversionPath).toBe("PASS");
    expect(pub.topicalCompleteness).toBe("PASS");
    expect(pub.expansionDepth).toBe("PASS");
    expect(pub.expansionReadability).toBe("PASS");
    const graph = evaluateTopicGraphConnectivity(successor.files);
    expect(graph.report.authorityNodes).toBe(41);
    expect(graph.report.orphans).toBe(0);
    expect(graph.report.deadEnds).toBe(0);
    expect(graph.report.hubToSpoke).toBeGreaterThanOrEqual(20);
    expect(graph.report.spokeToHub).toBeGreaterThanOrEqual(20);
    expect(graph.report.sameTopicLateral).toBeGreaterThan(0);
    expect(graph.report.crossTopic).toBeGreaterThan(0);
    expect(graph.report.commercialPath).toBeGreaterThan(0);
    const density = evaluateSemanticInternalLinkDensity(successor.files);
    expect(density.bodyContext).toBe("PASS");
    expect(density.stuffing).toBe(false);
    const surfaces = evaluateAnswerSurfaceCoverage(successor.files);
    expect(surfaces.singleSurfacePages).toBe(0);
    expect(surfaces.totalChunks).toBeGreaterThanOrEqual(80);
    const conversion = evaluateSearchIntentConversionPath(successor.files);
    expect(conversion.informational).toBe("PASS");
    expect(conversion.commercial).toBe("PASS");
    expect(conversion.transactional).toBe("PASS");
    expect(conversion.misleading).toBe(0);
    const topical = evaluateTopicalCompleteness(successor.files);
    expect(topical.overall).toBe("PASS");
    const above = evaluateAboveFoldVisualCoverage(successor.files);
    expect(above.homepage).toBe("PASS");
    expect(above.hubs).toBe(7);
    expect(above.questions.pass).toBe(above.questions.total);
    expect(above.commercial.pass).toBe(above.commercial.total);
    expect(above.cssOnlyCounted).toBe(false);
    const sample = pageContent(successor.files, EXPANSION_QUESTION_PAGES[0].route);
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(evaluateRenderedTableQuality(sample).overall).toBe("PASS");
    expect(evaluateRenderedCompositionQuality({ html: sample, css }).overall).toBe("PASS");
    expect(successor.footer.overall).toBe("PASS");
  });

  it("updates sitemap and schema without indexing admin, API, or test routes", () => {
    const sitemap = successor.files.find((file) => file.path === "app/sitemap.ts")?.content ?? "";
    const schema = successor.files.find((file) => file.path === "lib/site-schema.ts")?.content ?? "";
    for (const page of EXPANSION_QUESTION_PAGES) {
      expect(sitemap).toContain(`${page.route}/`);
      expect(schema).toContain(page.route);
    }
    expect(sitemap).not.toContain("/api/");
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/test/");
    expect(schema).toMatch(/WebPage|Article|BreadcrumbList|FAQPage/);
  });

  it("does not create keyword-permutation spam or competing-software citations", () => {
    const questions = buildSearchValidatedQuestionGraph().map((row) => row.normalizedQuestion);
    expect(new Set(questions).size).toBe(questions.length);
    const blob = successor.files
      .filter((file) => file.path.startsWith("app/") && file.encoding !== "base64")
      .map((file) => file.content)
      .join("\n");
    expect(blob).not.toMatch(/href="https?:\/\/[^"]*(lextract|accomplicere|costar)/i);
    expect(EXPANSION_QUESTION_PAGES.every((page) => page.question.includes("?") || page.question.length > 12)).toBe(true);
  });

  it("preserves the CRE experiment clock, evidence, and Gmail observer checkpoint", () => {
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectExperimentClock().deadline).toBe(clockBefore.deadline);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectRealMarketEvidence().experiment.experimentId).toBe("exp_e72beb7b6d35e7b20acf");
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
    expect(observerAfter.cadenceMs).toBe(300000);
    expect(observerAfter.lastInboundProcessed).toBe(observerBefore.lastInboundProcessed);
  });

  it("captures local above-fold screenshots at 1280, 1440, and 390 without deploying", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const routes = [
      "/",
      "/commercial-lease-npv",
      "/commercial-lease-npv/how-is-lease-npv-calculated",
    ];
    const dir = path.join(tmpdir(), `cre-authority-expansion-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    let overflow = 0;
    try {
      for (const route of routes) {
        const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(successor.files, route))}</body></html>`;
        for (const [name, width] of Object.entries(VISUAL_COMPOSITION_VIEWPORTS)) {
          const page = await browser.newPage();
          await page.setViewportSize({ width, height: name === "mobile" ? 844 : 900 });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          const file = path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${name}.png`);
          await page.screenshot({ path: file, fullPage: false });
          screenshotCount += 1;
          writeFileSync(file.replace(/\.png$/, ".html.txt"), html.slice(0, 200));
          const metrics = await page.evaluate(() => ({
            overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            headerImg: Boolean(document.querySelector("header img, .pv-hero img, img[src*='/media/']")),
          }));
          if (metrics.overflowX > 1) overflow += 1;
          expect(metrics.headerImg, `${route}:${name}`).toBe(true);
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    expect(overflow).toBe(0);
    expect(screenshotCount).toBe(9);
    expect(VISUAL_COMPOSITION_VIEWPORTS.desktop).toBe(1280);
    expect(VISUAL_COMPOSITION_VIEWPORTS.wide).toBe(1440);
    expect(VISUAL_COMPOSITION_VIEWPORTS.mobile).toBe(390);
  }, 180000);
});
