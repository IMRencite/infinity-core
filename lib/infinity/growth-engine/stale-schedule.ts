export const STALE_GROWTH_SCHEDULE_GATE = "StaleGrowthScheduleGate" as const;

export function evaluateStaleGrowthScheduleGate(input: {
  nextRunAt: string | null | undefined;
  now?: string;
}): {
  gate: typeof STALE_GROWTH_SCHEDULE_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  recomputeRequired: boolean;
} {
  const now = new Date(input.now ?? new Date().toISOString());
  if (!input.nextRunAt) {
    return {
      gate: STALE_GROWTH_SCHEDULE_GATE,
      result: "FAIL",
      reasons: ["NEXT_RUN_AT_MISSING"],
      recomputeRequired: true,
    };
  }
  const next = new Date(input.nextRunAt);
  if (Number.isNaN(next.getTime())) {
    return {
      gate: STALE_GROWTH_SCHEDULE_GATE,
      result: "FAIL",
      reasons: ["NEXT_RUN_AT_INVALID"],
      recomputeRequired: true,
    };
  }
  if (next.getTime() < now.getTime()) {
    return {
      gate: STALE_GROWTH_SCHEDULE_GATE,
      result: "FAIL",
      reasons: ["NEXT_RUN_AT_STALE"],
      recomputeRequired: true,
    };
  }
  return {
    gate: STALE_GROWTH_SCHEDULE_GATE,
    result: "PASS",
    reasons: [],
    recomputeRequired: false,
  };
}

export function nextHourlyRunAt(now = new Date()): string {
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.toISOString();
}
