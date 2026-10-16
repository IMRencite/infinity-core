import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.CT_EVAL_ROOT ?? process.cwd();
process.chdir(root);

async function loadModule<T>(rel: string): Promise<T> {
  const url = pathToFileURL(join(root, rel)).href;
  return import(url) as Promise<T>;
}

async function main() {
  const { listOccupancyClubThrottleBacklogArticles } = await loadModule<typeof import("../lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory")>(
    "lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory.ts",
  );
  const { pickClubThrottleAutonomousBacklogCandidate, rankClubThrottleAutonomousContentRefreshRows } = await loadModule<
    typeof import("../lib/infinity/autonomous-portfolio-operations/portfolio-operating-backlog-publish-v1")
  >("lib/infinity/autonomous-portfolio-operations/portfolio-operating-backlog-publish-v1.ts");
  const { buildBacklogRenderedEvidenceMap } = await loadModule<
    typeof import("../lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence")
  >("lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence.ts");
  const { evaluateBlogArticlePreDeployQc } = await loadModule<
    typeof import("../lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard")
  >("lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard.ts");
  const { evaluateBacklogSourceVNext } = await loadModule<typeof import("../lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory")>(
    "lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory.ts",
  );

  const requiredRel = [
    "lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-after-dark.ts",
    "lib/infinity/organic-growth-engine/continuous/club-throttle-journal.ts",
    "lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence.ts",
    "lib/infinity/organic-growth-engine/continuous/blog-article-media-registry.ts",
    "public/visual/journal-night-ride.svg",
  ];
  const missing = requiredRel.filter((rel) => !existsSync(join(root, rel)));

  const articles = listOccupancyClubThrottleBacklogArticles();
  const ad = articles.find((a) => a.slug === "how-to-ride-after-dark");
  const rendered = ad ? buildBacklogRenderedEvidenceMap([ad]) : {};
  const gate = ad ? evaluateBacklogSourceVNext(ad) : null;
  const pre = ad ? evaluateBlogArticlePreDeployQc({ article: ad, rendered: rendered[ad.path] ?? null }) : null;
  const pick = pickClubThrottleAutonomousBacklogCandidate(articles);
  const refreshCount = rankClubThrottleAutonomousContentRefreshRows(articles).length;

  const out = {
    eval_root: root,
    missing_required_files: missing,
    backlog_has_after_dark: Boolean(ad),
    rendered_evidence_present: Boolean(ad && rendered[ad.path]),
    publish_allowed: gate?.publish_allowed ?? null,
    deploy_allowed: pre?.deploy_allowed ?? null,
    predeploy_reasons: pre?.reasons ?? [],
    picked_candidate: pick?.slug ?? null,
    refresh_lane_ready_count: refreshCount,
  };
  console.log(JSON.stringify(out));
}

void main().catch((e) => {
  console.log(JSON.stringify({ error: String(e.message ?? e), eval_root: process.env.CT_EVAL_ROOT ?? process.cwd() }));
  process.exit(1);
});
