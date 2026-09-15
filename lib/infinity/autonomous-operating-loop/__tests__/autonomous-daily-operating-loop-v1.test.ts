import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { resetCanonicalWorkStore, listCanonicalWork } from "@/lib/infinity/canonical-work/store";
import { evaluateHQLiveWorkSurfaceConsistencyGate } from "@/lib/infinity/canonical-work/gates";
import {
  AUTONOMOUS_LOOP_STATES,
  completeAutonomousMissionAndContinue,
  evaluateAutonomousActionIdempotencyGate,
  evaluateAutonomousLoopRestartSafetyGate,
  evaluateAutonomousLoopRunawayGate,
  evaluateAutonomousMissionDeduplicationGate,
  evaluateAutonomousNextMissionGate,
  evaluateAutonomousOperatingLoopGate,
  evaluateFinancialAuthorityBeforeActionGate,
  evaluateLearningToActionGate,
  evaluateLoopNoMoneyMovementGate,
  evaluateNoBusyworkGate,
  evaluatePaidAcquisitionAuthorityLoopGate,
  evaluateProviderFailureBusinessInferenceGate,
  evaluateUniversalQCBeforeReleaseGate,
  evaluateWaitingForEvidenceValidityGate,
  executeAutonomousDailyOperatingLoop,
  loadAutonomousLoopState,
  projectAutonomousOperations,
  projectDailyReviews,
  resetAutonomousLoopMemoryForTests,
  wakeAutonomousLoop,
} from "..";
import type { ObservedVenture } from "../observe";

function occupancy(partial: Partial<ObservedVenture> = {}): Partial<ObservedVenture> {
  return {
    venture_id: CRE_VENTURE_ID,
    display_name: "OccupancyNPV",
    eligible: true,
    paused: false,
    checkout_unhealthy: false,
    checkout_ready: true,
    growth_active: false,
    send_executed: false,
    replies: 0,
    replies_pending: false,
    reply_class: null,
    unsubscribe: false,
    remaining_spend_authority: 5,
    remaining_allocation: 25,
    committed: 0,
    actual_spend: 0,
    provider_health: "HEALTHY",
    provider_failure_class: "NONE",
    active_mission_id: null,
    active_mission_title: null,
    qc_blocked: false,
    ...partial,
  };
}

function run(partial: Partial<ObservedVenture> = {}, extra?: { createMission?: boolean; executeExternal?: boolean; persist?: boolean; cwd?: string; now?: string }) {
  return executeAutonomousDailyOperatingLoop({
    now: extra?.now ?? "2026-09-14T23:40:00.000Z",
    persist: extra?.persist ?? true,
    createMission: extra?.createMission ?? false,
    executeExternal: extra?.executeExternal ?? false,
    cwd: extra?.cwd,
    overrides: { occupancy: occupancy(partial), skip_disk_finance: true },
  });
}

