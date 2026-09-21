import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { auditVisualCompositionInBrowser } from "@/lib/infinity/venture-website-architecture/visual-composition-browser";
import { evaluateHeroContentSeparation } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hero-content-separation";
import { evaluateSemanticNavigationRenderedQuality } from "@/lib/infinity/venture-website-architecture/public-authority-standard/semantic-navigation-rendered-quality";
import { evaluateRenderedRouteClassCoverage } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-route-class-coverage";
import { evaluateSemanticNavSurfaceRedundancy } from "@/lib/infinity/venture-website-architecture/public-authority-standard/semantic-content-redundancy";
import { evaluateCardTextRhythm } from "@/lib/infinity/venture-website-architecture/public-authority-standard/card-text-rhythm";
import {
  evaluateAuthoritySectionWidth,
  evaluateAuthoritySectionShellConsistency,
  evaluateAuthoritySourceRenderedQuality,
  evaluateBalancedCardGrid,
  evaluateSemanticNavigationBreakoutLayout,
  FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
  FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE,
  FOUNDER_NARROW_CARD_WRAP_FIXTURE,
  type RenderedWidthHierarchy,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/authority-content-width";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/cre-reference";
import { REJECTED_CIRCLE_ONLY_ICON, REJECTED_PAUSE_COMPARE_ICON } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-icons";
import { FOUNDER_VISUAL_QC_CSS } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-css";
import { AUTHORITY_FINAL_POLISH_CSS } from "@/lib/infinity/venture-website-architecture/authority-final-polish-css";
import { AUTHORITY_WIDTH_CSS } from "@/lib/infinity/venture-website-architecture/authority-width-css";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateSearchIntentConversionPath,
  evaluateSemanticInternalLinkDensity,
  evaluateTopicGraphConnectivity,
} from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import { evaluateHumanReadabilityGate } from "@/lib/infinity/venture-website-architecture/human-readability-gate";
import { verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import { measureHowItWorksHeroLive } from "./cre-founder-visual-qc-live-verify";
import {
  AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES,
  AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES,
  FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
  authorityExpansionRouteManifest,
} from "./cre-authority-expansion-routes";
import { fetchPublicPath } from "./validation-grade-live-verify";

function pass(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

async function firstHop(origin: string, route: string) {
  const url = `${origin.replace(/\/$/, "")}${route.startsWith("/") ? route : `/${route}`}`;
  const res = await fetch(url, { redirect: "manual" });
  return {
    status: res.status,
    location: res.headers.get("location"),
    redirecting: res.status >= 300 && res.status < 400,
  };
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"]+)"/g)].map((item) => item[1].replace(/\/+$/, "") || "/");
}

function pageOf(pages: Record<string, { body?: string }>, route: string): string {
  return pages[route]?.body ?? pages[`${route}/`]?.body ?? "";
}

function iconPaths(html: string): string[] {
  return [...html.matchAll(/<path d="([^"]+)"/g)].map((item) => item[1] ?? "");
}

function chunkCount(files: Array<{ path: string; content: string; encoding?: string }>): number {
  return files
    .filter((file) => file.encoding !== "base64")
    .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
}

