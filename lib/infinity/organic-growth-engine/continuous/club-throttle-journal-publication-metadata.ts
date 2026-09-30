import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import {
  absoluteUrl,
  buildConnectedSchemaGraph,
  evaluateOrganicBreadcrumbSchemaGate,
  evaluateOrganicCanonicalSchemaGate,
  evaluateOrganicFAQSchemaGate,
  evaluateOrganicSchemaStackGate,
  evaluateOrganicSpeakableGate,
  schemaInputFromDraft,
  type VentureOrganizationInput,
} from "./schema-standard";
import { evaluateVentureIsolationGate } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_ORIGIN = "https://clubthrottle.com" as const;
export const ARTICLE_CANONICAL_QC_GATE = "ArticleCanonicalQc" as const;
export const ARTICLE_SCHEMA_QC_GATE = "ArticleSchemaQc" as const;
export const ARTICLE_ROUTE_IDENTITY_QC_GATE = "ArticleRouteIdentityQc" as const;

export function clubThrottleOrganization(): VentureOrganizationInput {
  return {
    name: "Club Throttle",
    url: CLUB_THROTTLE_ORIGIN,
    logo: `${CLUB_THROTTLE_ORIGIN}/brand/club-throttle-mark.svg`,
    brand: "Club Throttle",
  };
}

export function clubThrottleJournalArticleCanonical(path: string): string {
  return absoluteUrl(CLUB_THROTTLE_ORIGIN, path);
}

export function clubThrottleJournalIndexCanonical(): string {
  return absoluteUrl(CLUB_THROTTLE_ORIGIN, "/journal/");
}

export function clubThrottleHomeCanonical(): string {
  return absoluteUrl(CLUB_THROTTLE_ORIGIN, "/");
}

export function clubThrottleJournalArticleMetadata(draft: OrganicDraft) {
  return {
    title: `${draft.title} · Club Throttle Journal`,
    description: draft.meta_description,
    alternates: { canonical: clubThrottleJournalArticleCanonical(draft.canonical) },
  };
}

