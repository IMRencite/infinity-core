import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ONPV_TI_WORKER_E2E_FIXTURE,
  resetOnpvWorkerE2eDurableStores,
  resetOnpvWorkerE2eHarnessControl,
  seedBuiltTiNewPublicationJobs,
  seedWorkerE2ePortfolioCycle,
  cyclePublicationCounterSnapshot,
  tiPublicationRegistryRows,
} from "../onpv-new-publication-worker-e2e-harness-v1";
import { listTestPortfolioJobQueueForTests } from "../durable/autonomous-portfolio-job-queue-v1";
import { executePortfolioJobRowForTests, runPortfolioJobWorker } from "../durable/portfolio-job-worker-v1";
import { readOnpvOpportunityLifecycle } from "../onpv-durable-opportunity-state-v1";
import * as reclaimModule from "../durable/portfolio-job-worker-reclaim-v1";

export const onpvDeployReclaimSimState = {
  deploymentId: "dpl_TEST_A",
  providerCreates: 0,
  readyAfterMs: 65_000,
  createdAtMs: 0,
  aliasFailOnce: false,
  aliasFailures: 0,
  terminalOnSecondPoll: false,
  terminalPollCount: 0,
};

vi.mock("../durable/async-venture-deployment-reconciliation-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../durable/async-venture-deployment-reconciliation-v1")>();
  return {
    ...original,
    executeBoundedVentureDeploy: vi.fn(async (input) => {
      const sim = onpvDeployReclaimSimState;
      const now = Date.now();
      const prior = input.prior_deployment_id?.trim();
      if (prior?.startsWith("dpl_")) {
        if (sim.terminalOnSecondPoll && sim.terminalPollCount === 0) {
          sim.terminalPollCount += 1;
          return {
            phase: "COMPLETED" as const,
            ok: false,
            deployment_id: prior,
            production_url: null,
            safe_error: "VERCEL_DEPLOYMENT_FAILED",
            provider_post_count: 0,
          };
        }
        if (sim.aliasFailOnce && sim.aliasFailures === 0) {
          sim.aliasFailures += 1;
          return {
            phase: "IN_PROGRESS" as const,
            deployment_id: prior,
            safe_error: "DEPLOY_IN_PROGRESS" as const,
            provider_post_count: 0,
          };
        }
        if (now - sim.createdAtMs >= sim.readyAfterMs) {
          return {
            phase: "COMPLETED" as const,
            ok: true,
            deployment_id: prior,
            production_url: ONPV_TI_WORKER_E2E_FIXTURE.canonical,
            safe_error: null,
            provider_post_count: 0,
          };
        }
        return {
          phase: "IN_PROGRESS" as const,
          deployment_id: prior,
          safe_error: "DEPLOY_IN_PROGRESS" as const,
          provider_post_count: 0,
        };
      }
      sim.providerCreates += 1;
      sim.createdAtMs = now;
      await input.on_deployment_submitted?.(sim.deploymentId);
      return {
        phase: "IN_PROGRESS" as const,
        deployment_id: sim.deploymentId,
        safe_error: "DEPLOY_IN_PROGRESS" as const,
        provider_post_count: 1,
      };
    }),
  };
});

vi.mock("../occupancynpv-production-publish-proof-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../occupancynpv-production-publish-proof-v1")>();
  return {
    ...original,
    verifyOccupancyNpvProductionPublication: vi.fn(async (input) => ({
      AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "PASS" as const,
      http_status: 200,
      canonical_ok: true,
      schema_ok: true,
      responsive_marker_ok: true,
      expected_path: input.expected_path,
    })),
  };
});

function resetSim() {
  onpvDeployReclaimSimState.providerCreates = 0;
  onpvDeployReclaimSimState.createdAtMs = 0;
  onpvDeployReclaimSimState.aliasFailOnce = false;
  onpvDeployReclaimSimState.aliasFailures = 0;
  onpvDeployReclaimSimState.terminalOnSecondPoll = false;
  onpvDeployReclaimSimState.terminalPollCount = 0;
  onpvDeployReclaimSimState.readyAfterMs = 65_000;
}

