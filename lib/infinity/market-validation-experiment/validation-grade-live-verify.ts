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

export type Gate = "PASS" | "FAIL";

function pass(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function visibleFooterFormat(html: string): string {
  const nav = html.match(/data-footer-format="([^"]+)"/)?.[1];
  if (nav) return nav;
  const labels = [
    CANONICAL_PRIVACY_LABEL,
    CANONICAL_TERMS_LABEL,
    CANONICAL_SITEMAP_LABEL,
    CANONICAL_INFINITE_OS_VENTURE_LABEL,
    CANONICAL_IMR_BY_LABEL,
  ];
  if (labels.every((label) => html.includes(label))) return CANONICAL_FOOTER_VISIBLE_FORMAT;
  return stripTags(html).replace(/\s+/g, " ").trim().slice(0, 160);
}

export function auditLiveRenderedValidationGrade(input: {
  landing: string;
  form: string;
  css: string;
  privacy: string;
  terms: string;
  sitemap: string;
}): {
  responsive: Gate;
  container: Gate;
  hero: Gate;
  cta: Gate;
  form: Gate;
  pricing: Gate;
  hierarchy: Gate;
  disclosure: Gate;
  mobile: Gate;
  accessibility: Gate;
  overall: Gate;
  annual: Gate;
  perDeal: Gate;
  requestPilotAccess: Gate;
  earlyValidation: Gate;
  informational: Gate;
  footerVisibleFormat: string;
  privacyLink: Gate;
  termsLink: Gate;
  sitemapLink: Gate;
  infiniteOs: Gate;
  imr: Gate;
  duplicateRawUrls: boolean;
} {
  const blob = `${input.landing}\n${input.form}\n${input.css}`;
  const landingText = stripTags(input.landing);
  const formText = stripTags(input.form);
  const responsive = pass(/@media/.test(input.css) || /vg-container|max-width/.test(blob));
  const container = pass(/vg-container/.test(blob));
  const hero = pass(/vg-hero/.test(input.landing) && /<h1[\s>]/.test(input.landing));
  const cta = pass(/vg-cta/.test(blob) && /Request Pilot Access/.test(blob));
  const form = pass(/vg-form/.test(input.form) && /<label[\s>]/.test(input.form) && /workEmail|work email/i.test(input.form));
  const pricing = pass(/\$290/.test(blob) && /\$149/.test(blob) && /vg-pricing-card|pricing is being tested|not a purchase/i.test(blob));
  const hierarchy = pass(/<h1[\s>]/.test(input.landing) && /<h2[\s>]/.test(input.landing));
  const disclosure = pass(/in validation|early access|pilot/i.test(landingText) && /informational|not legal advice|not investment advice/i.test(landingText));
  const mobile = pass(/@media/.test(input.css) && /vg-container/.test(blob));
  const accessibility = pass(/<h1[\s>]/.test(input.landing) && /<label[\s>]/.test(input.form) && /aria-label="Legal and venture attribution"/.test(blob));
  const overall = pass(
    [responsive, container, hero, cta, form, pricing, hierarchy, disclosure, mobile, accessibility].every((item) => item === "PASS"),
  );
  const withoutHrefs = blob
    .replace(/href=["']https:\/\/imros\.io["']/g, "")
    .replace(/href=["']https:\/\/infinitemediaresources\.com["']/g, "");
  return {
    responsive,
    container,
    hero,
    cta,
    form,
    pricing,
    hierarchy,
    disclosure,
    mobile,
    accessibility,
    overall,
    annual: pass(/\$290/.test(blob)),
    perDeal: pass(/\$149/.test(blob)),
    requestPilotAccess: pass(/Request Pilot Access/.test(blob)),
    earlyValidation: pass(/early validation|in validation|pilot \/ early access/i.test(`${landingText}\n${formText}`)),
    informational: pass(/informational|not legal advice|not investment advice/i.test(landingText)),
    footerVisibleFormat: visibleFooterFormat(input.landing),
    privacyLink: pass(/href=["']\/privacy-policy\/?["']/.test(blob) && blob.includes(CANONICAL_PRIVACY_LABEL)),
    termsLink: pass(/href=["']\/terms-of-service\/?["']/.test(blob) && blob.includes(CANONICAL_TERMS_LABEL)),
    sitemapLink: pass(/href=["']\/sitemap\.xml["']/.test(blob) && blob.includes(CANONICAL_SITEMAP_LABEL)),
    infiniteOs: pass(
      new RegExp(`href=["']${CANONICAL_INFINITE_OS_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(blob) &&
        blob.includes(CANONICAL_INFINITE_OS_VENTURE_LABEL),
    ),
    imr: pass(
      new RegExp(`href=["']${CANONICAL_IMR_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(blob) &&
        blob.includes(CANONICAL_IMR_BY_LABEL),
    ),
    duplicateRawUrls:
      /https:\/\/imros\.io/.test(withoutHrefs) || /https:\/\/infinitemediaresources\.com/.test(withoutHrefs),
  };
}

export function auditLiveSitemapXml(xml: string): Gate {
  const hasUrlset = /<urlset[\s>]/.test(xml) || /<url>/.test(xml);
  const includesPublic =
    xml.includes("/privacy-policy") &&
    xml.includes("/terms-of-service") &&
    (xml.includes("/early-access") || xml.includes("early-access"));
  const excludesInternal = !/\/api\/public\/market-validation/.test(xml);
  return pass(hasUrlset && includesPublic && excludesInternal);
}

export async function fetchPublicPath(
  origin: string,
  path: string,
): Promise<{ status: number; body: string; location: string | null; finalUrl: string; ok: boolean }> {
  const base = origin.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const first = await fetch(url, { redirect: "manual" });
  const location = first.headers.get("location");
  const sameOriginRedirect =
    location &&
    (first.status === 301 || first.status === 302 || first.status === 307 || first.status === 308) &&
    (location.startsWith("/") || location.startsWith(base));
  if (sameOriginRedirect) {
    const nextUrl = location.startsWith("http") ? location : `${base}${location}`;
    const second = await fetch(nextUrl, { redirect: "manual" });
    const body = await second.text();
    return {
      status: second.status,
      body,
      location: second.headers.get("location"),
      finalUrl: second.url,
      ok: second.ok,
    };
  }
  const body = await first.text();
  return {
    status: first.status,
    body,
    location,
    finalUrl: first.url,
    ok: first.ok,
  };
}

export async function fetchLiveStylesheet(origin: string, html: string): Promise<string> {
  const href = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/i)?.[1];
  if (!href) return "";
  const url = href.startsWith("http") ? href : `${origin.replace(/\/$/, "")}${href.startsWith("/") ? href : `/${href}`}`;
  const res = await fetch(url, { redirect: "follow" });
  return res.ok ? await res.text() : "";
}

export async function verifyValidationGradeLivePublic(url: string): Promise<{
  origin: string | null;
  http: Gate;
  vercelAuthentication: "DISABLED" | "ENABLED" | "UNKNOWN";
  protectionResponse: "ABSENT" | "PRESENT";
  design: ReturnType<typeof auditLiveRenderedValidationGrade>;
  privacyHttp: Gate;
  termsHttp: Gate;
  sitemapHttp: Gate;
  legalCompleteness: Gate;
}> {
  const origin = publicValidationIngestOrigin(url);
  const landing = await fetchPublicPath(url, "/");
  const form = await fetchPublicPath(url, "/early-access");
  const privacy = await fetchPublicPath(url, "/privacy-policy/");
  const terms = await fetchPublicPath(url, "/terms-of-service/");
  const sitemap = await fetchPublicPath(url, "/sitemap.xml");
  const css = origin ? await fetchLiveStylesheet(origin, landing.body) : "";
  const protection = classifyLiveHttpResponse({
    status: landing.status,
    location: landing.location,
    body: landing.body,
    finalUrl: landing.finalUrl,
  });
  const applicationReached = protection.reachedApplication && landing.ok && !/Protected deployment|Log in to Vercel/i.test(landing.body);
  const design = auditLiveRenderedValidationGrade({
    landing: landing.body,
    form: form.body,
    css,
    privacy: privacy.body,
    terms: terms.body,
    sitemap: sitemap.body,
  });
  const privacyHttp = pass(privacy.ok && /privacy/i.test(privacy.body));
  const termsHttp = pass(terms.ok && /terms/i.test(terms.body));
  const sitemapHttp = pass(sitemap.ok && auditLiveSitemapXml(sitemap.body) === "PASS");
  return {
    origin,
    http: pass(applicationReached),
    vercelAuthentication: protection.classification === "PROTECTION" ? "ENABLED" : applicationReached ? "DISABLED" : "UNKNOWN",
    protectionResponse: protection.classification === "PROTECTION" ? "PRESENT" : "ABSENT",
    design,
    privacyHttp,
    termsHttp,
    sitemapHttp,
    legalCompleteness: pass(privacyHttp === "PASS" && termsHttp === "PASS" && sitemapHttp === "PASS"),
  };
}
