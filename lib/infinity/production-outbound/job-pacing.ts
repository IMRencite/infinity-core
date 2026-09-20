export const PACING_CRON_MINUTES = 5 as const;

export type PacingVisibleJob = {
  job_id: string;
  state: string;
  created_at: string;
  eligible_at: string;
  failure_reason?: string | null;
};

export const FOUNDER_JOB_DISPLAY_STATES = [
  "WAITING_PACING",
  "READY",
  "RUNNING",
  "SENT",
  "FAILED",
  "BLOCKED",
  "SUPPRESSED",
] as const;

export type FounderJobDisplayState = (typeof FOUNDER_JOB_DISPLAY_STATES)[number];

export type PacingJobHqCard = {
  job_id: string;
  display_state: "WAITING — PACING";
  created_at: string;
  eligible_at: string;
  eligible_at_founder: string;
  time_remaining_ms: number;
  time_remaining_label: string;
  next_expected_cron: string;
  next_expected_cron_founder: string;
  reason: "Natural response pacing";
  healthy: true;
};

const FOUNDER_TZ = "America/New_York";

export function isPacingWaitState(state: string | null | undefined): boolean {
  return state === "WAITING" || state === "WAITING_PACING";
}

export function formatFounderClock(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: FOUNDER_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function nextExpectedCronIso(fromIso: string): string {
  const step = PACING_CRON_MINUTES * 60_000;
  const stamp = Date.parse(fromIso);
  if (!Number.isFinite(stamp)) return fromIso;
  return new Date(Math.ceil((stamp + 1) / step) * step).toISOString();
}

export function founderJobDisplayState(job: PacingVisibleJob, now: string): FounderJobDisplayState {
  if (job.state === "SENT") return "SENT";
  if (job.state === "SUPPRESSED" || job.state === "CANCELLED") return "SUPPRESSED";
  if (job.state === "BLOCKED" || job.failure_reason === "CONTENT_QUALITY_BLOCKED") return "BLOCKED";
  if (job.state === "FAILED") return "FAILED";
  if (job.state === "PROCESSING" || job.state === "RUNNING") return "RUNNING";
  if (job.state === "READY") return "READY";
  if (isPacingWaitState(job.state) && Date.parse(job.eligible_at) > Date.parse(now)) return "WAITING_PACING";
  return "READY";
}

export function projectPacingJobCard(job: PacingVisibleJob, now: string): PacingJobHqCard | null {
  if (founderJobDisplayState(job, now) !== "WAITING_PACING") return null;
  const remaining = Math.max(0, Date.parse(job.eligible_at) - Date.parse(now));
  const nextCron = nextExpectedCronIso(Date.parse(job.eligible_at) > Date.parse(now) ? job.eligible_at : now);
  const minutes = Math.ceil(remaining / 60_000);
  return {
    job_id: job.job_id,
    display_state: "WAITING — PACING",
    created_at: job.created_at,
    eligible_at: job.eligible_at,
    eligible_at_founder: formatFounderClock(job.eligible_at),
    time_remaining_ms: remaining,
    time_remaining_label: remaining <= 0 ? "eligible now" : `${minutes} min remaining`,
    next_expected_cron: nextCron,
    next_expected_cron_founder: formatFounderClock(nextCron).replace(/:\d{2} /, " "),
    reason: "Natural response pacing",
    healthy: true,
  };
}

export function evaluatePacingStateVisibilityGate(input: {
  jobs: PacingVisibleJob[];
  now: string;
  status: "HEALTHY" | "DEGRADED" | "FAILED";
}): { gate: "PacingStateVisibilityGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const paced = input.jobs.filter((job) => founderJobDisplayState(job, input.now) === "WAITING_PACING");
  const cards = paced.map((job) => projectPacingJobCard(job, input.now)).filter((row): row is PacingJobHqCard => Boolean(row));
  const reasons: string[] = [];
  if (paced.length && cards.some((card) => !card.eligible_at || card.time_remaining_ms < 0)) reasons.push("ELIGIBLE_AT_HIDDEN");
  if (paced.length && cards.some((card) => !card.next_expected_cron)) reasons.push("NEXT_CRON_HIDDEN");
  if (paced.length && input.status === "FAILED") reasons.push("PACING_SHOWN_AS_FAILURE");
  return {
    gate: "PacingStateVisibilityGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : paced.length ? ["WAITING_PACING_VISIBLE"] : ["NO_PACED_JOBS"],
  };
}
