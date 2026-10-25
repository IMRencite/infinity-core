import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  claimTestPortfolioJobs,
  portfolioJobClaimAndLeaseQc,
} from "../portfolio-job-claim-and-lease-v1";
import {
  computePortfolioJobReclaimWaitMs,
  runBoundedPortfolioJobWorkerReclaimLoop,
  shouldOnpvForceFreshProviderPost,
} from "../portfolio-job-worker-reclaim-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../autonomous-portfolio-job-queue-v1";

describe("portfolio job reclaim v1", () => {
  beforeEach(() => {
    resetTestPortfolioJobQueueForTests();
  });

  afterEach(() => {
    resetTestPortfolioJobQueueForTests();
    vi.useRealTimers();
  });

  it("claims IN_PROGRESS jobs when eligible_at elapsed", async () => {
    const cycle_id = randomUUID();
    await enqueuePortfolioJob({
      cycle_id,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: `deploy:${randomUUID()}`,
      input_lineage: {},
    });
    const row = listTestPortfolioJobQueueForTests()[0]!;
    row.status = "IN_PROGRESS";
    row.eligible_at = new Date(Date.now() - 1000).toISOString();
    const claimed = claimTestPortfolioJobs({ limit: 1, holder: "h1", cycle_id });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]!.attempt_count).toBe(1);
  });

  it("does not claim IN_PROGRESS job before eligible_at", async () => {
    const cycle_id = randomUUID();
    await enqueuePortfolioJob({
      cycle_id,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: `deploy:${randomUUID()}`,
      input_lineage: {},
    });
    expect(listTestPortfolioJobQueueForTests().length).toBe(1);
    const row = listTestPortfolioJobQueueForTests()[0]!;
    row.status = "IN_PROGRESS";
    row.eligible_at = new Date(Date.now() + 60_000).toISOString();
    const claimed = claimTestPortfolioJobs({ limit: 1, holder: "h1", cycle_id });
    expect(claimed).toHaveLength(0);
  });

  it("does not double-claim while lease active", async () => {
    const cycle_id = randomUUID();
    await enqueuePortfolioJob({
      cycle_id,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: `deploy:${randomUUID()}`,
      input_lineage: {},
    });
    expect(listTestPortfolioJobQueueForTests().length).toBe(1);
    const row = listTestPortfolioJobQueueForTests()[0]!;
    row.status = "IN_PROGRESS";
    row.eligible_at = new Date(Date.now() - 1000).toISOString();
    row.lease_expires_at = new Date(Date.now() + 120_000).toISOString();
    const claimed = claimTestPortfolioJobs({ limit: 1, holder: "h1", cycle_id });
    expect(claimed).toHaveLength(0);
  });

  it("reclaim loop waits for eligible_at then processes", async () => {
    vi.useFakeTimers();
    const cycle_id = randomUUID();
    await enqueuePortfolioJob({
      cycle_id,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: "deploy:wait",
    });
    const row = listTestPortfolioJobQueueForTests()[0]!;
    row.status = "IN_PROGRESS";
    row.eligible_at = new Date(Date.now() + 45_000).toISOString();
    let executions = 0;
    const run = runBoundedPortfolioJobWorkerReclaimLoop({
      cycle_id,
      holder: "worker:test",
      max_jobs: 1,
      slice_max_ms: 120_000,
      claim: async (input) => claimTestPortfolioJobs(input),
      execute: async () => {
        executions += 1;
      },
      now: () => Date.now(),
      sleep: (ms) => {
        vi.advanceTimersByTime(ms);
        return Promise.resolve();
      },
    });
    await vi.advanceTimersByTimeAsync(50_000);
    await run;
    expect(executions).toBe(1);
  });

  it("shouldOnpvForceFreshProviderPost allows first attempt only", () => {
    expect(
      shouldOnpvForceFreshProviderPost({
        is_onpv_new_publication: true,
        persisted_authoritative_deployment_id: null,
        allow_fresh_provider_post: false,
      }),
    ).toBe(true);
    expect(
      shouldOnpvForceFreshProviderPost({
        is_onpv_new_publication: true,
        persisted_authoritative_deployment_id: "dpl_existing",
        allow_fresh_provider_post: false,
      }),
    ).toBe(false);
  });

  it("computePortfolioJobReclaimWaitMs returns null when nothing pending", async () => {
    const wait = await computePortfolioJobReclaimWaitMs({
      now_ms: Date.now(),
      deadline_ms: Date.now() + 10_000,
    });
    expect(wait).toBeNull();
  });

  it("portfolioJobClaimAndLeaseQc PASS", () => {
    expect(portfolioJobClaimAndLeaseQc()).toBe("PASS");
  });

  it("claims IN_PROGRESS job from prior cycle when cycle_id filter omitted", async () => {
    const old_cycle = randomUUID();
    const new_cycle = randomUUID();
    await enqueuePortfolioJob({
      cycle_id: old_cycle,
      venture_id: "occupancynpv",
      job_type: "VENTURE_DEPLOY",
      idempotency_key: "deploy:old-cycle",
      input_lineage: {},
    });
    const row = listTestPortfolioJobQueueForTests()[0]!;
    row.status = "IN_PROGRESS";
    row.eligible_at = new Date(Date.now() - 1000).toISOString();
    await enqueuePortfolioJob({
      cycle_id: new_cycle,
      venture_id: "occupancynpv",
      job_type: "GROWTH_LEARNING",
      idempotency_key: "growth:new-cycle",
    });
    const claimedScoped = claimTestPortfolioJobs({ limit: 4, holder: "scoped", cycle_id: new_cycle });
    expect(claimedScoped.every((j) => j.cycle_id === new_cycle)).toBe(true);
    const claimedBacklog = claimTestPortfolioJobs({ limit: 4, holder: "backlog" });
    expect(claimedBacklog.some((j) => j.cycle_id === old_cycle)).toBe(true);
  });
});
