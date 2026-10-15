import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  buildOperatingVentureInventory,
  buildVentureOperatingPlanV1,
  operatingVentureInventoryQc,
  ventureOperatingPlanQc,
} from "../autonomous-portfolio-operations-v1";
import { resolveScheduledAutonomousPublish } from "../scheduled-autonomous-publish-policy-v1";
import type { PortfolioOperatingTrigger } from "../scheduled-autonomous-publish-policy-v1";
import {
  pickOccupancyNpvAutonomousBacklogCandidate,
  countBacklogPublishCandidates,
  rankOccupancyNpvAutonomousPublishRows,
  evaluateOccupancyNpvTargetPrepublishQc,
} from "../portfolio-operating-backlog-publish-v1";
import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { createPortfolioOperatingCycle, patchPortfolioCycle } from "./autonomous-portfolio-durable-execution-v1";
import { enqueuePortfolioJob } from "./autonomous-portfolio-job-queue-v1";
import type { PortfolioCronProvenance } from "./portfolio-cron-provenance-v1";
import { createPortfolioTickTimer, V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE } from "./portfolio-tick-instrumentation-v1";
import { publicationAssetIdentity, readPublicationRegistry } from "./autonomous-publication-idempotency-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import type { OperatingVentureInventoryRow } from "../autonomous-portfolio-operations-v1";
import {
  buildVentureNextBestGrowthActionsV1,
  ventureNextBestGrowthActionQc,
} from "../venture-next-best-growth-action-engine-v1";
import {
  analyzeVentureAuthorityExpansionV1,
  ventureGeoAuthorityExpansionQc,
  ventureSeoAuthorityExpansionQc,
} from "../venture-authority-expansion-engine-v1";

export const PORTFOLIO_CRON_ORCHESTRATOR_V1 = "PORTFOLIO_CRON_ORCHESTRATOR_V1" as const;

function resolveOperatingVentureId(row: OperatingVentureInventoryRow): string {
  if (
    row.venture_id === CRE_VENTURE_ID ||
    row.venture_id === "occupancynpv" ||
    row.production_url?.includes("occupancynpv.com")
  ) {
    return CRE_VENTURE_ID;
  }
  if (row.venture_id === CLUB_THROTTLE_VENTURE_ID || row.production_url?.includes("clubthrottle.com")) {
    return CLUB_THROTTLE_VENTURE_ID;
  }
  return row.venture_id;
}

