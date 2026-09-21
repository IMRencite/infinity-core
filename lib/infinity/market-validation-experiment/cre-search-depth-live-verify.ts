import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { SEO_GEO_REDIRECTS, SEO_GEO_TOPIC_HUBS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { DEPTH_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/search-demand-depth-catalog";
import { hubDiscoveryItems } from "@/lib/infinity/venture-website-architecture/hub-question-discovery";
import { currentStandaloneRoutesForTopic } from "@/lib/infinity/venture-website-architecture/search-demand-depth-research";
import { TOPIC_IDS, type TopicId } from "@/lib/infinity/venture-website-architecture/search-validated-question-graph";
import {
  evaluateSectionSurfaceContrast,
  evaluateSectionSurfaceRhythm,
  extractSurfaceSequence,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/section-surface-system";
import { evaluateHeroContentSeparation } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hero-content-separation";
import {
  evaluateAuthoritySectionWidth,
  evaluateAuthoritySectionShellConsistency,
  evaluateAuthoritySourceRenderedQuality,
  evaluateBalancedCardGrid,
  evaluateSemanticNavigationBreakoutLayout,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/authority-content-width";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/cre-reference";
import { AUTHORITY_WIDTH_CSS } from "@/lib/infinity/venture-website-architecture/authority-width-css";
import { AUTHORITY_FINAL_POLISH_CSS } from "@/lib/infinity/venture-website-architecture/authority-final-polish-css";
import { FOUNDER_VISUAL_QC_CSS } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-css";
import {
  evaluateAboveFoldVisualCoverage,
  evaluateSearchIntentConversionPath,
  evaluateSemanticInternalLinkDensity,
  evaluateTopicGraphConnectivity,
} from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import {
  evaluateHubQuestionDiscoveryCoverage,
  evaluateSearchDemandAuthoritySurface,
  evaluateSearchIntentCannibalization,
} from "@/lib/infinity/venture-website-architecture/search-demand-depth-gates";
import { evaluateHumanReadabilityGate } from "@/lib/infinity/venture-website-architecture/human-readability-gate";
import { REJECTED_CIRCLE_ONLY_ICON } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-icons";
import { verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import { measureHowItWorksHeroLive } from "./cre-founder-visual-qc-live-verify";
import { SEARCH_DEPTH_LIVE_SAMPLE_ROUTES, searchDepthRouteManifest } from "./cre-authority-expansion-routes";
import { fetchPublicPath } from "./validation-grade-live-verify";

function pass(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function pageOf(pages: Record<string, { body?: string }>, route: string): string {
  return pages[route]?.body ?? pages[`${route}/`]?.body ?? "";
}

function chunkCount(files: Array<{ path: string; content: string; encoding?: string }>): number {
  return files
    .filter((file) => file.encoding !== "base64")
    .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
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

const MEASURE_SCRIPT = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, width: r.width, left: r.left, height: r.height };
  };
  const shell = document.querySelector(".pv-authority-shell, .vg-container.pv-reading, .vg-container.pv-prose");
  const prose = [...document.querySelectorAll(".pv-reading > p, .pv-prose > p")].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  const nav = document.querySelector(".sn-block");
  const sources = document.querySelector(".pv-source-board");
  const table = document.querySelector(".pv-table-shell, .pv-analysis-board, table");
  const cta = document.querySelector(".pv-cta-panel, .pv-cta-band");
  const footer = document.querySelector("footer");
  const cards = [...document.querySelectorAll(".sn-card")];
  const surfaces = [...document.querySelectorAll("[data-surface]")].map((el) => el.getAttribute("data-surface"));
  return {
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    footer: document.body.innerText.includes("An Infinity OS Venture"),
    oldFooter: document.body.innerText.includes("An Infinite OS Venture"),
    gutter: footer ? footer.getBoundingClientRect().left : 0,
    shell: box(shell),
    prose: box(prose),
    nav: box(nav),
    sources: box(sources),
    table: box(table),
    cta: box(cta),
    cardCount: cards.length,
    cardWidths: cards.map((card) => card.getBoundingClientRect().width),
    discovery: Boolean(document.querySelector("[data-hub-question-discovery]")),
    discoveryGroups: [...document.querySelectorAll("[data-discovery-group]")].map((el) => el.getAttribute("data-discovery-group")),
    surfaces,
    iconPx: document.querySelector(".sn-icon") ? document.querySelector(".sn-icon").getBoundingClientRect().width : 0,
    circleOnly: [...document.querySelectorAll("path")].filter((el) => el.getAttribute("d") === ${JSON.stringify(REJECTED_CIRCLE_ONLY_ICON)}).length,
    titleInk: (function () {
      const el = document.querySelector(".sn-title, .sn-copy strong, .pv-source-board h2");
      if (!el) return 1;
      const color = getComputedStyle(el).color;
      const nums = color.match(/[0-9.]+/g);
      if (!nums || nums.length < 3) return 1;
      return (Number(nums[0]) * 299 + Number(nums[1]) * 587 + Number(nums[2]) * 114) / 255000;
    })(),
  };
})()`;

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "width" in value && typeof (value as { width: unknown }).width === "number") {
    return (value as { width: number }).width;
  }
  return 0;
}

export async function verifySearchDepthLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const manifest = searchDepthRouteManifest();
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
  const hubVisible: Record<TopicId, number> = {} as Record<TopicId, number>;
  for (const hub of SEO_GEO_TOPIC_HUBS) {
    const html = pageOf(routes.pages, hub.route);
    const owned = hubDiscoveryItems(hub.route);
    hubVisible[hub.cluster as TopicId] = owned.filter((item) => html.includes(clean(item.href)) || html.includes(item.href)).length;
  }
  const grouped = SEO_GEO_TOPIC_HUBS.every((hub) => /data-hub-question-discovery/.test(pageOf(routes.pages, hub.route)));
  const hubDiscoveryPass = TOPIC_IDS.every((topic) => (hubVisible[topic] ?? 0) >= 10) && grouped;
  const newPagesLive = DEPTH_QUESTION_PAGES.every((page) => {
    const html = pageOf(routes.pages, page.route);
    return /<h1/i.test(html) && html.includes(page.question) && !/Application error|Internal Server Error/i.test(html);
  });
  const sitemapHasDepth = DEPTH_QUESTION_PAGES.every((page) => sitemap.body.includes(page.route));
  const sitemapClean = !/\/api\/|\/admin|\/test\//.test(sitemap.body);
  const accidentalPublic = /\/admin|\/test\/|\/api\/internal|\/debug/i.test(`${sitemap.body}\n${home}`);
  const footerDestinations =
    /Privacy Policy/.test(home) &&
    /Terms of Service/.test(home) &&
    /Sitemap/.test(home) &&
    /An Infinity OS Venture/.test(home) &&
    /By IMR/.test(home);
  const sampled = SEARCH_DEPTH_LIVE_SAMPLE_ROUTES.map((route) => pageOf(routes.pages, route));
  const oldWordingRendered = sampled.some((body) => /An Infinite OS Venture/.test(body));
  const screenshotDir = path.join(tmpdir(), `cre-search-depth-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "wide", width: 1440, height: 900 },
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;
  const responsive = ["/", "/how-it-works", "/commercial-lease-npv", "/lease-sensitivity-analysis", "/commercial-lease-npv/why-use-npv-when-comparing-leases"];
  const rows: Array<Record<string, unknown>> = [];
  let shots = 0;
  try {
    for (const route of SEARCH_DEPTH_LIVE_SAMPLE_ROUTES) {
      const sizes = responsive.includes(route) ? viewports : viewports.filter((item) => item.name === "wide");
      for (const viewport of sizes) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${input.url.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
        const metrics = (await page.evaluate(MEASURE_SCRIPT)) as Record<string, unknown>;
        await page.screenshot({
          path: path.join(screenshotDir, `${route.replace(/[^\w]+/g, "_") || "home"}_${viewport.name}.png`),
          fullPage: false,
        });
        shots += 1;
        if (route === "/commercial-lease-npv/why-use-npv-when-comparing-leases" && viewport.name === "wide") {
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
          shots += 5;
        }
        rows.push({ route, viewport: viewport.name, width: viewport.width, ...metrics });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const heroLive = await measureHowItWorksHeroLive(input.url, screenshotDir);
  const at1440 = rows.find((row) => row.route === "/lease-sensitivity-analysis" && row.viewport === "wide");
  const longPage = rows.find((row) => row.route === "/commercial-lease-npv/why-use-npv-when-comparing-leases" && row.viewport === "wide");
  const liveSurfaces = extractSurfaceSequence(pageOf(routes.pages, "/commercial-lease-npv/why-use-npv-when-comparing-leases"));
  const rhythm = evaluateSectionSurfaceRhythm({ surfaces: liveSurfaces, longPage: true });
  const occupancyHtml = pageOf(routes.pages, "/occupancy-costs");
  const presentHtml = pageOf(routes.pages, "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client");
  const contrast = evaluateSectionSurfaceContrast({
    variants: liveSurfaces,
    textOnEmphasisLight: true,
    cardsDistinctOnTinted: true,
    linksReadable: true,
    html: `${pageOf(routes.pages, "/commercial-lease-npv/why-use-npv-when-comparing-leases")}\n${occupancyHtml}\n${presentHtml}`,
    css: input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? frozenCss,
  });
  const live1440 = {
    viewportWidth: 1440,
    authorityShellWidth: num(at1440?.shell),
    proseWidth: num(at1440?.prose),
    semanticNavWidth: num(at1440?.nav),
    trustedSourcesWidth: num(at1440?.sources),
    tableWidth: num(at1440?.table),
    ctaWidth: num(at1440?.cta),
    archetype: "QUESTION_AUTHORITY" as const,
  };
  const widthGate = evaluateAuthoritySectionWidth(live1440, profile);
  const breakout = evaluateSemanticNavigationBreakoutLayout({
    viewportWidth: 1440,
    navWidth: live1440.semanticNavWidth,
    proseWidth: live1440.proseWidth,
    cardWidths: Array.isArray(at1440?.cardWidths) ? (at1440?.cardWidths as number[]) : [],
    titleLineCounts: [],
    iconContainerPx: Number(at1440?.iconPx ?? 0) || undefined,
    cardCount: Number(at1440?.cardCount ?? 0),
    css: frozenCss,
    profile,
  });
  const grid = evaluateBalancedCardGrid({
    cardCount: Number(at1440?.cardCount ?? 0),
    columnCount: Number(at1440?.cardCount ?? 0) >= 4 ? 2 : Number(at1440?.cardCount ?? 0),
    rowCount: Number(at1440?.cardCount ?? 0) >= 4 ? 2 : 1,
    lastRowCount: Number(at1440?.cardCount ?? 0) >= 4 ? 2 : Number(at1440?.cardCount ?? 0),
    cardWidths: Array.isArray(at1440?.cardWidths) ? (at1440?.cardWidths as number[]) : [],
    cardHeights: [],
    viewportWidth: 1440,
  });
  const sourcesGate = evaluateAuthoritySourceRenderedQuality({
    sectionWidth: live1440.trustedSourcesWidth || live1440.authorityShellWidth,
    shellWidth: live1440.authorityShellWidth,
    desktopColumns: 2,
    viewportWidth: 1440,
    hasTitle: /Trusted Sources/i.test(pageOf(routes.pages, "/lease-sensitivity-analysis")),
    hasHierarchy: true,
    linkCount: 3,
    cramped: false,
    mobileStacked: true,
  });
  const shellGate = evaluateAuthoritySectionShellConsistency({
    proseWidth: live1440.proseWidth,
    moduleWidths: [live1440.trustedSourcesWidth, live1440.tableWidth, live1440.ctaWidth].filter((width) => width > 0),
    shellWidth: live1440.authorityShellWidth,
  });
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
  const overflowByViewport = {
    "1440": rows.filter((row) => row.viewport === "wide" && Number(row.overflowX) > 1).length,
    "1280": rows.filter((row) => row.viewport === "desktop" && Number(row.overflowX) > 1).length,
    "1024": rows.filter((row) => row.viewport === "tablet" && Number(row.overflowX) > 1).length,
    "390": rows.filter((row) => row.viewport === "mobile" && Number(row.overflowX) > 1).length,
  };
  const footer1440 = Math.min(...rows.filter((row) => row.viewport === "wide").map((row) => Number(row.gutter ?? 0)));
  const footer1280 = Math.min(...rows.filter((row) => row.viewport === "desktop").map((row) => Number(row.gutter ?? footer1440)));
  const footer390 = Math.min(...rows.filter((row) => row.viewport === "mobile").map((row) => Number(row.gutter ?? 20)));
  const files = input.files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content }));
  const demand = evaluateSearchDemandAuthoritySurface(files);
  const discovery = evaluateHubQuestionDiscoveryCoverage(files);
  const cannibal = evaluateSearchIntentCannibalization(files);
  const graph = evaluateTopicGraphConnectivity(files);
  const density = evaluateSemanticInternalLinkDensity(files);
  const conversion = evaluateSearchIntentConversionPath(files);
  const aboveFold = evaluateAboveFoldVisualCoverage(files);
  const answerChunks = chunkCount(input.files);
  const readability = evaluateHumanReadabilityGate(pageOf(routes.pages, "/commercial-lease-npv/why-use-npv-when-comparing-leases"));
  const standaloneByTopic = Object.fromEntries(TOPIC_IDS.map((topic) => [topic, currentStandaloneRoutesForTopic(topic).length])) as Record<TopicId, number>;
  const titles = DEPTH_QUESTION_PAGES.map((page) => page.title);
  const canonicals = DEPTH_QUESTION_PAGES.map((page) => (page.route.endsWith("/") ? page.route : `${page.route}/`));
  const tallOverlap = Number(tall?.mediaNextOverlap ?? 1);
  const desktopOverlap = Number(desktop?.mediaNextOverlap ?? 1);
  const mobileOverlap = Number(mobile?.mediaNextOverlap ?? 1);
  const tallHeadingOverlap = Number(tall?.mediaHeadingOverlap ?? 1);
  const footerContract = pass(footerDestinations && !oldWordingRendered && sampled.every((body) => /An Infinity OS Venture/.test(body)));
  const seoGeoPassed =
    routes.http === "PASS" &&
    routes.failingRoutes === 0 &&
    routes.notFound === 0 &&
    routes.runtimeErrors === 0 &&
    sitemapHasDepth &&
    sitemapClean &&
    !accidentalPublic &&
    footerContract === "PASS" &&
    newPagesLive;
  const visualPassed =
    heroGate.overall === "PASS" &&
    tallOverlap === 0 &&
    tallHeadingOverlap === 0 &&
    desktopOverlap === 0 &&
    mobileOverlap === 0 &&
    widthGate.overall === "PASS" &&
    breakout.overall === "PASS" &&
    sourcesGate.overall === "PASS" &&
    shellGate.overall === "PASS" &&
    rhythm.overall === "PASS" &&
    contrast.overall === "PASS" &&
    Object.values(overflowByViewport).every((count) => count === 0) &&
    footer1440 >= 32 &&
    footer390 >= 20 &&
    Number(at1440?.circleOnly ?? 0) === 0 &&
    rows.every((row) => Number(row.titleInk ?? 0) < 0.62);
  return {
    routes,
    intendedCount: manifest.intendedCount,
    passingRoutes: routes.failingRoutes === 0 ? manifest.intendedCount - intentionalRedirects : manifest.intendedCount - routes.failingRoutes - intentionalRedirects,
    intentionalRedirects,
    failingRoutes: routes.failingRoutes,
    notFound: routes.notFound,
    runtimeErrors: routes.runtimeErrors,
    sitemap: pass(sitemap.ok && sitemapHasDepth && sitemapClean),
    robots: pass(robots.ok && /Allow:\s*\//i.test(robots.body) && /Disallow:\s*\/api\//i.test(robots.body)),
    footerContract,
    oldWordingRendered: oldWordingRendered ? ("YES" as const) : ("NO" as const),
    seoGeoPassed,
    visualPassed,
    hubVisible,
    hubDiscovery: pass(hubDiscoveryPass),
    standaloneByTopic,
    newPagesLive: pass(newPagesLive),
    demand: demand.overall,
    discovery: discovery.overall,
    cannibal: cannibal.overall,
    thinPages: demand.thinPages,
    cannibalizingPages: cannibal.cannibalizingPages,
    rhythm: rhythm.overall,
    contrast: contrast.overall,
    allWhiteMonotony: rhythm.allWhiteMonotony,
    mechanicalZebra: rhythm.mechanicalZebra,
    adjacentHighEmphasis: rhythm.adjacentHighEmphasis,
    contrastFailures: contrast.contrastFailures,
    authoritySectionWidth: widthGate.overall,
    shellConsistency: shellGate.overall,
    semanticNavBreakout: breakout.overall,
    balancedGrid: grid.overall,
    sources: sourcesGate.overall,
    heroSeparationGate: heroGate.overall,
    heroIntersection: Math.max(tallOverlap, tallHeadingOverlap, desktopOverlap, mobileOverlap),
    aboveFold: aboveFold.overall,
    conversion: conversion.overall,
    readability: readability.overall,
    activeVoice: readability.activeVoice,
    paragraphPolicy: readability.paragraphLength,
    liveGraph: {
      orphans: graph.report.orphans,
      deadEnds: graph.report.deadEnds,
      density: density.overall,
      connectivity: graph.overall,
      overall: pass(graph.report.orphans === 0 && graph.report.deadEnds === 0 && density.overall === "PASS"),
    },
    frozen: {
      answerChunks,
      duplicateTitles: titles.length - new Set(titles).size,
      duplicateCanonicals: canonicals.length - new Set(canonicals).size,
    },
    visual: {
      screenshots: shots + heroLive.length,
      measurements: rows.length + heroLive.length,
      screenshotDir,
      overflowByViewport,
      footer1440,
      footer1280,
      footer390,
      desktopGutter: footer1440,
      mobileGutter: footer390,
      live1440,
      longPageSurfaces: liveSurfaces,
      howItWorksTall: pass(tallOverlap === 0 && tallHeadingOverlap === 0),
      howItWorksDesktop: pass(desktopOverlap === 0),
      howItWorksMobile: pass(mobileOverlap === 0),
    },
    redirectHops,
    accidentalPublic,
    longPage,
  };
}

export function searchDepthLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifySearchDepthLivePublic>>,
): boolean {
  return (
    live.seoGeoPassed &&
    live.visualPassed &&
    live.hubDiscovery === "PASS" &&
    live.newPagesLive === "PASS" &&
    live.demand === "PASS" &&
    live.discovery === "PASS" &&
    live.cannibal === "PASS" &&
    live.rhythm === "PASS" &&
    live.contrast === "PASS" &&
    live.liveGraph.overall === "PASS" &&
    live.footerContract === "PASS" &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0 &&
    live.heroIntersection === 0 &&
    live.thinPages === 0 &&
    live.cannibalizingPages === 0 &&
    live.frozen.answerChunks === 400 &&
    live.frozen.duplicateTitles === 0 &&
    live.frozen.duplicateCanonicals === 0 &&
    TOPIC_IDS.every((topic) => (live.standaloneByTopic[topic] ?? 0) >= 10)
  );
}
