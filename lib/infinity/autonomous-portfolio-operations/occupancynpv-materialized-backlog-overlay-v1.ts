import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";

const materializedArticles: BlogBacklogArticle[] = [];
const materializedDrafts: OrganicDraft[] = [];

export function resetOnpvMaterializedBacklogOverlayForTests(): void {
  materializedArticles.length = 0;
  materializedDrafts.length = 0;
}

export function registerOnpvMaterializedBacklogArticle(article: BlogBacklogArticle, draft: OrganicDraft): void {
  materializedArticles.push(article);
  materializedDrafts.push(draft);
}

export function listOnpvMaterializedBacklogArticles(): BlogBacklogArticle[] {
  return [...materializedArticles];
}

export function listOnpvMaterializedBacklogDrafts(): OrganicDraft[] {
  return [...materializedDrafts];
}

export function mergeOnpvMaterializedBacklogArticles(articles: BlogBacklogArticle[]): BlogBacklogArticle[] {
  if (materializedArticles.length === 0) return articles;
  const paths = new Set(articles.map((a) => a.path.replace(/\/+$/, "").toLowerCase()));
  const extra = materializedArticles.filter(
    (a) => !paths.has(a.path.replace(/\/+$/, "").toLowerCase()),
  );
  return extra.length ? [...articles, ...extra] : articles;
}
