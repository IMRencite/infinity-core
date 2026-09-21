import { EXPECTED_SEO_GEO_PAGE_ROUTES } from "./cre-seo-geo-successor-authorization";
import { fetchPublicPath, type Gate } from "./validation-grade-live-verify";

function pass(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

export async function verifySeoGeoSuccessorLivePublic(input: {
  url: string;
  intendedRoutes?: string[];
  artifactId: string;
  experimentId: string;
  candidateId: string;
}) {
  const intended = [...new Set(input.intendedRoutes?.length ? input.intendedRoutes : [...EXPECTED_SEO_GEO_PAGE_ROUTES])];
  const pages: Record<string, Awaited<ReturnType<typeof fetchPublicPath>>> = {};
  for (const route of intended) {
    const primary = await fetchPublicPath(input.url, route);
    pages[route] = primary.ok ? primary : await fetchPublicPath(input.url, route.endsWith("/") ? route : `${route}/`);
  }
  const sitemap = await fetchPublicPath(input.url, "/sitemap.xml");
  const robots = await fetchPublicPath(input.url, "/robots.txt");
  const home = pages["/"]?.body ?? "";
  const hub = pages["/commercial-lease-npv"]?.body ?? pages["/commercial-lease-npv/"]?.body ?? "";
  const question =
    pages["/commercial-lease-npv/what-is-npv-in-a-commercial-lease"]?.body ??
    pages["/commercial-lease-npv/what-is-npv-in-a-commercial-lease/"]?.body ??
    "";
  const privacy = pages["/privacy-policy"]?.body ?? pages["/privacy-policy/"]?.body ?? "";
  const terms = pages["/terms-of-service"]?.body ?? pages["/terms-of-service/"]?.body ?? "";
  const titles = intended.map((route) => pages[route]?.body.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  const h1s = intended.filter((route) => pages[route]?.ok).map((route) => /<h1[\s>]/i.test(pages[route]?.body ?? ""));
  const failing = intended.filter((route) => {
    const page = pages[route];
    return !page || !(page.ok || (page.status >= 300 && page.status < 400));
  });
  const notFound = intended.filter((route) => pages[route]?.status === 404);
  const runtimeErrors = intended.filter((route) => /Application error|Internal Server Error|__NEXT_DATA__.*error/i.test(pages[route]?.body ?? "")).length;
  return {
    intendedCount: intended.length,
    passingRoutes: intended.length - failing.length,
    failingRoutes: failing.length,
    failing,
    notFound: notFound.length,
    runtimeErrors,
    http: pass(failing.length === 0),
    titles: pass(titles.filter(Boolean).length >= intended.length - 6 && new Set(titles.filter(Boolean)).size >= 10),
    h1s: pass(h1s.filter(Boolean).length >= 20),
    breadcrumbs: pass(/Home/.test(hub) && /Home/.test(question)),
    schema: pass(/application\/ld\+json|BreadcrumbList|WebPage/i.test(`${hub}\n${question}`)),
    sitemap: pass(sitemap.ok && /commercial-lease-npv/.test(sitemap.body) && !/\/api\//.test(sitemap.body)),
    robots: pass(robots.ok && /Allow:\s*\//i.test(robots.body) && /Disallow:\s*\/api\//i.test(robots.body)),
    indexability: pass(!/noindex/i.test(hub) && !/noindex/i.test(question)),
    directAnswer: pass(/AnswerFirst|data-answer-chunk-id|today's dollars|net present value/i.test(question)),
    authorityLinks: pass(/investopedia|bls\.gov|naiop|fasb/i.test(`${hub}\n${question}`)),
    cta: pass(/Request Pilot Access|Compare Your Lease|Try the Lease Comparison/i.test(`${home}\n${hub}\n${question}`)),
    footer: pass(
      /Privacy Policy/.test(home) &&
        /Terms of Service/.test(home) &&
        /Sitemap/.test(home) &&
        /An Infinite OS Venture/.test(home) &&
        /By IMR/.test(home),
    ),
    legal: pass(/privacy/i.test(privacy) && /terms/i.test(terms)),
    visualizations: pass(/data-visualization|pv-formula|pv-compare/i.test(question)),
    experiment: pass(stripTags(home).length > 0),
    pages,
  };
}

export function seoGeoLiveVerificationPassed(live: Awaited<ReturnType<typeof verifySeoGeoSuccessorLivePublic>>): boolean {
  return (
    live.http === "PASS" &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0 &&
    live.sitemap === "PASS" &&
    live.directAnswer === "PASS" &&
    live.footer === "PASS" &&
    live.legal === "PASS" &&
    live.indexability === "PASS"
  );
}
