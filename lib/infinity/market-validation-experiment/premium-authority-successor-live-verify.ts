import {
  CANONICAL_FOOTER_VISIBLE_FORMAT,
  CANONICAL_IMR_BY_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITE_OS_URL,
  CANONICAL_INFINITE_OS_VENTURE_LABEL,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_LABEL,
} from "@/lib/infinity/public-venture-template";
import { classifyLiveHttpResponse } from "./live-validation-failure";
import { publicValidationIngestOrigin } from "./ingest";
import {
  auditLiveSitemapXml,
  fetchLiveStylesheet,
  fetchPublicPath,
  type Gate,
} from "./validation-grade-live-verify";

function pass(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function titleOf(html: string): string {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function descriptionOf(html: string): string {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    ""
  );
}

function canonicalOf(html: string): string {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    ""
  );
}

function jsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1] ?? "") as unknown;
      if (Array.isArray(parsed)) blocks.push(...(parsed as Array<Record<string, unknown>>));
      else if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record["@graph"])) blocks.push(...(record["@graph"] as Array<Record<string, unknown>>));
        else blocks.push(record);
      }
    } catch {
      blocks.push({ invalid: true });
    }
  }
  return blocks;
}

function extractHrefs(html: string): string[] {
  return [...html.matchAll(/href=["'](\/[^"'#]*)["']/g)].map((match) => match[1].replace(/\/$/, "") || "/");
}

function isPublicPageHref(href: string): boolean {
  const normalized = href.split("?")[0].replace(/\/$/, "") || "/";
  if (normalized.startsWith("/_next")) return false;
  if (normalized.startsWith("/api/")) return false;
  if (normalized === "/sitemap.xml") return false;
  if (/\.[a-z0-9]+$/i.test(normalized)) return false;
  return true;
}

async function fetchReferencedScripts(origin: string, html: string): Promise<string> {
  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  const bodies: string[] = [];
  for (const src of srcs.slice(0, 12)) {
    const url = src.startsWith("http") ? src : `${origin.replace(/\/$/, "")}${src.startsWith("/") ? src : `/${src}`}`;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) bodies.push(await res.text());
    } catch {
      // script fetch is supplemental to HTML lineage
    }
  }
  return bodies.join("\n");
}

function wordCount(html: string): number {
  return stripTags(html)
    .split(/\s+/)
    .filter((item) => /[A-Za-z]{3,}/.test(item)).length;
}

export const EXPECTED_AUTHORITY_PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
] as const;

