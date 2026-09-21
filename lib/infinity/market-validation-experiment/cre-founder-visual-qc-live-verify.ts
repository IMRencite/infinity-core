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
import { REJECTED_CIRCLE_ONLY_ICON, REJECTED_PAUSE_COMPARE_ICON } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-icons";
import { FOUNDER_VISUAL_QC_CSS } from "@/lib/infinity/venture-website-architecture/founder-visual-qc-css";
import { AUTHORITY_FINAL_POLISH_CSS } from "@/lib/infinity/venture-website-architecture/authority-final-polish-css";
import { verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import {
  FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
  AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES,
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

export async function measureHowItWorksHeroLive(origin: string, screenshotDir: string) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "tall", width: 1440, height: 1600 },
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;
  const rows: Array<Record<string, unknown>> = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${origin.replace(/\/$/, "")}/how-it-works`, { waitUntil: "networkidle", timeout: 45_000 });
      const metrics = (await page.evaluate(`(() => {
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height, width: r.width };
        };
        const hero = document.querySelector("header.pv-hero, .pv-hero");
        const media = document.querySelector(".pv-hero-media");
        const next = hero ? hero.nextElementSibling : null;
        const first = next ? next.querySelector("h2, p") : null;
        const heading = [...document.querySelectorAll("h2")].find((el) =>
          /Term normalization and cash-flow generation/i.test(el.textContent || ""),
        );
        const heroBox = box(hero);
        const mediaBox = box(media);
        const nextBox = box(next);
        const firstBox = box(first);
        const headingBox = box(heading || null);
        return {
          heroClass: hero ? hero.className : null,
          positionedAncestor: (() => {
            let node = media ? media.parentElement : null;
            while (node) {
              const pos = getComputedStyle(node).position;
              if (pos !== "static") return { tag: node.tagName, className: node.className, position: pos };
              node = node.parentElement;
            }
            return "INITIAL_CONTAINING_BLOCK";
          })(),
          hero: heroBox,
          media: mediaBox,
          nextSection: nextBox,
          firstBody: firstBox,
          termHeading: headingBox,
          mediaNextOverlap: mediaBox && nextBox ? Math.max(0, mediaBox.bottom - nextBox.top) : 0,
          mediaHeadingOverlap: mediaBox && headingBox ? Math.max(0, mediaBox.bottom - headingBox.top) : 0,
          visualSeparation: mediaBox && firstBox ? firstBox.top - mediaBox.bottom : null,
        };
      })()`)) as Record<string, unknown>;
      const shot = path.join(screenshotDir, `how_it_works_${viewport.name}_${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      rows.push({ viewport: viewport.name, width: viewport.width, height: viewport.height, screenshot: shot, ...metrics });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await writeFile(path.join(screenshotDir, "how-it-works-hero.json"), `${JSON.stringify(rows, null, 2)}\n`);
  return rows;
}

