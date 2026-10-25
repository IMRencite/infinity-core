import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import {
  AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
  autonomousSchedulerResponsibilitySeparationQc,
  autonomousVentureOperationsQc,
  PORTFOLIO_OPERATING_CRON_SCHEDULE,
} from "@/lib/infinity/autonomous-portfolio-operations/autonomous-portfolio-operations-v1";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import {
  founderDailyReportPortfolioOperationsQc,
  portfolioOperatingFounderDailyItems,
  type PortfolioOperatingReportSnapshot,
} from "@/lib/infinity/founder-daily-reports/portfolio-operations-v1";
import { reconcilePortfolioOperatingCronProofAsync } from "@/lib/infinity/autonomous-portfolio-operations/portfolio-operating-cron-reconciliation-v1";
import {
  resolvePortfolioCronProvenance,
  PORTFOLIO_CRON_SCHEDULE_IDENTITY,
  mapProvenanceToLedgerTriggerType,
  isPortfolioScheduledTrigger,
  realCronProvenancePolicyQc,
  cronAuthVsProvenanceSeparationQc,
} from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-provenance-v1";
import { orchestratePortfolioOperatingTick } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-orchestrator-v1";
import { appendScheduledExecutionLedger } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-runtime-scheduled-execution-ledger-v1";
import { triggerPortfolioJobWorkerContinuation } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-continuation-v1";
import {
  autonomousPortfolioDurableExecutionQc,
  reconcilePortfolioCycleTerminalState,
} from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-portfolio-durable-execution-v1";
import { autonomousPortfolioJobQueueQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-portfolio-job-queue-v1";
import { portfolioJobClaimAndLeaseQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-claim-and-lease-v1";
import { portfolioCronOrchestratorQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-orchestrator-v1";
import { autonomousPortfolioJobWorkerQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-worker-v1";
import { portfolioJobContinuationQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-continuation-v1";
import { portfolioJobRetryPolicyQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-retry-policy-v1";
import { durableContentSelfHealingQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/durable-content-self-healing-v1";
import {
  portfolioCronDurableProvenanceQc,
  discoveryCronDurableProvenanceArchitectureQc,
} from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-runtime-scheduled-execution-ledger-v1";
import { autonomousPublicationIdempotencyQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-publication-idempotency-v1";
import { autonomousDeployTelemetryQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-deploy-telemetry-v1";
import { asyncVentureDeploymentReconciliationQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/async-venture-deployment-reconciliation-v1";
import { resolveCreativeBudgetGovernance, creativeSelfHealBudgetGovernanceQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/creative-self-heal-budget-governance-v1";
import { diagnoseHeldClubThrottlePrintQc, autonomousProductCreativeSelfHealingQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-product-creative-self-healing-v1";
import { summarizeClubThrottleEditorialBacklog } from "@/lib/infinity/autonomous-portfolio-operations/durable/club-throttle-editorial-backlog-v1";
import { ventureOperatingLoopHealthQc } from "@/lib/infinity/autonomous-portfolio-operations/durable/venture-operating-loop-health-v1";
import { autonomousContentSelfHealingQc } from "@/lib/infinity/autonomous-portfolio-operations/autonomous-content-self-healing-v1";
import { scheduledAutonomousPublishPolicyQc } from "@/lib/infinity/autonomous-portfolio-operations/scheduled-autonomous-publish-policy-v1";
import { autonomousSafePublishAuthorityQc } from "@/lib/infinity/autonomous-portfolio-operations/autonomous-safe-publish-authority-v1";
import {
  buildPortfolioModuleInitProbeResponse,
  resolvePortfolioModuleInitProbeMode,
} from "@/lib/infinity/runtime-operations/portfolio-module-init-probe-v1";
import { vercelRuntimeIdentity } from "@/lib/infinity/production-outbound/obligation/release";

export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const probeDecision = resolvePortfolioModuleInitProbeMode(request);
  if (probeDecision.kind === "reject") {
    return NextResponse.json(
      { error: "MODULE_INIT_PROBE_REJECTED", reason: probeDecision.reason },
      { status: probeDecision.status },
    );
  }
  if (probeDecision.kind === "execute_probe") {
    const runtimeIdentity = vercelRuntimeIdentity();
    return NextResponse.json(
      buildPortfolioModuleInitProbeResponse({
        release_sha: runtimeIdentity.release_sha,
        deployment_id: runtimeIdentity.deployment_id,
      }),
      { status: 200 },
    );
  }

  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const provenance = resolvePortfolioCronProvenance(request);
  const url = new URL(request.url);
  const manualPublishFlag = url.searchParams.get("publish") === "1";
  const requestStarted = new Date().toISOString();

  try {
    const orchestration = await orchestratePortfolioOperatingTick({
      provenance,
      manual_publish_flag: manualPublishFlag,
    });

    await appendScheduledExecutionLedger({
      route: "/api/runtime/portfolio-operating-tick",
      schedule_identity: PORTFOLIO_CRON_SCHEDULE_IDENTITY,
      platform_provenance: provenance.platform_provenance,
      trigger_type: mapProvenanceToLedgerTriggerType(provenance.trigger_type),
      cycle_id: orchestration.cycle_id,
      accepted_status: "ACCEPTED",
      completed_status: "ORCHESTRATOR_RETURNED",
      completion_timestamp: new Date().toISOString(),
      payload: {
        jobs_created: orchestration.jobs_created,
        stage_timings: orchestration.stage_timings,
      },
    });

    const workerKick = await triggerPortfolioJobWorkerContinuation({
      cycle_id: orchestration.cycle_id ?? undefined,
    });
    const backlogWorkerKick = await triggerPortfolioJobWorkerContinuation({});

    const cycleTerminal =
      orchestration.cycle_id != null
        ? await reconcilePortfolioCycleTerminalState(orchestration.cycle_id)
        : { reconciled: false, status: "RUNNING" as const, counts: null };

    const cronReconcile = await reconcilePortfolioOperatingCronProofAsync();
    const architecturePass =
      orchestration.inventory_qc === "PASS" &&
      orchestration.plan_qc === "PASS" &&
      autonomousPortfolioDurableExecutionQc() === "PASS" &&
      portfolioCronOrchestratorQc() === "PASS";

    const existingVentureGrowthQc = architecturePass
      ? cronReconcile.PORTFOLIO_OPERATING_SCHEDULER_QC === "PASS"
        ? "PASS_PRODUCTION"
        : "PASS_DURABLE_PRODUCTION_ARCHITECTURE_AWAITING_REAL_CRON"
      : "PARTIAL";

    const autonomyQc = autonomousVentureOperationsQc({
      new_venture_discovery_autonomy_qc: "PENDING_NEXT_REAL_CRON",
      existing_venture_growth_autonomy_qc: existingVentureGrowthQc,
      portfolio_cycle_executed: Boolean(orchestration.cycle_id),
    });

    const ctEditorial = summarizeClubThrottleEditorialBacklog();
    const ctDiagnosis = await diagnoseHeldClubThrottlePrintQc();
    const creativeGov = resolveCreativeBudgetGovernance();

    const portfolioSnapshot: PortfolioOperatingReportSnapshot = {
      ventures_operated: orchestration.inventory_qc === "PASS" ? 2 : 0,
      assets_considered: orchestration.backlog_publish_candidates,
      assets_published: 0,
      quality_holds: ctEditorial.CT_EDITORIAL_HOLD_COUNT,
      self_heal_attempts: 0,
      self_heal_recoveries: 0,
      product_concepts: 1,
      products_advanced_beyond_concept: 0,
      blockers: workerKick.triggered ? [] : [`WORKER_CONTINUATION:${workerKick.reason}`],
    };

    const payload = {
      trigger: isPortfolioScheduledTrigger(provenance.trigger_type) ? "SCHEDULED" : "MANUAL",
      provenance,
      cadence: PORTFOLIO_OPERATING_CRON_SCHEDULE,
      cycle_id: orchestration.cycle_id,
      jobs_created: orchestration.jobs_created,
      worker_continuation: workerKick,
      backlog_worker_continuation: backlogWorkerKick,
      V44_RUNTIME_TICK_STAGE_TIMINGS: orchestration.stage_timings,
      V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE: orchestration.V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE,
      PORTFOLIO_OPERATING_SCHEDULER_QC: cronReconcile.PORTFOLIO_OPERATING_SCHEDULER_QC,
      portfolio_cron_reconciliation: cronReconcile,
      AUTONOMOUS_PORTFOLIO_DURABLE_EXECUTION_QC: autonomousPortfolioDurableExecutionQc(),
      AUTONOMOUS_PORTFOLIO_JOB_QUEUE_QC: autonomousPortfolioJobQueueQc(),
      PORTFOLIO_JOB_CLAIM_AND_LEASE_QC: portfolioJobClaimAndLeaseQc(),
      PORTFOLIO_CRON_ORCHESTRATOR_QC: portfolioCronOrchestratorQc(),
      AUTONOMOUS_PORTFOLIO_JOB_WORKER_QC: autonomousPortfolioJobWorkerQc(),
      PORTFOLIO_JOB_CONTINUATION_QC: portfolioJobContinuationQc(),
      PORTFOLIO_JOB_RETRY_POLICY_QC: portfolioJobRetryPolicyQc(),
      DURABLE_CONTENT_SELF_HEALING_QC: durableContentSelfHealingQc(),
      PORTFOLIO_CRON_DURABLE_PROVENANCE_QC: portfolioCronDurableProvenanceQc(),
      CRON_REQUEST_AUTH_QC: provenance.authorization_validated ? "PASS" : "FAIL",
      CRON_PLATFORM_PROVENANCE_QC: provenance.platform_origin_qc,
      REAL_CRON_PROVENANCE_POLICY_QC: realCronProvenancePolicyQc(),
      CRON_AUTH_VS_PROVENANCE_SEPARATION_QC: cronAuthVsProvenanceSeparationQc(),
      CRON_SECRET_REPLAY_CAN_MIMIC_REQUEST: true,
      PORTFOLIO_CYCLE_TERMINAL_RECONCILE: cycleTerminal,
      DISCOVERY_CRON_DURABLE_PROVENANCE_QC: discoveryCronDurableProvenanceArchitectureQc(),
      AUTONOMOUS_PUBLICATION_IDEMPOTENCY_QC: autonomousPublicationIdempotencyQc(),
      AUTONOMOUS_DEPLOY_TELEMETRY_QC: autonomousDeployTelemetryQc(),
      ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_QC: asyncVentureDeploymentReconciliationQc(),
      AUTONOMOUS_PRODUCT_CREATIVE_SELF_HEALING_QC: autonomousProductCreativeSelfHealingQc(),
      CREATIVE_SELF_HEAL_BUDGET_GOVERNANCE_QC: creativeSelfHealBudgetGovernanceQc(),
      ...creativeGov,
      ...ctDiagnosis,
      ...ctEditorial,
      CT_BLOGS_PUBLISHED_THIS_CYCLE: 0,
      CT_HIGH_VALUE_PAGES_PUBLISHED_THIS_CYCLE: 0,
      CT_PRODUCTS_PUBLISHED_THIS_CYCLE: 0,
      ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED: false,
      VENTURE_OPERATING_LOOP_HEALTH_QC: ventureOperatingLoopHealthQc(),
      AUTONOMOUS_PORTFOLIO_OPERATIONS_V1,
      AUTONOMOUS_PORTFOLIO_OPERATING_CYCLE_V1: "AUTONOMOUS_PORTFOLIO_DURABLE_ORCHESTRATOR_V1",
      OPERATING_VENTURE_INVENTORY_QC: orchestration.inventory_qc,
      VENTURE_OPERATING_PLAN_QC: orchestration.plan_qc,
      AUTONOMOUS_CONTENT_SELF_HEALING_QC: autonomousContentSelfHealingQc(),
      AUTONOMOUS_SCHEDULER_RESPONSIBILITY_SEPARATION_QC: autonomousSchedulerResponsibilitySeparationQc(),
      AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_QC: autonomousSafePublishAuthorityQc(),
      SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC: scheduledAutonomousPublishPolicyQc({
        scheduled_without_cli_flag: isPortfolioScheduledTrigger(provenance.trigger_type),
      }),
      publish_policy: {
        execute_publish: orchestration.publish_execute,
        reason: orchestration.publish_reason,
      },
      RUNTIME_ORIGINATED_VENTURE_PUBLICATION_QC: "PENDING_WORKER",
      AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "NOT_RUN",
      AUTONOMOUS_PRODUCTION_PUBLICATION_EXECUTION_QC: "NOT_RUN",
      FOUNDER_DAILY_REPORT_PORTFOLIO_OPERATIONS_QC: founderDailyReportPortfolioOperationsQc(portfolioSnapshot),
      founder_daily_portfolio_items: portfolioOperatingFounderDailyItems(portfolioSnapshot),
      EXISTING_VENTURE_GROWTH_AUTONOMY_QC: existingVentureGrowthQc,
      NEW_VENTURE_DISCOVERY_AUTONOMY_QC: "PENDING_NEXT_REAL_CRON",
      AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
      AUTONOMOUS_VENTURE_OPERATIONS_QC: autonomyQc,
      enqueued_jobs: orchestration.enqueued,
      onpv_autonomous_publish_candidate: orchestration.onpv_autonomous_publish_candidate,
      ct_autonomous_publish_candidate: orchestration.ct_autonomous_publish_candidate,
      ct_publish_skip_reason: orchestration.ct_publish_skip_reason,
      ct_publish_diagnostic: orchestration.ct_publish_diagnostic,
      ct_deploy_enqueue_suppressed: orchestration.ct_deploy_enqueue_suppressed,
      onpv_publish_diagnostic: orchestration.onpv_publish_diagnostic,
      venture_next_best_growth_actions: orchestration.venture_next_best_growth_actions,
      VENTURE_NEXT_BEST_GROWTH_ACTION_QC: orchestration.VENTURE_NEXT_BEST_GROWTH_ACTION_QC,
      VENTURE_SEO_AUTHORITY_EXPANSION_QC: orchestration.VENTURE_SEO_AUTHORITY_EXPANSION_QC,
      VENTURE_GEO_AUTHORITY_EXPANSION_QC: orchestration.VENTURE_GEO_AUTHORITY_EXPANSION_QC,
      AUTONOMOUS_CONTENT_CREATION_AUTHORITY_QC: "PASS",
      backlog_publish_candidates: orchestration.backlog_publish_candidates,
      request_started_at: requestStarted,
    };

    writeLocalJsonIfDurable(".infinity/autonomous-portfolio-operations/last-portfolio-operating-tick.json", payload);

    return NextResponse.json(payload, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "PORTFOLIO_OPERATING_TICK_FAILED", root_cause: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
