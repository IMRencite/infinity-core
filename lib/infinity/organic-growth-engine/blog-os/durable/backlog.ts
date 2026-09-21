import { BLOG_BACKLOG_POLICY, type DurableBlogObligation } from "./types";

export function selectPublicationOrder(input: {
  now_date: string;
  obligations: DurableBlogObligation[];
}): { current: DurableBlogObligation | null; catchup: DurableBlogObligation | null } {
  const open = input.obligations.filter((row) => row.pipeline_state !== "LIVE_VERIFIED" && row.pipeline_state !== "MISSED_RECORDED");
  const current = open.find((row) => row.operating_date === input.now_date) ?? null;
  const catchup = open
    .filter((row) => row.operating_date < input.now_date)
    .sort((a, b) => a.operating_date.localeCompare(b.operating_date))[0] ?? null;
  return { current, catchup };
}

export function publicationBudget(already_today: number): { current_allowed: boolean; catchup_allowed: boolean } {
  const remaining = BLOG_BACKLOG_POLICY.MAX_TOTAL_PUBLICATIONS_PER_DAY - already_today;
  return {
    current_allowed: remaining >= 1,
    catchup_allowed: remaining >= 2 || (already_today >= 1 && remaining >= 1 && already_today < BLOG_BACKLOG_POLICY.MAX_TOTAL_PUBLICATIONS_PER_DAY),
  };
}

export function reviewCamCandidate(input: {
  existing_topics: string[];
  candidate_topic: string;
}): { decision: "RECOVER_AND_PUBLISH" | "MISSED_RECORDED"; reason: string } {
  const overlap = input.existing_topics.some((topic) => topic.toLowerCase().includes("cam") && topic.toLowerCase().includes("first"));
  if (overlap) return { decision: "MISSED_RECORDED", reason: "DUPLICATE_INTENT" };
  return { decision: "RECOVER_AND_PUBLISH", reason: "DISTINCT_CAM_FIRST_YEAR_INTENT" };
}

export function decideMissedDayWithoutCandidate(): { decision: "MISSED_RECORDED"; reason: string } {
  return { decision: "MISSED_RECORDED", reason: "NO_CANDIDATE_PREPARED_RECOVERY_WOULD_BE_FILLER" };
}

export const BACKLOG_RECOVERY_ORDER = [
  { rank: 1, operating_date: "current_operating_day", decision: "PUBLISH_FIRST", reason: "current_day_required" },
  { rank: 2, operating_date: "2026-09-20", decision: "RECOVER_AND_PUBLISH", reason: "cam_first_year_distinct_intent" },
  { rank: 3, operating_date: "2026-09-18", decision: "MISSED_RECORDED", reason: "NO_CANDIDATE_PREPARED_RECOVERY_WOULD_BE_FILLER" },
  { rank: 4, operating_date: "2026-09-19", decision: "MISSED_RECORDED", reason: "NO_CANDIDATE_PREPARED_RECOVERY_WOULD_BE_FILLER" },
] as const;