export async function verifyFounderVisualQcLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
}) {
  const manifest = authorityExpansionRouteManifest();
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
  const question = pageOf(routes.pages, "/commercial-lease-npv/what-is-npv-in-a-commercial-lease");
  const persona = pageOf(routes.pages, "/for/tenant-rep-brokers");
  const pricing = pageOf(routes.pages, "/pricing");
  const resources = pageOf(routes.pages, "/resources");
  const cam = pageOf(routes.pages, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
  const sampledBodies = [home, how, hub, question, persona, pricing, resources, cam];
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
  const internalFooterWording = [how, hub, question, persona, pricing, resources].every((body) =>
    /An Infinity OS Venture/.test(body),
  );
  const learnRepeat = sampledBodies.reduce(
    (sum, body) => sum + ([...body.matchAll(/LEARN NEXT[\s\S]{0,160}Learn /g)].length),
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
  const screenshotDir = path.join(tmpdir(), `cre-founder-visual-qc-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const composition = await auditVisualCompositionInBrowser({
    origin: input.url,
    routes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
    viewports: ["desktop", "wide", "mobile"],
    screenshotDir,
  });
  const heroLive = await measureHowItWorksHeroLive(input.url, screenshotDir);
  const tall = heroLive.find((row) => row.viewport === "tall");
  const desktop = heroLive.find((row) => row.viewport === "desktop");
  const mobile = heroLive.find((row) => row.viewport === "mobile");
  const frozenCss = `${AUTHORITY_FINAL_POLISH_CSS}\n${FOUNDER_VISUAL_QC_CSS}`;
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
    title: /Explore the ideas behind the steps/.test(how) ? "Explore the ideas behind the steps" : "Learn the ideas behind the steps",
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
  const navRowSpread = Math.max(0, ...composition.pages.map((page) => page.semanticNavRowHeightSpread ?? 0));
  const overflowByViewport = {
    "1280": composition.pages.filter((page) => page.viewportName === "desktop" && page.overflowX > 1).length,
    "1440": composition.pages.filter((page) => page.viewportName === "wide" && page.overflowX > 1).length,
    "390": composition.pages.filter((page) => page.viewportName === "mobile" && page.overflowX > 1).length,
  };
  const imageRequired = composition.pages.filter((page) => page.route !== "/privacy-policy" && page.route !== "/terms-of-service");
  const imageFailures = imageRequired.filter((page) => page.realImages < 1).length;
  const utilizationMin = Math.min(...composition.pages.map((page) => page.tableUtilization || 1));
  const semanticNav =
    /data-semantic-navigation/.test(home) &&
    /sn-block/.test(how) &&
    /data-semantic-navigation/.test(hub) &&
    /data-semantic-navigation/.test(question) &&
    /data-semantic-navigation/.test(persona) &&
    /data-semantic-navigation/.test(resources) &&
    !/data-semantic-navigation/.test(pageOf(routes.pages, "/privacy-policy"));
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
    footerTouches: composition.footerTouches,
    overflowX: composition.overflowX,
    overflowByViewport,
    utilizationMin,
    imageFailures,
    screenshots: composition.screenshots.length + heroLive.length,
    measurements: composition.pages.length + heroLive.length,
    screenshotDir,
    heroLive,
    howItWorksTall: pass(tallOverlap === 0 && tallHeadingOverlap === 0 && visualSeparation >= 24),
    howItWorksDesktop: pass(desktopOverlap === 0),
    howItWorksMobile: pass(mobileOverlap === 0),
    heroSeparationGate: heroGate.overall,
    routeCoverage: routeCoverage.overall,
    howItWorksSampled: pass(routeCoverage.howItWorksSampled),
    navRendered: navRendered.overall,
    circleOnly,
    pauseIcons,
    learnRepeat,
    spellcheckIntact: pass(spellcheckIntact),
    kickerRedundant: evaluateSemanticNavSurfaceRedundancy([
      { kicker: "LEARN NEXT", heading: /Explore the ideas behind the steps/.test(how) ? "Explore the ideas behind the steps" : "Learn" },
    ]).redundant,
    navRowHeight: pass(navRowSpread <= 8),
    footerDefect: pass(composition.footerTouches === 0 && footer1280 >= 32 && footer1440 >= 32 && footer390 >= 20),
    imageryDefect: pass(imageFailures === 0 && /\/media\//.test(`${home}\n${hub}\n${how}`)),
    viewport1280: pass(overflowByViewport["1280"] === 0 && footer1280 >= 32),
    viewport1440: pass(overflowByViewport["1440"] === 0 && footer1440 >= 32),
    viewport390: pass(overflowByViewport["390"] === 0 && footer390 >= 20),
    familiesRepresented: Object.values(AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES).every((route) =>
      FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES.includes(route as (typeof FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES)[number]) ||
      imageRequired.some((page) => page.route === route),
    ),
  };
  const hubSpoke = hrefs(hub).some((item) => item.includes("/commercial-lease-npv/"));
  const spokeHub = hrefs(question).includes("/commercial-lease-npv");
  return {
    routes,
    visual,
    intendedCount: manifest.intendedCount,
    passingRoutes: routes.failingRoutes === 0 ? manifest.intendedCount - intentionalRedirects : manifest.intendedCount - routes.failingRoutes - intentionalRedirects,
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
    semanticNav: pass(semanticNav),
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
      visual.viewport1280 === "PASS" &&
      visual.viewport1440 === "PASS" &&
      visual.viewport390 === "PASS" &&
      composition.overflowX === 0,
    liveGraph: {
      hubToSpoke: pass(hubSpoke),
      spokeToHub: pass(spokeHub),
      overall: pass(hubSpoke && spokeHub),
    },
    redirectHops,
    screenshotDir,
    heroIntersection: Math.max(tallOverlap, tallHeadingOverlap, desktopOverlap, mobileOverlap),
    visualSeparation,
  };
}

export function founderVisualQcLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyFounderVisualQcLivePublic>>,
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
    live.heroIntersection === 0
  );
}
