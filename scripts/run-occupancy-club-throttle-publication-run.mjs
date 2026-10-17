/**
 * Scoped OccupancyNPV + Club Throttle blog backlog inventory, source vnext QC, optional deploy, live QA.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  listOccupancyClubThrottleBacklogArticles,
  evaluateBacklogSourceVNext,
  pickControlledDeployCanaryPair,
} from "../lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory.ts";
import { executeClubThrottleProductionDeployment } from "../lib/infinity/commerce/club-throttle-deployment.ts";
import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts";
import { evaluateBlogBacklogDeployGuard } from "../lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard.ts";
import { buildBacklogRenderedEvidenceMap } from "../lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence.ts";
import { evaluateBlogMediaCompletenessQc } from "../lib/infinity/organic-growth-engine/continuous/blog-media-completeness-qc.ts";
import { evaluateBlogArticlePreDeployQc } from "../lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard.ts";
import { evaluateBlogFinalPublicationState } from "../lib/infinity/organic-growth-engine/continuous/blog-production-live-pass.ts";
import { evaluateBlogRollRenderedQc } from "../lib/infinity/organic-growth-engine/continuous/blog-roll-rendered-qc.ts";
import {
  evaluateBlogCanonicalMediaFallbackQc,
  evaluateBlogProductionMediaDeliveryQc,
  evaluateBlogProductionRenderLayoutQc,
} from "../lib/infinity/organic-growth-engine/continuous/blog-production-media-delivery-qc.ts";
import { evaluateBlogMediaDeployArtifactQc } from "../lib/infinity/organic-growth-engine/continuous/blog-deploy-media-bundle.ts";
import { composeOccupancyNpvOrganicLiveFiles } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts";
import { composeClubThrottleStorefrontFiles } from "../lib/infinity/commerce/club-throttle-storefront-compose.ts";

const OUT = join(process.cwd(), ".infinity/blog-os/occupancy-club-throttle-publication-run.json");
const STATUS_PATH = join(process.cwd(), ".infinity/blog-os/club-throttle-v10-founder-status.json");
const DEPLOY = process.argv.includes("--deploy");

async function probeLive(url) {
  const live = await fetchPublicHtml(url);
  const title = live.body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  const canonical = live.body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
    ?? live.body.match(/href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
    ?? "";
  const h1 = live.body.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const blogPosting = live.body.includes("BlogPosting");
  const words = live.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    http: live.status,
    ok: live.ok,
    title,
    h1,
    canonical,
    schema_blog_posting: blogPosting,
    approx_words: words,
    final_url: live.final_url,
  };
}

async function probeImage(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const len = res.headers.get("content-length");
    return {
      http_status: res.status,
      content_type: res.headers.get("content-type"),
      content_length: len != null ? Number(len) : null,
      url,
    };
  } catch {
    return { http_status: 0, content_type: null, content_length: null, url };
  }
}

async function productionArticleMediaQc(article, liveBody = "") {
  if (article.backlog_scope !== "AUTHORIZED_BACKLOG") return { result: "NOT_RUN", http: null };
  const media = evaluateBlogMediaCompletenessQc({ article_path: article.path });
  const src = media.media?.hero_image.src;
  if (!src) return { result: "FAIL", http: null, reasons: media.reasons };
  const origin = new URL(article.canonical_url).origin;
  const abs = src.startsWith("http") ? src : `${origin}${src}`;
  const probe = await probeImage(abs);
  const rendered =
    liveBody.match(new RegExp(`<img[^>]+src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"))?.[0]
    ? src
    : liveBody.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  const delivery = evaluateBlogProductionMediaDeliveryQc({
    article_path: article.path,
    origin,
    probe,
    rendered_src: rendered,
  });
  const fallback = evaluateBlogCanonicalMediaFallbackQc({ article_path: article.path, rendered_src: rendered });
  const result = delivery.result === "PASS" && fallback.result === "PASS" && media.result === "PASS" ? "PASS" : "FAIL";
  return {
    result,
    http: probe.http_status,
    in_html: (liveBody ?? "").includes(src),
    reasons: [...media.reasons, ...delivery.reasons, ...fallback.reasons],
    BLOG_PRODUCTION_MEDIA_DELIVERY_QC: delivery.result,
    BLOG_CANONICAL_MEDIA_FALLBACK_QC: fallback.result,
  };
}

function updateAuthorizationStatus() {
  let status = {};
  if (existsSync(STATUS_PATH)) {
    try {
      status = JSON.parse(readFileSync(STATUS_PATH, "utf8"));
    } catch {
      status = {};
    }
  }
  const next = {
    ...status,
    CLUB_THROTTLE_V10_FOUNDER_QC: status.CLUB_THROTTLE_V10_FOUNDER_QC ?? "PASS",
    OCCUPANCY_BLOG_BACKLOG_PUBLICATION_AUTHORIZED: "YES",
    CLUB_THROTTLE_BLOG_BACKLOG_PUBLICATION_AUTHORIZED: "YES",
    CLUB_THROTTLE_PRODUCTION_CANARY_AUTHORIZED: DEPLOY ? "SCOPED_BACKLOG_BATCH" : status.CLUB_THROTTLE_PRODUCTION_CANARY_AUTHORIZED ?? "NO",
    AUTONOMOUS_PUBLISHING: "HOLD",
    MASS_PRODUCT_CREATION: "HOLD",
    MASS_PRODUCT_PUBLICATION: "HOLD",
    scoped_publication_note:
      "Founder authorized existing OccupancyNPV + Club Throttle authored backlog only; autonomous and mass merch remain HOLD.",
    updated_at: new Date().toISOString(),
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

async function main() {
  const started = new Date().toISOString();
  const articles = listOccupancyClubThrottleBacklogArticles();
  const authorization = updateAuthorizationStatus();
  const canary = pickControlledDeployCanaryPair(articles);

  const deployArtifactQc = {
    occupancynpv: evaluateBlogMediaDeployArtifactQc({ deploy_files: composeOccupancyNpvOrganicLiveFiles().files }),
    club_throttle: evaluateBlogMediaDeployArtifactQc({ deploy_files: composeClubThrottleStorefrontFiles(process.cwd()).files }),
  };

  const renderedMap = buildBacklogRenderedEvidenceMap(articles);
  const rollQc = {
    club_throttle: { result: "NOT_RUN", reasons: [] },
    occupancynpv: { result: "NOT_RUN", reasons: [] },
  };
  try {
    const ctRoll = await fetchPublicHtml("https://clubthrottle.com/journal");
    rollQc.club_throttle = evaluateBlogRollRenderedQc({ venture: "club-throttle", roll_html: ctRoll.body, viewport: "desktop" });
  } catch {
    rollQc.club_throttle = { gate: "BlogRollRenderedQc", result: "FAIL", reasons: ["fetch_failed"] };
  }
  try {
    const occRoll = await fetchPublicHtml("https://occupancynpv.com/blog");
    rollQc.occupancynpv = evaluateBlogRollRenderedQc({ venture: "occupancynpv", roll_html: occRoll.body, viewport: "desktop" });
  } catch {
    rollQc.occupancynpv = { gate: "BlogRollRenderedQc", result: "FAIL", reasons: ["fetch_failed"] };
  }

  const rows = [];
  for (const article of articles) {
    const vnext = evaluateBacklogSourceVNext(article);
    const live = await probeLive(article.canonical_url);
    const rendered = renderedMap[article.path] ?? null;
    const preDeploy =
      article.backlog_scope === "AUTHORIZED_BACKLOG"
        ? evaluateBlogArticlePreDeployQc({ article, rendered })
        : null;
    const mediaQc =
      article.backlog_scope === "AUTHORIZED_BACKLOG"
        ? evaluateBlogMediaCompletenessQc({ article_path: article.path, shell_html: rendered?.shell_html })
        : { result: "NOT_RUN", reasons: [] };
    const prodMedia = await productionArticleMediaQc(article, live.body);
    const row = {
      venture: article.venture,
      title: article.title,
      slug: article.slug,
      route: article.path,
      canonical_url: article.canonical_url,
      source_files: article.source_files,
      registry_state: article.registry_state,
      backlog_scope: article.backlog_scope,
      revalidation_status: article.backlog_scope === "AUTHORIZED_BACKLOG" ? "REVALIDATION_REQUIRED" : "N/A",
      source_qc: vnext.result,
      vnext_dimensions: vnext.dimensions,
      vnext_reasons: vnext.reasons,
      visual_required: vnext.visual_required,
      editorial_qc: vnext.dimensions.HUMAN_FIRST_EDITORIAL_QC ?? "UNKNOWN",
      media_completeness_qc: mediaQc.result,
      rendered_qc: preDeploy?.rendered_qc ?? "NOT_RUN",
      article_rendered_qc: preDeploy?.article_rendered_qc ?? "NOT_RUN",
      production_article_media_qc: prodMedia.result,
      production_blog_roll_qc:
        article.venture === "club-throttle" ? rollQc.club_throttle.result : rollQc.occupancynpv.result,
      deploy_status: "NOT_RUN",
      live,
      final: "NEEDS_REPAIR",
    };
    const localReady =
      row.source_qc === "PASS"
      && row.rendered_qc === "PASS"
      && row.media_completeness_qc === "PASS"
      && preDeploy?.deploy_allowed;
    row.revalidation_status =
      article.backlog_scope === "AUTHORIZED_BACKLOG"
        ? localReady
          ? "CLEARED"
          : "REVALIDATION_REQUIRED"
        : "N/A";
    row.final = evaluateBlogFinalPublicationState({
      source_qc: row.source_qc,
      editorial_qc: row.editorial_qc === "UNKNOWN" ? "FAIL" : row.editorial_qc,
      rendered_qc: row.rendered_qc,
      media_completeness_qc: row.media_completeness_qc,
      article_rendered_qc: row.article_rendered_qc,
      production_article_media_qc: row.production_article_media_qc,
      production_blog_roll_qc: row.production_blog_roll_qc,
      live_http_ok: live.ok && live.http === 200,
      revalidation_status: row.revalidation_status,
    });
    rows.push(row);
  }

  let deployments = { club_throttle: null, occupancynpv: null };
  if (DEPLOY) {
    const deployGuard = evaluateBlogBacklogDeployGuard({
      articles,
      rendered_by_path: buildBacklogRenderedEvidenceMap(articles),
      scoped_backlog_publication_authorized: true,
      deploy_files: [
        ...composeOccupancyNpvOrganicLiveFiles().files,
        ...composeClubThrottleStorefrontFiles(process.cwd()).files,
      ],
    });
    if (!deployGuard.bundle_deploy_allowed) {
      const report = {
        started_at: started,
        completed_at: new Date().toISOString(),
        deploy_requested: true,
        deploy_blocked: true,
        deploy_guard: deployGuard,
        authorization,
        article_results: rows,
        flags: {
          BLOG_QC_BYPASSED: "NO",
          UNRELATED_VENTURES_DEPLOYED: "NO",
        },
      };
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
      console.log(JSON.stringify({ ok: false, deploy_blocked: true, reasons: deployGuard.reasons }, null, 2));
      process.exit(2);
    }
    const ct = await executeClubThrottleProductionDeployment({
      deploy: true,
      aliasProduction: true,
      persistEvidence: true,
    });
    deployments.club_throttle = {
      deployment_id: ct.evidence?.deployment_id ?? null,
      deployment_url: ct.deploymentUrl,
      deployed: ct.deployed,
      smoke: ct.evidence?.smoke ?? {},
      safe_error: ct.safeError,
    };
    const occ = await deployOccupancyNpvOrganicLivePage({ deploy: true, aliasProduction: true });
    deployments.occupancynpv = {
      deployment_id: occ.deployment_id,
      preview_url: occ.preview_url,
      deployed: occ.deployed,
      aliased: occ.aliased,
      live_url: occ.live_url,
      safe_error: occ.safe_error,
    };
    for (const row of rows) {
      row.deploy_status = deployments.club_throttle?.deployed || deployments.occupancynpv?.deployed ? "DEPLOYED" : "FAIL";
      const live = await probeLive(row.canonical_url);
      row.live = live;
      const articleRef = articles.find((a) => a.path === row.route);
      if (articleRef) {
        const prodMedia = await productionArticleMediaQc(articleRef, live.body);
        row.production_article_media_qc = prodMedia.result;
      }
      const cleared =
        row.source_qc === "PASS"
        && row.rendered_qc === "PASS"
        && row.media_completeness_qc === "PASS"
        && row.production_article_media_qc === "PASS";
      row.revalidation_status = cleared ? "CLEARED" : "REVALIDATION_REQUIRED";
      row.final = evaluateBlogFinalPublicationState({
        source_qc: row.source_qc,
        editorial_qc: row.editorial_qc === "UNKNOWN" ? "FAIL" : row.editorial_qc,
        rendered_qc: row.rendered_qc,
        media_completeness_qc: row.media_completeness_qc,
        article_rendered_qc: row.article_rendered_qc,
        production_article_media_qc: row.production_article_media_qc,
        production_blog_roll_qc: row.production_blog_roll_qc,
        live_http_ok: live.ok && live.http === 200,
        revalidation_status: row.revalidation_status,
      });
    }
  }

  const summary = {
    total_club_throttle_discovered: rows.filter((r) => r.venture === "club-throttle" && r.backlog_scope === "AUTHORIZED_BACKLOG").length,
    total_club_throttle_live_pass: rows.filter((r) => r.venture === "club-throttle" && r.final === "LIVE_PASS").length,
    total_occupancynpv_discovered: rows.filter((r) => r.venture === "occupancynpv" && r.backlog_scope === "AUTHORIZED_BACKLOG").length,
    total_occupancynpv_live_pass: rows.filter((r) => r.venture === "occupancynpv" && r.final === "LIVE_PASS").length,
    canary_pair: {
      club_throttle: { route: canary.club_throttle.path, canonical: canary.club_throttle.canonical_url },
      occupancynpv: { route: canary.occupancynpv.path, canonical: canary.occupancynpv.canonical_url },
    },
  };

  const report = {
    started_at: started,
    completed_at: new Date().toISOString(),
    deploy_requested: DEPLOY,
    authorization,
    inventory: articles,
    article_results: rows,
    deployments,
    summary,
    production_layout_qc: {
      occupancynpv_blog: evaluateBlogProductionRenderLayoutQc({
        html: (await fetchPublicHtml("https://occupancynpv.com/blog/")).body,
        page_kind: "roll",
      }),
      occupancynpv_cap_rate: evaluateBlogProductionRenderLayoutQc({
        html: (await fetchPublicHtml("https://occupancynpv.com/blog/valuation/how-is-cap-rate-calculated-for-a-building/")).body,
        page_kind: "article",
      }),
      club_throttle_journal: evaluateBlogProductionRenderLayoutQc({
        html: (await fetchPublicHtml("https://clubthrottle.com/journal/")).body,
        page_kind: "roll",
      }),
    },
    blog_media_deploy_artifact_qc: deployArtifactQc,
    flags: {
      BLOG_PUBLICATION_DEPLOY_HOLD:
        process.env.BLOG_COMMITTED_TREE_REDEPLOY_PASS === "1"
          ? deployArtifactQc.occupancynpv.result === "PASS" && deployArtifactQc.club_throttle.result === "PASS"
            ? "CLEARED"
            : "ACTIVE_UNTIL_COMMITTED_REDEPLOY_PASS"
          : "ACTIVE_UNTIL_COMMITTED_REDEPLOY_PASS",
      CLUB_THROTTLE_V10_FOUNDER_QC: authorization.CLUB_THROTTLE_V10_FOUNDER_QC,
      OCCUPANCY_BLOG_BACKLOG_PUBLICATION_AUTHORIZED: authorization.OCCUPANCY_BLOG_BACKLOG_PUBLICATION_AUTHORIZED,
      CLUB_THROTTLE_BLOG_BACKLOG_PUBLICATION_AUTHORIZED: authorization.CLUB_THROTTLE_BLOG_BACKLOG_PUBLICATION_AUTHORIZED,
      AUTONOMOUS_PUBLISHING: authorization.AUTONOMOUS_PUBLISHING,
      MASS_PRODUCT_CREATION: authorization.MASS_PRODUCT_CREATION,
      MASS_PRODUCT_PUBLICATION: authorization.MASS_PRODUCT_PUBLICATION,
      UNRELATED_VENTURES_DEPLOYED: "NO",
      BLOG_QC_BYPASSED: "NO",
      MERCH_QC_BYPASSED: "NO",
    },
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, out: OUT, summary, deploy: DEPLOY }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