export function clubThrottleJournalArticleSchemaGraph(input: {
  draft: OrganicDraft;
  post: OccupancyNpvBlogPost;
  shell_html?: string;
}): Record<string, unknown> {
  const graphInput = schemaInputFromDraft(input.draft, {
    origin: CLUB_THROTTLE_ORIGIN,
    organization: clubThrottleOrganization(),
    kind: "BLOG_ARTICLE",
    html: input.shell_html,
  });
  graphInput.page.image = absoluteUrl(CLUB_THROTTLE_ORIGIN, input.post.image);
  graphInput.page.article_section = input.post.primaryCategory ?? input.post.category;
  graphInput.page.author = { type: "Organization", name: "Club Throttle", url: CLUB_THROTTLE_ORIGIN };
  graphInput.page.link_canonical = clubThrottleJournalArticleCanonical(input.draft.canonical);
  return buildConnectedSchemaGraph(graphInput);
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateArticleCanonicalQc(input: {
  expected_path: string;
  declared_canonical: string;
}): OrganicNamedGate {
  const expected = clubThrottleJournalArticleCanonical(input.expected_path);
  const reasons: string[] = [];
  if (normalizeUrl(input.declared_canonical) !== normalizeUrl(expected)) reasons.push("article_canonical_mismatch");
  if (normalizeUrl(input.declared_canonical) === normalizeUrl(clubThrottleHomeCanonical())) {
    reasons.push("homepage_canonical_on_article");
  }
  if (normalizeUrl(input.declared_canonical) === normalizeUrl(clubThrottleJournalIndexCanonical())) {
    reasons.push("journal_index_canonical_on_article");
  }
  if (/localhost|127\.0\.0\.1|vercel\.app/i.test(input.declared_canonical)) reasons.push("preview_url_canonical");
  return named(ARTICLE_CANONICAL_QC_GATE, reasons);
}

export function evaluateArticleRouteIdentityQc(input: {
  draft: OrganicDraft;
  declared_canonical: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const segments = input.draft.canonical.split("/").filter(Boolean);
  const category = segments[1];
  const slug = segments[2];
  const expected = clubThrottleJournalArticleCanonical(input.draft.canonical);
  if (!category || !slug) reasons.push("permalink_segments_missing");
  if (normalizeUrl(input.declared_canonical) !== normalizeUrl(expected)) reasons.push("route_canonical_mismatch");
  if (!input.declared_canonical.includes(slug ?? "___")) reasons.push("wrong_article_slug");
  if (category && !input.declared_canonical.includes(`/${category}/`)) reasons.push("wrong_category_path");
  const isolation = evaluateVentureIsolationGate({
    venture_id: "club-throttle",
    html_or_text: `${input.draft.body}\n${input.declared_canonical}`,
  });
  if (isolation.result === "FAIL") reasons.push(...isolation.reasons);
  return named(ARTICLE_ROUTE_IDENTITY_QC_GATE, reasons);
}

export function evaluateClubThrottleDraftSchemaStack(draft: OrganicDraft, shell_html?: string) {
  const input = schemaInputFromDraft(draft, {
    origin: CLUB_THROTTLE_ORIGIN,
    organization: clubThrottleOrganization(),
    kind: "BLOG_ARTICLE",
    html: shell_html,
  });
  input.page.author = { type: "Organization", name: "Club Throttle", url: CLUB_THROTTLE_ORIGIN };
  input.page.link_canonical = clubThrottleJournalArticleCanonical(draft.canonical);
  const graph = buildConnectedSchemaGraph(input);
  const gates = [
    evaluateOrganicBreadcrumbSchemaGate(input, graph),
    evaluateOrganicSpeakableGate(input, graph),
    evaluateOrganicFAQSchemaGate(input, graph),
    evaluateOrganicCanonicalSchemaGate(input, graph),
  ];
  return {
    input,
    graph,
    stack: evaluateOrganicSchemaStackGate(input, graph),
    gates,
  };
}

export function evaluateArticleSchemaQc(draft: OrganicDraft, shell_html?: string): OrganicNamedGate {
  const { stack, gates, graph } = evaluateClubThrottleDraftSchemaStack(draft, shell_html);
  const reasons: string[] = [];
  if (stack.result !== "PASS") reasons.push(...stack.reasons);
  for (const gate of gates) {
    if (gate.result !== "PASS") reasons.push(...gate.reasons);
  }
  const types = graphTypes(graph);
  if (!types.includes("BlogPosting")) reasons.push("blogposting_missing");
  if (!types.includes("WebPage")) reasons.push("webpage_missing");
  if (!types.includes("Organization")) reasons.push("organization_missing");
  if (!types.includes("WebSite")) reasons.push("website_missing");
  if (!types.includes("BreadcrumbList")) reasons.push("breadcrumb_missing");
  if ((draft.visible_faqs?.length ?? 0) > 0 && !types.includes("FAQPage")) reasons.push("faqpage_missing");
  return named(ARTICLE_SCHEMA_QC_GATE, reasons);
}

function evaluateClubThrottleDraftSchemaStackWithGraph(
  draft: OrganicDraft,
  shell_html: string | undefined,
  graph: Record<string, unknown>,
) {
  const input = schemaInputFromDraft(draft, {
    origin: CLUB_THROTTLE_ORIGIN,
    organization: clubThrottleOrganization(),
    kind: "BLOG_ARTICLE",
    html: shell_html,
  });
  input.page.link_canonical = clubThrottleJournalArticleCanonical(draft.canonical);
  const gates = [
    evaluateOrganicBreadcrumbSchemaGate(input, graph),
    evaluateOrganicSpeakableGate(input, graph),
    evaluateOrganicFAQSchemaGate(input, graph),
    evaluateOrganicCanonicalSchemaGate(input, graph),
  ];
  return { input, graph, stack: evaluateOrganicSchemaStackGate(input, graph), gates };
}

export function evaluateClubThrottleComposedArticlePublicationQc(input: {
  draft: OrganicDraft;
  post: OccupancyNpvBlogPost;
  declared_canonical: string;
  schema_graph: Record<string, unknown>;
  shell_html?: string;
}): {
  canonical: OrganicNamedGate;
  schema: OrganicNamedGate;
  route: OrganicNamedGate;
} {
  const canonical = evaluateArticleCanonicalQc({
    expected_path: input.draft.canonical,
    declared_canonical: input.declared_canonical,
  });
  const route = evaluateArticleRouteIdentityQc({
    draft: input.draft,
    declared_canonical: input.declared_canonical,
  });
  const stack = evaluateClubThrottleDraftSchemaStackWithGraph(input.draft, input.shell_html, input.schema_graph);
  const schemaReasons: string[] = [];
  if (stack.stack.result !== "PASS") schemaReasons.push(...stack.stack.reasons);
  for (const gate of stack.gates) {
    if (gate.result !== "PASS") schemaReasons.push(...gate.reasons);
  }
  const schema = named(ARTICLE_SCHEMA_QC_GATE, schemaReasons);
  return { canonical, schema, route };
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

function graphTypes(graph: Record<string, unknown>): string[] {
  const nodes = Array.isArray(graph["@graph"]) ? (graph["@graph"] as Array<Record<string, unknown>>) : [];
  return nodes.flatMap((node) => {
    const type = node["@type"];
    return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
  });
}
