/** Autonomous opportunity scanner scheduler (production). */

export const AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1 =
  "AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1" as const;

/** Conservative weekly cadence — avoids excessive research spend. */
export const OPPORTUNITY_SCANNER_CRON_SCHEDULE = "0 6 * * 1" as const;

export const OPPORTUNITY_SCANNER_SCHEDULED_EXECUTION_LAST_PATH =
  ".infinity/growth-engine/opportunity-scanner-scheduled-execution-last.json" as const;

export const OPPORTUNITY_SCANNER_FRESHNESS_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;
