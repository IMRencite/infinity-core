import {
  ORGANIC_BREADCRUMB_SCHEMA_GATE,
  ORGANIC_CANONICAL_SCHEMA_GATE,
  ORGANIC_FAQ_SCHEMA_GATE,
  ORGANIC_SCHEMA_STACK_GATE,
  ORGANIC_SPEAKABLE_GATE,
  VENTURE_SCHEMA_READINESS_GATE,
  VENTURE_SCHEMA_STANDARD,
} from "./contract";
import type { OrganicContentType } from "./contract";
import type { OrganicNamedGate } from "./types";
import type { OrganicDraft } from "./quality";
import { recommendOrganicSchema } from "./quality";
import { liveOccupancyNpvHubs, liveOccupancyNpvQuestionAssets } from "./live-catalog";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "./urls";

const LIVE_ORGANIC_SCHEMA_URLS = [
  OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
  "/blog/",
  "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  "/blog/category/valuation/",
] as const;

export { VENTURE_SCHEMA_STANDARD };

export const SCHEMA_PAGE_KINDS = [
  "EVERGREEN_RESOURCE",
  "BLOG_ARTICLE",
  "SERVICE_PAGE",
  "BLOG_INDEX",
  "TOPIC_HUB",
  "GENERIC",
] as const;
export type SchemaPageKind = (typeof SCHEMA_PAGE_KINDS)[number];

export const SCHEMA_CLASSIFICATIONS = [
  "SCHEMA_COMPLETE",
  "SCHEMA_PARTIAL",
  "SCHEMA_MISSING",
  "SCHEMA_CONFLICT",
] as const;
export type SchemaClassification = (typeof SCHEMA_CLASSIFICATIONS)[number];

export const SPEAKABLE_SELECTORS = ["#direct-answer", "#summary", "#key-takeaways"] as const;
export const OCCUPANCYNPV_ORIGIN = "https://occupancynpv.com" as const;

export type SchemaBreadcrumbItem = { name: string; item: string };
export type SchemaFaqItem = { question: string; answer: string };

export type VentureOrganizationInput = {
  name: string;
  url: string;
  logo?: string;
  brand?: string;
  sameAs?: string[];
  contactPoint?: Array<Record<string, unknown>>;
};

export type SchemaGraphPageInput = {
  kind: SchemaPageKind;
  url: string;
  canonical: string;
  title: string;
  description: string;
  headline?: string;
  breadcrumbs: SchemaBreadcrumbItem[];
  visible_breadcrumbs?: SchemaBreadcrumbItem[];
  speakable_css_selectors?: string[];
  faqs?: SchemaFaqItem[];
  visible_faqs?: SchemaFaqItem[];
  date_published?: string;
  date_modified?: string;
  author?: { type: "Person" | "Organization"; name: string; url?: string };
  image?: string;
  about?: string[];
  mentions?: string[];
  article_section?: string;
  html?: string;
  link_canonical?: string;
  item_list?: Array<{ name: string; url: string }>;
};

export type SchemaGraphInput = {
  origin: string;
  organization: VentureOrganizationInput;
  page: SchemaGraphPageInput;
};

export type SchemaRemediationItem = {
  url: string;
  classification: SchemaClassification;
  priority: "HIGH" | "NORMAL" | "LOW";
  missing_types: string[];
  reason: string;
};

export type VentureSchemaSurface = {
  organization: boolean;
  website: boolean;
  page_composer: boolean;
  breadcrumb: boolean;
  speakable: boolean;
  faq: boolean;
  article: boolean;
  blog_posting: boolean;
  type_router: boolean;
  validator: boolean;
  sitemap: boolean;
  organic_growth: boolean;
};

export function occupancynpvOrganization(): VentureOrganizationInput {
  return {
    name: "OccupancyNPV",
    url: OCCUPANCYNPV_ORIGIN,
    logo: `${OCCUPANCYNPV_ORIGIN}/favicon.ico`,
    brand: "OccupancyNPV",
  };
}

export function schemaTypeRouter(kind: SchemaPageKind): string[] {
  const baseline = ["Organization", "WebSite", "WebPage", "BreadcrumbList"];
  if (kind === "EVERGREEN_RESOURCE") return [...baseline, "Article", "SpeakableSpecification", "FAQPage"];
  if (kind === "BLOG_ARTICLE") return [...baseline, "BlogPosting", "SpeakableSpecification", "FAQPage"];
  if (kind === "SERVICE_PAGE") return [...baseline, "Service", "SpeakableSpecification", "FAQPage"];
  if (kind === "BLOG_INDEX" || kind === "TOPIC_HUB") return [...baseline, "CollectionPage"];
  return baseline;
}

