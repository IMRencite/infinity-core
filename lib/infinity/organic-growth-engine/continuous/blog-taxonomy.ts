import {
  BLOG_PERMALINK_INTEGRITY_GATE,
  BLOG_PERMALINK_MIGRATION_GATE,
  BLOG_PRIMARY_CATEGORY_GATE,
  BLOG_TAXONOMY_ARCHIVE_DESIGN_GATE,
  BLOG_TAXONOMY_ARCHIVE_QUALITY_GATE,
  BLOG_TAXONOMY_ARCHIVE_TRUTH_GATE,
  BLOG_TAXONOMY_INDEXATION_GATE,
} from "./contract";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import type { OrganicNamedGate } from "./types";

export type BlogTaxonomyKind = "category" | "tag";
export type BlogIndexationState = "INDEX" | "NOINDEX" | "HOLD" | "REMOVE_UNUSED";

export type PrimaryCategoryResolution = {
  primary: string | null;
  slug: string | null;
  result: "PASS" | "FAIL";
  reasons: string[];
  source: "explicit" | "topic_graph" | "venture_priority" | "none";
};

export type BlogPermalinkRedirect = {
  from: string;
  to: string;
  status: 301;
  hops: 1;
};

export function taxonomySlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function blogCategoryArchivePath(category: string): string {
  return `/blog/category/${taxonomySlug(category)}/`;
}

export function blogTagArchivePath(tag: string): string {
  return `/blog/tag/${taxonomySlug(tag)}/`;
}

export function blogArticlePermalink(primaryCategory: string, slug: string): string {
  return `/blog/${taxonomySlug(primaryCategory)}/${slug.replace(/^\/+|\/+$/g, "")}/`;
}

export function publishedBlogPosts(posts: OccupancyNpvBlogPost[]): OccupancyNpvBlogPost[] {
  return posts.filter((post) => !post.draft && !post.unpublished);
}

export function postCategories(post: OccupancyNpvBlogPost): string[] {
  const extras = "categories" in post && Array.isArray((post as OccupancyNpvBlogPost & { categories?: string[] }).categories)
    ? (post as OccupancyNpvBlogPost & { categories?: string[] }).categories ?? []
    : [];
  const primary = post.primaryCategory ?? post.category;
  return [...new Set([primary, ...extras].filter(Boolean))];
}

export function filterPostsByCategory(posts: OccupancyNpvBlogPost[], category: string): OccupancyNpvBlogPost[] {
  const slug = taxonomySlug(category);
  return publishedBlogPosts(posts).filter((post) => postCategories(post).some((row) => taxonomySlug(row) === slug));
}

export function filterPostsByTag(posts: OccupancyNpvBlogPost[], tag: string): OccupancyNpvBlogPost[] {
  const slug = taxonomySlug(tag);
  return publishedBlogPosts(posts).filter((post) => post.tags.some((row) => taxonomySlug(row) === slug));
}

export function paginateTaxonomyPosts<T>(posts: T[], page = 1, pageSize = 12): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(posts.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return { items: posts.slice(start, start + pageSize), page: safePage, pages };
}