describe("ONPV post-ready deploy reclaim E2E", () => {
  beforeEach(() => {
    resetOnpvWorkerE2eDurableStores();
    resetOnpvWorkerE2eHarnessControl();
    resetSim();
    vi.useFakeTimers();
    delete process.env.PORTFOLIO_JOB_RECLAIM_LOOP_DISABLED;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.PORTFOLIO_JOB_RECLAIM_LOOP_DISABLED;
  });

  it("ONPV_POST_READY_DEPLOY_RECLAIM_E2E_QC — resume READY deployment without second POST", async () => {
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    await seedBuiltTiNewPublicationJobs(cycle_id);
    const run = runPortfolioJobWorker({ cycle_id });
    await vi.advanceTimersByTimeAsync(120_000);
    await run;
    const deploy = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!;
    const verify = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "PRODUCTION_VERIFY")!;
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
    expect(deploy.status).toBe("COMPLETED");
    expect(String(deploy.output_lineage.deployment_id)).toBe("dpl_TEST_A");
    expect(verify.status).toBe("COMPLETED");
    expect(readOnpvOpportunityLifecycle(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id)).toBe("PUBLISHED");
    expect(cyclePublicationCounterSnapshot(cycle_id).blogs_published).toBe(1);
    expect(tiPublicationRegistryRows().length).toBe(1);
  });

  it("NO_DUPLICATE_PROVIDER_DEPLOY_ON_RECLAIM_QC", async () => {
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    await seedBuiltTiNewPublicationJobs(cycle_id);
    const run = runPortfolioJobWorker({ cycle_id });
    await vi.advanceTimersByTimeAsync(120_000);
    await run;
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
  });

  it("LONG_PROVIDER_BUILD_OUTLIVES_SLICE_QC", async () => {
    onpvDeployReclaimSimState.readyAfterMs = 70_000;
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    await seedBuiltTiNewPublicationJobs(cycle_id);
    const run = runPortfolioJobWorker({ cycle_id });
    await vi.advanceTimersByTimeAsync(130_000);
    await run;
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
    expect(listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!.status).toBe("COMPLETED");
  });

  it("RECLAIM_TEST_FAILS_WITH_CURRENT_STUCK_JOB_BUG when reclaim loop disabled", async () => {
    process.env.PORTFOLIO_JOB_RECLAIM_LOOP_DISABLED = "true";
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    await seedBuiltTiNewPublicationJobs(cycle_id);
    const run = runPortfolioJobWorker({ cycle_id });
    await vi.advanceTimersByTimeAsync(120_000);
    await run;
    const deploy = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!;
    expect(deploy.status).toBe("IN_PROGRESS");
  });

  it("RESUME_TEST_FAILS_WITH_FORCE_FRESH_REPOST_BUG when force-fresh always true", async () => {
    vi.useRealTimers();
    vi.spyOn(reclaimModule, "shouldOnpvForceFreshProviderPost").mockReturnValue(true);
    resetSim();
    onpvDeployReclaimSimState.readyAfterMs = 0;
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    const { deployJob } = await seedBuiltTiNewPublicationJobs(cycle_id);
    resetSim();
    onpvDeployReclaimSimState.readyAfterMs = 0;
    await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 1 });
    const mid = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    mid.status = "IN_PROGRESS";
    mid.output_lineage = {
      deployment_id: "dpl_TEST_A",
      authoritative_deployment_id: "dpl_TEST_A",
    };
    await executePortfolioJobRowForTests({ ...mid, status: "RUNNING", attempt_count: 2 });
    expect(onpvDeployReclaimSimState.providerCreates).toBeGreaterThan(1);
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it("POST_BEFORE_CRASH_RECOVERY_QC — authoritative id resumes without POST", async () => {
    vi.useRealTimers();
    resetSim();
    onpvDeployReclaimSimState.readyAfterMs = 0;
    onpvDeployReclaimSimState.providerCreates = 1;
    onpvDeployReclaimSimState.createdAtMs = Date.now() - 80_000;
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    const { deployJob } = await seedBuiltTiNewPublicationJobs(cycle_id);
    onpvDeployReclaimSimState.providerCreates = 1;
    onpvDeployReclaimSimState.createdAtMs = Date.now() - 80_000;
    const row = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    row.status = "IN_PROGRESS";
    row.output_lineage = {
      ...row.output_lineage,
      deployment_id: "dpl_TEST_A",
      authoritative_deployment_id: "dpl_TEST_A",
    };
    await executePortfolioJobRowForTests({ ...row, status: "RUNNING", attempt_count: 2 });
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
    expect(listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!.status).toBe("COMPLETED");
    vi.useFakeTimers();
  });

  it("ALIAS_RETRY_DOES_NOT_REDEPLOY_QC", async () => {
    vi.useRealTimers();
    onpvDeployReclaimSimState.aliasFailOnce = true;
    onpvDeployReclaimSimState.readyAfterMs = 0;
    onpvDeployReclaimSimState.providerCreates = 1;
    onpvDeployReclaimSimState.createdAtMs = Date.now() - 1000;
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    const { deployJob } = await seedBuiltTiNewPublicationJobs(cycle_id);
    const row = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    row.status = "IN_PROGRESS";
    row.output_lineage = {
      ...row.output_lineage,
      deployment_id: "dpl_TEST_A",
      authoritative_deployment_id: "dpl_TEST_A",
    };
    await executePortfolioJobRowForTests({ ...row, status: "RUNNING", attempt_count: 2 });
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
    expect(listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!.status).toBe("IN_PROGRESS");
    onpvDeployReclaimSimState.aliasFailOnce = false;
    const retry = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    await executePortfolioJobRowForTests({ ...retry, status: "RUNNING", attempt_count: 3 });
    expect(onpvDeployReclaimSimState.providerCreates).toBe(1);
    expect(listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!.status).toBe("COMPLETED");
    vi.useFakeTimers();
  });

  it("TERMINAL_PROVIDER_FAILURE_REPLACEMENT_QC clears authoritative id and allows fresh POST", async () => {
    vi.useRealTimers();
    resetSim();
    onpvDeployReclaimSimState.readyAfterMs = 0;
    onpvDeployReclaimSimState.terminalOnSecondPoll = true;
    onpvDeployReclaimSimState.providerCreates = 1;
    const cycle_id = randomUUID();
    seedWorkerE2ePortfolioCycle(cycle_id);
    const { deployJob } = await seedBuiltTiNewPublicationJobs(cycle_id);
    const row = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    row.status = "IN_PROGRESS";
    row.output_lineage = {
      ...row.output_lineage,
      deployment_id: "dpl_TEST_A",
      authoritative_deployment_id: "dpl_TEST_A",
    };
    await executePortfolioJobRowForTests({ ...row, status: "RUNNING", attempt_count: 2 });
    const after = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    expect(after.status).toBe("FAILED");
    expect(after.output_lineage.allow_fresh_provider_post).toBe(true);
    expect(after.output_lineage.authoritative_deployment_id).toBeNull();
    onpvDeployReclaimSimState.terminalOnSecondPoll = false;
    onpvDeployReclaimSimState.terminalPollCount = 0;
    onpvDeployReclaimSimState.providerCreates = 0;
    after.status = "IN_PROGRESS";
    after.output_lineage = { allow_fresh_provider_post: true };
    await executePortfolioJobRowForTests({ ...after, status: "RUNNING", attempt_count: 3 });
    expect(onpvDeployReclaimSimState.providerCreates).toBeGreaterThanOrEqual(1);
    vi.useFakeTimers();
  });
});