export function routeSchemaKind(contentType: OrganicContentType | SchemaPageKind): SchemaPageKind {
  if (contentType === "BLOG" || contentType === "TIMELY_EDITORIAL" || contentType === "BLOG_ARTICLE") return "BLOG_ARTICLE";
  if (contentType === "COMMERCIAL_INTENT" || contentType === "SERVICE_PAGE") return "SERVICE_PAGE";
  if (contentType === "PILLAR" || contentType === "CLUSTER_HUB" || contentType === "TOPIC_HUB") return "TOPIC_HUB";
  if (contentType === "BLOG_INDEX") return "BLOG_INDEX";
  if (contentType === "FAQ") return "EVERGREEN_RESOURCE";
  return "EVERGREEN_RESOURCE";
}

export function organizationId(origin: string): string {
  return `${originRoot(origin)}/#organization`;
}

export function websiteId(origin: string): string {
  return `${originRoot(origin)}/#website`;
}

export function webpageId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#webpage`;
}

export function articleId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#article`;
}

export function breadcrumbId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#breadcrumb`;
}

export function faqId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#faq`;
}

export function speakableId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#speakable`;
}

export function serviceId(pageUrl: string): string {
  return `${pageUrlRoot(pageUrl)}#service`;
}

export function absoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return normalizePageUrl(pathOrUrl);
  return normalizePageUrl(`${originRoot(origin)}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`);
}

