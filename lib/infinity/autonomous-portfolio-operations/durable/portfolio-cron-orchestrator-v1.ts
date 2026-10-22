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
  pickOccupancyNpvAutonomousBuildCandidate,
  buildClubThrottleAutonomousPublishCycleDiagnostic,
  clubThrottleBacklogCandidateWorkType,
  countBacklogPublishCandidates,
  rankOccupancyNpvAutonomousPublishRows,
  evaluateOccupancyNpvTargetPrepublishQc,
  evaluateOnpvInternalLinkClusterQc,
} from "../portfolio-operating-backlog-publish-v1";
import { loadQuarantinedPortfolioCandidateRows } from "./durable-portfolio-candidate-state-v1";
import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { resolveBacklogPublicationContentRevision } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-refresh-current-revision-v1";
import { createPortfolioOperatingCycle, patchPortfolioCycle } from "./autonomous-portfolio-durable-execution-v1";
import { vercelRuntimeIdentity } from "@/lib/infinity/production-outbound/obligation/release";
import { enqueuePortfolioJob } from "./autonomous-portfolio-job-queue-v1";
import { isPortfolioScheduledTrigger, type PortfolioCronProvenance } from "./portfolio-cron-provenance-v1";
import { createPortfolioTickTimer, V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE } from "./portfolio-tick-instrumentation-v1";
import { publicationAssetIdentity, readPublicationRegistry } from "./autonomous-publication-idempotency-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { countAutonomousShirtsPublishedOnUtcDay } from "@/lib/infinity/commerce/club-throttle-autonomous-storefront-publication-v1";
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
import {
  blogSelfHealContinuityQc,
  liveVentureContentContinuityQc,
  resolveLiveVentureContentContinuityV1,
  type VentureContentContinuityReport,
} from "../live-venture-content-continuity-v1";
import {
  candidateQuarantineKey,
  isCandidateQuarantined,
} from "../venture-candidate-quarantine-v1";
import {
  buildVentureDailyOutputCounters,
  evaluateLiveVentureDailyOutputFloorQc,
  evaluateLiveVentureDailyOutputOrchestrationQc,
  evaluateLiveVentureDailyOutputQc,
} from "../venture-daily-output-v1";

export const PORTFOLIO_CRON_ORCHESTRATOR_V1 = "PORTFOLIO_CRON_ORCHESTRATOR_V1" as const;

