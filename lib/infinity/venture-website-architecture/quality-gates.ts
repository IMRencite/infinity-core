import { auditPremiumValidation } from "@/lib/infinity/public-venture-design";
import { GEO_SEO_QUALITY_GATE, PREMIUM_AUTHORITY_VALIDATION_READY } from "./constants";
import type { AuthoritySiteAudit, Gate, PlannedPage, SiteKnowledgeGraph } from "./types";

function file(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((item) => item.path.replace(/\\/g, "/") === path)?.content ?? "";
}

function blobOf(files: Array<{ path: string; content: string }>): string {
  return files.map((item) => item.content).join("\n");
}

function routeToFile(route: string): string {
  if (route === "/") return "app/page.tsx";
  return `app${route}/page.tsx`;
}

export function extractInternalHrefs(content: string): string[] {
  return [...content.matchAll(/href\s*[:=]\s*["'](\/[^"']*)["']/g)].map((match) => match[1].replace(/\/$/, "") || "/");
}

export function extractJsonLdBlocks(content: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const objectLiteral = content.matchAll(/JSON\.stringify\(\s*(\{[\s\S]*?\})\s*\)/g);
  for (const match of objectLiteral) {
    if (match[1].includes("data") && match[1].length < 20) continue;
    try {
      const parsed = Function(`"use strict"; return (${match[1]});`)() as unknown;
      if (Array.isArray(parsed)) blocks.push(...(parsed as Array<Record<string, unknown>>));
      else if (parsed && typeof parsed === "object") blocks.push(parsed as Record<string, unknown>);
    } catch {
      // component helpers are not page schema
    }
  }
  if (/export const SITE_SCHEMA/.test(content)) {
    try {
      const json = content.replace(/^export const SITE_SCHEMA: Record<string, unknown> = /, "").replace(/;\s*$/, "");
      const parsed = JSON.parse(json) as Record<string, { "@graph"?: Array<Record<string, unknown>> }>;
      for (const value of Object.values(parsed)) {
        if (value?.["@graph"]) blocks.push(...value["@graph"]);
        else if (value && typeof value === "object") blocks.push(value as Record<string, unknown>);
      }
    } catch {
      blocks.push({ invalid: true });
    }
  }
  return blocks;
}

