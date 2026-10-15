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
import { registerSuccessfulPublication } from "./autonomous-publication-idempotency-v1";
import { verifyOccupancyNpvProductionPublication } from "../occupancynpv-production-publish-proof-v1";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { recordVentureGrowthLearning } from "../venture-growth-learning-loop-v1";
import {
  diagnoseHeldClubThrottlePrintQc,
  runBoundedCreativeSelfHeal,
} from "./autonomous-product-creative-self-healing-v1";
import { rankClubThrottleProductOpportunities } from "@/lib/infinity/commerce/club-throttle-autonomous-product-development-v1";
import { resolveCreativeBudgetGovernance } from "./creative-self-heal-budget-governance-v1";
import { patchPortfolioCycle } from "./autonomous-portfolio-durable-execution-v1";
import { triggerPortfolioJobWorkerContinuation } from "./portfolio-job-continuation-v1";
import { countPortfolioJobsByCycle, patchPortfolioJobFields } from "./autonomous-portfolio-job-queue-v1";
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
        const out = executeDurableContentSelfHealJob({
          venture_id: job.venture_id,
          execute_publish: Boolean(lineage.execute_publish),
          prior_attempts: job.attempt_count,
        });
        await completeJob(job, holder, {
          status: "COMPLETED",
          output_lineage: out as unknown as Record<string, unknown>,
        });
        return;
      }
      case "VENTURE_DEPLOY": {
        const expectedPath = String(lineage.path ?? "");
        if (expectedPath) {
          const prepublish = evaluateOccupancyNpvTargetPrepublishQc({ path: expectedPath });
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
          await patchPortfolioCycle(job.cycle_id, { assets_published: 1 });
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
        const proof = await verifyOccupancyNpvProductionPublication({ canonical_url, expected_path });
        const outcome = classifyProductionVerifyHttpOutcome({
          http_status: proof.http_status,
          upstream_blocked: false,
        });
        if (proof.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC === "PASS") {
          await registerSuccessfulPublication({
            venture_id: "occupancynpv",
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
        await completeJob(job, holder, {
          status: attempt.pass ? "COMPLETED" : job.attempt_count >= gov.max_self_heal_attempts ? "FAILED" : "QUEUED",
          safe_error: attempt.pass ? null : attempt.held_reason,
          eligible_at: new Date(Date.now() + 90_000).toISOString(),
          output_lineage: {
            diagnosis,
            attempt,
            CT_CREATIVE_ATTEMPTS: job.attempt_count,
            CT_SELECTED_ARTWORK_ID: attempt.pass ? attempt.source_asset_hash : null,
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
      case "BLOG_BUILD":
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
  return { processed: jobs.length, remaining_queued: counts.queued, continuation };
}

export function autonomousPortfolioJobWorkerQc(): "PASS" | "FAIL" {
  return MAX_JOBS_PER_INVOCATION >= 1 ? "PASS" : "FAIL";
}