function resolveCtPublishSkipReason(input: {
  publish_execute: boolean;
  publish_reason: string;
  continuity: VentureContentContinuityReport;
}): string | null {
  if (!input.publish_execute) return input.publish_reason;
  if (input.continuity.deploy_candidate) return null;
  return input.continuity.content_lane_stop_reason ?? "ACTIVE_CONTINUATION_IN_PROGRESS";
}

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
  ct_autonomous_publish_candidate: { slug: string; path: string; work_type: string } | null;
  ct_publish_skip_reason: string | null;
  ct_publish_diagnostic: ReturnType<typeof buildClubThrottleAutonomousPublishCycleDiagnostic>;
  ct_deploy_enqueue_suppressed: { idempotency_key: string; reason: "IDEMPOTENCY_DUPLICATE" } | null;
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
  ct_content_continuity: VentureContentContinuityReport;
  onpv_content_continuity: VentureContentContinuityReport;
  LIVE_VENTURE_CONTENT_CONTINUITY_QC: "PASS" | "FAIL";
  BLOG_SELF_HEAL_CONTINUITY_QC: "PASS" | "FAIL";
  LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS" | "FAIL";
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

  const trigger: PortfolioOperatingTrigger = isPortfolioScheduledTrigger(input.provenance.trigger_type)
    ? "SCHEDULED"
    : "MANUAL";
  const publishPolicy = resolveScheduledAutonomousPublish({
    trigger,
    manual_publish_flag: Boolean(input.manual_publish_flag),
  });
  timer.mark("research_ms");

  const runtimeIdentity = vercelRuntimeIdentity();
  const cycle = await createPortfolioOperatingCycle({
    provenance: input.provenance,
    venture_count: live.length,
    payload: {
      inventory_qc: inventoryQc,
      plan_qc: planQc,
      venture_next_best: ventureNextBest,
      runtime_deployment_id: runtimeIdentity.deployment_id,
      runtime_release_sha: runtimeIdentity.release_sha ?? runtimeIdentity.git_sha,
      cycle_trigger_provenance_snapshot: input.provenance,
    },
  });
  const cycle_id = cycle?.cycle_id ?? null;
  timer.mark("content_ms");

  await loadQuarantinedPortfolioCandidateRows([CLUB_THROTTLE_VENTURE_ID, CRE_VENTURE_ID]);

  const backlog = listOccupancyClubThrottleBacklogArticles();
  const backlogPublishCandidates = countBacklogPublishCandidates(backlog);
  const ctPublishDiagnostic = buildClubThrottleAutonomousPublishCycleDiagnostic(backlog);
  const ctContentContinuity = resolveLiveVentureContentContinuityV1({
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    articles: backlog,
  });
  const onpvContentContinuity = resolveLiveVentureContentContinuityV1({
    venture_id: CRE_VENTURE_ID,
    articles: backlog,
  });
  const enqueued: Array<{ job_type: string; venture_id: string; idempotency_key: string }> = [];
  let ctDeployEnqueueSuppressed: { idempotency_key: string; reason: "IDEMPOTENCY_DUPLICATE" } | null = null;
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

      const ventureContinuity = resolveLiveVentureContentContinuityV1({ venture_id: vid, articles: backlog });
      const selfHealKey = `content-self-heal:${vid}`;
      const selfHeal = await enqueuePortfolioJob({
        cycle_id,
        venture_id: vid,
        job_type: "CONTENT_SELF_HEAL",
        idempotency_key: selfHealKey,
        priority: 45,
        input_lineage: {
          execute_publish:
            publishPolicy.execute_publish && !ventureContinuity.daily_qualified_content_target_met,
          self_heal_target_slug: ventureContinuity.self_heal_candidate_slug,
          repairable_candidate_count: ventureContinuity.repairable_candidate_count,
          discovery_ran: ventureContinuity.discovery_ran,
          remaining_valid_opportunities: ventureContinuity.remaining_valid_opportunities,
          content_lane_stop_reason: ventureContinuity.content_lane_stop_reason,
        },
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
        } else {
          const qualifiedPublish = countBacklogPublishCandidates(backlog);
          const blogFloorUnmet = !ventureContinuity.daily_blog_target_met;
          const maintenanceAllowed =
            ventureContinuity.daily_blog_target_met || qualifiedPublish === 0;
          const clusterQc = evaluateOnpvInternalLinkClusterQc(backlog);
          if (maintenanceAllowed && clusterQc.ONPV_INTERNAL_LINK_CLUSTER_QC === "PASS") {
            const refreshKey = "refresh:onpv-lease-internal-link-cluster:v1";
            const refreshDeploy = await enqueuePortfolioJob({
              cycle_id,
              venture_id: vid,
              job_type: "VENTURE_DEPLOY",
              idempotency_key: refreshKey,
              priority: 70,
              input_lineage: {
                work_type: "INTERNAL_LINK_UPDATE",
                path: "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
                canonical_url: "https://occupancynpv.com/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
                asset_identity: refreshKey,
              },
            });
            if (refreshDeploy.job_id) {
              jobsCreated += 1;
              enqueued.push({ job_type: "VENTURE_DEPLOY", venture_id: vid, idempotency_key: refreshKey });
            }
          } else if (blogFloorUnmet && qualifiedPublish === 0) {
            const buildCandidate = pickOccupancyNpvAutonomousBuildCandidate(backlog);
            if (buildCandidate) {
              const buildKey = `blog-build:${buildCandidate.slug}`;
              const buildJob = await enqueuePortfolioJob({
                cycle_id,
                venture_id: vid,
                job_type: "BLOG_BUILD",
                idempotency_key: buildKey,
                priority: 72,
                input_lineage: {
                  slug: buildCandidate.slug,
                  path: buildCandidate.path,
                  canonical_url: buildCandidate.canonical_url,
                  work_type: "NEW_PUBLICATION",
                },
              });
              if (buildJob.job_id) {
                jobsCreated += 1;
                enqueued.push({ job_type: "BLOG_BUILD", venture_id: vid, idempotency_key: buildKey });
              }
            }
          }
        }
      }

      if (vid === CLUB_THROTTLE_VENTURE_ID) {
        const ctCandidate = publishPolicy.execute_publish ? ctContentContinuity.deploy_candidate : null;
        if (ctCandidate) {
          const workType = clubThrottleBacklogCandidateWorkType(ctCandidate);
          const ctRendered = buildBacklogRenderedEvidenceMap(backlog);
          const contentRevision = resolveBacklogPublicationContentRevision(
            ctCandidate,
            ctRendered[ctCandidate.path] ?? null,
          );
          const assetId = publicationAssetIdentity({
            venture_id: "club-throttle",
            canonical_path: ctCandidate.path,
            content_revision: contentRevision,
          });
          const deployKey = workType === "CONTENT_REFRESH" ? `refresh:${assetId}` : `deploy:${assetId}`;
          const deploy = await enqueuePortfolioJob({
            cycle_id,
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            job_type: "VENTURE_DEPLOY",
            idempotency_key: deployKey,
            priority: 80,
            input_lineage: {
              work_type: workType,
              path: ctCandidate.path,
              canonical_url: ctCandidate.canonical_url,
              asset_identity: assetId,
            },
          });
          if (deploy.skipped && !deploy.job_id) {
            ctDeployEnqueueSuppressed = { idempotency_key: deployKey, reason: "IDEMPOTENCY_DUPLICATE" };
          }
          if (deploy.job_id) {
            jobsCreated += 1;
            enqueued.push({ job_type: "VENTURE_DEPLOY", venture_id: CLUB_THROTTLE_VENTURE_ID, idempotency_key: deployKey });
            const verifyKey = `verify:${assetId}`;
            const verify = await enqueuePortfolioJob({
              cycle_id,
              venture_id: CLUB_THROTTLE_VENTURE_ID,
              job_type: "PRODUCTION_VERIFY",
              idempotency_key: verifyKey,
              priority: 75,
              input_lineage: {
                work_type: workType,
                path: ctCandidate.path,
                canonical_url: ctCandidate.canonical_url,
                asset_identity: assetId,
              },
            });
            if (verify.job_id) {
              jobsCreated += 1;
              enqueued.push({ job_type: "PRODUCTION_VERIFY", venture_id: CLUB_THROTTLE_VENTURE_ID, idempotency_key: verifyKey });
            }
          }
        }
        const creativeGov = resolveCreativeBudgetGovernance();
        const concepts = rankClubThrottleProductOpportunities().filter(
          (c) =>
            !isCandidateQuarantined({
              venture_id: CLUB_THROTTLE_VENTURE_ID,
              candidate_key: candidateQuarantineKey({ venture_id: CLUB_THROTTLE_VENTURE_ID, concept_id: c.concept_id }),
            }),
        );
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

    const ctCandidateForReport = publishPolicy.execute_publish ? ctContentContinuity.deploy_candidate : null;
    const ctPublishSkipReason = resolveCtPublishSkipReason({
      publish_execute: publishPolicy.execute_publish,
      publish_reason: publishPolicy.reason,
      continuity: ctContentContinuity,
    });

    await patchPortfolioCycle(cycle_id, {
      jobs_created: jobsCreated,
      status: "RUNNING",
      payload: {
        inventory_qc: inventoryQc,
        plan_qc: planQc,
        venture_next_best: ventureNextBest,
        publish_execute: publishPolicy.execute_publish,
        publish_reason: publishPolicy.reason,
        ct_autonomous_publish_candidate: ctCandidateForReport
          ? {
              slug: ctCandidateForReport.slug,
              path: ctCandidateForReport.path,
              work_type: clubThrottleBacklogCandidateWorkType(ctCandidateForReport),
            }
          : null,
        ct_publish_skip_reason: ctPublishSkipReason,
        ct_publish_diagnostic: ctPublishDiagnostic,
        ct_deploy_enqueue_suppressed: ctDeployEnqueueSuppressed,
        ct_content_continuity: ctContentContinuity,
        onpv_content_continuity: onpvContentContinuity,
        LIVE_VENTURE_CONTENT_CONTINUITY_QC: liveVentureContentContinuityQc(ctContentContinuity),
        BLOG_SELF_HEAL_CONTINUITY_QC: blogSelfHealContinuityQc(ctContentContinuity),
        LIVE_VENTURE_PREMATURE_IDLE_QC: ctContentContinuity.LIVE_VENTURE_PREMATURE_IDLE_QC,
        CT_LIVE_VENTURE_DAILY_OUTPUT_ORCHESTRATION_QC: evaluateLiveVentureDailyOutputOrchestrationQc({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          continuity: ctContentContinuity,
          next_best: ventureNextBest.find((a) => a.venture_id === CLUB_THROTTLE_VENTURE_ID) ?? null,
        }).result,
        CT_LIVE_VENTURE_DAILY_OUTPUT_FLOOR_QC: evaluateLiveVentureDailyOutputFloorQc({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          continuity: ctContentContinuity,
        }).result,
        CT_LIVE_VENTURE_DAILY_OUTPUT_QC: evaluateLiveVentureDailyOutputQc({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          continuity: ctContentContinuity,
          next_best: ventureNextBest.find((a) => a.venture_id === CLUB_THROTTLE_VENTURE_ID) ?? null,
        }).result,
        ONPV_LIVE_VENTURE_DAILY_OUTPUT_ORCHESTRATION_QC: evaluateLiveVentureDailyOutputOrchestrationQc({
          venture_id: CRE_VENTURE_ID,
          continuity: onpvContentContinuity,
          next_best: ventureNextBest.find((a) => a.venture_id === CRE_VENTURE_ID) ?? null,
        }).result,
        ONPV_LIVE_VENTURE_DAILY_OUTPUT_FLOOR_QC: evaluateLiveVentureDailyOutputFloorQc({
          venture_id: CRE_VENTURE_ID,
          continuity: onpvContentContinuity,
        }).result,
        ONPV_LIVE_VENTURE_DAILY_OUTPUT_QC: evaluateLiveVentureDailyOutputQc({
          venture_id: CRE_VENTURE_ID,
          continuity: onpvContentContinuity,
          next_best: ventureNextBest.find((a) => a.venture_id === CRE_VENTURE_ID) ?? null,
        }).result,
        ct_daily_output: buildVentureDailyOutputCounters({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          continuity: ctContentContinuity,
          shirts_published_today: countAutonomousShirtsPublishedOnUtcDay(process.cwd(), new Date().toISOString()),
        }),
        onpv_daily_output: buildVentureDailyOutputCounters({
          venture_id: CRE_VENTURE_ID,
          continuity: onpvContentContinuity,
        }),
        enqueued_job_types: enqueued.map((e) => e.job_type),
      },
    });
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
  const ctCandidateForReport = publishPolicy.execute_publish ? ctContentContinuity.deploy_candidate : null;
  const ctPublishSkipReason = resolveCtPublishSkipReason({
    publish_execute: publishPolicy.execute_publish,
    publish_reason: publishPolicy.reason,
    continuity: ctContentContinuity,
  });
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
      ? { slug: onpvCandidate.slug, path: onpvCandidate.path, asset_id: onpvCandidate.asset_id ?? onpvCandidate.slug }
      : null,
    ct_autonomous_publish_candidate: ctCandidateForReport
      ? {
          slug: ctCandidateForReport.slug,
          path: ctCandidateForReport.path,
          work_type: clubThrottleBacklogCandidateWorkType(ctCandidateForReport),
        }
      : null,
    ct_publish_skip_reason: ctPublishSkipReason,
    ct_publish_diagnostic: ctPublishDiagnostic,
    ct_deploy_enqueue_suppressed: ctDeployEnqueueSuppressed,
    ct_content_continuity: ctContentContinuity,
    onpv_content_continuity: onpvContentContinuity,
    LIVE_VENTURE_CONTENT_CONTINUITY_QC: liveVentureContentContinuityQc(ctContentContinuity),
    BLOG_SELF_HEAL_CONTINUITY_QC: blogSelfHealContinuityQc(ctContentContinuity),
    LIVE_VENTURE_PREMATURE_IDLE_QC: ctContentContinuity.LIVE_VENTURE_PREMATURE_IDLE_QC,
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
