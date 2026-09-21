import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { getCanonicalActivePublicValidationState } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { reconstructCreAuthorityWidthSuccessor } from "../cre-authority-width-successor";
import { runProviderEquivalentArtifactBuildGate } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { evaluateHeroContentSeparation, FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE } from "../public-authority-standard/hero-content-separation";
import { evaluateSemanticNavigationRenderedQuality, GOOD_SEMANTIC_NAV_RENDERED_FIXTURE } from "../public-authority-standard/semantic-navigation-rendered-quality";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import { pageContent } from "../answer-authority/page-inspect";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateExpandedPublicAuthorityPublishability,
  evaluateSearchIntentConversionPath,
  evaluateTopicGraphConnectivity,
} from "../authority-expansion-gates";
import { authorityExpansionRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { REJECTED_CIRCLE_ONLY_ICON, REJECTED_PAUSE_COMPARE_ICON } from "../founder-visual-qc-icons";
import { CANONICAL_PUBLIC_FOOTER_ATTRIBUTION } from "../public-authority-standard/constants";

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

describe("CRE authority width successor v1", () => {
  const clockBefore = inspectExperimentClock();
  const evidenceBefore = inspectRealMarketEvidence();
  const observerBefore = observerState();
  let successor: Awaited<ReturnType<typeof reconstructCreAuthorityWidthSuccessor>>;
  let screenshotCount = 0;
  let measurementCount = 0;

  beforeAll(async () => {
    successor = await reconstructCreAuthorityWidthSuccessor();
  }, 180000);

  it("builds a successor from the locked QC artifact without deploying", () => {
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(successor.routes).toBe(57);
    expect(authorityExpansionRouteManifest().intendedCount).toBe(57);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).not.toBe(SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID);
  });

  it("widens authority modules while keeping prose and prior QC repairs", () => {
    const how = pageContent(successor.files, "/how-it-works");
    const hub = pageContent(successor.files, "/lease-sensitivity-analysis");
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain("--pv-authority-shell");
    expect(css).toContain("--pv-prose-measure");
    expect(css).toContain("sn-grid--count-4");
    expect(how).toContain("pv-hero-photo--article");
    expect(how).not.toContain(REJECTED_CIRCLE_ONLY_ICON);
    expect(how).not.toContain(REJECTED_PAUSE_COMPARE_ICON);
    expect(how).toContain("pv-wide-module");
    expect(hub).toContain("pv-authority-shell");
    expect(hub).toContain("pv-wide-module");
    expect(hub).toMatch(/sn-grid--count-[2-6]/);
    expect(successor.hero.overall).toBe("PASS");
    expect(successor.navigation.rendered.overall).toBe("PASS");
    expect(successor.width.overall).toBe("PASS");
    expect(successor.navigation.breakout.overall).toBe("PASS");
    expect(successor.navigation.grid.overall).toBe("PASS");
    expect(successor.sources.overall).toBe("PASS");
    expect(evaluateHeroContentSeparation(FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE).overall).toBe("FAIL");
    expect(evaluateSemanticNavigationRenderedQuality(GOOD_SEMANTIC_NAV_RENDERED_FIXTURE).overall).toBe("PASS");
  });

  it("keeps footer, 57 routes, readability, SEO/GEO, graph, and conversion", () => {
    const blob = successor.files.filter((file) => file.encoding !== "base64").map((file) => file.content).join("\n");
    expect(blob).toContain(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION);
    expect(blob).not.toContain("An Infinite OS Venture");
    expect(successor.footerAttribution.ok).toBe(true);
    const pub = evaluateExpandedPublicAuthorityPublishability(successor.files);
    expect(pub.failures, pub.failures.join(",")).toEqual([]);
    expect(pub.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(evaluateTopicGraphConnectivity(successor.files).report.orphans).toBe(0);
    expect(evaluateTopicGraphConnectivity(successor.files).report.deadEnds).toBe(0);
    expect(evaluateTopicGraphConnectivity(successor.files).overall).toBe("PASS");
    expect(evaluateSearchIntentConversionPath(successor.files).overall).toBe("PASS");
    expect(evaluateAboveFoldVisualCoverage(successor.files).overall).toBe("PASS");
    expect(chunkCount(successor.files)).toBe(220);
    const cardCopy = [...new Set([...blob.matchAll(/sn-desc">([\s\S]*?)</g)].map((item) => item[1] ?? "").filter(Boolean))].join(" ");
    const read = evaluateHumanReadabilityGate(cardCopy);
    expect(read.failures, read.failures.join(",")).toEqual([]);
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
      }).ready,
    ).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
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
    expect(Number(observerAfter.historyCheckpointId)).toBeGreaterThanOrEqual(Number(observerBefore.historyCheckpointId));
    expect(observerAfter.lastInboundProcessed).toBe(observerBefore.lastInboundProcessed);
  });

  it("captures width screenshots at 1440, 1280, 1024, and 390", async () => {
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const routes = [
      "/lease-sensitivity-analysis",
      "/commercial-lease-npv",
      "/lease-comparison",
      "/how-it-works",
      "/resources",
      "/pricing",
      "/for/tenant-rep-brokers",
    ];
    const dir = path.join(tmpdir(), `cre-authority-width-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    const viewports = [
      ["wide", 1440, 900],
      ["desktop", 1280, 900],
      ["tablet", 1024, 900],
      ["mobile", 390, 844],
    ] as const;
    const measurements: Array<Record<string, unknown>> = [];
    let overflow = 0;
    try {
      for (const route of routes) {
        const footer = toStaticHtml(successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
        const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(successor.files, route))}${footer}</body></html>`;
        expect(html).toContain("An Infinity OS Venture");
        for (const [name, width, height] of viewports) {
          const page = await browser.newPage();
          await page.setViewportSize({ width, height });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          const file = path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${name}.png`);
          await page.screenshot({ path: file, fullPage: false });
          screenshotCount += 1;
          const metrics = await page.evaluate(`(() => {
            const box = (el) => {
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, width: r.width, left: r.left };
            };
            const shell = document.querySelector(".pv-authority-shell, .pv-reading, .pv-prose");
            const prose = document.querySelector(".pv-reading > p, .pv-prose > p, .pv-reading > h2, .pv-prose > h2");
            const nav = document.querySelector(".sn-block");
            const sources = document.querySelector(".pv-source-board");
            const table = document.querySelector(".pv-table-shell, .pv-analysis-board, table");
            const cta = document.querySelector(".pv-cta-panel, .pv-cta-band");
            const cards = [...document.querySelectorAll(".sn-card")];
            const rows = [];
            for (const card of cards) {
              const top = Math.round(card.getBoundingClientRect().top);
              let row = rows.find((item) => Math.abs(item.top - top) < 8);
              if (!row) { row = { top, count: 0 }; rows.push(row); }
              row.count += 1;
            }
            return {
              overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
              footer: document.body.innerText.includes("An Infinity OS Venture"),
              oldFooter: document.body.innerText.includes("An Infinite OS Venture"),
              viewport: window.innerWidth,
              shell: box(shell),
              prose: box(prose),
              nav: box(nav),
              sources: box(sources),
              table: box(table),
              cta: box(cta),
              cardCount: cards.length,
              columns: rows[0]?.count ?? 0,
              lastRow: rows.at(-1)?.count ?? 0,
              rows: rows.length,
              cardWidth: cards[0] ? cards[0].getBoundingClientRect().width : 0,
            };
          })()`) as Record<string, unknown>;
          measurementCount += 1;
          measurements.push({ route, viewport: name, ...metrics });
          if ((metrics.overflowX as number) > 1) overflow += 1;
          expect(metrics.footer, `${route}:${name}`).toBe(true);
          expect(metrics.oldFooter, `${route}:${name}`).toBe(false);
          if (name === "wide" || name === "desktop") {
            const navBox = metrics.nav as { width: number } | null;
            const proseBox = metrics.prose as { width: number } | null;
            if (navBox && proseBox && (proseBox.width as number) > 400) {
              expect(navBox.width, `${route}:${name}:nav`).toBeGreaterThan(proseBox.width + 20);
            }
            if (navBox) expect(navBox.width, `${route}:${name}:nav-min`).toBeGreaterThan(900);
            if (metrics.cardCount === 4) expect(metrics.lastRow, `${route}:${name}:4`).not.toBe(1);
            if ((metrics.cardCount as number) >= 4) expect(metrics.cardWidth as number, `${route}:${name}:card`).toBeGreaterThan(240);
          }
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    writeFileSync(path.join(dir, "measurements.json"), `${JSON.stringify(measurements, null, 2)}\n`);
    writeFileSync(
      path.join(process.cwd(), ".infinity", "cre-authority-width-measurements.json"),
      `${JSON.stringify({ screenshotCount, measurementCount, overflow, measurements }, null, 2)}\n`,
    );
    expect(overflow).toBe(0);
    expect(screenshotCount).toBe(routes.length * 4);
    expect(measurementCount).toBe(routes.length * 4);
  }, 180000);

  it("builds the authority-width successor in a clean-room production build without deploying", async () => {
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