export function wordCountOf(content: string): number {
  const strings = [...content.matchAll(/["'`]([^"'`]{12,})["'`]/g)].map((match) => match[1]);
  const text = `${content.replace(/<[^>]+>/g, " ")} ${strings.join(" ")}`
    .replace(/import[\s\S]*?from ["'][^"']+["'];?/g, " ")
    .replace(/export const metadata[\s\S]*?\};/g, " ");
  return text.split(/\s+/).filter((item) => /[A-Za-z]{3,}/.test(item)).length;
}

export function auditInternalLinks(files: Array<{ path: string; content: string }>, pages: PlannedPage[]): {
  inbound: Record<string, number>;
  outbound: Record<string, number>;
  broken: string[];
  orphans: string[];
} {
  const indexable = new Set(pages.filter((page) => page.indexable).map((page) => page.route));
  const inbound: Record<string, number> = Object.fromEntries([...indexable].map((route) => [route, 0]));
  const outbound: Record<string, number> = {};
  const broken: string[] = [];
  for (const page of pages) {
    const content = file(files, routeToFile(page.route));
    const hrefs = extractInternalHrefs(content).filter((href) => !href.startsWith("/api/") && href !== "/sitemap.xml");
    outbound[page.route] = hrefs.length;
    for (const href of hrefs) {
      const normalized = href.replace(/\/$/, "") || "/";
      if (!indexable.has(normalized) && !pages.some((item) => item.route === normalized)) broken.push(`${page.route}->${normalized}`);
      else if (inbound[normalized] !== undefined) inbound[normalized] += 1;
    }
  }
  const nav = file(files, "components/site-chrome.tsx") + file(files, "app/layout.tsx") + file(files, "components/venture-footer.tsx");
  for (const href of extractInternalHrefs(nav)) {
    const normalized = href.replace(/\/$/, "") || "/";
    if (inbound[normalized] !== undefined) inbound[normalized] += 1;
  }
  const orphans = [...indexable].filter((route) => route !== "/" && (inbound[route] ?? 0) === 0);
  return { inbound, outbound, broken, orphans };
}

export function auditGeoSeo(files: Array<{ path: string; content: string }>, pages: PlannedPage[]): Gate {
  void GEO_SEO_QUALITY_GATE;
  const blob = blobOf(files);
  const titles = pages.map((page) => page.title);
  const uniqueTitles = new Set(titles).size === titles.length;
  const sitemap = file(files, "app/sitemap.ts");
  const robots = file(files, "app/robots.ts");
  const answerFirst = /data-answer-first|pv-answer/.test(blob);
  const entities = /NPV|discount rate|tenant improvement/i.test(blob);
  const indexable = /robots:\s*\{\s*index:\s*true/.test(blob) || /allow:\s*"\/"/.test(robots);
  const noStuffing = !/(commercial lease comparison ){4,}/i.test(blob);
  const noDoorway = !files.some((item) => /app\/free-rent-in-every-city|app\/best-broker-in-/.test(item.path.replace(/\\/g, "/")));
  const canonicals = pages.filter((page) => page.indexable).every((page) => file(files, routeToFile(page.route)).includes("canonical") || page.role === "CONVERSION" || page.role === "LEGAL");
  return uniqueTitles && sitemap.includes("/") && /disallow:\s*\["?\/api/.test(robots) && answerFirst && entities && indexable && noStuffing && noDoorway && canonicals ? "PASS" : "FAIL";
}

export function auditPremiumAuthoritySite(input: {
  files: Array<{ path: string; content: string }>;
  pages: PlannedPage[];
  graph: SiteKnowledgeGraph;
}): AuthoritySiteAudit {
  const premium = auditPremiumValidation(input.files);
  const links = auditInternalLinks(input.files, input.pages);
  const blob = blobOf(input.files);
  const schemaBlocks = input.files.flatMap((item) => extractJsonLdBlocks(item.content));
  const invalidSchema = schemaBlocks.filter((block) => block.invalid === true).length;
  const fakeRatings = /aggregateRating|reviewRating|"ratingValue"/.test(blob) ? "YES" : "NO";
  const fakeOffers = /"@type":\s*"Offer"/.test(blob) && /payment is not collected/i.test(blob) ? "YES" : /"@type":\s*"Offer"/.test(blob) ? "YES" : "NO";
  const geoSeo = auditGeoSeo(input.files, input.pages);
  const thin = input.pages.filter((page) => page.role !== "LEGAL" && page.role !== "CONVERSION" && wordCountOf(file(input.files, routeToFile(page.route))) < 160).length;
  const titles = input.pages.map((page) => page.title);
  const duplicateIntent = titles.length - new Set(titles).size;
  const metadata = new Set(titles).size === titles.length ? "PASS" : "FAIL";
  const sitemap = /url:\s*"\/"/.test(file(input.files, "app/sitemap.ts")) ? "PASS" : "FAIL";
  const robots = /allow:\s*"\/"/.test(file(input.files, "app/robots.ts")) && /\/api\//.test(file(input.files, "app/robots.ts")) ? "PASS" : "FAIL";
  const accessibility = premium.accessibility;
  const internalLinks = links.broken.length === 0 && links.orphans.length === 0 && input.graph.orphans.length === 0 ? "PASS" : "FAIL";
  const schema = invalidSchema === 0 && fakeRatings === "NO" && fakeOffers === "NO" ? "PASS" : "FAIL";
  const overall =
    premium.premiumOverall === "PASS" &&
    geoSeo === "PASS" &&
    internalLinks === "PASS" &&
    schema === "PASS" &&
    metadata === "PASS" &&
    sitemap === "PASS" &&
    robots === "PASS" &&
    thin === 0 &&
    duplicateIntent === 0
      ? "PASS"
      : "FAIL";
  return {
    premiumDesign: premium.premiumOverall,
    geoSeo,
    internalLinks,
    schema,
    metadata,
    sitemap,
    robots,
    accessibility,
    thinPages: thin,
    duplicateIntentPages: duplicateIntent,
    indexableOrphans: links.orphans.length,
    brokenInternalLinks: links.broken.length,
    invalidSchemaBlocks: invalidSchema,
    fakeRatingsReviews: fakeRatings,
    fakeOffers,
    classification: overall === "PASS" ? PREMIUM_AUTHORITY_VALIDATION_READY : premium.classification,
    premiumAuthorityOverall: overall,
  };
}