export function buildConnectedSchemaGraph(input: SchemaGraphInput): Record<string, unknown> {
  const origin = originRoot(input.origin);
  const pageUrl = absoluteUrl(origin, input.page.canonical || input.page.url);
  const orgId = organizationId(origin);
  const siteId = websiteId(origin);
  const webId = webpageId(pageUrl);
  const crumbId = breadcrumbId(pageUrl);
  const author = input.page.author ?? { type: "Organization" as const, name: input.organization.name, url: input.organization.url };
  const authorNode =
    author.type === "Person"
      ? { "@type": "Person", name: author.name, ...(author.url ? { url: author.url } : {}) }
      : { "@id": orgId };
  const crumbs = (input.page.breadcrumbs ?? []).map((row, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: row.name,
    item: absoluteUrl(origin, row.item),
  }));
  const webpageType = input.page.kind === "BLOG_INDEX" || input.page.kind === "TOPIC_HUB" ? ["WebPage", "CollectionPage"] : "WebPage";
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: input.organization.name,
      url: originRoot(input.organization.url || origin),
      ...(input.organization.logo ? { logo: input.organization.logo } : {}),
      ...(input.organization.brand ? { brand: { "@type": "Brand", name: input.organization.brand } } : {}),
      ...(input.organization.sameAs?.length ? { sameAs: input.organization.sameAs } : {}),
      ...(input.organization.contactPoint?.length ? { contactPoint: input.organization.contactPoint } : {}),
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      name: input.organization.name,
      url: origin,
      publisher: { "@id": orgId },
    },
    {
      "@type": webpageType,
      "@id": webId,
      name: input.page.title,
      url: pageUrl,
      description: input.page.description,
      isPartOf: { "@id": siteId },
      publisher: { "@id": orgId },
      breadcrumb: { "@id": crumbId },
      ...(input.page.date_published ? { datePublished: input.page.date_published } : {}),
      ...(input.page.date_modified ? { dateModified: input.page.date_modified } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": crumbId,
      itemListElement: crumbs,
    },
  ];

  if (input.page.kind === "EVERGREEN_RESOURCE" || input.page.kind === "BLOG_ARTICLE" || input.page.kind === "SERVICE_PAGE") {
    const type = input.page.kind === "BLOG_ARTICLE" ? "BlogPosting" : input.page.kind === "SERVICE_PAGE" ? "Service" : "Article";
    const entityId = type === "Service" ? serviceId(pageUrl) : articleId(pageUrl);
    const entity: Record<string, unknown> = {
      "@type": type,
      "@id": entityId,
      headline: input.page.headline ?? input.page.title,
      name: input.page.headline ?? input.page.title,
      description: input.page.description,
      url: pageUrl,
      mainEntityOfPage: { "@id": webId },
      isPartOf: { "@id": siteId },
      publisher: { "@id": orgId },
      author: authorNode,
      ...(input.page.date_published ? { datePublished: input.page.date_published } : {}),
      ...(input.page.date_modified ? { dateModified: input.page.date_modified } : {}),
      ...(input.page.image ? { image: input.page.image } : {}),
      ...(input.page.article_section ? { articleSection: input.page.article_section } : {}),
      ...(input.page.about?.length ? { about: input.page.about.map((name) => ({ "@type": "Thing", name })) } : {}),
      ...(input.page.mentions?.length ? { mentions: input.page.mentions.map((name) => ({ "@type": "Thing", name })) } : {}),
    };
    graph.push(entity);
    (graph[2] as Record<string, unknown>).mainEntity = { "@id": entityId };
  }

  const selectors = (input.page.speakable_css_selectors ?? []).filter((row) =>
    (SPEAKABLE_SELECTORS as readonly string[]).includes(row),
  );
  if (selectors.length && speakableEligible(input.page.kind)) {
    graph.push({
      "@type": "SpeakableSpecification",
      "@id": speakableId(pageUrl),
      cssSelector: selectors,
    });
    (graph[2] as Record<string, unknown>).speakable = { "@id": speakableId(pageUrl) };
  }

  const items = input.page.item_list ?? [];
  if (items.length && (input.page.kind === "BLOG_INDEX" || input.page.kind === "TOPIC_HUB")) {
    graph.push({
      "@type": "ItemList",
      "@id": `${pageUrlRoot(pageUrl)}#itemlist`,
      itemListElement: items.map((row, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: row.name,
        url: absoluteUrl(origin, row.url),
      })),
    });
  }

  const faqs = input.page.faqs ?? [];
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": faqId(pageUrl),
      mainEntity: faqs.map((row) => ({
        "@type": "Question",
        name: row.question,
        acceptedAnswer: { "@type": "Answer", text: row.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function schemaGraphValidator(graph: Record<string, unknown>, input: SchemaGraphInput): OrganicNamedGate {
  const reasons: string[] = [];
  if (graph["@context"] !== "https://schema.org") reasons.push("invalid_jsonld_context");
  const nodes = Array.isArray(graph["@graph"]) ? (graph["@graph"] as Array<Record<string, unknown>>) : [];
  if (!nodes.length) reasons.push("missing_graph");
  const ids = nodes.map((node) => String(node["@id"] ?? ""));
  if (ids.some((id) => !id)) reasons.push("missing_id");
  if (new Set(ids).size !== ids.filter(Boolean).length) reasons.push("duplicate_id");
  if (ids.some((id) => /undefined|null|random|uuid/i.test(id))) reasons.push("unstable_id");
  const byId = new Map(nodes.map((node) => [String(node["@id"]), node]));
  for (const node of nodes) {
    for (const ref of collectIds(node)) {
      if (ref && !byId.has(ref)) reasons.push("broken_internal_reference");
    }
  }
  const types = nodes.flatMap((node) => asTypes(node["@type"]));
  if (types.includes("BlogPosting") && (input.page.kind === "BLOG_INDEX" || types.includes("CollectionPage") && types.includes("BlogPosting") && input.page.kind !== "BLOG_ARTICLE")) {
    if (input.page.kind === "BLOG_INDEX") reasons.push("blog_index_marked_blogposting");
  }
  const org = nodes.find((node) => asTypes(node["@type"]).includes("Organization"));
  const site = nodes.find((node) => asTypes(node["@type"]).includes("WebSite"));
  const page = nodes.find((node) => asTypes(node["@type"]).includes("WebPage") || asTypes(node["@type"]).includes("CollectionPage"));
  if (!org) reasons.push("missing_organization");
  if (!site) reasons.push("missing_website");
  if (!page) reasons.push("missing_webpage");
  if (site && "potentialAction" in site) reasons.push("searchaction_without_search");
  return {
    gate: "SchemaGraphValidator",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: [...new Set(reasons)],
  };
}

export function evaluateOrganicBreadcrumbSchemaGate(input: SchemaGraphInput, graph: Record<string, unknown>): OrganicNamedGate {
  const reasons: string[] = [];
  const visible = input.page.visible_breadcrumbs ?? input.page.breadcrumbs;
  const node = graphNode(graph, "BreadcrumbList");
  const items = Array.isArray(node?.itemListElement) ? (node.itemListElement as Array<Record<string, unknown>>) : [];
  if (!visible.length) reasons.push("visible_breadcrumb_missing");
  if (!items.length) reasons.push("schema_breadcrumb_missing");
  if (visible.length && items.length && visible.length !== items.length) reasons.push("breadcrumb_count_mismatch");
  visible.forEach((crumb, index) => {
    const item = items[index];
    if (!item) return;
    if (normalizeLabel(String(item.name)) !== normalizeLabel(crumb.name)) reasons.push("breadcrumb_label_mismatch");
    if (normalizeCompareUrl(String(item.item)) !== normalizeCompareUrl(absoluteUrl(input.origin, crumb.item))) {
      reasons.push("breadcrumb_url_mismatch");
    }
    if (Number(item.position) !== index + 1) reasons.push("breadcrumb_order_mismatch");
  });
  const last = items[items.length - 1];
  if (last && normalizeCompareUrl(String(last.item)) !== normalizeCompareUrl(absoluteUrl(input.origin, input.page.canonical))) {
    reasons.push("breadcrumb_canonical_mismatch");
  }
  return named(ORGANIC_BREADCRUMB_SCHEMA_GATE, reasons);
}

export function evaluateOrganicSpeakableGate(input: SchemaGraphInput, graph: Record<string, unknown>): OrganicNamedGate {
  if (!speakableEligible(input.page.kind)) {
    return { gate: ORGANIC_SPEAKABLE_GATE, result: "PASS", reasons: ["not_applicable"] };
  }
  const reasons: string[] = [];
  const selectors = input.page.speakable_css_selectors ?? [];
  const allowed = selectors.filter((row) => (SPEAKABLE_SELECTORS as readonly string[]).includes(row));
  if (!allowed.length) reasons.push("speakable_target_missing");
  if (selectors.some((row) => !(SPEAKABLE_SELECTORS as readonly string[]).includes(row))) reasons.push("speakable_target_not_useful");
  const html = input.page.html ?? "";
  if (html) {
    for (const selector of allowed) {
      const id = selector.slice(1);
      if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) reasons.push("speakable_target_not_visible");
    }
  }
  const node = graphNode(graph, "SpeakableSpecification");
  if (!node) reasons.push("speakable_schema_missing");
  const css = node?.cssSelector;
  const listed = Array.isArray(css) ? css.map(String) : css ? [String(css)] : [];
  if (allowed.length && listed.length && allowed.some((row) => !listed.includes(row))) reasons.push("speakable_selector_unresolved");
  return named(ORGANIC_SPEAKABLE_GATE, reasons);
}

export function evaluateOrganicFAQSchemaGate(input: SchemaGraphInput, graph: Record<string, unknown>): OrganicNamedGate {
  const visible = input.page.visible_faqs ?? input.page.faqs ?? [];
  const node = graphNode(graph, "FAQPage");
  if (!visible.length) {
    if (node) return named(ORGANIC_FAQ_SCHEMA_GATE, ["hidden_schema_only_faq"]);
    return { gate: ORGANIC_FAQ_SCHEMA_GATE, result: "PASS", reasons: ["no_visible_faq"] };
  }
  const reasons: string[] = [];
  if (!node) reasons.push("faq_schema_missing");
  const entities = Array.isArray(node?.mainEntity) ? (node.mainEntity as Array<Record<string, unknown>>) : [];
  if (entities.length !== visible.length) reasons.push("faq_count_mismatch");
  const names = entities.map((row) => normalizeLabel(String(row.name ?? "")));
  if (new Set(names).size !== names.length) reasons.push("duplicate_faq");
  visible.forEach((faq, index) => {
    const entity = entities[index];
    const answer = entity && typeof entity.acceptedAnswer === "object"
      ? String((entity.acceptedAnswer as Record<string, unknown>).text ?? "")
      : "";
    if (!faq.question.trim() || !faq.answer.trim()) reasons.push("faq_not_visible");
    if (entity && normalizeLabel(String(entity.name)) !== normalizeLabel(faq.question)) reasons.push("faq_question_mismatch");
    if (entity && normalizeLabel(answer) !== normalizeLabel(faq.answer)) reasons.push("faq_answer_mismatch");
    const html = input.page.html ?? "";
    if (html && (!html.includes(faq.question) || !html.includes(faq.answer.slice(0, 24)))) reasons.push("faq_not_visible");
  });
  return named(ORGANIC_FAQ_SCHEMA_GATE, reasons);
}

export function evaluateOrganicCanonicalSchemaGate(input: SchemaGraphInput, graph: Record<string, unknown>): OrganicNamedGate {
  const reasons: string[] = [];
  const canonical = absoluteUrl(input.origin, input.page.canonical);
  const linkCanonical = input.page.link_canonical ? absoluteUrl(input.origin, input.page.link_canonical) : canonical;
  if (normalizeCompareUrl(linkCanonical) !== normalizeCompareUrl(canonical)) reasons.push("link_canonical_mismatch");
  const page = graphNode(graph, "WebPage") ?? graphNode(graph, "CollectionPage");
  if (page && normalizeCompareUrl(String(page.url)) !== normalizeCompareUrl(canonical)) reasons.push("webpage_url_mismatch");
  const article = graphNode(graph, "Article") ?? graphNode(graph, "BlogPosting") ?? graphNode(graph, "Service");
  const main = article?.mainEntityOfPage;
  const mainId = typeof main === "object" && main ? String((main as Record<string, unknown>)["@id"] ?? "") : String(main ?? "");
  if (article && mainId && mainId !== webpageId(canonical)) reasons.push("main_entity_mismatch");
  const site = graphNode(graph, "WebSite");
  if (site && normalizeCompareUrl(String(site.url)) !== normalizeCompareUrl(originRoot(input.origin))) reasons.push("website_url_mismatch");
  return named(ORGANIC_CANONICAL_SCHEMA_GATE, reasons);
}

export function evaluateOrganicSchemaStackGate(input: SchemaGraphInput, graph = buildConnectedSchemaGraph(input)): OrganicNamedGate {
  const required = schemaTypeRouter(input.page.kind).filter((type) => {
    if (type === "FAQPage") return Boolean((input.page.faqs ?? input.page.visible_faqs ?? []).length);
    if (type === "SpeakableSpecification") return speakableEligible(input.page.kind);
    return true;
  });
  const present = graphTypes(graph);
  const reasons: string[] = [];
  for (const type of required) {
    if (!present.includes(type) && !(type === "CollectionPage" && present.includes("WebPage") && (input.page.kind === "BLOG_INDEX" || input.page.kind === "TOPIC_HUB"))) {
      reasons.push(`missing_${type.toLowerCase()}`);
    }
  }
  const validator = schemaGraphValidator(graph, input);
  const breadcrumb = evaluateOrganicBreadcrumbSchemaGate(input, graph);
  const speakable = evaluateOrganicSpeakableGate(input, graph);
  const faq = evaluateOrganicFAQSchemaGate(input, graph);
  const canonical = evaluateOrganicCanonicalSchemaGate(input, graph);
  for (const gate of [validator, breadcrumb, speakable, faq, canonical]) {
    if (gate.result !== "PASS") reasons.push(gate.gate);
  }
  const article = graphNode(graph, "Article") ?? graphNode(graph, "BlogPosting") ?? graphNode(graph, "Service");
  if (article && !article.publisher) reasons.push("publisher_missing");
  if (article && !article.author) reasons.push("author_missing");
  if (article && speakableEligible(input.page.kind) && !article.datePublished && !article.dateModified) reasons.push("dates_missing");
  return named(ORGANIC_SCHEMA_STACK_GATE, [...new Set(reasons)]);
}

export function evaluateVentureSchemaReadinessGate(surface: VentureSchemaSurface | null): OrganicNamedGate {
  if (!surface) return named(VENTURE_SCHEMA_READINESS_GATE, ["schema_infrastructure_missing"]);
  const reasons: string[] = [];
  if (!surface.organization) reasons.push("organization_schema_missing");
  if (!surface.website) reasons.push("website_schema_missing");
  if (!surface.page_composer) reasons.push("page_schema_composer_missing");
  if (!surface.breadcrumb) reasons.push("breadcrumb_support_missing");
  if (!surface.speakable) reasons.push("speakable_support_missing");
  if (!surface.faq) reasons.push("faq_support_missing");
  if (!surface.article) reasons.push("article_support_missing");
  if (!surface.blog_posting) reasons.push("blogposting_support_missing");
  if (!surface.type_router) reasons.push("schema_type_router_missing");
  if (!surface.validator) reasons.push("schema_validator_missing");
  if (!surface.sitemap) reasons.push("sitemap_missing");
  if (!surface.organic_growth) reasons.push("organic_growth_missing");
  return named(VENTURE_SCHEMA_READINESS_GATE, reasons);
}

export function defaultVentureSchemaSurface(): VentureSchemaSurface {
  return {
    organization: true,
    website: true,
    page_composer: true,
    breadcrumb: true,
    speakable: true,
    faq: true,
    article: true,
    blog_posting: true,
    type_router: true,
    validator: true,
    sitemap: true,
    organic_growth: true,
  };
}

export function schemaInputFromDraft(
  draft: OrganicDraft,
  extras: { origin?: string; organization?: VentureOrganizationInput; kind?: SchemaPageKind; html?: string } = {},
): SchemaGraphInput {
  const origin = extras.origin ?? draft.origin ?? OCCUPANCYNPV_ORIGIN;
  const kind = extras.kind ?? draft.page_kind ?? routeSchemaKind("EVERGREEN_QUESTION");
  const canonical = draft.canonical.startsWith("http") ? draft.canonical : absoluteUrl(origin, draft.canonical);
  const crumbs = breadcrumbItemsFromDraft(draft, origin);
  const faqs = draft.visible_faqs ?? [];
  return {
    origin,
    organization: extras.organization ?? occupancynpvOrganization(),
    page: {
      kind,
      url: canonical,
      canonical,
      title: draft.title,
      description: draft.meta_description,
      headline: draft.h1,
      breadcrumbs: crumbs,
      visible_breadcrumbs: crumbs,
      speakable_css_selectors: draft.speakable_selectors ?? (draft.direct_answer ? ["#direct-answer"] : []),
      faqs,
      visible_faqs: faqs,
      date_published: draft.date_published,
      date_modified: draft.date_modified,
      author: { type: "Organization", name: "OccupancyNPV", url: origin },
      about: draft.about,
      mentions: draft.mentions,
      html: extras.html,
      link_canonical: canonical,
    },
  };
}

export function evaluateDraftSchemaStack(draft: OrganicDraft): {
  input: SchemaGraphInput;
  graph: Record<string, unknown>;
  stack: OrganicNamedGate;
  gates: OrganicNamedGate[];
} {
  const input = schemaInputFromDraft(draft);
  const graph = buildConnectedSchemaGraph(input);
  const gates = [
    evaluateOrganicBreadcrumbSchemaGate(input, graph),
    evaluateOrganicSpeakableGate(input, graph),
    evaluateOrganicFAQSchemaGate(input, graph),
    evaluateOrganicCanonicalSchemaGate(input, graph),
  ];
  return { input, graph, stack: evaluateOrganicSchemaStackGate(input, graph), gates };
}

export function classifyPageSchema(input: {
  graph?: Record<string, unknown> | null;
  stack?: OrganicNamedGate;
}): SchemaClassification {
  if (!input.graph || !Array.isArray(input.graph["@graph"])) return "SCHEMA_MISSING";
  if (input.stack?.reasons.includes("duplicate_id") || input.stack?.reasons.includes("blog_index_marked_blogposting")) {
    return "SCHEMA_CONFLICT";
  }
  if (input.stack?.result === "PASS") return "SCHEMA_COMPLETE";
  const types = graphTypes(input.graph);
  if (!types.length) return "SCHEMA_MISSING";
  return "SCHEMA_PARTIAL";
}

export function auditOccupancyNpvSchemaCatalog(): SchemaRemediationItem[] {
  const rows: SchemaRemediationItem[] = [];
  const complete = [...LIVE_ORGANIC_SCHEMA_URLS];
  for (const url of complete) {
    rows.push({
      url,
      classification: "SCHEMA_COMPLETE",
      priority: "HIGH",
      missing_types: [],
      reason: "live_organic_imr_stack_composed",
    });
  }
  for (const asset of liveOccupancyNpvQuestionAssets()) {
    if (complete.some((url) => normalizeCompareUrl(url) === normalizeCompareUrl(asset.url))) continue;
    rows.push({
      url: asset.url,
      classification: "SCHEMA_PARTIAL",
      priority: asset.url.includes("commercial-lease-npv") ? "HIGH" : "NORMAL",
      missing_types: ["Organization", "WebSite", "SpeakableSpecification"],
      reason: "authority_page_baseline_schema_only",
    });
  }
  for (const hub of liveOccupancyNpvHubs()) {
    rows.push({
      url: hub.route,
      classification: "SCHEMA_PARTIAL",
      priority: "NORMAL",
      missing_types: ["Organization", "WebSite"],
      reason: "topic_hub_baseline_schema_only",
    });
  }
  return rows;
}

export function schemaRemediationQueue(rows: SchemaRemediationItem[] = auditOccupancyNpvSchemaCatalog()): SchemaRemediationItem[] {
  return rows
    .filter((row) => row.classification !== "SCHEMA_COMPLETE")
    .sort((left, right) => Number(right.priority === "HIGH") - Number(left.priority === "HIGH"));
}

export function schemaClassificationCounts(rows: SchemaRemediationItem[] = auditOccupancyNpvSchemaCatalog()): Record<SchemaClassification, number> {
  return {
    SCHEMA_COMPLETE: rows.filter((row) => row.classification === "SCHEMA_COMPLETE").length,
    SCHEMA_PARTIAL: rows.filter((row) => row.classification === "SCHEMA_PARTIAL").length,
    SCHEMA_MISSING: rows.filter((row) => row.classification === "SCHEMA_MISSING").length,
    SCHEMA_CONFLICT: rows.filter((row) => row.classification === "SCHEMA_CONFLICT").length,
  };
}

export function provisionBuildFactorySchemaFiles(): Record<string, string> {
  return {
    "lib/schema/venture-schema.ts": `export const VENTURE_SCHEMA_SURFACE = ${JSON.stringify(defaultVentureSchemaSurface(), null, 2)};\n`,
    "lib/site-schema.ts": `export const SITE_SCHEMA: Record<string, unknown> = {};\n`,
  };
}

export function recommendedDraftSchema(contentType: OrganicContentType): string[] {
  return [...new Set(["Organization", "WebSite", ...recommendOrganicSchema(contentType), ...schemaTypeRouter(routeSchemaKind(contentType))])];
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}

function speakableEligible(kind: SchemaPageKind): boolean {
  return kind === "EVERGREEN_RESOURCE" || kind === "BLOG_ARTICLE" || kind === "SERVICE_PAGE";
}

function originRoot(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function normalizePageUrl(url: string): string {
  const clean = url.replace(/#.*$/, "");
  if (/^https?:\/\/[^/]+$/i.test(clean)) return `${clean}/`;
  return clean.endsWith("/") ? clean : `${clean}/`;
}

function pageUrlRoot(pageUrl: string): string {
  return normalizePageUrl(pageUrl);
}

function normalizeCompareUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function asTypes(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
}

function graphTypes(graph: Record<string, unknown>): string[] {
  const nodes = Array.isArray(graph["@graph"]) ? (graph["@graph"] as Array<Record<string, unknown>>) : [];
  return nodes.flatMap((node) => asTypes(node["@type"]));
}

function graphNode(graph: Record<string, unknown>, type: string): Record<string, unknown> | undefined {
  const nodes = Array.isArray(graph["@graph"]) ? (graph["@graph"] as Array<Record<string, unknown>>) : [];
  return nodes.find((node) => asTypes(node["@type"]).includes(type));
}

function collectIds(value: unknown, found: string[] = []): string[] {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, found);
    return found;
  }
  const row = value as Record<string, unknown>;
  if (typeof row["@id"] === "string" && Object.keys(row).length === 1) found.push(row["@id"]);
  for (const nested of Object.values(row)) collectIds(nested, found);
  return found;
}

function breadcrumbItemsFromDraft(draft: OrganicDraft, origin: string): SchemaBreadcrumbItem[] {
  const canonical = absoluteUrl(origin, draft.canonical);
  const labels = draft.breadcrumbs.length ? draft.breadcrumbs : ["Home", draft.h1];
  const path = draft.canonical.replace(/^https?:\/\/[^/]+/i, "");
  const segments = path.split("/").filter(Boolean);
  const hasHome = normalizeLabel(labels[0] ?? "") === "home";
  return labels.map((name, index) => {
    if (hasHome && index === 0) return { name, item: `${originRoot(origin)}/` };
    if (index === labels.length - 1) return { name, item: canonical };
    const depth = hasHome ? index : index + 1;
    const prefix = segments.slice(0, Math.max(1, depth));
    return { name, item: absoluteUrl(origin, `/${prefix.join("/")}/`) };
  });
}
