import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import {
  clearOnpvOpportunityModuleReadCachesForTests,
  listDurableOnpvMaterializedArticlesFromCache,
} from "./onpv-durable-opportunity-state-v1";

/** Write-through UI cache only; authoritative materialized article lives in durable ONPV_OPPORTUNITY payload. */
const overlayArticleCache: BlogBacklogArticle[] = [];
const overlayDraftCache: OrganicDraft[] = [];

export function resetOnpvMaterializedBacklogOverlayForTests(): void {
  overlayArticleCache.length = 0;
  overlayDraftCache.length = 0;
  clearOnpvOpportunityModuleReadCachesForTests();
}

export function registerOnpvMaterializedBacklogArticle(article: BlogBacklogArticle, draft: OrganicDraft): void {
  overlayArticleCache.push(article);
  overlayDraftCache.push(draft);
}

export function listOnpvMaterializedBacklogDrafts(): OrganicDraft[] {
  return [...overlayDraftCache];
}

export function mergeOnpvMaterializedBacklogArticles(articles: BlogBacklogArticle[]): BlogBacklogArticle[] {
  const durableArticles = listDurableOnpvMaterializedArticlesFromCache();
  const combined = [...durableArticles, ...overlayArticleCache];
  if (combined.length === 0) return articles;
  const paths = new Set(articles.map((a) => a.path.replace(/\/+$/, "").toLowerCase()));
  const extra = combined.filter((a) => !paths.has(a.path.replace(/\/+$/, "").toLowerCase()));
  return extra.length ? [...articles, ...extra] : articles;
}
