import type { PageType } from "../constants";
import type {
  CanonicalURLRegistry,
  CanonicalUrlEntry,
  PageOpportunity,
  VentureOrganicContext,
} from "../types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function pageTypeSegment(pageType: PageType, contextEstablished: boolean): string | null {
  switch (pageType) {
    case "homepage":
      return null;
    case "question":
      return contextEstablished ? null : "questions";
    case "comparison":
      return contextEstablished ? null : "compare";
    case "city":
      return null;
    case "neighborhood":
      return null;
    case "guide":
      return contextEstablished ? null : "guides";
    case "product":
      return contextEstablished ? null : "products";
    case "category":
      return contextEstablished ? null : "categories";
    case "service":
      return contextEstablished ? null : "services";
    case "use_case":
      return contextEstablished ? null : "use-cases";
    case "route":
      return contextEstablished ? null : "routes";
    case "case_study":
      return "case-studies";
    case "article":
      return contextEstablished ? null : "resources";
    default:
      return null;
  }
}

function buildPathSegments(opportunity: PageOpportunity, context: VentureOrganicContext): string[] {
  const segments: string[] = [];
  const root = slugify(context.ventureName);
  const topicRoot = inferTopicRoot(context);

  if (opportunity.pageType === "homepage") return [];

  if (opportunity.geographicContext?.city) {
    const geoRoot = inferGeoRoot(context, topicRoot);
    if (geoRoot) segments.push(geoRoot);
    segments.push(slugify(opportunity.geographicContext.city));
    if (opportunity.geographicContext.neighborhood) {
      segments.push(slugify(opportunity.geographicContext.neighborhood));
    } else if (opportunity.pageType !== "city") {
      segments.push(slugify(opportunity.primaryEntity));
    }
    return dedupeAdjacent(segments);
  }

  const contextEstablished = Boolean(topicRoot);
  const typeSegment = pageTypeSegment(opportunity.pageType, contextEstablished);
  if (topicRoot) segments.push(topicRoot);
  if (typeSegment) segments.push(typeSegment);
  segments.push(slugify(opportunity.primaryEntity));
  return dedupeAdjacent(segments.filter(Boolean));
}

function inferTopicRoot(context: VentureOrganicContext): string | null {
  const hint = context.contentArchitecture?.urlRoot;
  if (typeof hint === "string" && hint.trim()) return slugify(hint);
  const vt = context.ventureType.toLowerCase();
  if (/saas|software/.test(vt)) return slugify(context.solution.split(" ")[0] ?? context.ventureName);
  if (/local|service/.test(vt)) return null;
  return slugify(context.ventureName);
}

function inferGeoRoot(context: VentureOrganicContext, topicRoot: string | null): string | null {
  const hint = context.contentArchitecture?.geoUrlRoot;
  if (typeof hint === "string") return slugify(hint);
  return topicRoot;
}

function dedupeAdjacent(segments: string[]): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    if (out[out.length - 1] === seg) continue;
    out.push(seg);
  }
  return out;
}

export function assignUrlToOpportunity(
  opportunity: PageOpportunity,
  context: VentureOrganicContext,
  registry: CanonicalURLRegistry,
): CanonicalUrlEntry {
  const domain = context.domain ?? "example.com";
  const segments = buildPathSegments(opportunity, context);
  let slug = segments[segments.length - 1] ?? "home";
  let path = segments.length ? `/${segments.join("/")}` : "/";
  let url = `https://${domain}${path}`;

  let collisionCount = 0;
  while (registry.entries.some((e) => e.url === url)) {
    collisionCount += 1;
    slug = `${slug}-${collisionCount}`;
    const newSegments = [...segments.slice(0, -1), slug];
    path = `/${newSegments.join("/")}`;
    url = `https://${domain}${path}`;
  }

  const breadcrumbPath = ["Home", ...segments.map((s) => titleCase(s))];
  return {
    url,
    pageOpportunityId: opportunity.pageOpportunityId,
    slug,
    status: "APPROVED",
    breadcrumbPath,
  };
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildCanonicalUrlRegistry(
  opportunities: PageOpportunity[],
  context: VentureOrganicContext,
): { registry: CanonicalURLRegistry; collisionsPrevented: number } {
  const domain = context.domain ?? "example.com";
  const reserved = new Set([
    ...(context.existingSite?.reservedRoutes ?? ["/api", "/admin", "/app", "/dashboard", "/login"]),
  ]);
  const registry: CanonicalURLRegistry = {
    domain,
    entries: [],
    reservedRoutes: [...reserved],
  };
  let collisionsPrevented = 0;

  for (const existing of context.existingSite?.publishedUrls ?? []) {
    registry.entries.push({
      url: existing.url,
      pageOpportunityId: `existing:${existing.url}`,
      slug: existing.url.split("/").filter(Boolean).pop() ?? "home",
      status: existing.status ?? "PUBLISHED",
      breadcrumbPath: ["Home", ...existing.url.split("/").filter(Boolean).map(titleCase)],
    });
  }

  for (const opp of opportunities) {
    const before = registry.entries.length;
    const entry = assignUrlToOpportunity(opp, context, registry);
    if (registry.entries.some((e) => e.url === entry.url && e.pageOpportunityId !== opp.pageOpportunityId)) {
      collisionsPrevented += 1;
    }
    if (reserved.has(new URL(entry.url).pathname)) continue;
    registry.entries.push(entry);
    if (registry.entries.length === before) collisionsPrevented += 1;
  }

  return { registry, collisionsPrevented };
}

export function validateInternalLinkTargets(
  links: Array<{ targetUrl: string }>,
  registry: CanonicalURLRegistry,
): { valid: number; invalid: number } {
  const registered = new Set(registry.entries.map((e) => e.url));
  let valid = 0;
  let invalid = 0;
  for (const link of links) {
    if (registered.has(link.targetUrl)) valid += 1;
    else invalid += 1;
  }
  return { valid, invalid };
}
