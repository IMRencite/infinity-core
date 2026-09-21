import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { dirname } from "node:path";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateMissionConcurrencyGate } from "./concurrency";
import { CRE_VENTURE_ID } from "./constants";
import { readOccupancynpvDurableAuthority } from "./occupancynpv-durable-authority";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence, OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH } from "./occupancynpv-public-launch-evidence";
import { liveCommercialCheckoutUnhealthy } from "./occupancynpv-live-checkout-health";
import { runDailyVentureOperatingCycle, runPortfolioOperatingCycle } from "./operations";
import {
  advanceOccupancynpvGrowthExperiment,
  occupancynpvGrowthExperimentIsActive,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { listVentureOperationalRecords } from "./persist";
import type { DailyVentureOperatingCycleResult } from "./types";

export const DAILY_VENTURE_OPERATING_RUNTIME_PATH =
  ".infinity/venture-operating-scale/daily-venture-operating-runtime.json" as const;

export const DAILY_VENTURE_OPERATING_TRIGGER = {
  type: "A" as const,
  scheduler: "vercel_cron",
  path: "/api/runtime/tick",
  additionalPath: "/api/runtime/venture-operating-cycle",
  cadence: "0 * * * *",
  dailyCadence: "0 12 * * *",
  runtime: "infinity_production_mission_runtime",
  retry: "next_scheduled_tick",
  idempotency: "last_run_cycle_id",
};

export type PostLaunchObservationBaseline = {
  observations: number;
  fabricated_observations: number;
  launch_timestamp: string;
};

export function readPostLaunchObservationBaseline(): PostLaunchObservationBaseline {
  if (!existsSync(OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH)) {
    return { observations: 0, fabricated_observations: 0, launch_timestamp: "2026-09-08T07:38:01.064Z" };
  }
  try {
    const raw = JSON.parse(readFileSync(OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH, "utf8")) as PostLaunchObservationBaseline;
    return {
      observations: raw.observations ?? 0,
      fabricated_observations: raw.fabricated_observations ?? 0,
      launch_timestamp: raw.launch_timestamp ?? "2026-09-08T07:38:01.064Z",
    };
  } catch {
    return { observations: 0, fabricated_observations: 0, launch_timestamp: "2026-09-08T07:38:01.064Z" };
  }
}

export function discoverOperatingVentures() {
  return listVentureOperationalRecords()
    .filter((row) => {
      if (row.venture_id === CRE_VENTURE_ID) return occupancynpvPubliclyLaunched() || row.public_launch_state === "YES" || row.venture_status === "ACTIVE";
      return row.public_launch_state === "YES" || row.operating_stage === "OPERATING" || row.commercialization_state === "PUBLICLY_LAUNCHED";
    })
    .map((row) => row.venture_id);
}

export function futureLaunchedVenturesAutoEnroll(): boolean {
  return true;
}

export type DailyVentureOperatingRuntimeState = {
  last_run_at: string | null;
  last_cycle_id: string | null;
  last_outcome: string | null;
  last_error: string | null;
  consecutive_failures: number;
  next_run_at: string | null;
  trigger: typeof DAILY_VENTURE_OPERATING_TRIGGER;
};

export function readDailyVentureOperatingRuntime(): DailyVentureOperatingRuntimeState | null {
  if (!existsSync(DAILY_VENTURE_OPERATING_RUNTIME_PATH)) return null;
  try {
    return JSON.parse(readFileSync(DAILY_VENTURE_OPERATING_RUNTIME_PATH, "utf8")) as DailyVentureOperatingRuntimeState;
  } catch {
    return null;
  }
}

export function persistDailyVentureOperatingRuntime(state: DailyVentureOperatingRuntimeState) {
  if (!durableLocalPersistEnabled()) return state;
  mkdirSync(dirname(DAILY_VENTURE_OPERATING_RUNTIME_PATH), { recursive: true });
  writeFileSync(DAILY_VENTURE_OPERATING_RUNTIME_PATH, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

function nextRunFrom(now: Date): string {
  const next = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  return next.toISOString();
}

export function applyPostLaunchEvidenceOverlay(
  daily: DailyVentureOperatingCycleResult,
  observations: number,
): DailyVentureOperatingCycleResult {
  if (!occupancynpvPubliclyLaunched() || daily.snapshot.ventureId !== CRE_VENTURE_ID) return daily;
  const sparse = observations === 0;
  const checkoutUnhealthy = liveCommercialCheckoutUnhealthy();
  const growthActive = occupancynpvGrowthExperimentIsActive();
  return {
    ...daily,
    snapshot: {
      ...daily.snapshot,
      publicStatus: "YES",
      blockedActions: [
        ...daily.snapshot.blockedActions.filter((row) => row !== "PUBLIC_LAUNCH"),
        ...(checkoutUnhealthy ? ["LIVE_CHECKOUT_SESSION_CREATE"] : []),
      ],
      trafficPerformanceState: sparse ? "INSUFFICIENT_POST_LAUNCH_EVIDENCE" : daily.snapshot.trafficPerformanceState,
      importantChangesSincePriorCycle: checkoutUnhealthy
        ? ["public_launch_evidence_reconciled", "live_checkout_session_create_failed"]
        : growthActive
          ? ["public_launch_evidence_reconciled", "growth_experiment_active"]
          : ["public_launch_evidence_reconciled"],
      learningSignals: [
        ...daily.snapshot.learningSignals.filter((row) => row !== "commercialization_blockers_present"),
        "post_launch_operating",
        ...(growthActive ? ["growth_experiment_active"] : []),
        ...(sparse && !growthActive ? ["insufficient_post_launch_evidence"] : []),
        ...(checkoutUnhealthy ? ["live_checkout_session_create_failed", "high_priority_commercial_incident"] : []),
      ],
      nextGovernedWork: checkoutUnhealthy
        ? ["REPAIR_LIVE_COMMERCIAL_CHECKOUT"]
        : growthActive
          ? ["EXECUTE_OCCUPANCYNPV_GROWTH_EXPERIMENT"]
          : [],
      dailyResult: checkoutUnhealthy
        ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT"
        : growthActive
          ? "GROWTH_EXPERIMENT_ACTIVE"
          : sparse
            ? "INSUFFICIENT_POST_LAUNCH_EVIDENCE"
            : "NO_ACTION_REQUIRED",
    },
    commercializationWorkRecognized: checkoutUnhealthy,
  };
}

export function executePostLaunchOperatingCycle(input: {
  now?: string;
  persist?: boolean;
} = {}) {
  const now = input.now ? new Date(input.now) : new Date();
  const baseline = readPostLaunchObservationBaseline();
  const cycleId = `cycle_occupancynpv_post_launch_${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
  const concurrency = evaluateMissionConcurrencyGate({
    proposed: "PERFORMANCE_INGESTION",
    active: ["INBOUND_OBSERVER"],
  });
  const ventures = discoverOperatingVentures();
  advanceOccupancynpvGrowthExperiment({ persist: input.persist, now: now.toISOString() });
  const daily = applyPostLaunchEvidenceOverlay(
    runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 }),
    baseline.observations,
  );
  const portfolio = runPortfolioOperatingCycle();
  const launch = readOccupancynpvPublicLaunchEvidence();
  const authority = readOccupancynpvDurableAuthority();
  const improvementMissionCreated = false;
  const learningDecision = daily.snapshot.dailyResult === "HIGH_PRIORITY_COMMERCIAL_INCIDENT"
    ? "HIGH_PRIORITY_COMMERCIAL_INCIDENT"
    : daily.snapshot.dailyResult === "GROWTH_EXPERIMENT_ACTIVE"
      ? "GROWTH_EXPERIMENT_ACTIVE"
      : baseline.observations === 0
        ? "INSUFFICIENT_POST_LAUNCH_EVIDENCE"
        : daily.snapshot.dailyResult;
  const state: DailyVentureOperatingRuntimeState = {
    last_run_at: now.toISOString(),
    last_cycle_id: cycleId,
    last_outcome: daily.snapshot.dailyResult,
    last_error: null,
    consecutive_failures: 0,
    next_run_at: nextRunFrom(now),
    trigger: DAILY_VENTURE_OPERATING_TRIGGER,
  };
  if (input.persist !== false) persistDailyVentureOperatingRuntime(state);
  return {
    cycleId,
    executed: true,
    fabricatedObservations: 0,
    baseline,
    daily,
    portfolio,
    ventures,
    occupancynpvAutoEnrolled: ventures.includes(CRE_VENTURE_ID),
    futureLaunchedVenturesAutoEnroll: futureLaunchedVenturesAutoEnroll(),
    concurrency,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    launch,
    orphanedPaidCustomers: authority?.orphaned_paid_customer_count ?? 0,
    improvementMissionCreated,
    learningDecision,
    diagnosis: daily.snapshot.dailyResult === "HIGH_PRIORITY_COMMERCIAL_INCIDENT"
      ? "LIVE_CHECKOUT_SESSION_CREATE_FAILED"
      : baseline.observations === 0 ? "NONE" : daily.snapshot.learningSignals[0] ?? "NONE",
    hypothesis: "NONE",
    optimizationOpportunity: "NONE",
    economicPriority: daily.snapshot.dailyResult === "HIGH_PRIORITY_COMMERCIAL_INCIDENT" ? "REPAIR" : "OBSERVE",
    evidenceSufficiency: baseline.observations === 0 ? "INSUFFICIENT" as const : "SUFFICIENT" as const,
    runtime: state,
    nextCycleRequiresFounderPrompt: false,
  };
}

export function recordOperatingCycleFailure(error: string, now = new Date()) {
  const prior = readDailyVentureOperatingRuntime();
  return persistDailyVentureOperatingRuntime({
    last_run_at: now.toISOString(),
    last_cycle_id: prior?.last_cycle_id ?? null,
    last_outcome: "RETRY",
    last_error: error,
    consecutive_failures: (prior?.consecutive_failures ?? 0) + 1,
    next_run_at: nextRunFrom(now),
    trigger: DAILY_VENTURE_OPERATING_TRIGGER,
  });
}
