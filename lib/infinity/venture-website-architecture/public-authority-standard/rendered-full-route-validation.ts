import { evaluateHeroContentSeparation } from "./hero-content-separation";
import {
  evaluateAuthoritySectionWidth,
  evaluateAuthoritySourceRenderedQuality,
  evaluateAuthoritySectionShellConsistency,
  evaluateBalancedCardGrid,
  evaluateSemanticNavigationBreakoutLayout,
} from "./authority-content-width";
import { evaluateSemanticNavigationRenderedQuality } from "./semantic-navigation-rendered-quality";
import { evaluateHubQuestionBoardLayout } from "./hub-discovery-rendered-quality";
import {
  RENDERED_LINK_CONTRAST_BROWSER_SCRIPT,
} from "./rendered-link-contrast-gate";
import {
  RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT,
  type ComputedTextSample,
} from "./rendered-text-contrast-gate";
import { evaluatePage, runDeterministicPerPageAdmission, type PerPageLoopResult } from "./per-page-render-validate-repair";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { pageContent } from "../answer-authority/page-inspect";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function expandAuthorityRefs(tsx: string): string {
  return tsx.replace(/<AuthorityRefs items=\{(\[[\s\S]*?\])\}\s*\/>/g, (_, raw: string) => {
    try {
      const items = JSON.parse(raw) as Array<{ href?: string; label?: string }>;
      return items.map((item) => `<a href="${item.href ?? "#"}">${item.label ?? "Source"}</a>`).join("\n");
    } catch {
      return `<a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia — net present value</a>`;
    }
  });
}

function toStaticHtml(tsx: string): string {
  return expandAuthorityRefs(tsx)
    .replace(/className=/g, "class=")
    .replace(/width=\{(\d+)\}/g, 'width="$1"')
    .replace(/height=\{(\d+)\}/g, 'height="$1"')
    .replace(/fetchPriority="high"/g, "")
    .replace(/\{JSON\.stringify\(([^)]+)\)\}/g, '"$1"');
}

