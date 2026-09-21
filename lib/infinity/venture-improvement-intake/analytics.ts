import type { IntakeAnalyticsEvent } from "./types";

const counts: Record<IntakeAnalyticsEvent, number> = {
  improvement_cta_opened: 0,
  submission_started: 0,
  submission_completed: 0,
  submission_failed: 0,
};

export function resetVentureImprovementIntakeAnalytics(): void {
  counts.improvement_cta_opened = 0;
  counts.submission_started = 0;
  counts.submission_completed = 0;
  counts.submission_failed = 0;
}

export function recordIntakeAnalytics(event: IntakeAnalyticsEvent): void {
  counts[event] += 1;
}

export function inspectIntakeAnalytics(): Record<IntakeAnalyticsEvent, number> {
  return { ...counts };
}

export function ctaClicksAreDemandEvidence(): false {
  return false;
}
