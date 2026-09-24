import { describe, expect, it } from "vitest";
import { applyFounderHoldDecision, currentSecondQcHold } from "../hold";
import {
  deriveEffectiveOrganicExecutionState,
  freezeSchedulerAuthorizationProjection,
} from "../effective-execution-state";
import { executeOrganicGrowthSchedulerTick } from "@/lib/infinity/organic-growth-engine/obligation/scheduler";

describe("organic effective execution state", () => {
  it("stale PAUSED snapshot cannot override newer CLEAR", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "CLEARED", execute_publish: true, hold_version: "N+1" },
      scheduler: { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false, hold_version: "N" },
    });
    expect(state.snapshot_class).toBe("STALE");
    expect(state.result).toBe("AUTHORIZED");
    expect(state.execute_publish).toBe(true);
    expect(state.reasons).toContain("STALE_BLOCKING_SNAPSHOT");
  });

  it("stale CLEAR snapshot cannot override newer PAUSED", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "ACTIVE", execute_publish: false, hold_version: "N+1" },
      scheduler: { publishing_hold: null, execute_publish: true, hold_version: "N" },
    });
    expect(state.snapshot_class).toBe("STALE");
    expect(state.result).toBe("BLOCKED_HOLD");
    expect(state.execute_publish).toBe(false);
    expect(state.reasons).toContain("STALE_PERMISSIVE_SNAPSHOT");
  });

  it("current CLEAR is AUTHORIZED", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "CLEARED", execute_publish: true, hold_version: "N" },
      scheduler: { publishing_hold: null, execute_publish: true, hold_version: "N" },
    });
    expect(state.snapshot_class).toBe("CURRENT");
    expect(state.result).toBe("AUTHORIZED");
  });

  it("current PAUSED is BLOCKED_HOLD", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "ACTIVE", execute_publish: false, hold_version: "N" },
      scheduler: { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false, hold_version: "N" },
    });
    expect(state.snapshot_class).toBe("CURRENT");
    expect(state.result).toBe("BLOCKED_HOLD");
  });

  it("missing canonical fails closed", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: null,
      scheduler: { publishing_hold: null, execute_publish: true },
      canonical_readable: true,
    });
    expect(state.result).toBe("BLOCKED_AUTHORIZATION");
    expect(state.execute_publish).toBe(false);
  });

  it("runtime cannot self-authorize from a permissive scheduler copy", () => {
    const state = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "ACTIVE", execute_publish: false },
      scheduler: { publishing_hold: null, execute_publish: true },
    });
    expect(state.result).toBe("BLOCKED_HOLD");
    expect(state.execute_publish).toBe(false);
  });

  it("organic_runtime cannot create founder approval or clear a hold", () => {
    const hold = currentSecondQcHold("2026-09-24T07:00:00.000Z");
    const runtime = applyFounderHoldDecision({
      hold,
      actor: "organic_runtime",
      decision: "CLEAR",
      evidence_complete: true,
      now: "2026-09-24T07:00:00.000Z",
    });
    expect(runtime.accepted).toBe(false);
    expect(runtime.reason).toBe("FOUNDER_FACTOR_REQUIRED");
    expect(runtime.hold.hold_state).toBe("ACTIVE");
    expect(runtime.hold.execute_publish).toBe(false);
  });

  it("does not persist a derived CLEAR over a prior paused projection", () => {
    const frozen = freezeSchedulerAuthorizationProjection(
      { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false },
      { publishing_hold: null, execute_publish: true, last_tick_at: "2026-09-24T08:00:00.000Z" },
    );
    expect(frozen.publishing_hold).toBe("PAUSED_FOR_SECOND_QC_ESCAPE");
    expect(frozen.execute_publish).toBe(false);
    expect(frozen.last_tick_at).toBe("2026-09-24T08:00:00.000Z");
  });

  it("makes a canonical CLEAR visible to the next tick without rewriting the payload", () => {
    const payload = { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE" as const, execute_publish: false };
    const afterTransition = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "CLEARED", execute_publish: true, hold_version: "N+1" },
      scheduler: payload,
    });
    const tick = executeOrganicGrowthSchedulerTick({
      now: "2026-09-24T08:15:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
      effective: afterTransition,
    });
    expect(afterTransition.result).toBe("AUTHORIZED");
    expect(tick.execute_publish).toBe(true);
    expect(payload.publishing_hold).toBe("PAUSED_FOR_SECOND_QC_ESCAPE");
  });

  it("makes a canonical PAUSE visible to the next tick without rewriting a stale CLEAR payload", () => {
    const payload = { publishing_hold: null, execute_publish: true };
    const afterTransition = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "ACTIVE", execute_publish: false, hold_version: "N+1" },
      scheduler: payload,
    });
    const tick = executeOrganicGrowthSchedulerTick({
      now: "2026-09-24T08:16:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
      effective: afterTransition,
    });
    expect(afterTransition.result).toBe("BLOCKED_HOLD");
    expect(tick.execute_publish).toBe(false);
    expect(payload.publishing_hold).toBeNull();
    expect(payload.execute_publish).toBe(true);
  });
});