describe("Autonomous Daily Operating Loop V1", () => {
  beforeEach(() => {
    resetAutonomousLoopMemoryForTests();
    resetCanonicalWorkStore();
  });
  afterEach(() => {
    resetAutonomousLoopMemoryForTests();
    resetCanonicalWorkStore();
  });

  it("1. no active mission → loop evaluates next action", () => {
    const result = run();
    expect(result.decision.contract).toBe("AutonomousNextMissionResolver");
    expect(result.decision.outcome).toBe("NO_ACTION_JUSTIFIED");
    expect(result.mission_created).toBe(false);
  });

  it("2. active mission → loop does not create duplicate", () => {
    const result = run({ active_mission_id: "work:existing:mission", active_mission_title: "Existing" }, { createMission: true });
    expect(result.decision.outcome).toBe("CONTINUE_EXISTING_ACTION");
    expect(result.mission_created).toBe(false);
    expect(evaluateAutonomousMissionDeduplicationGate({
      proposed: result.decision.selected_mission,
      active: ["work:existing:mission"],
      recent: [],
      created: result.mission_created,
    }).result).toBe("PASS");
  });

  it("3. mission completion → next evaluation automatically occurs", () => {
    const created = run({ reply_class: "INTERESTED" }, { createMission: true });
    expect(created.mission_created).toBe(true);
    const next = completeAutonomousMissionAndContinue({
      workId: created.mission_id!,
      output: "reply classified",
      now: "2026-09-14T23:41:00.000Z",
      persist: true,
      createMission: false,
      overrides: { occupancy: occupancy({ reply_class: null }), skip_disk_finance: true },
    });
    expect(next.decision.outcome).toBeDefined();
    expect(next.state.last_completed_mission_id).toBe(created.mission_id);
    expect(listCanonicalWork().find((row) => row.work_id === created.mission_id)?.status).toBe("COMPLETED");
  });

  it("4. no justified action → IDLE_NO_ACTION", () => {
    const result = run();
    expect(result.portfolio_state).toBe("IDLE_NO_ACTION");
    expect(evaluateNoBusyworkGate({
      outcome: result.decision.outcome,
      missionCreated: result.mission_created,
      spendAttempted: result.decision.spend_required > 0,
    }).result).toBe("PASS");
  });

  it("5. real dependency → WAITING_FOR_EVIDENCE", () => {
    const result = run({ send_executed: true, sends_attempted: 1, replies_pending: true, growth_active: true, campaign_id: "campaign:test" });
    expect(result.decision.outcome).toBe("WAIT_FOR_EVIDENCE");
    expect(result.portfolio_state).toBe("WAITING_FOR_EVIDENCE");
    expect(evaluateWaitingForEvidenceValidityGate({
      outcome: result.decision.outcome,
      lastActionKind: "SEND_EXECUTED",
      dependencyKind: result.state.waiting_dependency?.kind ?? null,
    }).result).toBe("PASS");
  });

  it("6. waiting state resumes on event", () => {
    run({ send_executed: true, sends_attempted: 1, replies_pending: true, growth_active: true, campaign_id: "campaign:test" });
    wakeAutonomousLoop({
      type: "CUSTOMER_REPLY",
      at: "2026-09-14T23:42:00.000Z",
      venture_id: CRE_VENTURE_ID,
      reason: "Interested — can you show a demo?",
    });
    const resumed = executeAutonomousDailyOperatingLoop({
      now: "2026-09-14T23:42:00.000Z",
      persist: true,
      overrides: {
        occupancy: occupancy({ send_executed: true, sends_attempted: 1, replies_pending: true, growth_active: true, campaign_id: "campaign:test" }),
        skip_disk_finance: true,
      },
    });
    expect(resumed.decision.outcome).toBe("EXECUTE_ACTION");
    expect(resumed.decision.selected_mission).toBe("CUSTOMER_REPLY_INTERESTED");
  });

  it("7. scheduled daily review persists", () => {
    const first = run();
    expect(first.daily_review_ran).toBe(true);
    expect(first.state.next_daily_review_at).toBeTruthy();
    const second = executeAutonomousDailyOperatingLoop({
      now: "2026-09-14T23:43:00.000Z",
      persist: true,
      overrides: { occupancy: occupancy(), skip_disk_finance: true, loop: first.state },
    });
    expect(second.daily_review_ran).toBe(false);
    expect(second.state.next_daily_review_at).toBe(first.state.next_daily_review_at);
  });

  it("8 + 28. restart resumes safely and survives process restart", () => {
    const cwd = mkdtempSync(join(tmpdir(), "aol-"));
    const previous = process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST;
    process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST = "1";
    try {
      const first = run({ reply_class: "QUESTION" }, { persist: true, cwd, executeExternal: true, createMission: true });
      resetAutonomousLoopMemoryForTests();
      const loaded = loadAutonomousLoopState({ now: "2026-09-14T23:44:00.000Z", cwd });
      expect(loaded.last_decision?.outcome).toBe(first.decision.outcome);
      expect(evaluateAutonomousLoopRestartSafetyGate({ loadedState: true, duplicateExternalAction: false }).result).toBe("PASS");
      const second = executeAutonomousDailyOperatingLoop({
        now: "2026-09-14T23:44:00.000Z",
        persist: true,
        cwd,
        executeExternal: true,
        createMission: true,
        overrides: { occupancy: occupancy({ reply_class: "QUESTION" }), skip_disk_finance: true },
      });
      expect(second.action_result).toBe("SKIPPED_IDEMPOTENT_DUPLICATE");
      expect(evaluateAutonomousActionIdempotencyGate({
        firstKey: first.state.last_action_idempotency_key,
        retryKey: second.state.last_action_idempotency_key,
        firstCount: 1,
        retryCount: 1,
      }).result).toBe("PASS");
    } finally {
      if (previous == null) delete process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST;
      else process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST = previous;
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("9. duplicate mission prevention", () => {
    const first = run({ reply_class: "QUESTION" }, { createMission: true });
    const second = run({ reply_class: "QUESTION" }, { createMission: true });
    expect(first.mission_created).toBe(true);
    expect(second.mission_created).toBe(false);
  });

  it("10. duplicate external action prevention", () => {
    const first = run({ reply_class: "POSITIVE" }, { executeExternal: true });
    const second = run({ reply_class: "POSITIVE" }, { executeExternal: true });
    expect(first.action_executed).toBe(true);
    expect(second.action_executed).toBe(false);
    expect(second.action_result).toBe("SKIPPED_IDEMPOTENT_DUPLICATE");
  });

  it("11. provider failure not treated as market rejection", () => {
    const result = run({ provider_health: "FAILED", provider_failure_class: "PROVIDER_FAILURE", growth_active: true });
    expect(result.decision.outcome).toBe("BLOCKED_BY_PROVIDER");
    expect(result.decision.evidence).toContain("PROVIDER_FAILURE_NE_MARKET_FAILURE");
    expect(evaluateProviderFailureBusinessInferenceGate({
      failureClass: "PROVIDER_FAILURE",
      inferredMarketRejection: false,
    }).result).toBe("PASS");
  });

  it("12. technical failure does not produce business learning", () => {
    const result = run({ provider_health: "FAILED", provider_failure_class: "PROVIDER_FAILURE" });
    const learned = result.state.learning[result.state.learning.length - 1];
    expect(learned.class).toBe("PROVIDER_FAILURE");
    expect(learned.changes_business_inference).toBe(false);
  });

  it("13. customer reply creates relevant action", () => {
    const result = run({ reply_class: "OBJECTION" }, { createMission: true });
    expect(result.decision.outcome).toBe("EXECUTE_ACTION");
    expect(result.decision.selected_mission).toBe("CUSTOMER_REPLY_OBJECTION");
    expect(result.mission_created).toBe(true);
  });

  it("14. unsubscribe suppresses future outreach", () => {
    const result = run({ unsubscribe: true, growth_active: true, campaign_id: "campaign:test" });
    expect(result.decision.outcome).toBe("NO_ACTION_JUSTIFIED");
    expect(result.decision.reason).toContain("UNSUBSCRIBE");
    expect(result.mission_created).toBe(false);
  });

  it("15. paid acquisition remains blocked", () => {
    const result = run({ remaining_spend_authority: 5 });
    expect(result.decision.alternatives_considered).toContain("PAID_ACQUISITION");
    expect(result.paid_acquisition_attempted).toBe(false);
    expect(evaluatePaidAcquisitionAuthorityLoopGate({
      paidAcquisitionAttempted: false,
      paidAcquisitionAuthority: 0,
    }).result).toBe("PASS");
  });

  it("16. spend authority does not force spending", () => {
    const result = run({ remaining_spend_authority: 5 });
    expect(result.decision.spend_required).toBe(0);
    expect(result.decision.financial_exposure).toBe(0);
    expect(evaluateFinancialAuthorityBeforeActionGate({
      spendRequired: result.decision.spend_required,
      remainingAuthority: 5,
      spendBecauseAuthorityExists: false,
      commitmentCreated: false,
    }).result).toBe("PASS");
  });

  it("17 + 18. financial action without commitment governance blocked; autonomous commitment disabled", () => {
    const result = run({ remaining_spend_authority: 5 });
    expect(result.commitment_created).toBe(false);
    expect(result.decision.recommended_commitment?.created).toBe(false);
    expect(result.gates.find((row) => row.gate === "AutonomousCommitmentDisabledGate")?.result).toBe("PASS");
  });

  it("19. no money movement possible", () => {
    const result = run();
    expect(result.money_moved).toBe(false);
    expect(evaluateLoopNoMoneyMovementGate(false).result).toBe("PASS");
  });

  it("20. learning affects future action selection", () => {
    const first = run({ provider_health: "FAILED", provider_failure_class: "PROVIDER_FAILURE", growth_active: true, campaign_id: "campaign:test" });
    expect(first.state.learning.some((row) => row.next_behavior === "SKIP_OUTREACH_AFTER_PROVIDER_FAILURE")).toBe(true);
    const second = executeAutonomousDailyOperatingLoop({
      now: "2026-09-14T23:45:00.000Z",
      persist: true,
      overrides: {
        occupancy: occupancy({ growth_active: true, campaign_id: "campaign:test", provider_health: "HEALTHY" }),
        skip_disk_finance: true,
        loop: first.state,
      },
    });
    expect(second.decision.outcome).toBe("BLOCKED_BY_PROVIDER");
    expect(second.decision.reason).toContain("LEARNING_BLOCKS_OUTREACH");
    expect(evaluateLearningToActionGate({ learningRecorded: true, behaviorChanged: true }).result).toBe("PASS");
  });

  it("21. completed missions remain history", () => {
    const created = run({ reply_class: "QUESTION" }, { createMission: true });
    completeAutonomousMissionAndContinue({
      workId: created.mission_id!,
      output: "done",
      now: "2026-09-14T23:46:00.000Z",
      persist: true,
      overrides: { occupancy: occupancy(), skip_disk_finance: true },
    });
    const history = listCanonicalWork().find((row) => row.work_id === created.mission_id);
    expect(history?.status).toBe("COMPLETED");
    expect(loadAutonomousLoopState().mission_history).toContain(created.mission_id);
  });

  it("22. current work correctly idles", () => {
    const result = run();
    expect(result.portfolio_state).toBe("IDLE_NO_ACTION");
    expect(listCanonicalWork().filter((row) => row.status === "ACTIVE")).toHaveLength(0);
    const projection = projectAutonomousOperations({ now: "2026-09-14T23:47:00.000Z" });
    expect(projection.current_mission).toBeNull();
    expect(projection.agents).toContain("PRESENT_IDLE");
  });

  it("23. rooms/agents reflect autonomous mission", () => {
    run({ reply_class: "POSITIVE" }, { createMission: true });
    const projection = projectAutonomousOperations({ now: "2026-09-14T23:48:00.000Z" });
    expect(projection.loop_state).toBe("MISSION_ACTIVE");
    expect(projection.rooms.length).toBeGreaterThan(0);
    expect(projection.agents).not.toEqual(["PRESENT_IDLE"]);
  });

  it("24. daily review covers all operating ventures", () => {
    const result = run();
    const reviews = projectDailyReviews(result.observation);
    expect(reviews.map((row) => row.venture_id)).toEqual([CRE_VENTURE_ID, ASKREVIEW_VENTURE_ID]);
  });

  it("25. paused venture is not operated as active", () => {
    const result = run();
    const ask = result.observation.askreview;
    expect(ask?.paused).toBe(true);
    expect(ask?.eligible).toBe(false);
    expect(projectDailyReviews(result.observation).find((row) => row.venture_id === ASKREVIEW_VENTURE_ID)?.highest_value_next_action).toBe("HOLD_PAUSED_VENTURE");
  });

  it("26. AskReview remains paused", () => {
    expect(run().observation.askreview?.operating_mode).toBe("PAUSED");
  });

  it("27. OccupancyNPV is eligible for operating loop", () => {
    expect(run().observation.occupancy?.eligible).toBe(true);
    expect(run().observation.occupancy?.paused).toBe(false);
  });

  it("29. SSE / live version includes loop state without refresh", () => {
    const before = projectAutonomousOperations();
    run({ checkout_unhealthy: true });
    const after = projectAutonomousOperations();
    expect(after.loop_state).not.toBe(before.loop_state);
    expect(after.why_this_mission).toContain("CUSTOMER_PAYMENT");
  });

  it("30. runaway loop protection stops repeated failures", () => {
    const paused = executeAutonomousDailyOperatingLoop({
      now: "2026-09-14T23:49:00.000Z",
      persist: true,
      overrides: {
        occupancy: occupancy(),
        skip_disk_finance: true,
        loop: { ...loadAutonomousLoopState(), same_decision_streak: 8, consecutive_failures: 5 },
      },
    });
    expect(paused.portfolio_state).toBe("PAUSED");
    expect(paused.action_result).toBe("PAUSED_BY_RUNAWAY_GATE");
    expect(evaluateAutonomousLoopRunawayGate({
      consecutiveFailures: 5,
      sameDecisionStreak: 8,
      paused: true,
    }).result).toBe("PASS");
  });

  it("architecture gates", () => {
    expect(evaluateAutonomousOperatingLoopGate({
      statesSupported: [...AUTONOMOUS_LOOP_STATES],
      durable: true,
      eventDriven: true,
      restartSafe: true,
    }).result).toBe("PASS");
    const decision = run().decision;
    expect(evaluateAutonomousNextMissionGate(decision).result).toBe("PASS");
    expect(evaluateUniversalQCBeforeReleaseGate({ released: false, qcPassed: false }).result).toBe("PASS");
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: { work_id: null, status: "IDLE", mission: null, stage: null },
      floor: { work_id: null, status: "IDLE", mission: null, stage: null },
    }).result).toBe("PASS");
  });

  it("does not treat idle wait as WAITING_FOR_EVIDENCE", () => {
    const result = run();
    expect(result.decision.outcome).not.toBe("WAIT_FOR_EVIDENCE");
    expect(evaluateWaitingForEvidenceValidityGate({
      outcome: "WAIT_FOR_EVIDENCE",
      lastActionKind: null,
      dependencyKind: null,
    }).result).toBe("FAIL");
  });
});
