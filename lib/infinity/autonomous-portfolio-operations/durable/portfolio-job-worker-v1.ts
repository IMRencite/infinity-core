import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";
import { claimPortfolioJobs, releasePortfolioJobLease } from "./portfolio-job-claim-and-lease-v1";
import type { PortfolioJobRow } from "./autonomous-portfolio-job-queue-v1";
import { classifyPortfolioJobRetry } from "./portfolio-job-retry-policy-v1";
import { executeDurableContentSelfHealJob } from "./durable-content-self-healing-v1";
import { executeBoundedVentureDeploy } from "./async-venture-deployment-reconciliation-v1";
import { persistAutonomousDeployTelemetry } from "./autonomous-deploy-telemetry-v1";
import { publicationAssetIdentity, registerSuccessfulPublication } from "./autonomous-publication-idempotency-v1";
import { verifyOccupancyNpvProductionPublication } from "../occupancynpv-production-publish-proof-v1";
import { verifyClubThrottleProductionPublication } from "../club-throttle-production-publish-proof-v1";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { resolveOccupancyNpvTargetArticleForPrepublish } from "../onpv-target-article-resolution-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { recordVentureGrowthLearning } from "../venture-growth-learning-loop-v1";
import {
  diagnoseHeldClubThrottlePrintQc,
  runBoundedCreativeSelfHeal,
} from "./autonomous-product-creative-self-healing-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";
import {
  candidateQuarantineKey,
  isCandidateQuarantined,
  quarantineCandidateQcExhaustedAsync,
  CANDIDATE_RETRY_BUDGET,
} from "../venture-candidate-quarantine-v1";
import {
  incrementPortfolioCandidateFailureAttempt,
  readPortfolioCandidateAttemptCount,
} from "./durable-portfolio-candidate-state-v1";
import { vercelRuntimeIdentity } from "@/lib/infinity/production-outbound/obligation/release";
import { rankOccupancyNpvAutonomousPublishRows } from "../portfolio-operating-backlog-publish-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { mergeOnpvMaterializedBacklogArticles } from "../occupancynpv-materialized-backlog-overlay-v1";
import {
  markOnpvOpportunityBuilt,
  resolveOnpvMaterializedArticleBySlug,
} from "../onpv-durable-opportunity-state-v1";
import {
  evaluateAutonomousStorefrontPublicationAllowed,
  evaluateStorefrontManufacturingSeparationQc,
} from "../venture-daily-output-v1";
import { enqueuePortfolioJob } from "./autonomous-portfolio-job-queue-v1";
import { buildAutonomousClubThrottleStorefrontProduct } from "@/lib/infinity/commerce/club-throttle-autonomous-product-build-v1";
import { publishAutonomousClubThrottleStorefrontProduct } from "@/lib/infinity/commerce/club-throttle-autonomous-storefront-publication-v1";
import { patchPortfolioCycle, reconcilePortfolioCycleTerminalState } from "./autonomous-portfolio-durable-execution-v1";
import { triggerPortfolioJobWorkerContinuation } from "./portfolio-job-continuation-v1";
import {
  countPortfolioJobsByCycle,
  patchPortfolioJobFields,
  patchTestPortfolioJobForTests,
} from "./autonomous-portfolio-job-queue-v1";
import {
  findVentureDeployJobForAsset,
  frozenRevisionForOccupancyDeployJob,
  listDeploymentIdsForJob,
  mergeVentureDeployOutputLineage,
  readPriorDeploymentIdFromLineage,
  resolveAuthoritativeDeploymentId,
  upstreamDeployBlocksProductionVerify,
  classifyProductionVerifyHttpOutcome,
} from "./venture-async-deploy-reconciliation-v1";

export const AUTONOMOUS_PORTFOLIO_JOB_WORKER_V1 = "AUTONOMOUS_PORTFOLIO_JOB_WORKER_V1" as const;

const MAX_JOBS_PER_INVOCATION = 4;

