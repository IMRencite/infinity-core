import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { evaluateBlogArticlePreDeployQc } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";

const AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS = new Set(["cam-first-year"]);

function rankOccupancyNpvAutonomousPublishRows(articles: BlogBacklogArticle[]) {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .filter(
      (a) =>
        a.venture === "occupancynpv" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => row.gate.publish_allowed && row.pre.deploy_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
}

export function pickOccupancyNpvAutonomousBacklogCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  return rankOccupancyNpvAutonomousPublishRows(articles)[0]?.article ?? null;
}

export function countBacklogPublishCandidates(articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles()): number {
  return rankOccupancyNpvAutonomousPublishRows(articles).length;
}

export function evaluateOccupancyNpvTargetPrepublishQc(input: {
  path: string;
  articles?: BlogBacklogArticle[];
}): { OCCUPANCYNPV_TARGET_PREPUBLISH_QC: "PASS" | "FAIL"; reasons: string[] } {
  const articles = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const article = articles.find((a) => a.path.replace(/\/+$/, "") === input.path.replace(/\/+$/, ""));
  if (!article) {
    return { OCCUPANCYNPV_TARGET_PREPUBLISH_QC: "FAIL", reasons: ["ARTICLE_NOT_FOUND"] };
  }
  const rendered = buildBacklogRenderedEvidenceMap([article]);
  const gate = evaluateBacklogSourceVNext(article);
  const pre = evaluateBlogArticlePreDeployQc({ article, rendered: rendered[article.path] ?? null });
  const reasons = [...gate.reasons, ...pre.reasons];
  return {
    OCCUPANCYNPV_TARGET_PREPUBLISH_QC:
      gate.publish_allowed && pre.deploy_allowed ? "PASS" : "FAIL",
    reasons,
  };
}