export function resolvePrimaryCategory(input: {
  explicit?: string | null;
  categories?: string[];
  topic_graph_parent?: string | null;
  venture_priority?: string[];
  active_categories?: string[];
}): PrimaryCategoryResolution {
  const reasons: string[] = [];
  const active = new Set((input.active_categories ?? input.categories ?? []).map(taxonomySlug).filter(Boolean));
  const explicit = input.explicit?.trim() || "";
  if (explicit) {
    const slug = taxonomySlug(explicit);
    if (active.size && !active.has(slug) && !(input.categories ?? []).some((row) => taxonomySlug(row) === slug)) {
      reasons.push("primary_category_inactive");
    }
    if (!slug) reasons.push("primary_category_slug_invalid");
    return {
      primary: explicit,
      slug: slug || null,
      result: reasons.length ? "FAIL" : "PASS",
      reasons,
      source: "explicit",
    };
  }
  const parent = input.topic_graph_parent?.trim() || "";
  if (parent) {
    const slug = taxonomySlug(parent);
    if (!slug) reasons.push("primary_category_slug_invalid");
    return {
      primary: parent,
      slug: slug || null,
      result: reasons.length ? "FAIL" : "PASS",
      reasons,
      source: "topic_graph",
    };
  }
  const assigned = [...new Set((input.categories ?? []).filter(Boolean))];
  const priority = input.venture_priority ?? [];
  const ranked = priority.filter((row) => assigned.some((item) => taxonomySlug(item) === taxonomySlug(row)));
  if (ranked.length === 1 || (ranked.length > 1 && taxonomySlug(ranked[0]!) !== taxonomySlug(ranked[1]!))) {
    const winner = ranked[0]!;
    return { primary: winner, slug: taxonomySlug(winner), result: "PASS", reasons, source: "venture_priority" };
  }
  if (assigned.length === 1) {
    return { primary: assigned[0]!, slug: taxonomySlug(assigned[0]!), result: "PASS", reasons, source: "venture_priority" };
  }
  return {
    primary: null,
    slug: null,
    result: "FAIL",
    reasons: ["primary_category_ambiguous", "no_publish"],
    source: "none",
  };
}

export function occupancynpvCategoryDescription(category: string): string {
  const slug = taxonomySlug(category);
  if (slug === "valuation") {
    return "How buyers, owners, and lenders translate income and required yield into indicated commercial property value.";
  }
  if (slug === "leasing") {
    return "Occupancy-cost and lease-comparison notes that stay next to the evergreen hubs.";
  }
  if (slug === "financing") {
    return "Debt service, coverage, and refinance context for commercial real estate decisions.";
  }
  return `Published OccupancyNPV notes assigned to ${category}.`;
}

export function occupancynpvTagDescription(tag: string): string {
  const slug = taxonomySlug(tag);
  if (slug === "interest-rates") return "How financing costs and policy rates show up in commercial property bids.";
  if (slug === "cap-rates") return "Going-in yield, NOI, and indicated value for commercial assets.";
  if (slug === "commercial-real-estate") return "Property-level economics for owners, buyers, and tenant-rep readers.";
  return `Published OccupancyNPV notes tagged ${tag}.`;
}

export function evaluateTaxonomyIndexation(input: {
  kind: BlogTaxonomyKind;
  label: string;
  published_count: number;
  intro: string;
  unique_editorial_value?: boolean;
  duplicative?: boolean;
  taxonomy_importance?: "HIGH" | "NORMAL" | "LOW";
}): { state: BlogIndexationState; reasons: string[] } {
  const reasons: string[] = [];
  if (input.published_count <= 0) return { state: "REMOVE_UNUSED", reasons: ["no_published_posts"] };
  const usefulIntro = input.intro.trim().length >= 40;
  if (input.kind === "tag") {
    if (input.duplicative) reasons.push("duplicative_tag");
    if (input.published_count < 2) reasons.push("thin_tag_single_post");
    if (!usefulIntro) reasons.push("weak_tag_intro");
    if (input.published_count < 2 || input.duplicative || !usefulIntro) {
      return { state: "NOINDEX", reasons: reasons.length ? reasons : ["thin_tag"] };
    }
    return { state: "INDEX", reasons };
  }
  if (input.published_count === 1 && !usefulIntro && input.taxonomy_importance !== "HIGH") {
    return { state: "NOINDEX", reasons: ["thin_category"] };
  }
  if (!usefulIntro) reasons.push("intro_thin");
  return { state: usefulIntro || input.taxonomy_importance === "HIGH" ? "INDEX" : "HOLD", reasons };
}

