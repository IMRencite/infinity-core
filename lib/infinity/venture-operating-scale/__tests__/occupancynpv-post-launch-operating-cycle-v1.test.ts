import { describe, expect, it } from "vitest";
import { evaluateCalculationFixtures } from "@/lib/infinity/occupancynpv-product/fixtures";
import { CRE_VENTURE_ID } from "../constants";
import { evaluateMissionConcurrencyGate } from "../concurrency";
import { occupancynpvPubliclyLaunched } from "../occupancynpv-public-launch-evidence";
import { runDailyVentureOperatingCycle, runPortfolioOperatingCycle } from "../operations";
import {
  applyPostLaunchEvidenceOverlay,
  DAILY_VENTURE_OPERATING_TRIGGER,
  discoverOperatingVentures,
  executePostLaunchOperatingCycle,
  futureLaunchedVenturesAutoEnroll,
  recordOperatingCycleFailure,
} from "../post-launch-operating-runtime";
import { liveCommercialCheckoutUnhealthy } from "../occupancynpv-live-checkout-health";
import { backfillCreVentureOperationalRecord } from "../record";
import { writeVentureOperationalRecord } from "../persist";

describe("OccupancyNPV post-launch operating cycle", () => {
  it("runs one live cycle and waits when post-launch evidence is sparse", () => {
    const cycle = executePostLaunchOperatingCycle({ persist: true, now: "2026-09-09T06:00:00.000Z" });
    expect(cycle.executed).toBe(true);
    expect(cycle.fabricatedObservations).toBe(0);
    expect(cycle.baseline.observations).toBe(0);
    expect(cycle.daily.snapshot.dailyResult).toBe(
      liveCommercialCheckoutUnhealthy() ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT" : "INSUFFICIENT_POST_LAUNCH_EVIDENCE",
    );
    expect(cycle.improvementMissionCreated).toBe(false);
    expect(cycle.learningDecision).toBe(
      liveCommercialCheckoutUnhealthy() ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT" : "INSUFFICIENT_POST_LAUNCH_EVIDENCE",
    );
    expect(cycle.evidenceSufficiency).toBe("INSUFFICIENT");
    expect(cycle.optimizationOpportunity).toBe("NONE");
    expect(cycle.nextCycleRequiresFounderPrompt).toBe(false);
    expect(cycle.runtime.trigger.path).toBe("/api/runtime/tick");
    expect(cycle.runtime.next_run_at).toBeTruthy();
  });

  it("discovers OccupancyNPV automatically and auto-enrolls future launched ventures", () => {
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    expect(occupancynpvPubliclyLaunched()).toBe(true);
    expect(discoverOperatingVentures()).toContain(CRE_VENTURE_ID);
    expect(futureLaunchedVenturesAutoEnroll()).toBe(true);
    const portfolio = runPortfolioOperatingCycle();
    expect(portfolio.secondDecisionEngineCreated).toBe(false);
    expect(portfolio.ventures.some((row) => row.ventureId === CRE_VENTURE_ID)).toBe(true);
  });

  it("does not replace the Decision Engine and keeps observation concurrent", () => {
    const raw = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    expect(raw.replacesDecisionEngine).toBe(false);
    const overlaid = applyPostLaunchEvidenceOverlay(raw, 0);
    expect(overlaid.snapshot.dailyResult).toBe(
      liveCommercialCheckoutUnhealthy() ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT" : "INSUFFICIENT_POST_LAUNCH_EVIDENCE",
    );
    expect(overlaid.snapshot.nextGovernedWork).toEqual(
      liveCommercialCheckoutUnhealthy() ? ["REPAIR_LIVE_COMMERCIAL_CHECKOUT"] : [],
    );
    expect(evaluateMissionConcurrencyGate({
      proposed: "PERFORMANCE_INGESTION",
      active: ["INBOUND_OBSERVER"],
    }).outcome).toBe("ALLOWED");
    expect(DAILY_VENTURE_OPERATING_TRIGGER.type).toBe("A");
    expect(DAILY_VENTURE_OPERATING_TRIGGER.scheduler).toBe("vercel_cron");
  });

  it("retries a failed cycle without stopping future runs", () => {
    const failed = recordOperatingCycleFailure("CYCLE_FAILED", new Date("2026-09-09T06:00:00.000Z"));
    expect(failed.last_error).toBe("CYCLE_FAILED");
    expect(failed.consecutive_failures).toBeGreaterThanOrEqual(1);
    expect(failed.next_run_at).toBeTruthy();
    const recovered = executePostLaunchOperatingCycle({ persist: true, now: "2026-09-09T06:05:00.000Z" });
    expect(recovered.runtime.consecutive_failures).toBe(0);
    expect(recovered.runtime.last_error).toBeNull();
  });

  it("preserves OccupancyNPV calculation fixtures", () => {
    const fixtures = evaluateCalculationFixtures();
    expect(fixtures.failed).toBe(0);
    expect(fixtures.passed).toBeGreaterThanOrEqual(8);
  });
});
