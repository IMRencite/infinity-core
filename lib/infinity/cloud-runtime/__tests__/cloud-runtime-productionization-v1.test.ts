import { describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { occupancyNpvAffiliateProgram } from "@/lib/infinity/affiliate-referral/occupancy";
import { occupancyNpvFinancialLock } from "@/lib/infinity/affiliate-referral/occupancy";
import {
  CLOUD_RUNTIME_PRODUCTION_URL,
  CLOUD_RUNTIME_PROJECT,
  CLOUD_RUNTIME_PROJECT_ID,
  LOCAL_LOOP_STATE_FILE,
  MemoryCloudRuntimeStore,
  authorizeCloudRuntimeRequest,
  boundedRetryEligible,
  cloudRuntimeFinancialLock,
  evaluateAlwaysOnAutonomyGate,
  evaluateAlwaysOnAutonomyProductionGate,
  evaluateCloudRuntimeArtifactIdentityGate,
  evaluateCloudRuntimeAuthorizationGate,
  evaluateCloudRuntimeCatchupGate,
  evaluateCloudRuntimeEventWakeGate,
  evaluateCloudRuntimeHeartbeatGate,
  evaluateCloudRuntimeIdempotencyGate,
  evaluateCloudRuntimeLeaseGate,
  evaluateCloudRuntimeNoLocalDependencyGate,
  evaluateCloudRuntimePersistenceGate,
  evaluateCloudRuntimeRestartSafetyGate,
  evaluateCloudRuntimeRunawayGate,
  evaluateCloudRuntimeSchedulerGate,
  evaluateCloudRuntimeSingleSchedulerGate,
  executeCloudRuntimeWake,
  occupancyNpvCampaignMustNotDuplicate,
  observeCloudRuntimePortfolio,
  productionUsesLocalLoopFile,
  publicCloudRuntimeProjection,
  publicProjectionHidesRuntimeSecrets,
  readCloudRuntimeSchedulerConfig,
  resolveCloudRuntimeCatchup,
  sanitizeRuntimeError,
  technicalFailureIsNotBusinessRejection,
  verifyCloudRuntimeEventSignature,
} from "..";

describe("Cloud Runtime Productionization V1", () => {
  it("1-4. durable store, no local file, scheduler, scheduler auth", async () => {
    const store = new MemoryCloudRuntimeStore();
    expect(store.kind).toBe("DURABLE_MEMORY");
    expect(store.uses_local_file).toBe(false);
    expect(productionUsesLocalLoopFile()).toBe(false);
    expect(evaluateCloudRuntimePersistenceGate(store).result).toBe("PASS");
    expect(evaluateCloudRuntimeSchedulerGate().result).toBe("PASS");
    const config = readCloudRuntimeSchedulerConfig();
    expect(config.hourly).toBe(true);
    expect(config.daily).toBe(true);
    expect(evaluateCloudRuntimeAuthorizationGate().result).toBe("PASS");
    expect(authorizeCloudRuntimeRequest(
      new Request("https://infinity-runtime.vercel.app/api/runtime/tick"),
      {},
    ).ok).toBe(false);
  });

  it("5-9. mutation auth, atomic lease, concurrency, expiry, active lease", async () => {
    expect(evaluateCloudRuntimeAuthorizationGate().reasons[0]).toBe("BEARER_REQUIRED");
    expect((await evaluateCloudRuntimeLeaseGate()).result).toBe("PASS");
    expect((await evaluateCloudRuntimeRunawayGate()).result).toBe("PASS");
  });

  it("10-13. persist across invocations, restart, replayed wake, duplicate event", async () => {
    const store = new MemoryCloudRuntimeStore();
    const first = await executeCloudRuntimeWake({
      source: "CRON_HOURLY",
      now: "2026-09-15T08:00:00.000Z",
      store,
      holder: "inv-1",
    });
    const snap = store.snapshot();
    const next = new MemoryCloudRuntimeStore();
    next.restore(snap);
    const second = await executeCloudRuntimeWake({
      source: "CRON_HOURLY",
      now: "2026-09-15T08:10:00.000Z",
      store: next,
      holder: "inv-2",
    });
    expect(first.ran).toBe(true);
    expect(second.ran).toBe(true);
    expect(second.mission_created).toBe(false);
    expect(second.state.local_file_used).toBe(false);
    expect((await evaluateCloudRuntimeRestartSafetyGate()).result).toBe("PASS");
    expect((await evaluateCloudRuntimeIdempotencyGate()).result).toBe("PASS");
  });

  it("14-18. catch-up, daily review, idle/wait remain valid, provider failure", async () => {
    expect((await evaluateCloudRuntimeCatchupGate()).result).toBe("PASS");
    const store = new MemoryCloudRuntimeStore();
    const daily = await executeCloudRuntimeWake({
      source: "CRON_DAILY",
      now: "2026-09-15T16:00:00.000Z",
      store,
      holder: "daily",
    });
    expect(["NO_ACTION_JUSTIFIED", "CONTINUE_EXISTING_ACTION", "WAIT_FOR_EVIDENCE", "BLOCKED_BY_PROVIDER", "REPAIR_REQUIRED", "EXECUTE_ACTION"].includes(daily.decision ?? "")).toBe(true);
    expect(["IDLE", "WAITING", "HEALTHY", "DEGRADED", "BLOCKED"].includes(daily.state.heartbeat.state)).toBe(true);
    expect(technicalFailureIsNotBusinessRejection("PROVIDER_TIMEOUT")).toBe(true);
    expect(technicalFailureIsNotBusinessRejection("NO_MARKET")).toBe(false);
  });

  it("19-24. bounded retry, failed work, heartbeat, healthy>200, artifact, HQ observer", async () => {
    expect(boundedRetryEligible(4)).toBe(true);
    expect(boundedRetryEligible(5)).toBe(false);
    const store = new MemoryCloudRuntimeStore();
    await store.recordFailure({
      action_id: "fail-1",
      reason: "TECHNICAL_FAILURE",
      attempt_count: 1,
      provider: "gmail",
      at: "2026-09-15T08:00:00.000Z",
      safe_error: sanitizeRuntimeError("Bearer supersecret"),
      recovery_state: "RETRY_ELIGIBLE",
      next_retry_at: "2026-09-15T08:15:00.000Z",
    });
    const failed = (await store.load("2026-09-15T08:00:00.000Z")).failed_work[0];
    expect(failed.safe_error).not.toMatch(/supersecret/);
    expect((await evaluateCloudRuntimeHeartbeatGate()).result).toBe("PASS");
    expect(evaluateCloudRuntimeArtifactIdentityGate({ deployment_id: "dpl_test", git_sha: "abc" }).result).toBe("PASS");
    const ran = await executeCloudRuntimeWake({
      source: "CRON_HOURLY",
      now: "2026-09-15T08:00:00.000Z",
      store,
      holder: "hq",
    });
    expect(ran.hq.execution_dependency).toBe(false);
    expect(ran.hq.distinction).toBe("CLOUD");
  });

  it("25-32. no HQ/browser/PC/IMROS required; sales+affiliate observe and fixture wakes", async () => {
    const observation = observeCloudRuntimePortfolio();
    expect(observation.occupancy_loaded).toBe(true);
    expect(observation.sales_floor_available).toBe(true);
    expect(observation.affiliate_available).toBe(true);
    expect(observation.campaign_id).toBe(OCCUPANCYNPV_GROWTH_CAMPAIGN_ID);
    expect(occupancyNpvCampaignMustNotDuplicate(OCCUPANCYNPV_GROWTH_CAMPAIGN_ID)).toBe(true);
    expect((await evaluateCloudRuntimeEventWakeGate()).result).toBe("PASS");
    const store = new MemoryCloudRuntimeStore();
    const sales = await executeCloudRuntimeWake({
      source: "EVENT",
      now: "2026-09-15T08:00:00.000Z",
      store,
      holder: "sales",
      event: {
        event_id: "sales-1",
        type: "SALES_REPLY",
        at: "2026-09-15T08:00:00.000Z",
        venture_id: CRE_VENTURE_ID,
        reason: "fixture reply",
        fixture: true,
      },
    });
    expect(sales.sales_outreach_sent).toBe(false);
    const aff = occupancyNpvAffiliateProgram();
    expect(aff.activated).toBe(false);
  });

  it("33-40. no duplicate campaign, no real outreach/payout, money movement stays disabled", async () => {
    const money = cloudRuntimeFinancialLock();
    expect(money.verified_cash).toBe(50);
    expect(money.occupancynpv_allocation).toBe(25);
    expect(money.spend_authority).toBe(5);
    expect(money.committed).toBe(0);
    expect(money.actual_spend).toBe(0);
    expect(money.paid_acquisition).toBe(0);
    expect(money.mercury).toBe("READ_ONLY");
    expect(money.general_money_movement).toBe("DISABLED");
    expect(money.autonomous_financial_commitments).toBe("DISABLED");
    expect(money.affiliate_live_payout).toBe("DISABLED");
    expect(occupancyNpvFinancialLock().mercury).toBe("READ_ONLY");
    const store = new MemoryCloudRuntimeStore();
    const result = await executeCloudRuntimeWake({
      source: "CRON_HOURLY",
      now: "2026-09-15T08:00:00.000Z",
      store,
      holder: "safe",
    });
    expect(result.payout_executed).toBe(false);
    expect(result.sales_outreach_sent).toBe(false);
    expect(result.affiliate_outreach_sent).toBe(false);
    expect(result.state.observation.duplicate_campaign).toBe(false);
  });

  it("41-48. public privacy, runaway, restart, no local file, scheduler config, AlwaysOnAutonomy", async () => {
    const publicJson = JSON.stringify(publicCloudRuntimeProjection());
    expect(publicProjectionHidesRuntimeSecrets(publicJson)).toBe(true);
    expect(publicJson).not.toMatch(/CRON_SECRET/);
    expect((await evaluateCloudRuntimeRunawayGate()).result).toBe("PASS");
    expect((await evaluateCloudRuntimeNoLocalDependencyGate()).result).toBe("PASS");
    expect(LOCAL_LOOP_STATE_FILE).toContain(".infinity/autonomous-operating-loop");
    expect(evaluateCloudRuntimeSingleSchedulerGate({ VERCEL: "1" }).result).toBe("PASS");
    expect(evaluateCloudRuntimeSingleSchedulerGate({ INFINITY_LOCAL_PRODUCTION_SCHEDULER: "1" }).result).toBe("FAIL");
    expect((await evaluateAlwaysOnAutonomyGate()).result).toBe("PASS");
    expect(evaluateAlwaysOnAutonomyProductionGate().result).toBe("FAIL");
    expect(evaluateAlwaysOnAutonomyProductionGate({
      runtime_deployed: true,
      durable_postgres: true,
      production_scheduler_live: true,
      authenticated_wake: true,
      independent_invocations: true,
      lease_proven: true,
      idempotency_proven: true,
      restart_continuity: true,
      artifact_identity: true,
      heartbeat_healthy: true,
      founder_pc_required: false,
      founder_browser_required: false,
      hq_required: false,
      public_imros_required: false,
      local_state_file_required: false,
    }).result).toBe("PASS");
    expect(CLOUD_RUNTIME_PROJECT).toBe("infinity-runtime");
    expect(CLOUD_RUNTIME_PROJECT_ID).toBe("prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox");
    expect(CLOUD_RUNTIME_PRODUCTION_URL).toBe("https://infinity-runtime.vercel.app");
    expect(verifyCloudRuntimeEventSignature(
      new Request("https://infinity-runtime.vercel.app/api/runtime/wake", {
        headers: { authorization: "Bearer wake" },
      }),
      { CRON_SECRET: "wake" },
    ).ok).toBe(true);
    const catchup = resolveCloudRuntimeCatchup({
      state: (await new MemoryCloudRuntimeStore().load("2026-09-15T08:00:00.000Z")),
      now: "2026-09-15T08:00:00.000Z",
    });
    expect(catchup.replay_missed_ticks).toBe(false);
  });
});
