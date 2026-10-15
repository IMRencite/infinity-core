import { CLUB_THROTTLE_JOURNAL_POSTS } from "./club-throttle-journal-posts";
import { clubThrottleJournalDrafts } from "./club-throttle-journal";
import {
  clubThrottleJournalArticleMetadata,
  clubThrottleJournalArticleSchemaGraph,
} from "./club-throttle-journal-publication-metadata";
import { renderBlogArticleShell, OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "./blog-ux";
import { renderCanonicalArticleMain } from "./article-section-renderer";
import type { BlogBacklogArticle } from "./blog-backlog-inventory";
import type { RenderedBacklogEvidence } from "./blog-backlog-deploy-guard";
import { occupancynpvExpansionDrafts } from "./occupancynpv-blog-expansion";
import { occupancynpvAutonomousBacklogDrafts } from "./occupancynpv-autonomous-backlog-v1";
import { occupancynpvInterestRateDraft } from "./occupancynpv-blog";
import { occupancynpvCamFirstYearDraft } from "./occupancynpv-cam-first-year-page";
import { occupancyInfoVisualHtml, slugFromOccupancyPath } from "./occupancynpv-info-visuals";
import { blogArticleMediaForPath } from "./blog-article-media-registry";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";

function clubThrottleEvidence(article: BlogBacklogArticle): RenderedBacklogEvidence | null {
  const draft = clubThrottleJournalDrafts().find((d) => d.canonical.replace(/\/+$/, "") === article.path.replace(/\/+$/, ""));
  if (!draft) return null;
  const post = CLUB_THROTTLE_JOURNAL_POSTS.find((p) => p.path === article.path);
  if (!post) return null;
  const mainHtml = renderCanonicalArticleMain({
    headings: draft.headings,
    body: draft.body,
    faqs: draft.visible_faqs,
  });
  const shell = renderBlogArticleShell({
    category: draft.breadcrumbs[1] ?? post.category,
    date: post.published,
    title: draft.h1,
    dek: draft.direct_answer ?? post.excerpt,
    featured_image: post.image,
    featured_alt: post.image_alt,
    tags: post.tags,
    path: draft.canonical,
    posts: CLUB_THROTTLE_JOURNAL_POSTS,
    main_html: mainHtml,
    venture_id: "club-throttle",
    archive_root: "/journal",
    featured_reads_html: "",
  });
  const metadata = clubThrottleJournalArticleMetadata(draft);
  const schemaGraph = clubThrottleJournalArticleSchemaGraph({ draft, post, shell_html: shell });
  const shell_html = `${shell}\n<script type="application/ld+json">${JSON.stringify(schemaGraph)}</script>`;
  return {
    shell_html,
    main_html: mainHtml,
    expected_canonical: article.canonical_url,
    featured_image_path: post.image,
  };
}

function occupancyMainAndShell(draft: NonNullable<BlogBacklogArticle["draft"]>, article: BlogBacklogArticle) {
  const slug = slugFromOccupancyPath(article.path) ?? "";
  const mainHtml = renderCanonicalArticleMain({
    headings: draft.headings,
    body: draft.body,
    faqs: draft.visible_faqs,
    info_visual_html: slug ? occupancyInfoVisualHtml(slug) : "",
  });
  const featured = slug ? occupancynpvFeaturedEditorialFor(slug) : null;
  const heroSrc = featured?.path ?? "/media/hero-building.webp";
  const heroAlt = featured?.alt ?? draft.h1.replace(/"/g, "'");
  const schemaStub =
    '{"@context":"https://schema.org","@graph":[{"@type":"BlogPosting"},{"@type":"WebPage"},{"@type":"BreadcrumbList"},{"@type":"Organization"},{"@type":"WebSite"}]}';
  const shell_html = `<article data-blog-article-shell="true"><div data-blog-article-hero="true" data-visual-role="FEATURED_EDITORIAL_IMAGE"><img src="${heroSrc}" alt="${heroAlt}" width="1600" height="900" /></div><div class="onpv-blog-main pv-reading">${mainHtml}</div><script type="application/ld+json">${schemaStub}</script></article>`;
  return { mainHtml, shell_html };
}

function occupancyEvidence(article: BlogBacklogArticle): RenderedBacklogEvidence | null {
  const pathNorm = article.path.replace(/\/+$/, "");
  const expansion = occupancynpvExpansionDrafts().find((d) => d.canonical.replace(/\/+$/, "") === pathNorm);
  const autonomous = occupancynpvAutonomousBacklogDrafts().find((d) => d.canonical.replace(/\/+$/, "") === pathNorm);
  let draft = expansion ?? autonomous ?? null;
  if (!draft && pathNorm.endsWith("/blog/occupancy-costs/cam-first-year")) {
    draft = occupancynpvCamFirstYearDraft();
  } else if (!draft && pathNorm.includes("how-interest-rates-affect-commercial-property-values")) {
    draft = occupancynpvInterestRateDraft();
  }
  if (!draft) return null;
  const { mainHtml, shell_html } = occupancyMainAndShell(draft, article);
  return {
    shell_html,
    main_html: mainHtml,
    expected_canonical: article.canonical_url,
    featured_image_path: blogArticleMediaForPath(article.path)?.hero_image.src ?? "/media/hero-building.webp",
  };
}

export function buildBacklogRenderedEvidence(article: BlogBacklogArticle): RenderedBacklogEvidence | null {
  if (article.venture === "club-throttle") return clubThrottleEvidence(article);
  if (article.venture === "occupancynpv") return occupancyEvidence(article);
  return null;
}

export function buildBacklogRenderedEvidenceMap(articles: BlogBacklogArticle[]): Record<string, RenderedBacklogEvidence | null> {
  const map: Record<string, RenderedBacklogEvidence | null> = {};
  for (const article of articles) {
    if (article.backlog_scope === "AUTHORIZED_BACKLOG") {
      map[article.path] = buildBacklogRenderedEvidence(article);
    }
  }
  return map;
}
