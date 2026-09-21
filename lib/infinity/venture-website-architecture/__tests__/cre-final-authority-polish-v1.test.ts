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
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { getCanonicalActivePublicValidationState } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { reconstructCreAuthorityFinalPolishSuccessor } from "../cre-authority-final-polish-successor";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { evaluateSemanticPair, evaluateSemanticContentRedundancy } from "../public-authority-standard/semantic-content-redundancy";
import { evaluateEditorialHighlightQuality, evaluateAuthorityQuoteProvenance } from "../public-authority-standard/editorial-highlight-quality";
import { evaluateSemanticNavigationQuality } from "../public-authority-standard/semantic-navigation-quality";
import {
  CANONICAL_PUBLIC_FOOTER_ATTRIBUTION,
  REJECTED_PUBLIC_FOOTER_ATTRIBUTION,
  HARD_PUBLISHABILITY_GATES,
} from "../public-authority-standard/constants";
import { evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { pageContent } from "../answer-authority/page-inspect";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateExpandedPublicAuthorityPublishability,
  evaluateSearchIntentConversionPath,
  evaluateSemanticInternalLinkDensity,
  evaluateTopicGraphConnectivity,
} from "../authority-expansion-gates";
import { SEO_GEO_LEGAL_ROUTES, SEO_GEO_TOPIC_HUBS } from "../digital-real-estate-catalog";
import { VISUAL_COMPOSITION_VIEWPORTS } from "../visual-composition-browser";
import { authorityExpansionRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { CANONICAL_INFINITY_OS_LABEL, REJECTED_INFINITE_OS_VENTURE_LABEL } from "@/lib/infinity/venture-build-orchestration/constants";
import { validateFooterAttribution } from "@/lib/infinity/venture-build-orchestration/footer";
import { polishNavEligibleRoutes, semanticNavigationForRoute } from "../authority-final-polish-nav";

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

describe("Infinity Public Authority semantic QC primitives", () => {
  it("rejects the founder CAM assumption duplicate and the common-mistake duplicate", () => {
    expect(
      evaluateSemanticPair(
        "The sample treats CAM as tenant-paid on a net path.",
        "The sample treats CAM as tenant-paid on a net path.",
      ).overall,
    ).toBe("FAIL");
    expect(
      evaluateSemanticPair("Using one CAM number for two buildings.", "Using one CAM number for two buildings.").overall,
    ).toBe("FAIL");
  });

  it("rejects near-duplicate restatement and passes useful reinforcement", () => {
    expect(
      evaluateSemanticPair(
        "Using one CAM number for both buildings can distort the comparison.",
        "A common mistake is using the same CAM number for two buildings.",
      ).overall,
    ).toBe("FAIL");
    expect(
      evaluateSemanticPair(
        "The sample treats CAM as tenant-paid.",
        "If one option is gross and the other is net, normalize CAM before you compare them.",
      ).overall,
    ).toBe("PASS");
  });

  it("rejects fabricated quotes and requires authority-quote provenance", () => {
    expect(
      evaluateEditorialHighlightQuality({
        highlights: [{ kind: "KEY_TAKEAWAY", title: "Quote", body: "As one broker said, this always works.", quoted: true }],
      }).fabricatedQuoteRisk,
    ).toBe("FAIL");
    expect(evaluateAuthorityQuoteProvenance({ text: "Later cash is not equal to cash today.", sourceTitle: "Example" })).toBe("FAIL");
    expect(
      evaluateAuthorityQuoteProvenance({
        text: "Later cash is not equal to cash today.",
        sourceId: "src_1",
        sourceTitle: "Investopedia NPV",
        sourceUrl: "https://www.investopedia.com/terms/n/npv.asp",
      }),
    ).toBe("PASS");
  });

  it("requires Infinity OS footer wording and rejects Infinite OS", () => {
    expect(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION).toBe("An Infinity OS Venture");
    expect(REJECTED_PUBLIC_FOOTER_ATTRIBUTION).toBe("An Infinite OS Venture");
    expect(CANONICAL_INFINITY_OS_LABEL).toBe("An Infinity OS Venture");
    expect(REJECTED_INFINITE_OS_VENTURE_LABEL).toBe("An Infinite OS Venture");
    expect(
      validateFooterAttribution([
        { path: "components/venture-footer.tsx", content: `<a href="https://imros.io">An Infinite OS Venture</a>` },
      ]).failures,
    ).toContain("rejected_infinite_os_wording");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SemanticContentRedundancyGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("SemanticNavigationQualityGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("EditorialHighlightQualityGate");
    const ready = evaluatePublicAuthorityPublishability({
      gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
    });
    expect(ready.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
  });
});

describe("CRE final authority polish successor v1", () => {
  const clockBefore = inspectExperimentClock();
  const evidenceBefore = inspectRealMarketEvidence();
  const observerBefore = observerState();
  let successor: Awaited<ReturnType<typeof reconstructCreAuthorityFinalPolishSuccessor>>;
  let screenshotCount = 0;
  let measurementCount = 0;

  beforeAll(async () => {
    successor = await reconstructCreAuthorityFinalPolishSuccessor();
  }, 180000);

  it("builds a successor from the locked expansion artifact without deploying", () => {
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(successor.routes).toBe(57);
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(successor.artifactId);
    expect(successor.redundancy.repaired).toBeGreaterThan(0);
    expect(successor.navigation.blocks).toBeGreaterThanOrEqual(7);
    expect(successor.highlights.sourcedQuotes).toBe(0);
  });

  it("records polish coverage metrics", () => {
    const graph = evaluateTopicGraphConnectivity(successor.files);
    const navRoutes = polishNavEligibleRoutes().filter((route) => pageContent(successor.files, route).includes("data-semantic-navigation"));
    const questionRoutes = navRoutes.filter((route) => route.split("/").filter(Boolean).length >= 2);
    const productRoutes = ["/", "/how-it-works", "/compare-commercial-leases", "/pricing", "/resources", "/faq", "/for/tenant-rep-brokers"];
    const productWithNav = productRoutes.filter((route) => pageContent(successor.files, route).includes("data-semantic-navigation"));
    const report = {
      redundancy: successor.redundancy,
      highlights: successor.highlights,
      navigation: {
        blocks: successor.navigation.blocks,
        cards: successor.navigation.cards,
        uniqueDestinations: successor.navigation.uniqueDestinations,
        duplicateDestinationProblems: successor.navigation.duplicateDestinationProblems,
      },
      hubsWithNav: SEO_GEO_TOPIC_HUBS.filter((hub) => pageContent(successor.files, hub.route).includes("data-semantic-navigation")).length,
      questionNav: questionRoutes.length,
      productNav: productWithNav.length,
      graph: graph.report,
      chunks: chunkCount(successor.files),
    };
    writeFileSync(path.join(process.cwd(), ".infinity", "cre-final-authority-polish-metrics.json"), JSON.stringify(report, null, 2));
    expect(report).toMatchObject({
      navigation: { duplicateDestinationProblems: 0 },
      hubsWithNav: 7,
      graph: { orphans: 0, deadEnds: 0 },
    });
  });

  it("renders An Infinity OS Venture globally and keeps old wording out of templates", () => {
    const blob = successor.files.filter((file) => file.encoding !== "base64").map((file) => file.content).join("\n");
    expect(blob).toContain("An Infinity OS Venture");
    expect(blob).not.toContain("An Infinite OS Venture");
    expect(successor.footerAttribution.ok).toBe(true);
    expect(successor.footer.overall).toBe("PASS");
    const footer = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "";
    expect(footer).toContain("An Infinity OS Venture");
    expect(footer).toContain("https://imros.io");
    expect(footer).not.toMatch(/rel=["']nofollow/);
  });

  it("repairs founder duplication and keeps useful reinforcement", () => {
    const cam = pageContent(successor.files, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
    expect(cam).not.toMatch(/The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/);
    expect(cam).not.toMatch(/Using one CAM number for two buildings[\s\S]{0,240}Using one CAM number for two buildings/);
    expect(successor.redundancy.repaired).toBeGreaterThan(0);
    expect(successor.highlights.sourcedQuotes).toBe(0);
    expect(successor.files.some((file) => file.path === "components/editorial-highlight.tsx")).toBe(true);
    expect(successor.files.some((file) => file.path === "components/semantic-navigation.tsx")).toBe(true);
  });

  it("adds page-aware semantic navigation without forcing legal pages", () => {
    expect(successor.navigation.blocks).toBeGreaterThanOrEqual(7);
    expect(successor.navigation.duplicateDestinationProblems).toBe(0);
    for (const hub of SEO_GEO_TOPIC_HUBS) {
      expect(pageContent(successor.files, hub.route)).toContain("data-semantic-navigation");
    }
    for (const route of SEO_GEO_LEGAL_ROUTES) {
      expect(pageContent(successor.files, route)).not.toContain("data-semantic-navigation");
    }
    const homeNav = semanticNavigationForRoute("/");
    const camNav = semanticNavigationForRoute("/occupancy-costs/what-is-cam-in-a-commercial-lease");
    expect(homeNav?.variant).not.toBe(camNav?.variant);
    expect(evaluateSemanticNavigationQuality({ blocks: successor.navigation.records.filter((item) => item.pageRoute === "/"), pageArchetype: "PRODUCT" }).overall).toBe("PASS");
    expect(polishNavEligibleRoutes().every((route) => !SEO_GEO_LEGAL_ROUTES.includes(route as (typeof SEO_GEO_LEGAL_ROUTES)[number]))).toBe(true);
  });

  it("preserves SEO, GEO, graph, conversion, readability, and above-fold imagery", () => {
    const pub = evaluateExpandedPublicAuthorityPublishability(successor.files);
    const graph = evaluateTopicGraphConnectivity(successor.files);
    const density = evaluateSemanticInternalLinkDensity(successor.files);
    const conversion = evaluateSearchIntentConversionPath(successor.files);
    const above = evaluateAboveFoldVisualCoverage(successor.files);
    expect(pub.failures, pub.failures.join(",")).toEqual([]);
    expect(pub.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(graph.report.orphans).toBe(0);
    expect(graph.report.deadEnds).toBe(0);
    expect(graph.overall).toBe("PASS");
    expect(density.overall).toBe("PASS");
    expect(conversion.overall).toBe("PASS");
    expect(above.overall).toBe("PASS");
    expect(chunkCount(successor.files)).toBeGreaterThanOrEqual(205);
    const cardCopy = successor.navigation.records.flatMap((block) => block.cards.map((card) => card.description)).join(" ");
    expect(evaluateHumanReadabilityGate(cardCopy).overall).toBe("PASS");
    expect(successor.files.some((file) => /An Infinite OS Venture/.test(file.content))).toBe(false);
  });

  it("preserves the CRE experiment clock, evidence, and Gmail observer checkpoint", () => {
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(Number(observerAfter.historyCheckpointId)).toBeGreaterThanOrEqual(Number(observerBefore.historyCheckpointId));
    expect(observerAfter.lastInboundProcessed).toBe(observerBefore.lastInboundProcessed);
  });

  it("captures representative screenshots at 1280, 1440, and 390 without deploying", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const routes = [
      "/",
      "/commercial-lease-npv",
      "/occupancy-costs",
      "/commercial-lease-npv/how-is-lease-npv-calculated",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
      "/effective-rent/effective-rent-vs-npv",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease",
      "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show",
      "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics",
      "/lease-financial-modeling/what-are-common-lease-analysis-mistakes",
      "/for/tenant-rep-brokers",
      "/pricing",
      "/resources",
    ];
    const dir = path.join(tmpdir(), `cre-final-authority-polish-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    let overflow = 0;
    try {
      for (const route of routes) {
        const footer = toStaticHtml(successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
        const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(successor.files, route))}${footer}</body></html>`;
        expect(html).toContain("An Infinity OS Venture");
        expect(html).not.toContain("An Infinite OS Venture");
        if (!SEO_GEO_LEGAL_ROUTES.includes(route as (typeof SEO_GEO_LEGAL_ROUTES)[number])) {
          expect(html).toContain("sn-block");
        }
        for (const [name, width] of Object.entries(VISUAL_COMPOSITION_VIEWPORTS)) {
          const page = await browser.newPage();
          await page.setViewportSize({ width, height: name === "mobile" ? 844 : 900 });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          const file = path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${name}.png`);
          await page.screenshot({ path: file, fullPage: false });
          screenshotCount += 1;
          const metrics = await page.evaluate(() => ({
            overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            footer: document.body.innerText.includes("An Infinity OS Venture"),
            nav: Boolean(document.querySelector(".sn-block")),
            highlight: Boolean(document.querySelector(".ed-highlight, .pv-callout")),
          }));
          measurementCount += 1;
          if (metrics.overflowX > 1) overflow += 1;
          expect(metrics.footer, `${route}:${name}`).toBe(true);
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    writeFileSync(path.join(dir, "counts.json"), JSON.stringify({ screenshotCount, measurementCount, overflow }));
    expect(overflow).toBe(0);
    expect(screenshotCount).toBe(routes.length * 3);
    expect(evaluateSemanticContentRedundancy({ blocks: [] }).overall).toBe("PASS");
  }, 180000);

  it("builds the polish successor in a clean-room production build without deploying", async () => {
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