export function blogSitemapUrls(input: {
  index: string;
  articles: OccupancyNpvBlogPost[];
  categories: string[];
  tags: Array<{ tag: string; count: number; intro: string }>;
  legacy_paths?: string[];
}): string[] {
  const urls = new Set<string>([input.index]);
  for (const post of publishedBlogPosts(input.articles)) urls.add(post.path);
  for (const category of input.categories) {
    const posts = filterPostsByCategory(input.articles, category);
    const policy = evaluateTaxonomyIndexation({
      kind: "category",
      label: category,
      published_count: posts.length,
      intro: occupancynpvCategoryDescription(category),
      taxonomy_importance: "HIGH",
    });
    if (policy.state === "INDEX") urls.add(blogCategoryArchivePath(category));
  }
  for (const row of input.tags) {
    const policy = evaluateTaxonomyIndexation({
      kind: "tag",
      label: row.tag,
      published_count: row.count,
      intro: row.intro,
    });
    if (policy.state === "INDEX") urls.add(blogTagArchivePath(row.tag));
  }
  for (const legacy of input.legacy_paths ?? []) urls.delete(legacy);
  return [...urls];
}

export function taxonomyChipHtml(kind: BlogTaxonomyKind, label: string, surface: "light" | "hero" = "light"): string {
  const href = kind === "category" ? blogCategoryArchivePath(label) : blogTagArchivePath(label);
  const attr = kind === "category" ? "data-blog-category" : "data-blog-tag";
  const display = kind === "category" ? `[ ${label.toUpperCase()} ]` : `[ ${label} ]`;
  return `<a href=${JSON.stringify(href)} className="onpv-taxonomy-chip" ${attr}=${JSON.stringify(label)} data-blog-taxonomy-link="${kind}" data-blog-taxonomy-chip="true" data-blog-taxonomy-kind="${kind}" data-blog-taxonomy-surface="${surface}">${display}</a>`;
}

export function renderTaxonomyArchiveRollHtml(posts: OccupancyNpvBlogPost[], filter: { kind: BlogTaxonomyKind; slug: string; page?: number }): string {
  const page = paginateTaxonomyPosts(posts, filter.page ?? 1);
  const cards = page.items.map((post) => `<article className="onpv-blog-archive-card" data-blog-archive-card="true" data-blog-card="true" data-category=${JSON.stringify(post.primaryCategory ?? post.category)}>
                <a href="${post.path}">
                  <img src="${post.image}" alt=${JSON.stringify(post.image_alt)} width={480} height={270} loading="lazy" />
                  <h2>${post.title}</h2>
                </a>
                <p>${post.excerpt}</p>
                <p><time dateTime="${post.published}">${post.published}</time>${post.reading_time ? ` · ${post.reading_time}` : ""}</p>
                <p>${taxonomyChipHtml("category", post.primaryCategory ?? post.category)} ${post.tags.map((tag) => taxonomyChipHtml("tag", tag)).join(" ")}</p>
                <a href="${post.path}">Read article</a>
              </article>`).join("\n              ");
  const pagination = page.pages > 1
    ? `<nav data-blog-pagination="true" data-blog-taxonomy-page="${page.page}" data-blog-taxonomy-pages="${page.pages}" data-blog-taxonomy-filter="${filter.kind}:${filter.slug}" aria-label="Archive pagination"><span>Page ${page.page} of ${page.pages}</span></nav>`
    : `<p hidden data-blog-taxonomy-page="1" data-blog-taxonomy-filter="${filter.kind}:${filter.slug}"></p>`;
  return `<section className="onpv-blog-archive-grid" data-blog-archive-roll="true" data-blog-taxonomy-kind="${filter.kind}" data-blog-taxonomy-slug="${filter.slug}">
              ${cards || "<p>No published posts in this archive.</p>"}
              ${pagination}
            </section>`;
}

export function evaluateBlogPrimaryCategoryGate(input: {
  resolution: PrimaryCategoryResolution;
  permalink?: string;
  breadcrumbs?: string[];
  schema_section?: string;
  canonical?: string;
}): OrganicNamedGate {
  const reasons = [...input.resolution.reasons];
  if (input.resolution.result !== "PASS" || !input.resolution.primary || !input.resolution.slug) {
    if (!reasons.includes("primary_category_missing")) reasons.push("primary_category_missing");
  } else {
    if (input.permalink && !input.permalink.includes(`/blog/${input.resolution.slug}/`)) reasons.push("permalink_missing_category");
    if (input.canonical && !input.canonical.includes(`/blog/${input.resolution.slug}/`)) reasons.push("canonical_missing_category");
    if (input.breadcrumbs && !input.breadcrumbs.some((row) => taxonomySlug(row) === input.resolution.slug || row === input.resolution.primary)) {
      reasons.push("breadcrumb_missing_category");
    }
    if (input.schema_section && taxonomySlug(input.schema_section) !== input.resolution.slug && input.schema_section !== input.resolution.primary) {
      reasons.push("schema_missing_category");
    }
  }
  return named(BLOG_PRIMARY_CATEGORY_GATE, [...new Set(reasons)]);
}

