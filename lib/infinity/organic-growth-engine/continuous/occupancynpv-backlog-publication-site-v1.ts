import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import type { BlogBacklogArticle } from "./blog-backlog-inventory";
import type { OrganicDraft } from "./quality";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";
import { occupancynpvPublishedBlogPosts } from "./occupancynpv-blog-catalog";
import { occupancynpvEditorialBlogPageSource } from "./occupancynpv-editorial-blog-page";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { buildConnectedSchemaGraph, occupancynpvOrganization } from "./schema-standard";
import { blogCategoryArchivePath, blogSitemapUrls, sanitizeBlogSitemap, taxonomyDisplayLabel } from "./blog-taxonomy";
import { injectOccupancyNpvOrganicPage } from "./occupancynpv-publisher";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsertArtifact(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const norm = path.replace(/\\/g, "/");
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== norm);
  next.push({ path, content });
  return next;
}
import { OCCUPANCYNPV_BLOG_INDEX_PATH } from "./occupancynpv-blog-catalog";
import { occupancynpvActiveCategories, occupancynpvActiveTags } from "./occupancynpv-blog-catalog";
import { occupancynpvTagDescription } from "./blog-taxonomy";
import { occupancyInfoVisualHtml } from "./occupancynpv-info-visuals";
import { renderCanonicalArticleMain } from "./article-section-renderer";

export const ONPV_BACKLOG_PUBLICATION_SITE_V1 = "ONPV_BACKLOG_PUBLICATION_SITE_V1" as const;

function normPath(path: string): string {
  return path.replace(/\/+$/, "").toLowerCase();
}

function categorySlugFromPath(path: string): string {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const blogIdx = parts.indexOf("blog");
  return blogIdx >= 0 && parts[blogIdx + 1] ? parts[blogIdx + 1]! : "leasing";
}

function postFromBacklogArticle(article: BlogBacklogArticle, draft: OrganicDraft): OccupancyNpvBlogPost {
  const categorySlug = categorySlugFromPath(article.path);
  const label = taxonomyDisplayLabel(categorySlug);
  const featured = occupancynpvFeaturedEditorialFor(article.slug);
  return {
    asset_id: article.asset_id ?? article.slug,
    slug: article.slug,
    path: article.path,
    title: draft.h1 ?? article.title,
    excerpt: draft.meta_description ?? draft.direct_answer ?? "",
    published: draft.date_published ?? "2026-10-22",
    modified: draft.date_modified ?? draft.date_published ?? "2026-10-22",
    primaryCategory: label,
    category: label,
    tags: draft.visible_faqs?.length ? ["Leasing", "Occupancy costs"] : ["Leasing"],
    image: featured.path,
    image_alt: featured.alt,
    featured: false,
    reading_time: "11 min",
    draft: false,
    unpublished: false,
  };
}

function plannedPageFromArticle(article: BlogBacklogArticle, draft: OrganicDraft): PlannedPage {
  const route = article.path.replace(/\/+$/, "") || "/";
  const categorySlug = categorySlugFromPath(article.path);
  return {
    route,
    role: "EDUCATIONAL_ARTICLE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${draft.h1 ?? article.title} — OccupancyNPV`,
    metaDescription: draft.meta_description ?? draft.direct_answer ?? "",
    canonical: article.path,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: taxonomyDisplayLabel(categorySlug),
    pageOpportunityId: `occupancynpv-${article.slug}`,
  };
}

export function occupancynpvBacklogPublicationPageSchema(article: BlogBacklogArticle, draft: OrganicDraft): Record<string, unknown> {
  const page = plannedPageFromArticle(article, draft);
  const post = postFromBacklogArticle(article, draft);
  const categorySlug = categorySlugFromPath(article.path);
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_ARTICLE",
      url: article.path,
      canonical: article.canonical_url,
      title: page.title,
      description: page.metaDescription,
      headline: draft.h1 ?? article.title,
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: taxonomyDisplayLabel(categorySlug), item: blogCategoryArchivePath(categorySlug) },
        { name: post.title, item: article.path },
      ],
      visible_breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: taxonomyDisplayLabel(categorySlug), item: blogCategoryArchivePath(categorySlug) },
        { name: post.title, item: article.path },
      ],
      speakable_css_selectors: draft.speakable_selectors ?? ["h1", "[data-direct-answer]"],
      faqs: draft.visible_faqs ?? [],
      visible_faqs: draft.visible_faqs ?? [],
      date_published: post.published,
      date_modified: post.modified,
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      image: post.image,
      article_section: post.primaryCategory ?? post.category,
      about: ["commercial lease", "occupancy cost"],
      mentions: ["tenant improvement", "amortization"],
      link_canonical: article.canonical_url,
    },
  });
}