export async function verifyPremiumAuthorityLivePublic(input: {
  url: string;
  intendedRoutes: string[];
  artifactId: string;
  experimentId: string;
  candidateId: string;
}): Promise<{
  origin: string | null;
  homepageHttp: Gate;
  allIntendedPages: Gate;
  vercelAuthentication: "DISABLED" | "ENABLED" | "UNKNOWN";
  protectionResponse: "ABSENT" | "PRESENT";
  totalIntendedPublicRoutes: number;
  routesReturningExpectedSuccess: number;
  missingRoutes: string[];
  unexpectedPublicRoutes: string[];
  design: {
    hero: Gate;
    productUi: Gate;
    leaseComparison: Gate;
    npv: Gate;
    workflow: Gate;
    typography: Gate;
    sectionVariety: Gate;
    ctaForm: Gate;
    mobile: Gate;
    accessibility: Gate;
    overall: Gate;
  };
  geoSeo: {
    uniqueMetadata: Gate;
    canonicals: Gate;
    answerFirst: Gate;
    entityClarity: Gate;
    authoritySources: Gate;
    indexability: Gate;
    geoseoLive: Gate;
  };
  links: {
    nodes: number;
    edges: number;
    broken: number;
    indexableOrphans: number;
    hubSpoke: Gate;
    navigation: Gate;
    breadcrumbs: Gate;
  };
  schema: {
    routesChecked: number;
    valid: number;
    invalid: number;
    fakeRatings: boolean;
    fakeReviews: boolean;
    fakeOffers: boolean;
  };
  sitemapHttp: Gate;
  sitemapIndexablePresent: Gate;
  sitemapPrivateExcluded: Gate;
  robots: Gate;
  footer: {
    exact: Gate;
    privacy: Gate;
    terms: Gate;
    sitemap: Gate;
    infiniteOs: Gate;
    imr: Gate;
  };
  contentDepth: Gate;
  instrumentation: {
    pageIdentity: Gate;
    sectionIdentity: Gate;
    patternIdentity: Gate;
    artifactLineage: Gate;
    gscLive: false;
    ga4Live: false;
  };
  form: {
    earlyAccessRoute: Gate;
    form: Gate;
    sameOrigin: Gate;
    experiment: Gate;
    candidate: Gate;
    successorArtifactLineage: Gate;
  };
  pricing: Gate;
  disclosure: Gate;
}> {
  const origin = publicValidationIngestOrigin(input.url);
  const intended = [...new Set(input.intendedRoutes.length ? input.intendedRoutes : [...EXPECTED_AUTHORITY_PUBLIC_ROUTES])];
  const pages: Record<string, Awaited<ReturnType<typeof fetchPublicPath>>> = {};
  for (const route of intended) {
    const primary = await fetchPublicPath(input.url, route);
    if (primary.ok) {
      pages[route] = primary;
      continue;
    }
    const slashed = route.endsWith("/") ? route : `${route}/`;
    pages[route] = await fetchPublicPath(input.url, slashed);
  }
  const sitemap = await fetchPublicPath(input.url, "/sitemap.xml");
  const robots = await fetchPublicPath(input.url, "/robots.txt");
  const landing = pages["/"] ?? (await fetchPublicPath(input.url, "/"));
  const form = pages["/early-access"] ?? (await fetchPublicPath(input.url, "/early-access"));
  const css = origin ? await fetchLiveStylesheet(origin, landing.body) : "";
  const formScripts = origin ? await fetchReferencedScripts(origin, form.body) : "";
  const protection = classifyLiveHttpResponse({
    status: landing.status,
    location: landing.location,
    body: landing.body,
    finalUrl: landing.finalUrl,
  });
  const applicationReached =
    protection.reachedApplication && landing.ok && !/Protected deployment|Log in to Vercel/i.test(landing.body);
  const missingRoutes = intended.filter((route) => !pages[route]?.ok);
  const homepageHttp = pass(applicationReached);
  const allIntendedPages = pass(missingRoutes.length === 0 && intended.every((route) => pages[route]?.ok));

  const homepage = landing.body;
  const homepageText = stripTags(homepage);
  const blob = `${homepage}\n${form.body}\n${formScripts}\n${css}\n${intended.map((route) => pages[route]?.body ?? "").join("\n")}`;
  const hero = pass(/pv-hero|vg-hero/.test(homepage) && /<h1[\s>]/.test(homepage));
  const productUi = pass(/pv-product-frame|PRODUCT_UI_FRAME|data-visualization="PRODUCT_UI_FRAME"/.test(homepage));
  const leaseComparison = pass(/LEASE_OPTION_COMPARISON|pv-compare/.test(homepage));
  const npv = pass(/NPV_COMPARISON|pv-npv|NPV @ 8%/.test(homepage));
  const workflow = pass(/WORKFLOW_DIAGRAM|pv-workflow/.test(blob));
  const typography = pass(/pv-display|vg-lede|pv-lede/.test(homepage));
  const sectionVariety = pass(
    /data-section-type="HERO"/.test(homepage) &&
      /data-section-type="COMPARISON"|LEASE_OPTION_COMPARISON/.test(homepage) &&
      /data-section-type="CTA"|Request Pilot Access/.test(homepage),
  );
  const ctaForm = pass(/Request Pilot Access/.test(blob) && /<label[\s>]/.test(form.body) && /workEmail|work email/i.test(form.body));
  const mobile = pass(/@media/.test(css));
  const accessibility = pass(
    /<h1[\s>]/.test(homepage) &&
      /<label[\s>]/.test(form.body) &&
      /aria-label="Legal and venture attribution"/.test(blob),
  );
  const designOverall = pass(
    [hero, productUi, leaseComparison, npv, workflow, typography, sectionVariety, ctaForm, mobile, accessibility].every(
      (item) => item === "PASS",
    ),
  );

  const pageHtmls = intended
    .filter((route) => route !== "/privacy-policy" && route !== "/terms-of-service" && route !== "/early-access")
    .map((route) => pages[route]?.body ?? "");
  const titles = pageHtmls.map(titleOf).filter(Boolean);
  const descriptions = pageHtmls.map(descriptionOf).filter(Boolean);
  const canonicals = pageHtmls.map(canonicalOf).filter(Boolean);
  const uniqueMetadata = pass(titles.length >= 8 && new Set(titles).size === titles.length && new Set(descriptions).size === descriptions.length);
  const canonicalsPass = pass(canonicals.length >= 8 && new Set(canonicals).size === canonicals.length);
  const answerFirst = pass(/data-answer-first|pv-answer/.test(blob));
  const entityClarity = pass(/NPV|discount rate|tenant improvement|commercial lease/i.test(blob));
  const authoritySources = pass(/authority|source|BOMA|NAIOP|CCIM|appraisal/i.test(blob));
  const indexability = pass(!/noindex/i.test(landing.body) && /allow:\s*\//.test(robots.body));
  const geoseoLive = pass(
    uniqueMetadata === "PASS" &&
      canonicalsPass === "PASS" &&
      answerFirst === "PASS" &&
      entityClarity === "PASS" &&
      indexability === "PASS",
  );

  const hrefs = intended.flatMap((route) => extractHrefs(pages[route]?.body ?? ""));
  const internal = hrefs.filter((href) => isPublicPageHref(href));
  const known = new Set(intended.map((route) => route.replace(/\/$/, "") || "/"));
  const brokenTargets = internal.filter((href) => !known.has(href.replace(/\/$/, "") || "/"));
  const inbound: Record<string, number> = Object.fromEntries([...known].map((route) => [route, 0]));
  for (const href of internal) {
    const normalized = href.replace(/\/$/, "") || "/";
    if (inbound[normalized] !== undefined) inbound[normalized] += 1;
  }
  const indexableOrphans = [...known].filter(
    (route) => route !== "/" && route !== "/privacy-policy" && route !== "/terms-of-service" && (inbound[route] ?? 0) === 0,
  );
  const nav = /href=["']\/how-it-works/.test(blob) && /href=["']\/pricing/.test(blob) && /href=["']\/early-access/.test(blob);
  const breadcrumbs = /breadcrumb|SiteBreadcrumb|aria-label="Breadcrumb"/i.test(blob);
  const hubSpoke = /href=["']\/resources/.test(blob) && /href=["']\/commercial-lease-npv/.test(blob);

  let validSchema = 0;
  let invalidSchema = 0;
  let routesChecked = 0;
  let fakeRatings = false;
  let fakeReviews = false;
  let fakeOffers = false;
  for (const route of intended) {
    const html = pages[route]?.body ?? "";
    if (!html) continue;
    const blocks = jsonLdBlocks(html);
    if (!blocks.length) continue;
    routesChecked += 1;
    for (const block of blocks) {
      if (block.invalid === true) invalidSchema += 1;
      else validSchema += 1;
      const serialized = JSON.stringify(block);
      if (/aggregateRating|reviewRating|"ratingValue"/.test(serialized)) fakeRatings = true;
      if (/"@type":"Review"/.test(serialized) && /customer review/i.test(serialized)) fakeReviews = true;
      if (/"@type":"Offer"/.test(serialized) && !/hypothesis|not collected|early validation/i.test(serialized + html)) {
        fakeOffers = true;
      }
    }
  }

  const sitemapLocs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    try {
      return new URL(match[1]).pathname.replace(/\/$/, "") || "/";
    } catch {
      return match[1];
    }
  });
  const indexableExpected = intended.filter(
    (route) => route !== "/early-access" && route !== "/privacy-policy" && route !== "/terms-of-service",
  );
  const sitemapIndexablePresent = pass(
    sitemap.ok &&
      auditLiveSitemapXml(sitemap.body) === "PASS" &&
      indexableExpected.every((route) => sitemapLocs.includes(route.replace(/\/$/, "") || "/")),
  );
  const sitemapPrivateExcluded = pass(
    !sitemapLocs.some((loc) => loc.startsWith("/api") || loc.includes("ingest") || loc.includes("synthetic")),
  );
  const robotsText = robots.body.replace(/\r/g, "");
  const robotsPass = pass(
    robots.ok &&
      /allow:\s*\//i.test(robotsText) &&
      /disallow:\s*\/api/i.test(robotsText) &&
      /sitemap/i.test(robotsText),
  );

  const footerFormat =
    landing.body.match(/data-footer-format="([^"]+)"/)?.[1] ??
    ([
      CANONICAL_PRIVACY_LABEL,
      CANONICAL_TERMS_LABEL,
      CANONICAL_SITEMAP_LABEL,
      CANONICAL_INFINITE_OS_VENTURE_LABEL,
      CANONICAL_IMR_BY_LABEL,
    ].every((label) => landing.body.includes(label))
      ? CANONICAL_FOOTER_VISIBLE_FORMAT
      : "");
  const footerExact = pass(footerFormat === CANONICAL_FOOTER_VISIBLE_FORMAT);
  const footerHtml = landing.body.match(/<footer[\s\S]*?<\/footer>/i)?.[0] ?? landing.body;
  const withoutHrefs = footerHtml
    .replace(/href=["']https:\/\/imros\.io["']/g, "")
    .replace(/href=["']https:\/\/infinitemediaresources\.com["']/g, "");
  const duplicateRaw =
    /https:\/\/imros\.io/.test(withoutHrefs) || /https:\/\/infinitemediaresources\.com/.test(withoutHrefs);
  const privacyFooter = pass(/href=["']\/privacy-policy\/?["']/.test(blob) && blob.includes(CANONICAL_PRIVACY_LABEL));
  const termsFooter = pass(/href=["']\/terms-of-service\/?["']/.test(blob) && blob.includes(CANONICAL_TERMS_LABEL));
  const sitemapFooter = pass(/href=["']\/sitemap\.xml["']/.test(blob) && blob.includes(CANONICAL_SITEMAP_LABEL));
  const infiniteOs = pass(
    new RegExp(`href=["']${CANONICAL_INFINITE_OS_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(blob) &&
      blob.includes(CANONICAL_INFINITE_OS_VENTURE_LABEL),
  );
  const imr = pass(
    new RegExp(`href=["']${CANONICAL_IMR_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(blob) &&
      blob.includes(CANONICAL_IMR_BY_LABEL),
  );

  const depthRoutes = [
    "/",
    "/how-it-works",
    "/compare-commercial-leases",
    "/commercial-lease-npv",
    "/tenant-improvement-allowance",
    "/discount-rate-sensitivity",
    "/resources",
    "/pricing",
    "/faq",
    "/early-access",
  ];
  const contentDepth = pass(depthRoutes.every((route) => wordCount(pages[route]?.body ?? "") >= 80));

  const pageIdentity = pass(/data-page-id|data-page-role|data-page-pattern/.test(blob));
  const sectionIdentity = pass(/data-section-id/.test(blob));
  const patternIdentity = pass(/data-pattern-id/.test(blob));
  const artifactLineage = pass(blob.includes(input.artifactId));

  const unexpectedPublicRoutes = sitemapLocs.filter((loc) => !known.has(loc) && loc !== "/sitemap.xml");

  return {
    origin,
    homepageHttp,
    allIntendedPages,
    vercelAuthentication: protection.classification === "PROTECTION" ? "ENABLED" : applicationReached ? "DISABLED" : "UNKNOWN",
    protectionResponse: protection.classification === "PROTECTION" ? "PRESENT" : "ABSENT",
    totalIntendedPublicRoutes: intended.length,
    routesReturningExpectedSuccess: intended.filter((route) => pages[route]?.ok).length,
    missingRoutes,
    unexpectedPublicRoutes,
    design: {
      hero,
      productUi,
      leaseComparison,
      npv,
      workflow,
      typography,
      sectionVariety,
      ctaForm,
      mobile,
      accessibility,
      overall: designOverall,
    },
    geoSeo: {
      uniqueMetadata,
      canonicals: canonicalsPass,
      answerFirst,
      entityClarity,
      authoritySources,
      indexability,
      geoseoLive,
    },
    links: {
      nodes: known.size,
      edges: internal.length,
      broken: brokenTargets.length,
      indexableOrphans: indexableOrphans.length,
      hubSpoke: pass(hubSpoke),
      navigation: pass(nav),
      breadcrumbs: pass(breadcrumbs),
    },
    schema: {
      routesChecked,
      valid: validSchema,
      invalid: invalidSchema,
      fakeRatings,
      fakeReviews,
      fakeOffers,
    },
    sitemapHttp: pass(sitemap.ok && auditLiveSitemapXml(sitemap.body) === "PASS"),
    sitemapIndexablePresent,
    sitemapPrivateExcluded,
    robots: robotsPass,
    footer: {
      exact: pass(footerExact === "PASS" && !duplicateRaw),
      privacy: privacyFooter,
      terms: termsFooter,
      sitemap: sitemapFooter,
      infiniteOs,
      imr,
    },
    contentDepth,
    instrumentation: {
      pageIdentity,
      sectionIdentity,
      patternIdentity,
      artifactLineage,
      gscLive: false,
      ga4Live: false,
    },
    form: {
      earlyAccessRoute: pass(form.ok),
      form: ctaForm,
      sameOrigin: pass(/VALIDATION_INGEST_PATH|\/api\/public\/market-validation/.test(`${form.body}\n${formScripts}`)),
      experiment: pass(blob.includes(input.experimentId)),
      candidate: pass(blob.includes(input.candidateId)),
      successorArtifactLineage: pass(blob.includes(input.artifactId)),
    },
    pricing: pass(/\$290/.test(blob) && /\$149/.test(blob) && /early validation|hypothesis|not a purchase/i.test(blob)),
    disclosure: pass(/in validation|early access|pilot/i.test(homepageText) && /informational|not legal advice|not a finished product/i.test(homepageText)),
  };
}
