import { SCHEDULE_HOST_REQUIREMENT } from "./constants";

export const ACQUISITION_SCHEDULE = {
  kind: "bounded_window_reevaluation" as const,
  minIntervalHours: 12,
  maxIntervalHours: 24,
  maxEvaluationsPer14DayWindow: 28,
  hostRequirement: SCHEDULE_HOST_REQUIREMENT,
};

export function shouldRunScheduledEvaluation(input: {
  now: Date;
  lastEvaluatedAt: string | null;
}): boolean {
  if (!input.lastEvaluatedAt) return true;
  const elapsedHours = (input.now.getTime() - Date.parse(input.lastEvaluatedAt)) / 3_600_000;
  return elapsedHours >= ACQUISITION_SCHEDULE.minIntervalHours;
}

export function scheduledEvaluationInterface() {
  return {
    supported: true as const,
    schedule: ACQUISITION_SCHEDULE,
    invoke: "invokeMarketValidationAcquisitionRuntime",
    host: SCHEDULE_HOST_REQUIREMENT,
  };
}