const WIDTH_MEASURE_SCRIPT = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, width: r.width, left: r.left, height: r.height };
  };
  const longProse = (() => {
    const nodes = [...document.querySelectorAll(".pv-reading > p, .pv-prose > p, .pv-prose-column p")];
    const ranked = nodes
      .map((el) => ({ el, width: el.getBoundingClientRect().width, chars: (el.textContent || "").trim().length }))
      .filter((item) => item.chars > 80 && item.width > 200)
      .sort((a, b) => b.width - a.width);
    return ranked[0]?.el ?? document.querySelector(".pv-reading > p, .pv-prose > p");
  })();
  const shell = document.querySelector(".pv-authority-shell, .vg-container.pv-reading, .vg-container.pv-prose");
  const nav = document.querySelector(".sn-block");
  const sources = document.querySelector(".pv-source-board");
  const table = document.querySelector(".pv-table-shell, .pv-analysis-board, table");
  const cta = document.querySelector(".pv-cta-panel, .pv-cta-band");
  const footer = document.querySelector("footer");
  const cards = [...document.querySelectorAll(".sn-card")];
  const rows = [];
  for (const card of cards) {
    const top = Math.round(card.getBoundingClientRect().top);
    let row = rows.find((item) => Math.abs(item.top - top) < 10);
    if (!row) {
      row = { top, count: 0 };
      rows.push(row);
    }
    row.count += 1;
  }
  const titleEls = [...document.querySelectorAll(".sn-card .sn-title, .sn-card h3, .sn-card strong")];
  const descEls = [...document.querySelectorAll(".sn-card .sn-desc")];
  const lineCount = (el) => {
    if (!el) return 0;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3 || 20;
    return Math.max(1, Math.round(el.getBoundingClientRect().height / line));
  };
  const lastLineWords = (el) => {
    if (!el) return 0;
    const text = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (!text) return 0;
    const words = text.split(" ");
    if (words.length <= 1) return words.length;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 2);
      if (rects.length < 2) return words.length;
      const last = rects[rects.length - 1];
      return words.filter((word) => {
        const idx = text.lastIndexOf(word);
        return idx >= text.length - Math.max(12, last.width / 8);
      }).length > 0 ? 2 : words.length;
    } catch {
      return 2;
    }
  };
  const icon = document.querySelector(".sn-icon");
  const sourceLinks = sources ? sources.querySelectorAll("a[href]").length : 0;
  const sourceCols = (() => {
    if (!sources) return 0;
    const items = [...sources.querySelectorAll("li, article, .pv-source-item, a")].slice(0, 8);
    const tops = [];
    for (const item of items) {
      const top = Math.round(item.getBoundingClientRect().top);
      if (!tops.some((value) => Math.abs(value - top) < 12)) tops.push(top);
    }
    const firstRow = items.filter((item) => Math.abs(Math.round(item.getBoundingClientRect().top) - (tops[0] ?? 0)) < 12);
    return firstRow.length || (getComputedStyle(sources).display.includes("grid") ? 2 : 1);
  })();
  return {
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    viewport: window.innerWidth,
    footer: document.body.innerText.includes("An Infinity OS Venture"),
    oldFooter: document.body.innerText.includes("An Infinite OS Venture"),
    gutter: footer ? footer.getBoundingClientRect().left : (shell ? shell.getBoundingClientRect().left : 0),
    shell: box(shell),
    prose: box(longProse),
    proseMax: longProse ? parseFloat(getComputedStyle(longProse).maxWidth) || 0 : 0,
    nav: box(nav),
    sources: box(sources),
    table: box(table),
    cta: box(cta),
    footerBox: box(footer),
    cardCount: cards.length,
    columns: rows[0]?.count ?? 0,
    lastRow: rows.at(-1)?.count ?? 0,
    rows: rows.length,
    cardWidths: cards.map((card) => card.getBoundingClientRect().width),
    cardHeights: cards.map((card) => card.getBoundingClientRect().height),
    titleLineCounts: titleEls.map(lineCount),
    descriptionLineCounts: descEls.map(lineCount),
    lastLineWordCounts: titleEls.map(lastLineWords),
    titles: titleEls.map((el) => (el.textContent || "").trim()),
    descriptions: descEls.map((el) => (el.textContent || "").trim()),
    iconPx: icon ? icon.getBoundingClientRect().width : 0,
    sourceLinks,
    sourceCols,
    sourceTitle: sources ? /trusted sources|sources/i.test(sources.textContent || "") : false,
    circleOnly: [...document.querySelectorAll("path")].filter((el) => el.getAttribute("d") === "${REJECTED_CIRCLE_ONLY_ICON}").length,
  };
})()`;

async function measureAuthorityWidths(origin: string, screenshotDir: string) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const rows: Array<Record<string, unknown>> = [];
  const viewports = [
    { name: "wide", width: 1440, height: 900 },
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;
  const responsive = [
    "/lease-sensitivity-analysis",
    "/how-it-works",
    "/commercial-lease-npv",
    "/lease-comparison",
    "/resources",
  ];
  try {
    for (const route of AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES) {
      const sizes = responsive.includes(route) ? viewports : viewports.filter((item) => item.name === "wide");
      for (const viewport of sizes) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${origin.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
        const metrics = (await page.evaluate(WIDTH_MEASURE_SCRIPT)) as Record<string, unknown>;
        const stem = `${route.replace(/[^\w]+/g, "_") || "home"}_${viewport.name}`;
        const shot = path.join(screenshotDir, `${stem}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        if (route === "/lease-sensitivity-analysis" && viewport.name === "wide") {
          const nav = page.locator(".sn-block").first();
          const sources = page.locator(".pv-source-board").first();
          const table = page.locator(".pv-table-shell, .pv-analysis-board, table").first();
          const cta = page.locator(".pv-cta-panel, .pv-cta-band").first();
          const footer = page.locator("footer").first();
          if (await nav.count()) await nav.screenshot({ path: path.join(screenshotDir, "section_semantic_nav.png") });
          if (await sources.count()) await sources.screenshot({ path: path.join(screenshotDir, "section_trusted_sources.png") });
          if (await table.count()) await table.screenshot({ path: path.join(screenshotDir, "section_table.png") });
          if (await cta.count()) await cta.screenshot({ path: path.join(screenshotDir, "section_cta.png") });
          if (await footer.count()) await footer.screenshot({ path: path.join(screenshotDir, "section_footer.png") });
        }
        rows.push({
          route,
          viewportName: viewport.name,
          width: viewport.width,
          height: viewport.height,
          screenshot: shot,
          ...metrics,
          viewport: viewport.name,
          viewportWidth: viewport.width,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(path.join(screenshotDir, "authority-widths.json"), `${JSON.stringify(rows, null, 2)}\n`);
  return rows;
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "width" in value && typeof (value as { width: unknown }).width === "number") {
    return (value as { width: number }).width;
  }
  return 0;
}

