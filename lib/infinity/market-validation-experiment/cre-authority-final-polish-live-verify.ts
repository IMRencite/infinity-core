import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { auditVisualCompositionInBrowser } from "@/lib/infinity/venture-website-architecture/visual-composition-browser";
import { verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import {
  AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES,
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

function pageOf(
  pages: Record<string, { body?: string }>,
  route: string,
): string {
  return pages[route]?.body ?? pages[`${route}/`]?.body ?? "";
}

function adjacentFounderDuplicates(html: string): number {
  const patterns = [
    /The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/,
    /Using one CAM number for two buildings[\s\S]{0,240}Using one CAM number for two buildings/,
  ];
  return patterns.filter((pattern) => pattern.test(html)).length;
}

export async function verifyAuthorityFinalPolishLivePublic(input: {
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
  const hub = pageOf(routes.pages, "/commercial-lease-npv");
  const question = pageOf(routes.pages, "/commercial-lease-npv/how-is-lease-npv-calculated");
  const persona = pageOf(routes.pages, "/for/tenant-rep-brokers");
  const pricing = pageOf(routes.pages, "/pricing");
  const resources = pageOf(routes.pages, "/resources");
  const cam = pageOf(routes.pages, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
  const sampledBodies = [home, hub, question, persona, pricing, resources, cam];
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
  const footerNofollow = /An Infinity OS Venture[\s\S]{0,80}rel="nofollow"|By IMR[\s\S]{0,80}rel="nofollow"/.test(home);
  const rawUrlDupes = /https:\/\/imros\.io[\s\S]{0,40}https:\/\/imros\.io|https:\/\/infinitemediaresources\.com[\s\S]{0,40}https:\/\/infinitemediaresources\.com/.test(
    home.replace(/<script[\s\S]*?<\/script>/g, ""),
  );
  const oldWordingRendered = sampledBodies.some((body) => /An Infinite OS Venture/.test(body));
  const homepageFooterWording = /An Infinity OS Venture/.test(home);
  const internalFooterWording = [hub, question, persona, pricing, resources].every((body) =>
    /An Infinity OS Venture/.test(body),
  );
  const hubSpoke = hrefs(hub).some((item) => item.includes("/commercial-lease-npv/how-is-lease-npv-calculated"));
  const spokeHub = hrefs(question).includes("/commercial-lease-npv");
  const sameTopic = hrefs(question).some(
    (item) => item.startsWith("/commercial-lease-npv/") && item !== "/commercial-lease-npv/how-is-lease-npv-calculated",
  );
  const crossTopic = hrefs(question).some((item) =>
    ["/lease-comparison", "/effective-rent", "/occupancy-costs"].some((hubRoute) => item === hubRoute || item.startsWith(`${hubRoute}/`)),
  );
  const commercialPath = hrefs(question).some((item) =>
    ["/compare-commercial-leases", "/how-it-works", "/pricing", "/early-access", "/for/tenant-rep-brokers"].includes(item),
  );
  const semanticNav =
    /data-semantic-navigation/.test(home) &&
    /sn-block/.test(home) &&
    /sn-card/.test(home) &&
    /sn-icon/.test(home) &&
    /data-semantic-navigation/.test(hub) &&
    /data-semantic-navigation/.test(question) &&
    !/data-semantic-navigation/.test(pageOf(routes.pages, "/privacy-policy"));
  const editorial =
    /ed-highlight|data-editorial-highlight/.test(`${question}\n${cam}`) &&
    !/as one broker said|our clients say/i.test(`${home}\n${question}\n${cam}`);
  const duplicateAdjacent = adjacentFounderDuplicates(`${cam}\n${question}`);
  const screenshotDir = path.join(tmpdir(), `cre-authority-final-polish-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const composition = await auditVisualCompositionInBrowser({
    origin: input.url,
    routes: AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES,
    viewports: ["desktop", "wide", "mobile"],
    screenshotDir,
  });
  const footerDesktop = composition.pages.filter((page) => page.viewportName === "desktop").map((page) => page.footerLeft);
  const footerWide = composition.pages.filter((page) => page.viewportName === "wide").map((page) => page.footerLeft);
  const footerMobile = composition.pages.filter((page) => page.viewportName === "mobile").map((page) => page.footerLeft);
  const footer1280 = Math.min(...footerDesktop);
  const footer1440 = Math.min(...footerWide);
  const footer390 = Math.min(...footerMobile);
  const homeDesktop = composition.pages.find((page) => page.route === "/" && page.viewportName === "desktop");
  const imageRequired = composition.pages.filter(
    (page) => page.route !== "/privacy-policy" && page.route !== "/terms-of-service",
  );
  const imageFailures = imageRequired.filter((page) => page.realImages < 1).length;
  const tablePages = composition.pages.filter((page) => page.table && page.viewportName === "desktop");
  const utilizationMin = Math.min(...composition.pages.map((page) => page.tableUtilization || 1));
  const overflowByViewport = {
    "1280": composition.pages.filter((page) => page.viewportName === "desktop" && page.overflowX > 1).length,
    "1440": composition.pages.filter((page) => page.viewportName === "wide" && page.overflowX > 1).length,
    "390": composition.pages.filter((page) => page.viewportName === "mobile" && page.overflowX > 1).length,
  };
  const sampleSet = new Set<string>(AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES);
  const howItWorksDesktop = composition.pages.find((page) => page.route === "/how-it-works" && page.viewportName === "desktop");
  const heroOverlap = composition.pages.filter((page) => page.heroOverlapsFollowing).length;
  const navRowSpread = Math.max(0, ...composition.pages.map((page) => page.semanticNavRowHeightSpread ?? 0));
  const navOrphans = composition.pages.reduce((sum, page) => sum + (page.semanticNavLastLineOrphans ?? 0), 0);
  const familiesRepresented = Object.values(AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES).every((route) =>
    sampleSet.has(route),
  );
  const visual = {
    footer1280,
    footer1440,
    footer390,
    footerTouches: composition.footerTouches,
    overflowX: composition.overflowX,
    overflowByViewport,
    utilizationMin,
    imageFailures,
    screenshots: composition.screenshots.length,
    measurements: composition.pages.length,
    familiesRepresented,
    table: tablePages[0]?.table ?? null,
    hero: homeDesktop?.hero ?? null,
    footer: homeDesktop?.footer ?? null,
    screenshotDir,
    footerDefect: pass(composition.footerTouches === 0 && footer1280 >= 32 && footer1440 >= 32 && footer390 >= 20),
    homepageFooter: pass(Boolean(homeDesktop) && (homeDesktop?.footerLeft ?? 0) >= 32 && homeDesktop?.footerTouchesViewport === false),
    tableDefect: pass(utilizationMin >= 0.7 && composition.overflowX === 0),
    imageryDefect: pass(imageFailures === 0 && /\/media\//.test(`${home}\n${hub}\n${question}`)),
    textWallDefect: pass(/pv-callout|pv-analysis-board|<ul/.test(question)),
    relatedDefect: pass(/pv-related-editorial|Keep reading|Related questions|sn-block/.test(`${question}\n${hub}`)),
    sources: pass(/Trusted sources|Sources & Further Reading|investopedia|bls\.gov|naiop|fasb/i.test(`${question}\n${hub}`)),
    ctaHierarchy: pass(/pv-cta-panel|Request Pilot Access|Compare Your Lease/.test(`${question}\n${pricing}\n${persona}`)),
    viewport1280: pass(overflowByViewport["1280"] === 0 && footer1280 >= 32),
    viewport1440: pass(overflowByViewport["1440"] === 0 && footer1440 >= 32),
    viewport390: pass(overflowByViewport["390"] === 0 && footer390 >= 20),
    semanticNav: pass(semanticNav),
    editorial: pass(editorial),
    howItWorksSampled: pass(Boolean(howItWorksDesktop)),
    heroSeparation: pass(heroOverlap === 0),
    navRowHeight: pass(navRowSpread <= 8),
    navOrphans: pass(navOrphans === 0),
  };
  const liveGraph = {
    hubToSpoke: pass(hubSpoke),
    spokeToHub: pass(spokeHub),
    sameTopic: pass(sameTopic),
    crossTopic: pass(crossTopic),
    commercialPath: pass(commercialPath),
    overall: pass(hubSpoke && spokeHub && sameTopic && crossTopic && commercialPath),
  };
  const passingCanonical = routes.intendedCount - routes.failingRoutes - intentionalRedirects;
  const footerContract = pass(footerDestinations && !footerNofollow && !rawUrlDupes && !oldWordingRendered && homepageFooterWording && internalFooterWording);
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
  return {
    routes,
    visual,
    liveGraph,
    intendedCount: manifest.intendedCount,
    passingRoutes: routes.failingRoutes === 0 ? manifest.intendedCount - intentionalRedirects : passingCanonical,
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
    editorial: pass(editorial),
    duplicateAdjacentLive: duplicateAdjacent,
    seoGeoPassed,
    visualPassed:
      visual.footerDefect === "PASS" &&
      visual.homepageFooter === "PASS" &&
      visual.tableDefect === "PASS" &&
      visual.imageryDefect === "PASS" &&
      visual.textWallDefect === "PASS" &&
      visual.relatedDefect === "PASS" &&
      visual.sources === "PASS" &&
      visual.ctaHierarchy === "PASS" &&
      visual.viewport1280 === "PASS" &&
      visual.viewport1440 === "PASS" &&
      visual.viewport390 === "PASS" &&
      visual.semanticNav === "PASS" &&
      visual.editorial === "PASS" &&
      visual.howItWorksSampled === "PASS" &&
      visual.heroSeparation === "PASS" &&
      visual.navRowHeight === "PASS" &&
      visual.navOrphans === "PASS" &&
      composition.overflowX === 0,
    resourcesPresent: /resource|topic|lease/i.test(resources),
    redirectHops,
    screenshotDir,
  };
}

export function authorityFinalPolishLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyAuthorityFinalPolishLivePublic>>,
): boolean {
  return (
    live.seoGeoPassed &&
    live.visualPassed &&
    live.liveGraph.overall === "PASS" &&
    live.footerContract === "PASS" &&
    live.sitemap === "PASS" &&
    live.semanticNav === "PASS" &&
    live.editorial === "PASS" &&
    live.duplicateAdjacentLive === 0 &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0
  );
}