export function evaluateBlogTaxonomyArchiveTruthGate(input: {
  kind: BlogTaxonomyKind;
  label: string;
  html: string;
  catalog: OccupancyNpvBlogPost[];
  page?: number;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const expected = input.kind === "category" ? filterPostsByCategory(input.catalog, input.label) : filterPostsByTag(input.catalog, input.label);
  const page = paginateTaxonomyPosts(expected, input.page ?? 1);
  if (!input.html.includes("data-blog-archive-roll")) reasons.push("archive_roll_missing");
  if (input.html.includes("data-fuzzy-filter") || /includes\(.*toLowerCase/.test(input.html)) reasons.push("fuzzy_filtering");
  for (const post of page.items) {
    if (!input.html.includes(post.title) && !input.html.includes(post.path)) reasons.push("matching_post_missing");
    if (post.draft && input.html.includes(post.path)) reasons.push("draft_included");
  }
  for (const post of input.catalog) {
    const match = expected.some((row) => row.path === post.path);
    if (!match && !post.draft && input.html.includes(post.title) && input.html.includes("data-blog-archive-card")) {
      reasons.push("unrelated_post_included");
    }
    if (post.draft && input.html.includes(post.path)) reasons.push("draft_included");
    if (post.unpublished && input.html.includes(post.path)) reasons.push("unpublished_included");
  }
  const countMark = input.html.match(/data-blog-archive-count="(\d+)"/);
  if (countMark && Number(countMark[1]) !== expected.length) reasons.push("published_count_mismatch");
  if (page.pages > 1 && !input.html.includes(`data-blog-taxonomy-filter`)) reasons.push("pagination_loses_taxonomy");
  const slug = taxonomySlug(input.label);
  const self = input.kind === "category" ? blogCategoryArchivePath(input.label) : blogTagArchivePath(input.label);
  if (input.html.includes("href=\"#\"") || (input.html.includes("data-blog-archive-card") && !input.html.includes(self) && !page.items.every((post) => input.html.includes(post.path)))) {
    reasons.push("links_unresolved");
  }
  if (!input.html.includes(`data-blog-taxonomy-slug="${slug}"`)) reasons.push("canonical_taxonomy_source_missing");
  return named(BLOG_TAXONOMY_ARCHIVE_TRUTH_GATE, [...new Set(reasons)]);
}

export function evaluateBlogTaxonomyArchiveQualityGate(input: {
  kind: BlogTaxonomyKind;
  html: string;
  intro: string;
  published_count: number;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (input.intro.trim().length < 40) reasons.push("intro_thin");
  if (!input.html.includes("data-blog-hero")) reasons.push("archive_hero_missing");
  if (input.published_count === 0) reasons.push("empty_archive");
  if (input.kind === "tag" && input.published_count < 2 && !input.html.includes("noindex") && !input.html.includes("index: false")) {
    reasons.push("thin_tag_indexable");
  }
  return named(BLOG_TAXONOMY_ARCHIVE_QUALITY_GATE, reasons);
}

export function evaluateBlogTaxonomyIndexationGate(input: {
  kind: BlogTaxonomyKind;
  label: string;
  published_count: number;
  intro: string;
  robots_index: boolean;
  sitemap_includes: boolean;
}): OrganicNamedGate {
  const policy = evaluateTaxonomyIndexation({
    kind: input.kind,
    label: input.label,
    published_count: input.published_count,
    intro: input.intro,
    taxonomy_importance: input.kind === "category" ? "HIGH" : "NORMAL",
  });
  const reasons: string[] = [];
  if (policy.state === "INDEX" && !input.robots_index) reasons.push("should_index");
  if (policy.state === "NOINDEX" && input.robots_index) reasons.push("should_noindex");
  if (policy.state === "INDEX" && !input.sitemap_includes) reasons.push("indexable_missing_from_sitemap");
  if ((policy.state === "NOINDEX" || policy.state === "REMOVE_UNUSED") && input.sitemap_includes) reasons.push("noindex_in_sitemap");
  return named(BLOG_TAXONOMY_INDEXATION_GATE, [...new Set([...policy.reasons.filter((row) => row === "no_published_posts"), ...reasons])]);
}

export function evaluateBlogTaxonomyArchiveDesignGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes("data-blog-hero") || !html.includes('data-blog-hero-treatment="editorial-panel"')) reasons.push("archive_hero_plain");
  if (!html.includes('data-blog-layout="editorial"')) reasons.push("archive_layout_unpolished");
  if (!html.includes("data-blog-sidebar") || !html.includes('data-blog-sidebar-shared="BlogSidebar"')) reasons.push("archive_sidebar_missing");
  if (!html.includes("data-blog-archive-card") && !html.includes("data-blog-archive-roll")) reasons.push("archive_cards_missing");
  if (!html.includes("onpv-blog-archive-card") && html.includes("data-blog-archive-card")) reasons.push("utility_archive_styling");
  if (!html.includes("data-blog-taxonomy-link")) reasons.push("taxonomy_chips_not_linked");
  if (!html.includes("data-blog-taxonomy-chip")) reasons.push("TAXONOMY_PRESENTATION_FAIL");
  return named(BLOG_TAXONOMY_ARCHIVE_DESIGN_GATE, reasons);
}

export function evaluateBlogPermalinkIntegrityGate(input: {
  permalink: string;
  canonical: string;
  breadcrumbs: string[];
  schema_url: string;
  sitemap: string;
  internal_html: string;
  primary_category_slug: string;
  legacy_path?: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const expected = `/blog/${input.primary_category_slug}/`;
  if (!input.permalink.includes(expected)) reasons.push("permalink_missing_category");
  if (normalizePath(input.canonical) !== normalizePath(input.permalink)) reasons.push("canonical_mismatch");
  if (!input.breadcrumbs.some((row) => normalizePath(row) === normalizePath(input.permalink) || taxonomySlug(row) === input.primary_category_slug)) {
    reasons.push("breadcrumb_mismatch");
  }
  if (normalizePath(input.schema_url) !== normalizePath(input.permalink)) reasons.push("schema_mismatch");
  if (!input.sitemap.includes(input.permalink)) reasons.push("sitemap_mismatch");
  if (input.legacy_path && input.sitemap.includes(input.legacy_path)) reasons.push("legacy_url_in_sitemap");
  if (input.legacy_path && input.internal_html.includes(`href="${input.legacy_path}"`)) reasons.push("stale_internal_flat_url");
  if (/\/blog\/[a-z0-9-]+\/$/.test(input.permalink) === false && input.permalink.split("/").filter(Boolean).length < 3) {
    reasons.push("flat_article_url");
  }
  const flat = input.legacy_path ?? "";
  if (flat && input.sitemap.includes(flat) && input.sitemap.includes(input.permalink)) reasons.push("duplicate_article_url");
  return named(BLOG_PERMALINK_INTEGRITY_GATE, [...new Set(reasons)]);
}

export function evaluateBlogPermalinkMigrationGate(input: {
  old_url: string;
  new_url: string;
  old_status: number;
  hops: number;
  new_status: number;
  canonical: string;
  sitemap: string;
  internal_html: string;
  schema_url: string;
  breadcrumbs: string[];
  asset_id_before: string;
  asset_id_after: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (input.old_status !== 301) reasons.push("old_url_not_301");
  if (input.hops !== 1) reasons.push("redirect_chain");
  if (input.new_status !== 200) reasons.push("new_url_not_200");
  if (normalizePath(input.canonical) !== normalizePath(input.new_url)) reasons.push("canonical_not_new");
  if (input.sitemap.includes(input.old_url)) reasons.push("old_url_in_sitemap");
  if (!input.sitemap.includes(input.new_url)) reasons.push("new_url_missing_sitemap");
  if (input.internal_html.includes(`href="${input.old_url}"`)) reasons.push("internal_links_stale");
  if (normalizePath(input.schema_url) !== normalizePath(input.new_url)) reasons.push("schema_stale");
  if (!input.breadcrumbs.some((row) => normalizePath(row) === normalizePath(input.new_url))) reasons.push("breadcrumb_stale");
  if (input.asset_id_before !== input.asset_id_after) reasons.push("content_identity_changed");
  return named(BLOG_PERMALINK_MIGRATION_GATE, reasons);
}

export function occupancynpvPermalinkRedirect(): BlogPermalinkRedirect {
  return {
    from: "/blog/how-interest-rates-affect-commercial-property-values/",
    to: "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    status: 301,
    hops: 1,
  };
}

export function vercelRedirectEntries(redirects: BlogPermalinkRedirect[]): Array<{ source: string; destination: string; statusCode: 301 }> {
  return redirects.flatMap((row) => {
    const bare = row.from.replace(/\/+$/, "") || "/";
    return [
      { source: bare, destination: row.to, statusCode: 301 as const },
      { source: `${bare}/`, destination: row.to, statusCode: 301 as const },
    ];
  });
}

export function nextConfigRedirectSnippet(redirects: BlogPermalinkRedirect[]): string {
  const entries = vercelRedirectEntries(redirects)
    .map((row) => `      { source: ${JSON.stringify(row.source)}, destination: ${JSON.stringify(row.destination)}, statusCode: 301 }`)
    .join(",\n");
  return `async redirects() {\n    return [\n${entries}\n    ];\n  }`;
}

export function permalinkRedirectRouteSource(to: string): string {
  return `import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(new URL(${JSON.stringify(to)}, request.url), 301);
}

export function HEAD(request: Request) {
  return GET(request);
}
`;
}

export function applyPermalinkRedirectFiles(
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>,
  redirects: BlogPermalinkRedirect[] = [occupancynpvPermalinkRedirect()],
): Array<{ path: string; content: string; encoding?: "utf8" | "base64" }> {
  let next = files.filter((file) => file.path.replace(/\\/g, "/") !== "vercel.json");
  for (const redirect of redirects) {
    const clean = redirect.from.replace(/\/+$/, "") || "/";
    const routePath = clean === "/" ? "app/route.ts" : `app${clean}/route.ts`;
    const pagePath = clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
    next = next.filter((file) => {
      const path = file.path.replace(/\\/g, "/");
      return path !== routePath && path !== pagePath;
    });
    next.push({ path: routePath, content: permalinkRedirectRouteSource(redirect.to) });
  }
  const config = next.find((file) => /next\.config\.(js|mjs|ts)$/.test(file.path.replace(/\\/g, "/")));
  if (config && redirects[0] && !config.content.includes(redirects[0].to)) {
    if (/const nextConfig[^=]*=\s*\{/.test(config.content)) {
      config.content = config.content.replace(/const nextConfig[^=]*=\s*\{/, `const nextConfig = {\n  ${nextConfigRedirectSnippet(redirects)},`);
    }
  }
  return next;
}

export function sanitizeBlogSitemap(content: string, keep: string[], drop: string[]): string {
  const found = [...content.matchAll(/url:\s*"([^"]+)"/g)].map((item) => item[1]!);
  const other = found.filter((url) => !url.startsWith("/blog"));
  const urls = [...new Set([...other, ...keep].filter((url) => !drop.some((legacy) => url === legacy || url === legacy.replace(/\/+$/, "") || url.endsWith(legacy.replace(/\/+$/, "")))))];
  return urls.length ? content.replace(/return \[[\s\S]*?\];/, `return [\n${urls.map((url) => `    { url: ${JSON.stringify(url)}, changeFrequency: "weekly" as const, priority: ${url === "/" ? "1" : "0.6"} }`).join(",\n")}\n  ];`) : content;
}

function normalizePath(value: string): string {
  return value.replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "") || "/";
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}
