import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { auditVisualCompositionInBrowser } from "@/lib/infinity/venture-website-architecture/visual-composition-browser";
import { seoGeoLiveVerificationPassed, verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import {
  AUTHORITY_EXPANSION_LIVE_SAMPLE_ROUTES,
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

export async function verifyAuthorityExpansionLivePublic(input: {
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
  const home = routes.pages["/"]?.body ?? "";
  const hub = routes.pages["/commercial-lease-npv"]?.body ?? "";
  const question =
    routes.pages["/commercial-lease-npv/how-is-lease-npv-calculated"]?.body ??
    routes.pages["/commercial-lease-npv/how-is-lease-npv-calculated/"]?.body ??
    "";
  const persona = routes.pages["/for/tenant-rep-brokers"]?.body ?? "";
  const pricing = routes.pages["/pricing"]?.body ?? "";
  const resources = routes.pages["/resources"]?.body ?? "";
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
    /An Infinite OS Venture/.test(home) &&
    /href="https:\/\/infinitemediaresources\.com\/?"/.test(home) &&
    /By IMR/.test(home);
  const footerNofollow = /An Infinite OS Venture[\s\S]{0,80}rel="nofollow"|By IMR[\s\S]{0,80}rel="nofollow"/.test(home);
  const rawUrlDupes = /https:\/\/imros\.io[\s\S]{0,40}https:\/\/imros\.io|https:\/\/infinitemediaresources\.com[\s\S]{0,40}https:\/\/infinitemediaresources\.com/.test(
    home.replace(/<script[\s\S]*?<\/script>/g, ""),
  );
  const hubSpoke = hrefs(hub).some((item) => item.includes("/commercial-lease-npv/how-is-lease-npv-calculated"));
  const spokeHub = hrefs(question).includes("/commercial-lease-npv");
  const sameTopic = hrefs(question).some((item) => item.startsWith("/commercial-lease-npv/") && item !== "/commercial-lease-npv/how-is-lease-npv-calculated");
  const crossTopic = hrefs(question).some((item) =>
    ["/lease-comparison", "/effective-rent", "/occupancy-costs"].some((hubRoute) => item === hubRoute || item.startsWith(`${hubRoute}/`)),
  );
  const commercialPath = hrefs(question).some((item) =>
    ["/compare-commercial-leases", "/how-it-works", "/pricing", "/early-access", "/for/tenant-rep-brokers"].includes(item),
  );
  const screenshotDir = path.join(tmpdir(), `cre-authority-expansion-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const composition = await auditVisualCompositionInBrowser({
    origin: input.url,
    routes: AUTHORITY_EXPANSION_LIVE_SAMPLE_ROUTES,
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
  const sampleSet = new Set<string>(AUTHORITY_EXPANSION_LIVE_SAMPLE_ROUTES);
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
    relatedDefect: pass(/pv-related-editorial|Keep reading|Related questions/.test(`${question}\n${hub}`)),
    sources: pass(/Trusted sources|Sources & Further Reading|investopedia|bls\.gov|naiop|fasb/i.test(`${question}\n${hub}`)),
    ctaHierarchy: pass(/pv-cta-panel|Request Pilot Access|Compare Your Lease/.test(`${question}\n${pricing}\n${persona}`)),
    viewport1280: pass(overflowByViewport["1280"] === 0 && footer1280 >= 32),
    viewport1440: pass(overflowByViewport["1440"] === 0 && footer1440 >= 32),
    viewport390: pass(overflowByViewport["390"] === 0 && footer390 >= 20),
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
    footerContract: pass(routes.footer === "PASS" && footerDestinations && !footerNofollow && !rawUrlDupes),
    seoGeoPassed: seoGeoLiveVerificationPassed(routes) && sitemapHasExpansion,
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
      composition.overflowX === 0,
    resourcesPresent: /resource|topic|lease/i.test(resources),
    redirectHops,
    screenshotDir,
  };
}

export function authorityExpansionLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyAuthorityExpansionLivePublic>>,
): boolean {
  return (
    live.seoGeoPassed &&
    live.visualPassed &&
    live.liveGraph.overall === "PASS" &&
    live.footerContract === "PASS" &&
    live.sitemap === "PASS" &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0
  );
}
