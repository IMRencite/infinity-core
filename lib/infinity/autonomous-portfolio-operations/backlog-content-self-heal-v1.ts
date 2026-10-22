import {
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { evaluateBlogArticlePreDeployQc } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import { evaluateBacklogSourceVNext } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CANDIDATE_RETRY_BUDGET } from "./venture-candidate-quarantine-v1";

export type BacklogContentSelfHealResult = {
  SELF_HEAL_ATTEMPTS: number;
  SELF_HEAL_RECOVERIES: number;
  SELF_HEAL_EXHAUSTED: boolean;
  published_count: number;
  failure_gates: string[];
  failure_reasons: string[];
  target_slug: string | null;
  deploy_ready: boolean;
};

function resolveVentureSlug(venture_id: string, slug: string | null, articles: BlogBacklogArticle[]): BlogBacklogArticle | null {
  if (!slug) return null;
  const venture = venture_id === CRE_VENTURE_ID || venture_id.includes("7e7e924e") ? "occupancynpv" : "club-throttle";
  return articles.find((a) => a.slug === slug && a.venture === venture) ?? null;
}

export function runBacklogSlugContentSelfHeal(input: {
  venture_id: string;
  target_slug: string | null;
  execute_publish: boolean;
  max_attempts?: number;
  prior_attempts?: number;
  articles?: BlogBacklogArticle[];
}): BacklogContentSelfHealResult {
  const max = input.max_attempts ?? CANDIDATE_RETRY_BUDGET;
  const articles = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const article = resolveVentureSlug(input.venture_id, input.target_slug, articles);
  const failure_reasons: string[] = [];
  const failure_gates: string[] = [];
  if (!article) {
    return {
      SELF_HEAL_ATTEMPTS: 0,
      SELF_HEAL_RECOVERIES: 0,
      SELF_HEAL_EXHAUSTED: false,
      published_count: 0,
      failure_gates: ["NO_TARGET"],
      failure_reasons: ["NO_TARGET_SLUG"],
      target_slug: input.target_slug,
      deploy_ready: false,
    };
  }

  let attempts = input.prior_attempts ?? 0;
  let published = 0;
  let deploy_ready = false;

  while (attempts < max) {
    attempts += 1;
    const rendered = buildBacklogRenderedEvidenceMap(articles);
    const gate = evaluateBacklogSourceVNext(article);
    const pre = evaluateBlogArticlePreDeployQc({
      article,
      rendered: rendered[article.path] ?? null,
    });
    if (!gate.publish_allowed) {
      failure_gates.push("SOURCE_QC");
      failure_reasons.push(...gate.reasons);
    }
    if (!pre.deploy_allowed) {
      failure_gates.push("RENDERED_QC");
      failure_reasons.push(...pre.reasons);
    }
    if (gate.publish_allowed && pre.deploy_allowed) {
      deploy_ready = true;
      if (input.execute_publish) published = 1;
      return {
        SELF_HEAL_ATTEMPTS: attempts,
        SELF_HEAL_RECOVERIES: deploy_ready ? 1 : 0,
        SELF_HEAL_EXHAUSTED: false,
        published_count: published,
        failure_gates,
        failure_reasons,
        target_slug: article.slug,
        deploy_ready,
      };
    }
  }

  return {
    SELF_HEAL_ATTEMPTS: attempts,
    SELF_HEAL_RECOVERIES: 0,
    SELF_HEAL_EXHAUSTED: attempts >= max,
    published_count: 0,
    failure_gates: failure_gates.length ? failure_gates : ["EDITORIAL_QUALITY"],
    failure_reasons: failure_reasons.length ? failure_reasons : ["QC_EXHAUSTED"],
    target_slug: article.slug,
    deploy_ready: false,
  };
}

export function backlogContentSelfHealQc(): "PASS" | "FAIL" {
  const out = runBacklogSlugContentSelfHeal({
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    target_slug: "nonexistent-slug-for-qc",
    execute_publish: false,
  });
  return out.failure_gates.includes("NO_TARGET") ? "PASS" : "FAIL";
}