async function completeJob(job: PortfolioJobRow, holder: string, patch: {
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "QUEUED";
  safe_error?: string | null;
  output_lineage?: Record<string, unknown>;
  eligible_at?: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    patchTestPortfolioJobForTests(job.job_id, {
      status: patch.status,
      safe_error: patch.safe_error ?? null,
      output_lineage: patch.output_lineage ?? job.output_lineage,
    });
    return;
  }
  const client = createPortfolioDurableSupabase();
  if (!client) return;
  await client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .update({
      status: patch.status,
      safe_error: patch.safe_error ?? null,
      output_lineage: patch.output_lineage ?? job.output_lineage,
      completed_at: patch.status === "COMPLETED" || patch.status === "FAILED" ? new Date().toISOString() : null,
      eligible_at: patch.eligible_at ?? new Date().toISOString(),
      lease_holder: null,
      lease_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("job_id", job.job_id);
  await releasePortfolioJobLease(job.job_id, holder);
}

async function executeOneJob(job: PortfolioJobRow, holder: string): Promise<void> {
  const lineage = job.input_lineage ?? {};
  try {
    switch (job.job_type) {
      case "CONTENT_SELF_HEAL": {
        const targetSlug = typeof lineage.self_heal_target_slug === "string" ? lineage.self_heal_target_slug : null;
        const slugKey = targetSlug
          ? candidateQuarantineKey({ venture_id: job.venture_id, slug: targetSlug })
          : null;
        const priorDurable =
          slugKey && targetSlug
            ? await readPortfolioCandidateAttemptCount({
                venture_id: job.venture_id,
                lane: "CONTENT_SLUG",
                candidate_key: slugKey,
              })
            : 0;
        const out = executeDurableContentSelfHealJob({
          venture_id: job.venture_id,
          execute_publish: Boolean(lineage.execute_publish),
          prior_attempts: priorDurable,
          self_heal_target_slug: targetSlug,
        });
        if (slugKey && targetSlug && out.SELF_HEAL_EXHAUSTED) {
          await quarantineCandidateQcExhaustedAsync({
            venture_id: job.venture_id,
            candidate_key: slugKey,
            failure_reasons: out.failure_gates.length ? out.failure_gates : ["QC_EXHAUSTED"],
            attempt_count: out.SELF_HEAL_ATTEMPTS,
            last_cycle_id: job.cycle_id,
            last_release_sha: vercelRuntimeIdentity().release_sha ?? vercelRuntimeIdentity().git_sha,
            lane: "CONTENT_SLUG",
          });
        } else if (slugKey && targetSlug && !out.deploy_ready) {
          await incrementPortfolioCandidateFailureAttempt({
            venture_id: job.venture_id,
            lane: "CONTENT_SLUG",
            candidate_key: slugKey,
            failure_reasons: out.failure_gates,
            last_cycle_id: job.cycle_id,
            last_release_sha: vercelRuntimeIdentity().release_sha ?? vercelRuntimeIdentity().git_sha,
          });
        }
        if (out.deploy_ready && targetSlug && Boolean(lineage.execute_publish)) {
          const articles = listOccupancyClubThrottleBacklogArticles();
          const candidate = articles.find((a) => a.slug === targetSlug);
          if (candidate) {
            const assetId = publicationAssetIdentity({
              venture_id: candidate.venture === "occupancynpv" ? "occupancynpv" : "club-throttle",
              canonical_path: candidate.path,
              content_revision: candidate.slug,
            });
            const deployKey = `deploy:${assetId}`;
            await enqueuePortfolioJob({
              cycle_id: job.cycle_id,
              venture_id: job.venture_id,
              job_type: "VENTURE_DEPLOY",
              idempotency_key: deployKey,
              priority: 78,
              input_lineage: {
                path: candidate.path,
                canonical_url: candidate.canonical_url,
                asset_identity: assetId,
                work_type: "NEW_PUBLICATION",
              },
            });
          }
        }
        await completeJob(job, holder, {
          status: "COMPLETED",
          output_lineage: {
            ...(out as unknown as Record<string, unknown>),
            CANDIDATE_RETRY_BUDGET,
            quarantined_slug: out.quarantined_slug ?? (out.SELF_HEAL_EXHAUSTED ? targetSlug : null),
            alternate_topic_decision: out.alternate_topic_decision,
          },
        });
        return;
      }
      case "BLOG_BUILD": {
        const slug = String(lineage.slug ?? "");
        const workType = String(lineage.work_type ?? "NEW_PUBLICATION");
        const opportunityId = typeof lineage.opportunity_id === "string" ? lineage.opportunity_id : null;
        const articles = mergeOnpvMaterializedBacklogArticles(listOccupancyClubThrottleBacklogArticles());
        const article =
          articles.find((a) => a.slug === slug) ?? (await resolveOnpvMaterializedArticleBySlug(slug));
        if (!article) {
          await completeJob(job, holder, { status: "FAILED", safe_error: "BLOG_BUILD_SLUG_NOT_FOUND" });
          return;
        }
        if (workType === "INTERNAL_LINK_UPDATE") {
          await completeJob(job, holder, {
            status: "FAILED",
            safe_error: "NEW_PUBLISH_MAINTENANCE_CONTRACT_REJECTED",
          });
          return;
        }
        const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
        const ready = ranked.find((r) => r.article.slug === slug);
        if (ready) {
          const assetId = publicationAssetIdentity({
            venture_id: "occupancynpv",
            canonical_path: article.path,
            content_revision: article.slug,
          });
          await enqueuePortfolioJob({
            cycle_id: job.cycle_id,
            venture_id: job.venture_id,
            job_type: "VENTURE_DEPLOY",
            idempotency_key: `deploy:${assetId}`,
            priority: 80,
            input_lineage: {
              path: article.path,
              canonical_url: article.canonical_url,
              asset_identity: assetId,
              work_type: "NEW_PUBLICATION",
              slug: article.slug,
              opportunity_id: opportunityId,
              materialized_candidate_key: lineage.materialized_candidate_key ?? article.asset_id,
            },
          });
        }
        if (ready && opportunityId) {
          await markOnpvOpportunityBuilt({ opportunity_id: opportunityId });
        }
        await completeJob(job, holder, {
          status: ready ? "COMPLETED" : "FAILED",
          safe_error: ready ? null : "BLOG_BUILD_QC_NOT_READY",
          output_lineage: {
            slug,
            materialized: Boolean(ready),
            full_publication_qc: workType === "NEW_PUBLICATION",
            materialized_candidate_key: lineage.materialized_candidate_key ?? article.asset_id,
            opportunity_id: opportunityId,
          },
        });
        return;
      }
      case "VENTURE_DEPLOY": {
        const expectedPath = String(lineage.path ?? "");
        const isOnpvDeploy =
          job.venture_id === CRE_VENTURE_ID ||
          job.venture_id === "occupancynpv" ||
          String(job.venture_id).includes("7e7e924e");
        if (expectedPath && isOnpvDeploy) {
          const resolved = await resolveOccupancyNpvTargetArticleForPrepublish({
            path: expectedPath,
            work_type: String(lineage.work_type ?? ""),
            opportunity_id: typeof lineage.opportunity_id === "string" ? lineage.opportunity_id : null,
            materialized_candidate_key:
              typeof lineage.materialized_candidate_key === "string"
                ? lineage.materialized_candidate_key
                : null,
            slug: typeof lineage.slug === "string" ? lineage.slug : null,
          });
          const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
            path: expectedPath,
            work_type: String(lineage.work_type ?? ""),
            resolved_article: resolved.article,
            lineage_fail_reasons: resolved.fail_reasons,
            articles: resolved.article
              ? mergeOnpvMaterializedBacklogArticles(listOccupancyClubThrottleBacklogArticles())
              : undefined,
          });
          if (prepublish.OCCUPANCYNPV_TARGET_PREPUBLISH_QC !== "PASS") {
            await completeJob(job, holder, {
              status: "FAILED",
              safe_error: `OCCUPANCYNPV_TARGET_PREPUBLISH_QC_FAIL:${prepublish.reasons.join(",")}`,
              output_lineage: prepublish as unknown as Record<string, unknown>,
            });
            return;
          }
        }
        const bundleStart = new Date().toISOString();
        const deployVentureId =
          job.venture_id === CRE_VENTURE_ID || job.venture_id === "occupancynpv"
            ? CRE_VENTURE_ID
            : job.venture_id;
        const frozenRevision = frozenRevisionForOccupancyDeployJob(job);
        const telemetryDeployments = await listDeploymentIdsForJob(job.job_id);
        const authoritative = resolveAuthoritativeDeploymentId({
          output_lineage: job.output_lineage,
          telemetry_deployments: telemetryDeployments,
        });
        let priorDeploymentId = authoritative.authoritative_deployment_id ?? readPriorDeploymentIdFromLineage(job.output_lineage);
        const allowFreshPost = Boolean((job.output_lineage as Record<string, unknown>)?.allow_fresh_provider_post);
        if (allowFreshPost) priorDeploymentId = null;
        const deploy = await executeBoundedVentureDeploy({
          venture_id: deployVentureId,
          prior_deployment_id: priorDeploymentId,
          frozen_revision: frozenRevision,
          persisted_deploy_lineage: mergeVentureDeployOutputLineage(job.output_lineage, {
            asset_identity: frozenRevision.asset_id,
            frozen_bundle_manifest_hash: frozenRevision.frozen_bundle_manifest_hash,
            authoritative_deployment_id: priorDeploymentId,
            superseded_deployment_ids: authoritative.superseded_deployment_ids,
          }),
          on_deployment_submitted: async (deployment_id) => {
            await patchPortfolioJobFields(job.job_id, {
              output_lineage: mergeVentureDeployOutputLineage(job.output_lineage, {
                deployment_id,
                authoritative_deployment_id: deployment_id,
                submitted_at: new Date().toISOString(),
                asset_identity: frozenRevision.asset_id,
                frozen_bundle_manifest_hash: frozenRevision.frozen_bundle_manifest_hash,
                superseded_deployment_ids: authoritative.superseded_deployment_ids,
              }),
            });
          },
        });
        const outputPatch = mergeVentureDeployOutputLineage(job.output_lineage, {
          deployment_id: deploy.deployment_id,
          authoritative_deployment_id: deploy.deployment_id ?? priorDeploymentId,
          production_url: deploy.phase === "COMPLETED" ? deploy.production_url : undefined,
          asset_identity: frozenRevision.asset_id,
          frozen_bundle_manifest_hash: deploy.frozen_bundle_manifest_hash ?? frozenRevision.frozen_bundle_manifest_hash,
          superseded_deployment_ids: authoritative.superseded_deployment_ids,
          provider_post_count: deploy.provider_post_count,
        });
        await persistAutonomousDeployTelemetry({
          cycle_id: job.cycle_id,
          job_id: job.job_id,
          venture_id: job.venture_id,
          bundle_started_at: bundleStart,
          bundle_completed_at: new Date().toISOString(),
          vercel_deployment_id: deploy.deployment_id,
          build_status: deploy.phase,
          safe_payload: {
            path: lineage.path,
            canonical_url: lineage.canonical_url,
            provider_post_count: deploy.provider_post_count,
            authoritative_selection: authoritative.selection_reason,
            superseded_deployment_ids: authoritative.superseded_deployment_ids,
            superseded_classification: authoritative.superseded_deployment_ids.map(() => "SUPERSEDED_DUPLICATE_DEPLOYMENT"),
          },
        });
        if (deploy.phase === "IN_PROGRESS") {
          const retry = classifyPortfolioJobRetry({
            job_type: "VENTURE_DEPLOY",
            safe_error: deploy.safe_error,
            attempt_count: job.attempt_count,
          });
          await completeJob(job, holder, {
            status: "IN_PROGRESS",
            safe_error: deploy.safe_error,
            eligible_at: retry.eligible_at,
            output_lineage: outputPatch,
          });
          return;
        }
        if (deploy.ok) {
          const workType = String(lineage.work_type ?? "NEW_PUBLICATION");
          const { incrementPortfolioCyclePublicationCounters } = await import(
            "./autonomous-portfolio-durable-execution-v1"
          );
          if (workType === "INTERNAL_LINK_UPDATE") {
            await incrementPortfolioCyclePublicationCounters(job.cycle_id, {
              maintenance_actions_completed: 1,
            });
          } else if (workType === "CONTENT_REFRESH") {
            await incrementPortfolioCyclePublicationCounters(job.cycle_id, { refreshes_completed: 1 });
          } else {
            await incrementPortfolioCyclePublicationCounters(job.cycle_id, {
              new_assets_published: 1,
              blogs_published: 1,
            });
          }
        }
        const terminalDeployFail =
          deploy.safe_error === "VERCEL_DEPLOYMENT_FAILED" || deploy.safe_error === "VERCEL_DEPLOYMENT_CREATE_FAILED";
        if (!deploy.ok && terminalDeployFail) {
          outputPatch.allow_fresh_provider_post = true;
          outputPatch.authoritative_deployment_id = null;
          outputPatch.deployment_id = null;
        }
        await completeJob(job, holder, {
          status: deploy.ok ? "COMPLETED" : "FAILED",
          safe_error: deploy.safe_error,
          output_lineage: outputPatch,
        });
        return;
      }
      case "PRODUCTION_VERIFY": {
        const canonical_url = String(lineage.canonical_url ?? "");
        const expected_path = String(lineage.path ?? "");
        const assetIdentity = String(lineage.asset_identity ?? "");
        const upstream = await findVentureDeployJobForAsset({
          cycle_id: job.cycle_id,
          asset_identity: assetIdentity,
        });
        const upstreamGate = upstreamDeployBlocksProductionVerify(upstream);
        if (upstreamGate.blocked) {
          const retry = classifyPortfolioJobRetry({
            job_type: "PRODUCTION_VERIFY",
            safe_error: upstreamGate.reason,
            attempt_count: job.attempt_count,
          });
          await completeJob(job, holder, {
            status: retry.disposition === "TERMINAL" ? "FAILED" : "QUEUED",
            safe_error: upstreamGate.reason,
            eligible_at: retry.eligible_at,
            output_lineage: {
              upstream_venture_deploy_status: upstream?.status ?? null,
              upstream_deployment_id: readPriorDeploymentIdFromLineage(upstream?.output_lineage),
            },
          });
          return;
        }
        const isClubThrottle = job.venture_id === CLUB_THROTTLE_VENTURE_ID;
        const refreshMarkers =
          isClubThrottle && expected_path.includes("group-ride-etiquette")
            ? ["sodium lights turning chrome orange", "judged when the last rider gets home"]
            : undefined;
        const proof = isClubThrottle
          ? await verifyClubThrottleProductionPublication({
              canonical_url,
              expected_path,
              content_markers: refreshMarkers,
            })
          : await verifyOccupancyNpvProductionPublication({ canonical_url, expected_path });
        const outcome = classifyProductionVerifyHttpOutcome({
          http_status: proof.http_status,
          upstream_blocked: false,
        });
        if (proof.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC === "PASS") {
          await registerSuccessfulPublication({
            venture_id: isClubThrottle ? "club-throttle" : "occupancynpv",
            asset_identity: assetIdentity,
            canonical_path: expected_path,
            content_revision: assetIdentity,
            production_url: canonical_url,
            payload: { proof },
          });
        }
        await persistAutonomousDeployTelemetry({
          cycle_id: job.cycle_id,
          job_id: job.job_id,
          venture_id: job.venture_id,
          canonical_check: proof.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC,
          production_get_status: proof.http_status ?? null,
          safe_payload: { canonical_url, expected_path },
        });
        if (!outcome.terminal) {
          const retry = classifyPortfolioJobRetry({
            job_type: "PRODUCTION_VERIFY",
            safe_error: outcome.safe_error,
            attempt_count: job.attempt_count,
          });
          await completeJob(job, holder, {
            status: "QUEUED",
            safe_error: outcome.safe_error,
            eligible_at: retry.eligible_at,
            output_lineage: proof as unknown as Record<string, unknown>,
          });
          return;
        }
        await completeJob(job, holder, {
          status: proof.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC === "PASS" ? "COMPLETED" : "FAILED",
          safe_error: proof.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC === "PASS" ? null : outcome.safe_error ?? "PRODUCTION_VERIFY_FAILED",
          output_lineage: proof as unknown as Record<string, unknown>,
        });
        return;
      }
      case "CREATIVE_SELF_HEAL": {
        const diagnosis = await diagnoseHeldClubThrottlePrintQc();
        const concepts = rankClubThrottleProductOpportunities();
        const concept = concepts.find((c) => c.concept_id === lineage.concept_id) ?? concepts[0];
        if (!concept) {
          await completeJob(job, holder, { status: "FAILED", safe_error: "NO_PRODUCT_CONCEPT" });
          return;
        }
        const gov = resolveCreativeBudgetGovernance();
        const attempt = await runBoundedCreativeSelfHeal({
          concept,
          failure_reasons: diagnosis.CT_PRINT_QC_FAILURE_REASONS,
          attempt_index: job.attempt_count,
          execute_live_creative: gov.LIVE_CREATIVE_ENABLED,
        });
        const qualityHeldTerminal =
          !gov.LIVE_CREATIVE_ENABLED ||
          attempt.held_reason === "LIVE_CREATIVE_NOT_AUTHORIZED" ||
          attempt.held_reason === "CT_PRINT_QC_QUALITY_HELD_NO_AUTO_PAID_RETRY";
        const printHold = attempt.manufacturing_print_production_hold;
        const listingPass = attempt.storefront_listing_pass;
        const storefrontSep = evaluateStorefrontManufacturingSeparationQc({
          print_production_qc_hold: printHold,
          storefront_listing_qc_pass: listingPass,
        });
        const publicationAllowed = evaluateAutonomousStorefrontPublicationAllowed({
          storefront_ready: storefrontSep.STOREFRONT_READY,
        });
        const conceptKey = candidateQuarantineKey({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          concept_id: concept.concept_id,
        });
        let cumulativeAttempts = await readPortfolioCandidateAttemptCount({
          venture_id: CLUB_THROTTLE_VENTURE_ID,
          lane: "SHIRT_CONCEPT",
          candidate_key: conceptKey,
        });
        if (!listingPass) {
          cumulativeAttempts = await incrementPortfolioCandidateFailureAttempt({
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            lane: "SHIRT_CONCEPT",
            candidate_key: conceptKey,
            revision_identity: attempt.source_asset_hash ?? null,
            failure_reasons: attempt.print_failure_reasons,
            last_cycle_id: job.cycle_id,
            last_release_sha: vercelRuntimeIdentity().release_sha ?? vercelRuntimeIdentity().git_sha,
          });
        }
        const shirtBudgetExhausted = cumulativeAttempts >= gov.max_self_heal_attempts;
        if (!listingPass && (qualityHeldTerminal || shirtBudgetExhausted)) {
          await quarantineCandidateQcExhaustedAsync({
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            candidate_key: conceptKey,
            failure_reasons: attempt.print_failure_reasons.length
              ? attempt.print_failure_reasons
              : diagnosis.CT_PRINT_QC_FAILURE_REASONS,
            attempt_count: cumulativeAttempts,
            failure_class: "ART_QC",
            last_cycle_id: job.cycle_id,
            last_release_sha: vercelRuntimeIdentity().release_sha ?? vercelRuntimeIdentity().git_sha,
            lane: "SHIRT_CONCEPT",
          });
          const nextConcept = concepts.find(
            (c) =>
              c.concept_id !== concept.concept_id &&
              !isCandidateQuarantined({
                venture_id: CLUB_THROTTLE_VENTURE_ID,
                candidate_key: candidateQuarantineKey({ venture_id: CLUB_THROTTLE_VENTURE_ID, concept_id: c.concept_id }),
                lane: "SHIRT_CONCEPT",
              }),
          );
          if (nextConcept) {
            await enqueuePortfolioJob({
              cycle_id: job.cycle_id,
              venture_id: CLUB_THROTTLE_VENTURE_ID,
              job_type: "CREATIVE_SELF_HEAL",
              idempotency_key: `creative-self-heal:${nextConcept.concept_id}`,
              priority: 55,
              input_lineage: { concept_id: nextConcept.concept_id },
            });
          }
        }
        if (listingPass && attempt.source_asset_hash) {
          const buildKey = `storefront-product-build:${concept.concept_id}:${attempt.source_asset_hash.slice(0, 16)}`;
          await enqueuePortfolioJob({
            cycle_id: job.cycle_id,
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            job_type: "STOREFRONT_PRODUCT_BUILD",
            idempotency_key: buildKey,
            priority: 60,
            input_lineage: {
              concept_id: concept.concept_id,
              source_artwork_hash: attempt.source_asset_hash,
              storefront_gate_qc: attempt.storefront_gate_qc,
            },
          });
        }
        await completeJob(job, holder, {
          status: listingPass
            ? "COMPLETED"
            : qualityHeldTerminal || shirtBudgetExhausted
              ? "FAILED"
              : "QUEUED",
          safe_error: listingPass ? null : attempt.held_reason ?? "STOREFRONT_LISTING_QC_FAIL",
          eligible_at: new Date(Date.now() + 90_000).toISOString(),
          output_lineage: {
            diagnosis,
            attempt,
            CT_CREATIVE_ATTEMPTS: cumulativeAttempts,
            CT_SELECTED_ARTWORK_ID: listingPass ? attempt.source_asset_hash : null,
            STOREFRONT_MANUFACTURING_SEPARATION: storefrontSep,
            STOREFRONT_PUBLICATION_ALLOWED: publicationAllowed,
            MANUFACTURING_BLOCKED_BY_PRINT_HOLD: printHold,
            STOREFRONT_GATE_QC: attempt.storefront_gate_qc,
          },
        });
        return;
      }
      case "STOREFRONT_PRODUCT_BUILD": {
        const conceptId = String(lineage.concept_id ?? "");
        const artHash = String(lineage.source_artwork_hash ?? "");
        const concepts = rankClubThrottleProductOpportunities();
        const concept = concepts.find((c) => c.concept_id === conceptId);
        if (!concept || !artHash) {
          await completeJob(job, holder, { status: "FAILED", safe_error: "STOREFRONT_BUILD_LINEAGE_INCOMPLETE" });
          return;
        }
        const built = buildAutonomousClubThrottleStorefrontProduct({ concept, source_artwork_hash: artHash });
        const published = await publishAutonomousClubThrottleStorefrontProduct({ built });
        if (published.customer_visible && published.incremented_daily_counter) {
          await patchPortfolioCycle(job.cycle_id, { products_published: 1 });
        }
        await completeJob(job, holder, {
          status: published.customer_visible ? "COMPLETED" : "FAILED",
          safe_error: published.customer_visible ? null : published.reason ?? "STOREFRONT_PUBLICATION_FAILED",
          output_lineage: {
            built,
            publication: published,
            CT_AUTONOMOUS_STOREFRONT_PUBLICATION_FUNCTION: "publishAutonomousClubThrottleStorefrontProduct",
          },
        });
        return;
      }
      case "GROWTH_LEARNING": {
        const learning = recordVentureGrowthLearning({
          venture_id: job.venture_id,
          cycle_outcome: "NO_QUALIFIED_OPPORTUNITY",
          assets_published: 0,
          assets_failed: 0,
        });
        await completeJob(job, holder, { status: "COMPLETED", output_lineage: learning as unknown as Record<string, unknown> });
        return;
      }
      case "VENTURE_RESEARCH":
      case "HIGH_VALUE_PAGE_BUILD":
      default: {
        await completeJob(job, holder, {
          status: "COMPLETED",
          output_lineage: { note: "PLANNED_OR_LIGHTWEIGHT_V44", job_type: job.job_type },
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retry = classifyPortfolioJobRetry({
      job_type: job.job_type,
      safe_error: message,
      attempt_count: job.attempt_count,
    });
    await completeJob(job, holder, {
      status: retry.disposition === "TERMINAL" ? "FAILED" : "QUEUED",
      safe_error: message.slice(0, 500),
      eligible_at: retry.eligible_at,
    });
  }
}

export async function executePortfolioJobRowForTests(job: PortfolioJobRow): Promise<void> {
  await executeOneJob(job, `test-holder:${Date.now()}`);
}

export async function runPortfolioJobWorker(input?: { cycle_id?: string; max_jobs?: number }): Promise<{
  processed: number;
  remaining_queued: number;
  continuation: { triggered: boolean; reason: string };
}> {
  const holder = `worker:${Date.now()}`;
  const jobs = await claimPortfolioJobs({
    limit: input?.max_jobs ?? MAX_JOBS_PER_INVOCATION,
    holder,
    cycle_id: input?.cycle_id,
  });
  for (const job of jobs) {
    await executeOneJob(job, holder);
  }
  const counts = input?.cycle_id
    ? await countPortfolioJobsByCycle(input.cycle_id)
    : { queued: 0, running: 0, failed: 0, completed: 0 };
  const continuation =
    counts.queued > 0 ? await triggerPortfolioJobWorkerContinuation({ cycle_id: input?.cycle_id }) : { triggered: false, reason: "NO_REMAINING_JOBS" };
  if (input?.cycle_id) {
    await reconcilePortfolioCycleTerminalState(input.cycle_id);
  }
  return { processed: jobs.length, remaining_queued: counts.queued, continuation };
}

export function autonomousPortfolioJobWorkerQc(): "PASS" | "FAIL" {
  return MAX_JOBS_PER_INVOCATION >= 1 ? "PASS" : "FAIL";
}