const PAGE_GEOMETRY_SCRIPT = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, height: r.height, left: r.left, width: r.width };
  };
  const first = (sel) => document.querySelector(sel);
  const cards = [...document.querySelectorAll(".sn-card")];
  const discoveryGroups = [...document.querySelectorAll("[data-hub-question-discovery] .pv-discovery-grid [data-discovery-group]")];
  const discoveryGrid = first("[data-hub-question-discovery] .pv-discovery-grid");
  const roleBand = first("[data-hub-question-discovery] .pv-discovery-band, [data-hub-role-band]");
  const discoveryTops = [...new Set(discoveryGroups.map((el) => Math.round(el.getBoundingClientRect().top / 8) * 8))];
  const cardWidths = cards.map((el) => el.getBoundingClientRect().width);
  const cardHeights = cards.map((el) => el.getBoundingClientRect().height);
  const uniqueTops = [...new Set(cards.map((el) => Math.round(el.getBoundingClientRect().top / 8) * 8))];
  const shell = first(".vg-container, .pv-hoisted-light-modules, main") || document.body;
  const prose = first("article, .pv-prose, [data-section-type=\\"ANSWER_SURFACES\\"]") || first("p");
  const nav = first(".sn-block, [data-section-type=\\"SEMANTIC_NAVIGATION\\"]");
  const sources = first(".pv-source-board");
  const table = first("table, .pv-table-shell");
  const cta = first(".pv-cta-band, .pv-cta-panel, [data-section-type=\\"CTA\\"]");
  return {
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    hero: box(first("header, [data-section-type=\\"HERO\\"], .pv-hero, .pv-article-hero")),
    following: box(first("header ~ section, [data-section-type=\\"HERO\\"] ~ section, .pv-hero ~ section")),
    media: box(first(".pv-hero-media, header figure")),
    shellWidth: shell.getBoundingClientRect().width,
    proseWidth: prose ? prose.getBoundingClientRect().width : 0,
    semanticNavWidth: nav ? nav.getBoundingClientRect().width : 0,
    trustedSourcesWidth: sources ? sources.getBoundingClientRect().width : 0,
    tableWidth: table ? table.getBoundingClientRect().width : 0,
    ctaWidth: cta ? cta.getBoundingClientRect().width : 0,
    cardCount: cards.length,
    cardWidths,
    cardHeights,
    columnCount: cards.filter((el) => Math.abs(el.getBoundingClientRect().top - (cards[0]?.getBoundingClientRect().top ?? 0)) < 12).length,
    rowCount: uniqueTops.length,
    lastRowCount: uniqueTops.length ? cards.filter((el) => Math.round(el.getBoundingClientRect().top / 8) * 8 === uniqueTops[uniqueTops.length - 1]).length : 0,
    sourceHasTitle: Boolean(first(".pv-source-board h2")),
    sourceLinkCount: document.querySelectorAll(".pv-source-board a").length,
    iconPaths: [...document.querySelectorAll(".sn-icon path, .sn-card svg path")].map((el) => el.getAttribute("d") || ""),
    discoveryGroupCount: discoveryGroups.length + (roleBand ? 1 : 0),
    discoveryColumnCount: discoveryGroups.filter((el) => Math.abs(el.getBoundingClientRect().top - (discoveryGroups[0]?.getBoundingClientRect().top ?? 0)) < 12).length,
    discoveryLastRowCount: (() => {
      const last = discoveryTops[discoveryTops.length - 1];
      return last == null ? 0 : discoveryGroups.filter((el) => Math.round(el.getBoundingClientRect().top / 8) * 8 === last).length;
    })(),
    discoveryRowCount: discoveryTops.length,
    discoveryGridWidth: discoveryGrid ? discoveryGrid.getBoundingClientRect().width : 0,
    discoveryGridX: discoveryGrid ? discoveryGrid.getBoundingClientRect().left : 0,
    discoveryGroupWidths: discoveryGroups.map((el) => el.getBoundingClientRect().width),
    roleBandWidth: roleBand ? roleBand.getBoundingClientRect().width : 0,
    roleBandX: roleBand ? roleBand.getBoundingClientRect().left : 0,
    roleBandY: roleBand ? roleBand.getBoundingClientRect().top : 0,
    hasHubBoard: Boolean(first("[data-hub-question-discovery]")),
  };
})()`;

export type RenderedFullRouteValidationResult = {
  routes: number;
  pageRoutes: number;
  redirects: number;
  rendered: number;
  viewportsRun: number;
  expandedViewports: number;
  contrastSamples: number;
  linkContrastSamples: number;
  overflowFailures: number;
  geometryFailures: number;
  missingEvidence: number;
  loop: PerPageLoopResult;
  postFreeze: PerPageLoopResult;
  overall: "PASS" | "FAIL";
};

export async function runRenderedFullRouteValidation(input: {
  files: ArtifactFile[];
  includeExpandedOnFailure?: boolean;
}): Promise<RenderedFullRouteValidationResult> {
  const manifest = searchDepthRouteManifest();
  const css = input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const footer = toStaticHtml(input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const samplesByRoute: Record<string, ComputedTextSample[]> = {};
  const linkSamplesByRoute: Record<string, ComputedTextSample[]> = {};
  let viewportsRun = 0;
  let expandedViewports = 0;
  let overflowFailures = 0;
  let geometryFailures = 0;
  let rendered = 0;
  try {
    for (const route of manifest.pageRoutes) {
      const source = pageContent(input.files, route);
      if (!source) continue;
      rendered += 1;
      const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(source)}${footer}</body></html>`;
      const primary = [
        { name: "1280", width: 1280, height: 900 },
        { name: "390", width: 390, height: 844 },
      ];
      let failed = false;
      for (const viewport of primary) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        const text = (await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT)) as { samples: ComputedTextSample[] };
        const links = (await page.evaluate(RENDERED_LINK_CONTRAST_BROWSER_SCRIPT)) as ComputedTextSample[];
        const geometry = (await page.evaluate(PAGE_GEOMETRY_SCRIPT)) as {
          overflowX: number;
          hero: { top: number; height: number } | null;
          following: { top: number; height: number } | null;
          media: { top: number; height: number } | null;
          shellWidth: number;
          proseWidth: number;
          semanticNavWidth: number;
          trustedSourcesWidth: number;
          tableWidth: number;
          ctaWidth: number;
          cardCount: number;
          cardWidths: number[];
          cardHeights: number[];
          columnCount: number;
          rowCount: number;
          lastRowCount: number;
          sourceHasTitle: boolean;
          sourceLinkCount: number;
          iconPaths: string[];
          discoveryGroupCount: number;
          discoveryColumnCount: number;
          discoveryLastRowCount: number;
          discoveryRowCount: number;
          discoveryGridWidth: number;
          discoveryGridX: number;
          discoveryGroupWidths: number[];
          roleBandWidth: number;
          roleBandX: number;
          roleBandY: number;
          hasHubBoard: boolean;
        };
        viewportsRun += 1;
        samplesByRoute[route] = [...(samplesByRoute[route] ?? []), ...(text.samples ?? [])];
        linkSamplesByRoute[route] = [...(linkSamplesByRoute[route] ?? []), ...(links ?? [])];
        if (geometry.overflowX > 1) {
          overflowFailures += 1;
          failed = true;
        }
        if (viewport.width >= 1200) {
          const width = evaluateAuthoritySectionWidth({
            viewportWidth: viewport.width,
            authorityShellWidth: geometry.shellWidth,
            proseWidth: geometry.proseWidth,
            semanticNavWidth: geometry.semanticNavWidth,
            trustedSourcesWidth: geometry.trustedSourcesWidth,
            tableWidth: geometry.tableWidth,
            ctaWidth: geometry.ctaWidth,
          });
          const hero = evaluateHeroContentSeparation({
            hero: geometry.hero,
            following: geometry.following,
            media: geometry.media,
            css,
          });
          const nav = geometry.cardCount
            ? evaluateSemanticNavigationRenderedQuality({
                css,
                html: source,
                cardHeights: geometry.cardHeights,
                iconPaths: geometry.iconPaths,
                cardCount: geometry.cardCount,
                danglingLastRow: geometry.lastRowCount === 1 ? 1 : 0,
              })
            : { overall: "PASS" as const };
          const grid = geometry.cardCount
            ? evaluateBalancedCardGrid({
                cardCount: geometry.cardCount,
                columnCount: geometry.columnCount || 1,
                rowCount: geometry.rowCount || 1,
                lastRowCount: geometry.lastRowCount,
                cardWidths: geometry.cardWidths,
                cardHeights: geometry.cardHeights,
                viewportWidth: viewport.width,
              })
            : { overall: "PASS" as const };
          const breakout = geometry.semanticNavWidth
            ? evaluateSemanticNavigationBreakoutLayout({
                viewportWidth: viewport.width,
                navWidth: geometry.semanticNavWidth,
                proseWidth: geometry.proseWidth,
                cardWidths: geometry.cardWidths,
                css,
              })
            : { overall: "PASS" as const };
          const sources = geometry.trustedSourcesWidth
            ? evaluateAuthoritySourceRenderedQuality({
                sectionWidth: geometry.trustedSourcesWidth,
                shellWidth: geometry.shellWidth,
                desktopColumns: geometry.trustedSourcesWidth > 720 ? 2 : 1,
                viewportWidth: viewport.width,
                hasTitle: geometry.sourceHasTitle,
                hasHierarchy: geometry.sourceHasTitle && geometry.sourceLinkCount > 0,
                linkCount: geometry.sourceLinkCount,
                cramped: geometry.trustedSourcesWidth > 0 && geometry.trustedSourcesWidth < 280,
              })
            : { overall: "PASS" as const };
          const shell = evaluateAuthoritySectionShellConsistency({
            proseWidth: geometry.proseWidth,
            moduleWidths: [geometry.semanticNavWidth, geometry.trustedSourcesWidth, geometry.ctaWidth].filter((width) => width > 0),
            shellWidth: geometry.shellWidth,
          });
          const hubDiscovery = /data-hub-question-discovery/.test(source)
            ? evaluateHubQuestionBoardLayout({
                html: source,
                css,
                desktopColumnCount: geometry.discoveryColumnCount,
                lastRowGroupCount: geometry.discoveryLastRowCount,
                groupCount: geometry.discoveryGroupCount,
                requireGeometry: true,
                geometry: {
                  captured: geometry.hasHubBoard,
                  viewportWidth: viewport.width,
                  containerWidth: geometry.shellWidth,
                  gridWidth: geometry.discoveryGridWidth,
                  columnCount: geometry.discoveryColumnCount,
                  groupWidths: geometry.discoveryGroupWidths,
                  rowCount: geometry.discoveryRowCount,
                  lastRowOccupancy: geometry.discoveryLastRowCount,
                  lastRowGroupCount: geometry.discoveryLastRowCount,
                  roleBandWidth: geometry.roleBandWidth,
                  roleBandX: geometry.roleBandX,
                  roleBandY: geometry.roleBandY,
                  gridX: geometry.discoveryGridX,
                  overflowX: geometry.overflowX,
                  groupCount: geometry.discoveryGroupCount,
                },
              })
            : { overall: "PASS" as const };
          if ([width, hero, nav, grid, breakout, sources, shell, hubDiscovery].some((item) => item.overall === "FAIL")) {
            geometryFailures += 1;
            failed = true;
          }
        }
        const pageEval = evaluatePage(source, css, route, {
          mode: "browser",
          samples: links,
          textSamples: text.samples,
          overflowX: geometry.overflowX,
          hero: geometry.hero,
          following: geometry.following,
          media: geometry.media,
          hubBoard: {
            captured: geometry.hasHubBoard,
            viewportWidth: viewport.width,
            containerWidth: geometry.shellWidth,
            gridWidth: geometry.discoveryGridWidth,
            columnCount: geometry.discoveryColumnCount,
            groupWidths: geometry.discoveryGroupWidths,
            rowCount: geometry.discoveryRowCount,
            lastRowOccupancy: geometry.discoveryLastRowCount,
            lastRowGroupCount: geometry.discoveryLastRowCount,
            roleBandWidth: geometry.roleBandWidth,
            roleBandX: geometry.roleBandX,
            roleBandY: geometry.roleBandY,
            gridX: geometry.discoveryGridX,
            overflowX: geometry.overflowX,
            groupCount: geometry.discoveryGroupCount,
          },
        });
        if (pageEval.failures.length) failed = true;
        await page.close();
      }
      if (failed && input.includeExpandedOnFailure !== false) {
        for (const viewport of [
          { name: "1440", width: 1440, height: 900 },
          { name: "1024", width: 1024, height: 900 },
        ]) {
          const page = await browser.newPage();
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT);
          expandedViewports += 1;
          viewportsRun += 1;
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  const loop = runDeterministicPerPageAdmission({
    files: input.files,
    routes: [...manifest.pageRoutes],
    redirects: [...manifest.redirectSupport],
    samplesByRoute: linkSamplesByRoute,
  });
  const postFreeze = runDeterministicPerPageAdmission({
    files: loop.files,
    routes: [...manifest.pageRoutes],
    redirects: [...manifest.redirectSupport],
    samplesByRoute: linkSamplesByRoute,
  });
  const missingEvidence = loop.missingEvidence;
  return {
    routes: manifest.intendedCount,
    pageRoutes: rendered,
    redirects: manifest.redirectSupport.length,
    rendered,
    viewportsRun,
    expandedViewports,
    contrastSamples: Object.values(samplesByRoute).reduce((sum, items) => sum + items.length, 0),
    linkContrastSamples: Object.values(linkSamplesByRoute).reduce((sum, items) => sum + items.length, 0),
    overflowFailures,
    geometryFailures,
    missingEvidence,
    loop,
    postFreeze,
    overall: loop.overall === "PASS" && postFreeze.overall === "PASS" && loop.finalFailed === 0 ? "PASS" : "FAIL",
  };
}