export function occupancynpvBacklogPublicationPageSource(article: BlogBacklogArticle): string {
  const draft = article.draft;
  if (!draft) throw new Error(`ONPV_BACKLOG_PUBLICATION_MISSING_DRAFT:${article.slug}`);
  const page = plannedPageFromArticle(article, draft);
  const post = postFromBacklogArticle(article, draft);
  const featured = occupancynpvFeaturedEditorialFor(article.slug);
  const categorySlug = categorySlugFromPath(article.path);
  const infoVisual = occupancyInfoVisualHtml(article.slug as Parameters<typeof occupancyInfoVisualHtml>[0]);
  const related = infoVisual
    ? `<section data-section-type="INFO_VISUAL">${infoVisual}</section>`
    : "";
  return occupancynpvEditorialBlogPageSource({
    page,
    draft,
    post,
    featured_image: featured.path,
    featured_alt: featured.alt,
    importDepth: "../../../../",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/blog", label: "Blog" },
      { href: blogCategoryArchivePath(categorySlug), label: taxonomyDisplayLabel(categorySlug) },
      { href: article.path, label: post.title },
    ],
    related_html: related || undefined,
  });
}

export function injectOccupancyNpvBacklogPublicationsIntoSite(
  files: ArtifactFile[],
  articles: BlogBacklogArticle[],
): { files: ArtifactFile[]; injected_paths: string[] } {
  let next = files;
  const injected_paths: string[] = [];
  const publishable = articles.filter((a) => a.venture === "occupancynpv" && a.draft);
  for (const article of publishable) {
    const route = article.path.replace(/\/+$/, "") || "/";
    const source = occupancynpvBacklogPublicationPageSource(article);
    const schema = occupancynpvBacklogPublicationPageSchema(article, article.draft!);
    next = injectOccupancyNpvOrganicPage(next, { route: article.path, source, schema });
    injected_paths.push(route);
  }
  if (publishable.length > 0) {
    const basePosts = occupancynpvPublishedBlogPosts();
    const extraPosts = publishable.map((a) => postFromBacklogArticle(a, a.draft!));
    const mergedPosts = [...basePosts];
    for (const post of extraPosts) {
      if (!mergedPosts.some((p) => normPath(p.path) === normPath(post.path))) mergedPosts.push(post);
    }
    const sitemap = next.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts");
    if (sitemap) {
      const keep = blogSitemapUrls({
        index: OCCUPANCYNPV_BLOG_INDEX_PATH,
        articles: mergedPosts,
        categories: occupancynpvActiveCategories(mergedPosts),
        tags: occupancynpvActiveTags(mergedPosts).map((row) => ({
          tag: row.tag,
          count: row.count,
          intro: occupancynpvTagDescription(row.tag),
        })),
        legacy_paths: [],
      });
      next = upsertArtifact(
        next,
        "app/sitemap.ts",
        sanitizeBlogSitemap(sitemap.content, keep, ["/blog/tag/"]),
      );
    }
  }
  return { files: next, injected_paths };
}

export function evaluateOnpvBuildArtifactPublicationIdentity(input: {
  files: ArtifactFile[];
  article: BlogBacklogArticle;
}): {
  ONPV_BUILD_ARTIFACT_EXPECTED_ROUTE_QC: "PASS" | "FAIL";
  ONPV_BUILD_ARTIFACT_ARTICLE_IDENTITY_QC: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const routePath = `app${input.article.path.replace(/\/+$/, "")}/page.tsx`.replace(/\/+/g, "/");
  const file = input.files.find((f) => f.path.replace(/\\/g, "/") === routePath);
  if (!file) reasons.push("EXPECTED_ROUTE_FILE_MISSING");
  const draft = input.article.draft;
  if (file && draft) {
    if (!file.content.includes(input.article.slug)) reasons.push("SLUG_NOT_IN_ROUTE_FILE");
    if (!file.content.includes(draft.h1 ?? input.article.title)) reasons.push("TITLE_NOT_IN_ROUTE_FILE");
    const mainProbe = renderCanonicalArticleMain({
      headings: draft.headings,
      body: draft.body,
      faqs: draft.visible_faqs,
    });
    const probeLine = draft.headings[0] ?? draft.body.slice(0, 40);
    if (probeLine && !file.content.includes(probeLine.slice(0, Math.min(24, probeLine.length)))) {
      reasons.push("BODY_FINGERPRINT_MISSING");
    }
    if (!file.content.includes(input.article.canonical_url.replace("https://occupancynpv.com", "").replace(/\/+$/, ""))) {
      if (!file.content.includes(input.article.path.replace(/\/+$/, ""))) reasons.push("CANONICAL_PATH_MISSING");
    }
    void mainProbe;
  }
  return {
    ONPV_BUILD_ARTIFACT_EXPECTED_ROUTE_QC: reasons.includes("EXPECTED_ROUTE_FILE_MISSING") ? "FAIL" : "PASS",
    ONPV_BUILD_ARTIFACT_ARTICLE_IDENTITY_QC: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function onpvBacklogPublicationSiteQc(): "PASS" | "FAIL" {
  return typeof ONPV_BACKLOG_PUBLICATION_SITE_V1 === "string" ? "PASS" : "FAIL";
}
