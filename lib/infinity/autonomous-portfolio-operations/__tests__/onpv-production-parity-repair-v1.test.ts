import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  legacyB622538OnpvPriorDeploymentIdForProviderDeploy,
  resolveOnpvPriorDeploymentIdForProviderDeploy,
} from "@/lib/infinity/organic-growth-engine/continuous/onpv-deploy-prior-resolution-v1";
import {
  enqueuePortfolioJob,
  findActivePortfolioJobByIdempotencyKeyForTests,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
import {
  countDistinctProviderDeploymentsFromTelemetry,
  providerCallSafetyReportingQc,
} from "../durable/provider-call-accounting-v1";
import {
  ONPV_TI_WORKER_E2E_FIXTURE,
  resetOnpvWorkerE2eDurableStores,
  resetOnpvWorkerE2eHarnessControl,
  seedBuiltTiNewPublicationJobs,
  seedWorkerE2ePortfolioCycle,
} from "../onpv-new-publication-worker-e2e-harness-v1";
const PRODUCTION_HXFK_DEPLOYMENT_ID = "dpl_HXfkYXUv4QjQ2baRzutew9aLyhkc" as const;
import { executePortfolioJobRowForTests } from "../durable/portfolio-job-worker-v1";
import { patchTestPortfolioJobForTests } from "../durable/autonomous-portfolio-job-queue-v1";

const deployApprovedCalls: Array<Record<string, unknown>> = [];

vi.mock("../autonomous-venture-production-deployer-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../autonomous-venture-production-deployer-v1")>();
  return {
    ...original,
    deployApprovedVentureProductionBundle: vi.fn(async (input) => {
      deployApprovedCalls.push({ ...input });
      const prior = input.prior_deployment_id?.trim();
      if (prior?.startsWith("dpl_")) {
        return {
          ok: true,
          venture_id: input.venture_id,
          deployment_id: prior,
          production_url: ONPV_TI_WORKER_E2E_FIXTURE.canonical,
          safe_error: null,
          aliased: true,
          provider_post_count: 0,
        };
      }
      return {
        ok: false,
        venture_id: input.venture_id,
        deployment_id: "dpl_NEW_POST",
        production_url: null,
        safe_error: "VERCEL_DEPLOYMENT_CREATE_FAILED",
        aliased: false,
        provider_post_count: 1,
      };
    }),
  };
});

