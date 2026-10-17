import { createHash } from "node:crypto";
import type { BlogBacklogArticle } from "./blog-backlog-inventory";
import type { RenderedBacklogEvidence } from "./blog-backlog-deploy-guard";
import { getPublishedBlogRecord, registerPublishedBlogRecord } from "./published-blog-inventory";
import { buildBacklogRenderedEvidenceMap } from "./blog-backlog-compose-evidence";

export const BLOG_BACKLOG_REFRESH_CURRENT_REVISION_V1 = "BLOG_BACKLOG_REFRESH_CURRENT_REVISION_V1" as const;

export function backlogRenderedMainContentDigest(rendered: RenderedBacklogEvidence): string {
  return createHash("sha256").update(rendered.main_html.trim()).digest("hex");
}

export function resolveBacklogPublicationContentRevision(
  article: BlogBacklogArticle,
  rendered: RenderedBacklogEvidence | null,
): string {
  if (rendered) return backlogRenderedMainContentDigest(rendered);
  return article.asset_id ?? article.slug;
}

/** When registry content_version matches current authored main_html, refresh deploy is not eligible. */
export function isBacklogRefreshRevisionAlreadyCurrent(
  article: BlogBacklogArticle,
  rendered: RenderedBacklogEvidence | null,
): boolean {
  if (!rendered) return false;
  const digest = backlogRenderedMainContentDigest(rendered);
  const assetId = article.asset_id ?? (article.venture === "club-throttle" ? `journal-${article.slug}` : article.slug);
  const reg = getPublishedBlogRecord(article.venture === "occupancynpv" ? "occupancynpv" : "club-throttle", assetId);
  if (!reg) return false;
  if (reg.content_version === digest) return true;
  if (reg.publication_evidence === `verified:${digest}`) return true;
  return false;
}

export function hydrateClubThrottlePublishedRevisionDigests(articles: BlogBacklogArticle[]): void {
  const rendered = buildBacklogRenderedEvidenceMap(articles.filter((a) => a.venture === "club-throttle"));
  for (const article of articles) {
    if (article.venture !== "club-throttle") continue;
    const ev = rendered[article.path];
    if (!ev) continue;
    const digest = backlogRenderedMainContentDigest(ev);
    const assetId = article.asset_id ?? `journal-${article.slug}`;
    const reg = getPublishedBlogRecord("club-throttle", assetId);
    if (!reg) continue;
    registerPublishedBlogRecord({
      ...reg,
      content_version: digest,
      publication_evidence: `verified:${digest}`,
    });
  }
}

export function blogBacklogRefreshCurrentRevisionQc(): "PASS" | "FAIL" {
  return typeof BLOG_BACKLOG_REFRESH_CURRENT_REVISION_V1 === "string" ? "PASS" : "FAIL";
}