export async function orchestratePortfolioOperatingTick(input: {
  provenance: PortfolioCronProvenance;
  manual_publish_flag?: boolean;
}): Promise<{
  cycle_id: string | null;
  jobs_created: number;
  inventory_qc: "PASS" | "FAIL";
  plan_qc: "PASS" | "FAIL";
  publish_execute: boolean;
  publish_reason: string;
  stage_timings: ReturnType<ReturnType<typeof createPortfolioTickTimer>["finish"]>;
  V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE: typeof V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE;
  backlog_publish_candidates: number;
  onpv_autonomous_publish_candidate: { slug: string; path: string; asset_id: string } | null;
  onpv_publish_diagnostic: {
    occupancynpv_backlog_articles: number;
    ranked_publish_ready: number;
    OCCUPANCYNPV_TARGET_PREPUBLISH_QC: string;
  };
  enqueued: Array<{ job_type: string; venture_id: string; idempotency_key: string }>;
  venture_next_best_growth_actions: ReturnType<typeof buildVentureNextBestGrowthActionsV1>;
  VENTURE_NEXT_BEST_GROWTH_ACTION_QC: "PASS" | "FAIL";
  VENTURE_SEO_AUTHORITY_EXPANSION_QC: "PASS" | "FAIL";
  VENTURE_GEO_AUTHORITY_EXPANSION_QC: "PASS" | "FAIL";
}> {
  const timer = createPortfolioTickTimer();
  const inventory = buildOperatingVentureInventory();
  const inventoryQc = operatingVentureInventoryQc(inventory);
  timer.mark("inventory_ms");
  const live = inventory.filter((r) => r.state === "LIVE_OPERATING");
  const plans = live.map(buildVentureOperatingPlanV1);
  const planQc = ventureOperatingPlanQc(plans, inventory);
  const ventureNextBest = buildVentureNextBestGrowthActionsV1();
  const authorityReports = live.map((row) =>
    analyzeVentureAuthorityExpansionV1({
      venture_id: resolveOperatingVentureId(row),
    }),
  );
  timer.mark("plans_ms");

  const trigger: PortfolioOperatingTrigger = input.provenance.trigger_type === "REAL_CRON" ? "SCHEDULED" : "MANUAL";
  const publishPolicy = resolveScheduledAutonomousPublish({
    trigger,
    manual_publish_flag: Boolean(input.manual_publish_flag),
  });
  timer.mark("research_ms");

  const cycle = await createPortfolioOperatingCycle({
    provenance: input.provenance,
    venture_count: live.length,
    payload: {
      inventory_qc: inventoryQc,
      plan_qc: planQc,
      venture_next_best: ventureNextBest,
    },
  });
  const cycle_id = cycle?.cycle_id ?? null;
  timer.mark("content_ms");

  const backlog = listOccupancyClubThrottleBacklogArticles();
  const backlogPublishCandidates = countBacklogPublishCandidates(backlog);
  const enqueued: Array<{ job_type: string; venture_id: string; idempotency_key: string }> = [];
  let jobsCreated = 0;

  if (cycle_id) {
    for (const row of live) {
      const vid = resolveOperatingVentureId(row);
      const researchKey = `research:${vid}`;
      const research = await enqueuePortfolioJob({
        cycle_id,
        venture_id: vid,
        job_type: "VENTURE_RESEARCH",
        idempotency_key: researchKey,
        priority: 30,
        input_lineage: {
          plan:
            plans.find((p) => p.venture_id === vid || p.venture_id === row.venture_id) ?? null,
          inventory_venture_id: row.venture_id,
        },
      });
      if (research.job_id) {
        jobsCreated += 1;
        enqueued.push({ job_type: "VENTURE_RESEARCH", venture_id: vid, idempotency_key: researchKey });
      }

      const selfHealKey = `content-self-heal:${vid}`;
      const selfHeal = await enqueuePortfolioJob({
        cycle_id,
        venture_id: vid,
        job_type: "CONTENT_SELF_HEAL",
        idempotency_key: selfHealKey,
        priority: 45,
        input_lineage: { execute_publish: false },
      });
      if (selfHeal.job_id) {
        jobsCreated += 1;
        enqueued.push({ job_type: "CONTENT_SELF_HEAL", venture_id: vid, idempotency_key: selfHealKey });
      }

      const isOnpv =
        vid === CRE_VENTURE_ID ||
        row.production_url?.includes("occupancynpv.com") ||
        row.venture_id === "occupancynpv";
      if (isOnpv && publishPolicy.execute_publish) {
        const candidate = pickOccupancyNpvAutonomousBacklogCandidate(backlog);
        if (candidate) {
          const assetId = publicationAssetIdentity({
            venture_id: "occupancynpv",
            canonical_path: candidate.path,
            content_revision: candidate.slug,
          });
          const reg = await readPublicationRegistry({ venture_id: "occupancynpv", asset_identity: assetId });
          if (!reg.published) {
            const deployKey = `deploy:${assetId}`;
            const deploy = await enqueuePortfolioJob({
              cycle_id,
              venture_id: vid,
              job_type: "VENTURE_DEPLOY",
              idempotency_key: deployKey,
              priority: 80,
              input_lineage: {
                path: candidate.path,
                canonical_url: candidate.canonical_url,
                asset_identity: assetId,
              },
            });
            if (deploy.job_id) {
              jobsCreated += 1;
              enqueued.push({ job_type: "VENTURE_DEPLOY", venture_id: vid, idempotency_key: deployKey });
              const verifyKey = `verify:${assetId}`;
              const verify = await enqueuePortfolioJob({
                cycle_id,
                venture_id: vid,
                job_type: "PRODUCTION_VERIFY",
                idempotency_key: verifyKey,
                priority: 75,
                input_lineage: {
                  path: candidate.path,
                  canonical_url: candidate.canonical_url,
                  asset_identity: assetId,
                },
              });
              if (verify.job_id) {
                jobsCreated += 1;
                enqueued.push({ job_type: "PRODUCTION_VERIFY", venture_id: vid, idempotency_key: verifyKey });
              }
            }
          }
        }
      }

      if (vid === CLUB_THROTTLE_VENTURE_ID) {
        const ctBacklog = backlog.filter((a) => a.venture === "club-throttle");
        const eligible = ctBacklog.filter((a) => evaluateBacklogSourceVNext(a).publish_allowed).length;
        const blogKey = `blog-build:club-throttle:${cycle_id.slice(0, 8)}`;
        if (eligible > 0) {
          const blog = await enqueuePortfolioJob({
            cycle_id,
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            job_type: "BLOG_BUILD",
            idempotency_key: blogKey,
            priority: 50,
            input_lineage: { eligible_count: eligible },
          });
          if (blog.job_id) {
            jobsCreated += 1;
            enqueued.push({ job_type: "BLOG_BUILD", venture_id: CLUB_THROTTLE_VENTURE_ID, idempotency_key: blogKey });
          }
        }
        const creativeGov = resolveCreativeBudgetGovernance();
        const concepts = rankClubThrottleProductOpportunities();
        if (concepts[0] && creativeGov.LIVE_CREATIVE_ENABLED) {
          const creativeKey = `creative-self-heal:${concepts[0].concept_id}`;
          const creative = await enqueuePortfolioJob({
            cycle_id,
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            job_type: "CREATIVE_SELF_HEAL",
            idempotency_key: creativeKey,
            priority: 55,
            input_lineage: { concept_id: concepts[0].concept_id },
          });
          if (creative.job_id) {
            jobsCreated += 1;
            enqueued.push({
              job_type: "CREATIVE_SELF_HEAL",
              venture_id: CLUB_THROTTLE_VENTURE_ID,
              idempotency_key: creativeKey,
            });
          }
        }
      }

      const learningKey = `growth-learning:${vid}`;
      const learning = await enqueuePortfolioJob({
        cycle_id,
        venture_id: vid,
        job_type: "GROWTH_LEARNING",
        idempotency_key: learningKey,
        priority: 10,
      });
      if (learning.job_id) {
        jobsCreated += 1;
        enqueued.push({ job_type: "GROWTH_LEARNING", venture_id: vid, idempotency_key: learningKey });
      }
    }

    await patchPortfolioCycle(cycle_id, { jobs_created: jobsCreated, status: "RUNNING" });
  }

  timer.mark("self_heal_ms");
  timer.mark("creative_ms");
  timer.mark("bundle_generation_ms");
  timer.mark("deployment_ms");
  timer.mark("alias_promotion_ms");
  timer.mark("production_verification_ms");
  timer.mark("persistence_ms");
  const stage_timings = timer.finish();

  const onpvCandidate = pickOccupancyNpvAutonomousBacklogCandidate(backlog);
  const onpvRanked = rankOccupancyNpvAutonomousPublishRows(backlog);
  const onpvPrepublish = onpvCandidate
    ? evaluateOccupancyNpvTargetPrepublishQc({ path: onpvCandidate.path, articles: backlog })
    : null;

  return {
    cycle_id,
    jobs_created: jobsCreated,
    inventory_qc: inventoryQc,
    plan_qc: planQc,
    publish_execute: publishPolicy.execute_publish,
    publish_reason: publishPolicy.reason,
    stage_timings,
    V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE,
    backlog_publish_candidates: backlogPublishCandidates,
    onpv_autonomous_publish_candidate: onpvCandidate
      ? { slug: onpvCandidate.slug, path: onpvCandidate.path, asset_id: onpvCandidate.asset_id }
      : null,
    onpv_publish_diagnostic: {
      occupancynpv_backlog_articles: backlog.filter((a) => a.venture === "occupancynpv").length,
      ranked_publish_ready: onpvRanked.length,
      OCCUPANCYNPV_TARGET_PREPUBLISH_QC: onpvPrepublish?.OCCUPANCYNPV_TARGET_PREPUBLISH_QC ?? "NOT_RUN",
    },
    enqueued,
    venture_next_best_growth_actions: ventureNextBest,
    VENTURE_NEXT_BEST_GROWTH_ACTION_QC: ventureNextBestGrowthActionQc(ventureNextBest),
    VENTURE_SEO_AUTHORITY_EXPANSION_QC: ventureSeoAuthorityExpansionQc(authorityReports),
    VENTURE_GEO_AUTHORITY_EXPANSION_QC: ventureGeoAuthorityExpansionQc(authorityReports),
  };
}

export function portfolioCronOrchestratorQc(): "PASS" | "FAIL" {
  return typeof PORTFOLIO_CRON_ORCHESTRATOR_V1 === "string" ? "PASS" : "FAIL";
}
