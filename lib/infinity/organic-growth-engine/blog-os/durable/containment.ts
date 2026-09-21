import type { CheckResult } from "./types";

export type ContainedArticle = {
  path: string;
  unpublished: boolean;
  noindex: boolean;
};

export function containPublishedArticle(article: { path: string }): ContainedArticle {
  return { path: article.path, unpublished: true, noindex: true };
}

export function catalogAfterContainment(posts: Array<{ path: string; unpublished?: boolean }>, contained: ContainedArticle): Array<{ path: string; unpublished?: boolean }> {
  return posts
    .map((post) => post.path === contained.path ? { ...post, unpublished: true } : post)
    .filter((post) => !post.unpublished);
}

export function sitemapAfterContainment(urls: string[], contained: ContainedArticle): string[] {
  return urls.filter((url) => !url.includes(contained.path));
}

export const TAKEDOWN_EVIDENCE_CLASS = "CODE_ONLY" as const;

export function evaluateTakedownPath(input: {
  before_catalog: number;
  after_catalog: number;
  before_sitemap: number;
  after_sitemap: number;
}): CheckResult {
  const removed = input.after_catalog === input.before_catalog - 1 && input.after_sitemap === input.before_sitemap - 1;
  return {
    check: "TakedownPath",
    result: removed ? "PASS" : "FAIL",
    reasons: removed ? ["UNPUBLISH_AND_NOINDEX"] : ["CONTAINMENT_DID_NOT_REMOVE"],
  };
}