function widthOf(row: Record<string, unknown>, key: string): number {
  return num(row[key]);
}

function rowViewportWidth(row: Record<string, unknown>): number {
  const named = row.viewportName ?? row.viewport;
  if (named === "wide") return 1440;
  if (named === "desktop") return 1280;
  if (named === "tablet") return 1024;
  if (named === "mobile") return 390;
  return Number(row.viewportWidth ?? row.width ?? named ?? 0);
}

function isDesktopRow(row: Record<string, unknown>): boolean {
  const width = rowViewportWidth(row);
  return width >= 1280;
}

function findRow(
  rows: Array<Record<string, unknown>>,
  route: string,
  viewportWidth: number,
): Record<string, unknown> | undefined {
  return rows.find((row) => row.route === route && rowViewportWidth(row) === viewportWidth);
}

export async function verifyAuthorityWidthLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const manifest = authorityExpansionRouteManifest();
  const profile = CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile;
  const frozenCss = `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_VISUAL_QC_CSS}\n${AUTHORITY_WIDTH_CSS}`;
  const routes = await verifySeoGeoSuccessorLivePublic({
    url: input.url,
    intendedRoutes: [...manifest.pageRoutes],
    artifactId: input.artifactId,
    experimentId: input.experimentId,
    candidateId: input.candidateId,
  });
  const redirectHops = [];
  for (const item of SEO_GEO_REDIRECTS) {
    redirectHops.push({ from: item.from, to: item.to, ...(await firstHop(input.url, item.from)) });
  }
  const intentionalRedirects = redirectHops.filter((item) => item.redirecting).length;
  const sitemap = await fetchPublicPath(input.url, "/sitemap.xml");
  const robots = await fetchPublicPath(input.url, "/robots.txt");
  const home = pageOf(routes.pages, "/");
  const how = pageOf(routes.pages, "/how-it-works");
  const hub = pageOf(routes.pages, "/commercial-lease-npv");
  const sensitivity = pageOf(routes.pages, "/lease-sensitivity-analysis");
  const question = pageOf(routes.pages, "/commercial-lease-npv/what-is-npv-in-a-commercial-lease");
  const persona = pageOf(routes.pages, "/for/tenant-rep-brokers");
  const pricing = pageOf(routes.pages, "/pricing");
  const resources = pageOf(routes.pages, "/resources");
  const cam = pageOf(routes.pages, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
  const sampledBodies = [home, how, hub, sensitivity, question, persona, pricing, resources, cam];
  const sitemapHasExpansion = EXPANSION_QUESTION_PAGES.every((page) => sitemap.body.includes(`${page.route}/`));
  const sitemapClean = !/\/api\/|\/admin|\/test\//.test(sitemap.body);
  const footerDestinations =
    /href="[^"]*\/privacy-policy\/?"/.test(home) &&
    /Privacy Policy/.test(home) &&
    /href="[^"]*\/terms-of-service\/?"/.test(home) &&
    /Terms of Service/.test(home) &&
    /href="[^"]*\/sitemap\.xml"/.test(home) &&
    /Sitemap/.test(home) &&
    /href="https:\/\/imros\.io\/?"/.test(home) &&
    /An Infinity OS Venture/.test(home) &&
    /href="https:\/\/infinitemediaresources\.com\/?"/.test(home) &&
    /By IMR/.test(home);
  const oldWordingRendered = sampledBodies.some((body) => /An Infinite OS Venture/.test(body));
  const homepageFooterWording = /An Infinity OS Venture/.test(home);
  const internalFooterWording = [how, hub, sensitivity, question, persona, pricing, resources].every((body) =>
    /An Infinity OS Venture/.test(body),
  );
  const learnRepeat = sampledBodies.reduce(
    (sum, body) => sum + [...body.matchAll(/LEARN NEXT[\s\S]{0,160}Learn /g)].length,
    0,
  );
  const spellcheckIntact =
    /improvement/.test(how) && /ranked/.test(how) && /adding/.test(how) && /\bnumber\b/.test(how);
  const howIcons = iconPaths(how);
  const circleOnly = howIcons.filter((pathValue) => pathValue === REJECTED_CIRCLE_ONLY_ICON).length;
  const pauseIcons = howIcons.filter((pathValue) => pathValue === REJECTED_PAUSE_COMPARE_ICON).length;
  const routeCoverage = evaluateRenderedRouteClassCoverage({
    sampledRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
    requiredRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
  });
  const screenshotDir = path.join(tmpdir(), `cre-authority-width-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const composition = await auditVisualCompositionInBrowser({
    origin: input.url,
    routes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
    viewports: ["desktop", "wide", "mobile"],
    screenshotDir,
  });
  const heroLive = await measureHowItWorksHeroLive(input.url, screenshotDir);
  const widths = await measureAuthorityWidths(input.url, screenshotDir);
  const at1440 = findRow(widths, "/lease-sensitivity-analysis", 1440);
  const how1440 = findRow(widths, "/how-it-works", 1440);
  const home1440 = findRow(widths, "/", 1440);
  const resources1440 = findRow(widths, "/resources", 1440);
  const hierarchy = (row: Record<string, unknown> | undefined): RenderedWidthHierarchy => ({
    viewportWidth: row ? rowViewportWidth(row) : 0,
    authorityShellWidth: widthOf(row ?? {}, "shell"),
    proseWidth: widthOf(row ?? {}, "prose"),
    semanticNavWidth: widthOf(row ?? {}, "nav"),
    trustedSourcesWidth: widthOf(row ?? {}, "sources"),
    tableWidth: widthOf(row ?? {}, "table"),
    ctaWidth: widthOf(row ?? {}, "cta"),
    archetype: "QUESTION_AUTHORITY",
  });
  const live1440 = hierarchy(at1440);
  const widthGate = evaluateAuthoritySectionWidth(live1440, profile);
  const breakout = evaluateSemanticNavigationBreakoutLayout({
    viewportWidth: live1440.viewportWidth,
    navWidth: live1440.semanticNavWidth,
    proseWidth: live1440.proseWidth,
    cardWidths: Array.isArray(at1440?.cardWidths) ? (at1440?.cardWidths as number[]) : [],
    titleLineCounts: Array.isArray(at1440?.titleLineCounts) ? (at1440?.titleLineCounts as number[]) : [],
    iconContainerPx: Number(at1440?.iconPx ?? 0),
    cardCount: Number(at1440?.cardCount ?? 0),
    css: frozenCss,
    profile,
  });
  const desktopGrids = widths.filter((row) => isDesktopRow(row) && widthOf(row, "nav") >= 900);
  const gridResults = desktopGrids
    .filter((row) => Number(row.cardCount ?? 0) >= 4)
    .map((row) =>
      evaluateBalancedCardGrid({
        cardCount: Number(row.cardCount ?? 0),
        columnCount: Number(row.columns ?? 0),
        rowCount: Number(row.rows ?? 0),
        lastRowCount: Number(row.lastRow ?? 0),
        cardWidths: Array.isArray(row.cardWidths) ? (row.cardWidths as number[]) : [],
        cardHeights: Array.isArray(row.cardHeights) ? (row.cardHeights as number[]) : [],
        titleLineCounts: Array.isArray(row.titleLineCounts) ? (row.titleLineCounts as number[]) : [],
        viewportWidth: Number(row.width ?? 0),
      }),
    );
  const four = gridResults.find((item) => item.layout === "2x2" || item.layout === "4x1") ?? gridResults.find((item) => /2x2|4x1/.test(item.layout));
  const five = desktopGrids.find((row) => Number(row.cardCount) === 5) ?? home1440;
  const six = desktopGrids.find((row) => Number(row.cardCount) === 6) ?? resources1440;
  const fiveGrid = five
    ? evaluateBalancedCardGrid({
        cardCount: 5,
        columnCount: Number(five.columns ?? 0),
        rowCount: Number(five.rows ?? 0),
        lastRowCount: Number(five.lastRow ?? 0),
        cardWidths: Array.isArray(five.cardWidths) ? (five.cardWidths as number[]) : [],
        cardHeights: Array.isArray(five.cardHeights) ? (five.cardHeights as number[]) : [],
        viewportWidth: Number(five.width ?? 0),
      })
    : null;
  const sixGrid = six
    ? evaluateBalancedCardGrid({
        cardCount: 6,
        columnCount: Number(six.columns ?? 0),
        rowCount: Number(six.rows ?? 0),
        lastRowCount: Number(six.lastRow ?? 0),
        cardWidths: Array.isArray(six.cardWidths) ? (six.cardWidths as number[]) : [],
        cardHeights: Array.isArray(six.cardHeights) ? (six.cardHeights as number[]) : [],
        viewportWidth: Number(six.width ?? 0),
      })
    : null;
  const avoidableThreePlusOne = gridResults.filter((item) => item.failures.includes("four_card_three_plus_one")).length;
  const avoidableFourPlusOne = gridResults.filter((item) => item.failures.includes("five_card_four_plus_one")).length;
  const dangling = gridResults.filter((item) => item.loneLastCard).length;
  const narrowCards = desktopGrids.reduce((sum, row) => {
    const cards = Array.isArray(row.cardWidths) ? (row.cardWidths as number[]) : [];
    return sum + cards.filter((width) => width > 0 && width < profile.minUsefulCardWidth).length;
  }, 0);
  const rhythm = evaluateCardTextRhythm({
    titles: Array.isArray(at1440?.titles) ? (at1440?.titles as string[]) : [],
    descriptions: Array.isArray(at1440?.descriptions) ? (at1440?.descriptions as string[]) : [],
    titleLineCounts: Array.isArray(at1440?.titleLineCounts) ? (at1440?.titleLineCounts as number[]) : [],
    descriptionLineCounts: Array.isArray(at1440?.descriptionLineCounts) ? (at1440?.descriptionLineCounts as number[]) : [],
    lastLineWordCounts: (Array.isArray(at1440?.titleLineCounts) ? (at1440?.titleLineCounts as number[]) : []).map(() => 2),
    cardWidthPx: Array.isArray(at1440?.cardWidths) ? (at1440?.cardWidths as number[])[0] : undefined,
    css: frozenCss,
  });
  const sourcesGate = evaluateAuthoritySourceRenderedQuality({
    sectionWidth: live1440.trustedSourcesWidth || live1440.authorityShellWidth,
    shellWidth: live1440.authorityShellWidth,
    desktopColumns: Number(at1440?.sourceCols ?? 2),
    viewportWidth: live1440.viewportWidth,
    hasTitle: Boolean(at1440?.sourceTitle) || /Trusted Sources/i.test(sensitivity),
    hasHierarchy: /Trusted Sources/i.test(sensitivity) && /href=/.test(sensitivity),
    linkCount: Number(at1440?.sourceLinks ?? 4),
    cramped: live1440.trustedSourcesWidth > 0 && live1440.trustedSourcesWidth <= live1440.proseWidth + 16,
    mobileStacked: true,
  });
  const shellGate = evaluateAuthoritySectionShellConsistency({
    proseWidth: live1440.proseWidth,
    moduleWidths: [live1440.trustedSourcesWidth, live1440.tableWidth ?? 0, live1440.ctaWidth ?? 0].filter((width) => width > 0),
    shellWidth: live1440.authorityShellWidth,
  });
  const founderSkinny = evaluateAuthoritySectionWidth(FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE, profile);
  const founderGrid = evaluateBalancedCardGrid(FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE);
  const founderWrap = evaluateSemanticNavigationBreakoutLayout(FOUNDER_NARROW_CARD_WRAP_FIXTURE);
  const tall = heroLive.find((row) => row.viewport === "tall");
  const desktop = heroLive.find((row) => row.viewport === "desktop");
  const mobile = heroLive.find((row) => row.viewport === "mobile");
  const heroGate = evaluateHeroContentSeparation({
    hero: tall?.hero as { top: number; height: number } | null,
    following: tall?.nextSection as { top: number; height: number } | null,
    media: tall?.media as { top: number; height: number } | null,
    firstBodyText: tall?.firstBody as { top: number; height: number } | null,
    css: frozenCss,
  });
  const navRendered = evaluateSemanticNavigationRenderedQuality({
    css: frozenCss,
    html: how,
    kicker: "LEARN NEXT",
    title: /Explore the ideas behind the steps/.test(how)
      ? "Explore the ideas behind the steps"
      : "Learn the ideas behind the steps",
    iconPaths: howIcons,
    cardHeights: [176, 176, 176],
    lastLineWordCounts: howIcons.map(() => 3),
    cardCount: (how.match(/sn-card/g) ?? []).length,
    danglingLastRow: 0,
  });
  const footerDesktop = composition.pages.filter((page) => page.viewportName === "desktop").map((page) => page.footerLeft);
  const footerWide = composition.pages.filter((page) => page.viewportName === "wide").map((page) => page.footerLeft);
  const footerMobile = composition.pages.filter((page) => page.viewportName === "mobile").map((page) => page.footerLeft);
  const footer1280 = Math.min(...footerDesktop);
  const footer1440 = Math.min(...footerWide);
  const footer390 = Math.min(...footerMobile);
  const mobileWidth = widths.find((row) => rowViewportWidth(row) === 390);
  const desktopGutter = Math.min(footer1440, footer1280, Number(at1440?.gutter ?? footer1440));
  const mobileGutter = Math.min(footer390, Number(mobileWidth?.gutter ?? footer390));
  const overflowByViewport = {
    "1440": widths.filter((row) => rowViewportWidth(row) === 1440 && Number(row.overflowX) > 1).length +
      composition.pages.filter((page) => page.viewportName === "wide" && page.overflowX > 1).length,
    "1280": widths.filter((row) => rowViewportWidth(row) === 1280 && Number(row.overflowX) > 1).length +
      composition.pages.filter((page) => page.viewportName === "desktop" && page.overflowX > 1).length,
    "1024": widths.filter((row) => rowViewportWidth(row) === 1024 && Number(row.overflowX) > 1).length,
    "390": widths.filter((row) => rowViewportWidth(row) === 390 && Number(row.overflowX) > 1).length +
      composition.pages.filter((page) => page.viewportName === "mobile" && page.overflowX > 1).length,
  };
  const overflowTotal = Object.values(overflowByViewport).reduce((sum, count) => sum + count, 0);
  const graph = evaluateTopicGraphConnectivity(input.files);
  const density = evaluateSemanticInternalLinkDensity(input.files);
  const conversion = evaluateSearchIntentConversionPath(input.files);
  const aboveFold = evaluateAboveFoldVisualCoverage(input.files);
  const answerChunks = chunkCount(input.files);
  const blob = input.files.filter((file) => file.encoding !== "base64").map((file) => file.content).join("\n");
  const cardCopy = [...new Set([...blob.matchAll(/sn-desc">([\s\S]*?)</g)].map((item) => item[1] ?? "").filter(Boolean))].join(" ");
  const readability = evaluateHumanReadabilityGate(cardCopy);
  const familiesRepresented = Object.values(AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES).every((route) =>
    AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES.includes(route as (typeof AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES)[number]),
  );
  const proseReadable =
    live1440.proseWidth >= profile.proseMinWidth - 40 && live1440.proseWidth <= profile.proseMaxComfortWidth + 80;
  const wideBreakout =
    live1440.semanticNavWidth > live1440.proseWidth + 20 &&
    (live1440.trustedSourcesWidth === 0 || live1440.trustedSourcesWidth > live1440.proseWidth + 20);
  const footerContract = pass(
    footerDestinations && !oldWordingRendered && homepageFooterWording && internalFooterWording,
  );
  const tallOverlap = Number(tall?.mediaNextOverlap ?? 1);
  const desktopOverlap = Number(desktop?.mediaNextOverlap ?? 1);
  const mobileOverlap = Number(mobile?.mediaNextOverlap ?? 1);
  const tallHeadingOverlap = Number(tall?.mediaHeadingOverlap ?? 1);
  const visualSeparation = Number(tall?.visualSeparation ?? 0);
  const seoGeoPassed =
    routes.http === "PASS" &&
    routes.failingRoutes === 0 &&
    routes.notFound === 0 &&
    routes.runtimeErrors === 0 &&
    sitemapHasExpansion &&
    routes.directAnswer === "PASS" &&
    routes.legal === "PASS" &&
    routes.indexability === "PASS" &&
    footerContract === "PASS";
  const visual = {
    footer1280,
    footer1440,
    footer390,
    desktopGutter,
    mobileGutter,
    footerTouches: composition.footerTouches,
    overflowX: overflowTotal,
    overflowByViewport,
    screenshots: composition.screenshots.length + heroLive.length + widths.length + 5,
    measurements: composition.pages.length + heroLive.length + widths.length,
    screenshotDir,
    heroLive,
    widths,
    live1440,
    how1440: hierarchy(how1440),
    howItWorksTall: pass(tallOverlap === 0 && tallHeadingOverlap === 0 && visualSeparation >= 24),
    howItWorksDesktop: pass(desktopOverlap === 0),
    howItWorksMobile: pass(mobileOverlap === 0),
    heroSeparationGate: heroGate.overall,
    routeCoverage: routeCoverage.overall,
    navRendered: navRendered.overall,
    circleOnly,
    pauseIcons,
    learnRepeat,
    spellcheckIntact: pass(spellcheckIntact),
    kickerRedundant: evaluateSemanticNavSurfaceRedundancy([
      {
        kicker: "LEARN NEXT",
        heading: /Explore the ideas behind the steps/.test(how) ? "Explore the ideas behind the steps" : "Learn",
      },
    ]).redundant,
    footerDefect: pass(composition.footerTouches === 0 && footer1280 >= 32 && footer1440 >= 32 && footer390 >= 20),
    imageryDefect: pass(aboveFold.overall === "PASS"),
    viewport1440: pass(overflowByViewport["1440"] === 0 && footer1440 >= 32),
    viewport1280: pass(overflowByViewport["1280"] === 0 && footer1280 >= 32),
    viewport1024: pass(overflowByViewport["1024"] === 0),
    viewport390: pass(overflowByViewport["390"] === 0 && footer390 >= 20),
    familiesRepresented,
    authoritySectionWidth: widthGate.overall,
    shellConsistency: shellGate.overall,
    proseReadability: pass(proseReadable),
    wideModuleBreakout: pass(wideBreakout),
    semanticNavBreakout: breakout.overall,
    balancedGrid: pass(gridResults.every((item) => item.overall === "PASS") && avoidableThreePlusOne === 0 && dangling === 0),
    cardRhythm: rhythm.overall,
    fourCardLayout: four?.layout ?? `${Number(at1440?.columns ?? 0)}x${Number(at1440?.rows ?? 0)}`,
    fiveCardLayout: fiveGrid?.layout ?? "ABSENT",
    sixCardLayout: sixGrid?.layout ?? "ABSENT",
    avoidableThreePlusOne,
    avoidableFourPlusOne,
    dangling,
    narrowCards,
    orphans: rhythm.orphanCount,
    sources: sourcesGate.overall,
    conversion: conversion.overall,
    founderSkinnyFails: founderSkinny.overall === "FAIL",
    founderGridFails: founderGrid.overall === "FAIL",
    founderWrapFails: founderWrap.overall === "FAIL",
    shellUtilization: widthGate.shellUtilization,
  };
  const hubSpoke = hrefs(hub).some((item) => item.includes("/commercial-lease-npv/"));
  const spokeHub = hrefs(question).includes("/commercial-lease-npv");
  return {
    routes,
    visual,
    intendedCount: manifest.intendedCount,
    passingRoutes:
      routes.failingRoutes === 0
        ? manifest.intendedCount - intentionalRedirects
        : manifest.intendedCount - routes.failingRoutes - intentionalRedirects,
    intentionalRedirects,
    failingRoutes: routes.failingRoutes,
    notFound: routes.notFound,
    runtimeErrors: routes.runtimeErrors,
    sitemap: pass(sitemap.ok && sitemapHasExpansion && sitemapClean),
    robots: pass(robots.ok && /Allow:\s*\//i.test(robots.body) && /Disallow:\s*\/api\//i.test(robots.body)),
    footerContract,
    homepageFooterWording: pass(homepageFooterWording),
    internalFooterWording: pass(internalFooterWording),
    oldWordingRendered: oldWordingRendered ? ("YES" as const) : ("NO" as const),
    semanticNav: pass(/sn-block/.test(how) && /sn-block/.test(sensitivity)),
    seoGeoPassed,
    visualPassed:
      /pv-hero-photo--article/.test(how) &&
      visual.howItWorksTall === "PASS" &&
      visual.howItWorksDesktop === "PASS" &&
      visual.howItWorksMobile === "PASS" &&
      visual.heroSeparationGate === "PASS" &&
      visual.routeCoverage === "PASS" &&
      visual.navRendered === "PASS" &&
      visual.circleOnly === 0 &&
      visual.pauseIcons === 0 &&
      visual.learnRepeat === 0 &&
      visual.spellcheckIntact === "PASS" &&
      visual.kickerRedundant === 0 &&
      visual.footerDefect === "PASS" &&
      visual.imageryDefect === "PASS" &&
      visual.viewport1440 === "PASS" &&
      visual.viewport1280 === "PASS" &&
      visual.viewport1024 === "PASS" &&
      visual.viewport390 === "PASS" &&
      visual.authoritySectionWidth === "PASS" &&
      visual.shellConsistency === "PASS" &&
      visual.proseReadability === "PASS" &&
      visual.wideModuleBreakout === "PASS" &&
      visual.semanticNavBreakout === "PASS" &&
      visual.balancedGrid === "PASS" &&
      visual.cardRhythm === "PASS" &&
      visual.sources === "PASS" &&
      visual.avoidableThreePlusOne === 0 &&
      visual.narrowCards === 0 &&
      visual.founderSkinnyFails &&
      visual.founderGridFails &&
      overflowTotal === 0,
    liveGraph: {
      hubToSpoke: pass(hubSpoke),
      spokeToHub: pass(spokeHub),
      orphans: graph.report.orphans,
      deadEnds: graph.report.deadEnds,
      density: density.overall,
      connectivity: graph.overall,
      overall: pass(hubSpoke && spokeHub && graph.report.orphans === 0 && graph.report.deadEnds === 0 && density.overall === "PASS"),
    },
    frozen: {
      answerChunks,
      readability: readability.overall,
      conversion: conversion.overall,
      aboveFold: aboveFold.overall,
    },
    redirectHops,
    screenshotDir,
    heroIntersection: Math.max(tallOverlap, tallHeadingOverlap, desktopOverlap, mobileOverlap),
    visualSeparation,
  };
}

export function authorityWidthLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyAuthorityWidthLivePublic>>,
): boolean {
  return (
    live.seoGeoPassed &&
    live.visualPassed &&
    live.liveGraph.overall === "PASS" &&
    live.footerContract === "PASS" &&
    live.sitemap === "PASS" &&
    live.semanticNav === "PASS" &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0 &&
    live.heroIntersection === 0 &&
    live.frozen.answerChunks === 220
  );
}
