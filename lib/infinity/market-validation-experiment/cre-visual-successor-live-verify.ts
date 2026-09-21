import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { seoGeoLiveVerificationPassed, verifySeoGeoSuccessorLivePublic } from "./cre-seo-geo-successor-live-verify";
import { EXPECTED_VISUAL_SUCCESSOR_PAGE_ROUTES } from "./cre-visual-successor-authorization";
import { auditVisualCompositionInBrowser } from "@/lib/infinity/venture-website-architecture/visual-composition-browser";

export const VISUAL_SUCCESSOR_LIVE_SAMPLE_ROUTES = [
  "/",
  "/commercial-lease-npv",
  "/lease-comparison",
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
  "/effective-rent/effective-rent-vs-npv",
  "/lease-financial-modeling/what-are-common-lease-analysis-mistakes",
  "/pricing",
  "/resources",
  "/for/tenant-rep-brokers",
] as const;

function pass(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export async function verifyVisualSuccessorLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
}) {
  const routes = await verifySeoGeoSuccessorLivePublic({
    url: input.url,
    intendedRoutes: [...EXPECTED_VISUAL_SUCCESSOR_PAGE_ROUTES],
    artifactId: input.artifactId,
    experimentId: input.experimentId,
    candidateId: input.candidateId,
  });
  const question =
    routes.pages["/commercial-lease-npv/what-is-npv-in-a-commercial-lease"]?.body ??
    routes.pages["/commercial-lease-npv/what-is-npv-in-a-commercial-lease/"]?.body ??
    "";
  const hub = routes.pages["/commercial-lease-npv"]?.body ?? "";
  const home = routes.pages["/"]?.body ?? "";
  const compare =
    routes.pages["/lease-comparison/how-do-you-compare-two-commercial-lease-options"]?.body ?? "";
  const imageOk = /\/media\/hero-|\/media\/viz-/.test(`${home}\n${hub}\n${question}`);
  const brokenImg = (/src="\/media\/[^"]+"/.test(question) ? 0 : 1) + (/src="\/media\/[^"]+"/.test(home) ? 0 : 1);
  const tableOk = /pv-analysis-board/.test(question) && /pv-fin-table/.test(question) && /pv-table-shell/.test(question);
  const relatedOk = /pv-related-editorial/.test(`${question}\n${hub}`) && /Keep reading|Related questions/.test(`${question}\n${hub}`);
  const sourcesOk = /Trusted sources|Sources & Further Reading/i.test(`${question}\n${home}`);
  const ctaOk = /pv-cta-panel/.test(`${question}\n${compare}\n${hub}`) && /Request Pilot Access|Compare Your Lease/.test(question);
  const textWallBroken = /pv-callout|pv-analysis-board|<ul/.test(question);
  const screenshotDir = path.join(tmpdir(), `cre-visual-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const composition = await auditVisualCompositionInBrowser({
    origin: input.url,
    routes: VISUAL_SUCCESSOR_LIVE_SAMPLE_ROUTES,
    viewports: ["desktop", "wide", "mobile"],
    screenshotDir,
  });
  const footerDesktop = composition.pages.filter((page) => page.viewportName === "desktop").map((page) => page.footerLeft);
  const footerWide = composition.pages.filter((page) => page.viewportName === "wide").map((page) => page.footerLeft);
  const footerMobile = composition.pages.filter((page) => page.viewportName === "mobile").map((page) => page.footerLeft);
  const footer1280 = Math.min(...footerDesktop);
  const footer1440 = Math.min(...footerWide);
  const footer390 = Math.min(...footerMobile);
  const tablePages = composition.pages.filter((page) => page.table && page.viewportName === "desktop");
  const utilizationMin = Math.min(...composition.pages.map((page) => page.tableUtilization || 1));
  const imageFailures = composition.pages.filter((page) => page.realImages < 1).length;
  const articleDesktop = composition.pages.find((page) => page.route === "/" && page.viewportName === "desktop")?.article;
  const articleWidthOk =
    !articleDesktop || (articleDesktop.width >= 640 && articleDesktop.width <= 920) || articleDesktop.width === 0;
  const visual = {
    footer1280,
    footer1440,
    footer390,
    footerTouches: composition.footerTouches,
    overflowX: composition.overflowX,
    utilizationMin,
    imageFailures,
    screenshots: composition.screenshots.length,
    measurements: composition.pages.length,
    article: articleDesktop ?? null,
    table: tablePages[0]?.table ?? null,
    related: composition.pages.find((page) => page.related)?.related ?? null,
    cta: composition.pages.find((page) => page.cta)?.cta ?? null,
    footer: composition.pages.find((page) => page.footer && page.viewportName === "desktop")?.footer ?? null,
    footerDefect: pass(composition.footerTouches === 0 && footer1280 >= 32 && footer1440 >= 32 && footer390 >= 20),
    tableDefect: pass(tableOk && utilizationMin >= 0.7 && composition.overflowX === 0),
    imageryDefect: pass(imageOk && imageFailures === 0 && brokenImg === 0),
    textWallDefect: pass(textWallBroken),
    relatedDefect: pass(relatedOk),
    sources: pass(sourcesOk),
    ctaHierarchy: pass(ctaOk),
    articleWidth: pass(articleWidthOk),
    screenshotDir,
  };
  return {
    routes,
    visual,
    seoGeoPassed: seoGeoLiveVerificationPassed(routes),
    visualPassed:
      visual.footerDefect === "PASS" &&
      visual.tableDefect === "PASS" &&
      visual.imageryDefect === "PASS" &&
      visual.textWallDefect === "PASS" &&
      visual.relatedDefect === "PASS" &&
      visual.sources === "PASS" &&
      visual.ctaHierarchy === "PASS" &&
      composition.overflowX === 0,
  };
}

export function visualSuccessorLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyVisualSuccessorLivePublic>>,
): boolean {
  return live.seoGeoPassed && live.visualPassed && live.routes.failingRoutes === 0 && live.routes.notFound === 0;
}