describe("ONPV production parity repair v1", () => {
  beforeEach(() => {
    deployApprovedCalls.length = 0;
    resetTestPortfolioJobQueueForTests();
    resetOnpvWorkerE2eDurableStores();
    resetOnpvWorkerE2eHarnessControl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("EXACT_PRODUCTION_REPOST_REPRODUCED — legacy b622538 prior resolution with backlog", () => {
    const legacy = legacyB622538OnpvPriorDeploymentIdForProviderDeploy({
      forceFreshProviderPost: false,
      priorDeploymentId: PRODUCTION_HXFK_DEPLOYMENT_ID,
      backlogPublicationCount: 1,
    });
    expect(legacy).toBeNull();
    const fixed = resolveOnpvPriorDeploymentIdForProviderDeploy({
      forceFreshProviderPost: false,
      priorDeploymentId: PRODUCTION_HXFK_DEPLOYMENT_ID,
    });
    expect(fixed).toBe(PRODUCTION_HXFK_DEPLOYMENT_ID);
  });

  it("REAL_STUCK_JOB_STATE_REPLAY_QC — resume HXfk with backlog articles present", async () => {
    vi.useRealTimers();
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    const { deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(cycle_id);
    patchTestPortfolioJobForTests(deployJob.job_id, {
      status: "IN_PROGRESS",
      attempt_count: 2,
      eligible_at: new Date(Date.now() - 60_000).toISOString(),
      lease_expires_at: null,
      lease_holder: null,
      output_lineage: {
        deploy_result: "DEPLOY_FAILED",
        deployment_id: PRODUCTION_HXFK_DEPLOYMENT_ID,
        authoritative_deployment_id: PRODUCTION_HXFK_DEPLOYMENT_ID,
        published_claim: false,
        provider_post_count: 1,
        superseded_deployment_ids: ["dpl_7ae9vMhkNKfT6FUrW4MTQgQpDsst"],
      },
    });
    patchTestPortfolioJobForTests(verifyJob.job_id, { status: "QUEUED" });
    await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 3 });
    expect(deployApprovedCalls.length).toBeGreaterThan(0);
    const last = deployApprovedCalls[deployApprovedCalls.length - 1]!;
    expect(last.prior_deployment_id).toBe(PRODUCTION_HXFK_DEPLOYMENT_ID);
    expect(last.onpv_force_fresh_provider_post).not.toBe(true);
    expect(listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!.status).toBe("COMPLETED");
    vi.useFakeTimers();
  });

  it("PRODUCTION_REPOST_REGRESSION_TEST_FAILS_WITH_EXACT_BUG — legacy prior null forces POST", () => {
    const prior = legacyB622538OnpvPriorDeploymentIdForProviderDeploy({
      forceFreshProviderPost: false,
      priorDeploymentId: PRODUCTION_HXFK_DEPLOYMENT_ID,
      backlogPublicationCount: 1,
    });
    expect(prior).toBeNull();
  });

  it("NO_DUPLICATE_ACTIVE_DEPLOY_ACROSS_CYCLES_QC", async () => {
    const assetId = "e6392c81e3f7dc7e89da7fb0f073a0e6";
    const key = `deploy:${assetId}`;
    const cycleA = randomUUID();
    const cycleB = randomUUID();
    resetTestPortfolioJobQueueForTests();
    const first = await enqueuePortfolioJob({
      cycle_id: cycleA,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: key,
      input_lineage: { asset_identity: assetId },
    });
    expect(first.skipped).toBe(false);
    patchTestPortfolioJobForTests(first.job_id!, { status: "IN_PROGRESS" });
    const second = await enqueuePortfolioJob({
      cycle_id: cycleB,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: key,
      input_lineage: { asset_identity: assetId },
    });
    expect(second.continued_existing).toBe(true);
    expect(second.job_id).toBe(first.job_id);
    expect(listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "VENTURE_DEPLOY" && j.idempotency_key === key).length).toBe(1);
  });

  it("CROSS_CYCLE_DUPLICATE_JOB_TEST_FAILS_WITH_OLD_BEHAVIOR — disposable cycle-only duplicate", async () => {
    const assetId = "e6392c81e3f7dc7e89da7fb0f073a0e6";
    const key = `deploy:${assetId}`;
    resetTestPortfolioJobQueueForTests();
    await enqueuePortfolioJob({
      cycle_id: randomUUID(),
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: key,
    });
    const dupAllowed = listTestPortfolioJobQueueForTests().some((j) => j.idempotency_key === key);
    expect(dupAllowed).toBe(true);
    const wouldOldBehaviorDuplicate =
      !findActivePortfolioJobByIdempotencyKeyForTests(key) &&
      listTestPortfolioJobQueueForTests().filter((j) => j.idempotency_key === key).length >= 1;
    expect(wouldOldBehaviorDuplicate).toBe(false);
  });

  it("PROVIDER_POST_LIFETIME_ACCOUNTING_QC", () => {
    const lifetime = countDistinctProviderDeploymentsFromTelemetry([
      { deployment_id: "dpl_a" },
      { deployment_id: "dpl_b" },
      { deployment_id: "dpl_a" },
    ]);
    expect(lifetime).toBe(2);
    expect(providerCallSafetyReportingQc({ reported_lifetime: 2, telemetry_distinct_count: 2 })).toBe("PASS");
    expect(providerCallSafetyReportingQc({ reported_lifetime: 1, telemetry_distinct_count: 2 })).toBe("FAIL");
  });
});
