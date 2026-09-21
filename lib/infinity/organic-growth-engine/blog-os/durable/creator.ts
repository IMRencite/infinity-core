import { CURRENT_HOLD_ID, OCCUPANCYNPV_BLOG_TIMEZONE, type DurableBlogObligation } from "./types";
import { DurableBlogStore } from "./store";

export function operatingDateInTimezone(now: string, timeZone = OCCUPANCYNPV_BLOG_TIMEZONE): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  return formatted;
}

export function dueAtEndOfOperatingDay(operating_date: string, timeZone = OCCUPANCYNPV_BLOG_TIMEZONE): string {
  const probe = new Date(`${operating_date}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(probe);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-4";
  const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const sign = match?.[1] === "-" ? "-" : "+";
  const hours = (match?.[2] ?? "4").padStart(2, "0");
  const minutes = (match?.[3] ?? "00").padStart(2, "0");
  return `${operating_date}T23:59:59.000${sign}${hours}:${minutes}`;
}

export function createDailyBlogObligation(input: {
  store: DurableBlogStore;
  venture_id: string;
  now: string;
  candidate_id?: string | null;
  expected_url?: string | null;
  hold_id?: string | null;
  actor?: string;
  deployment_id?: string | null;
}): { result: "INSERTED" | "CONFLICT_NOOP"; obligation: DurableBlogObligation } {
  const operating_date = operatingDateInTimezone(input.now);
  const started = input.now;
  const created: DurableBlogObligation = {
    id: `blog:${input.venture_id}:${operating_date}`,
    venture_id: input.venture_id,
    operating_date,
    operating_timezone: OCCUPANCYNPV_BLOG_TIMEZONE,
    required_count: 1,
    candidate_id: input.candidate_id ?? "cand:cam-operating-year",
    expected_url: input.expected_url ?? "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    pipeline_state: "PLANNED",
    hold_id: input.hold_id ?? CURRENT_HOLD_ID,
    qc_version: null,
    owner: "VentureBlogWorker",
    created_at: input.now,
    due_at: dueAtEndOfOperatingDay(operating_date),
    last_attempt_at: null,
    next_attempt_at: input.now,
    failure_reason: null,
    published_at: null,
    live_verified_at: null,
    live_url: null,
    recovered: false,
    clean: false,
    missed_reason: null,
    decision_owner: null,
    decided_at: null,
    updated_at: input.now,
  };
  const inserted = input.store.insertDailyObligation(created);
  input.store.recordSchedulerEvent({
    id: `sched:${input.venture_id}:${operating_date}:${started}`,
    deployment_id: input.deployment_id ?? null,
    started_at: started,
    completed_at: new Date().toISOString(),
    venture_id: input.venture_id,
    operating_date,
    insert_attempted: true,
    insert_result: inserted.result === "CONFLICT_NOOP" ? "ALREADY_EXISTS" : inserted.result,
    invoked_by: (input.actor === "VERCEL_CRON" ? "VERCEL_CRON" : input.actor === "TEST" ? "TEST" : "HTTP") as "VERCEL_CRON" | "HTTP" | "TEST",
    error: null,
  });
  return inserted;
}

export function backfillKnownDay(input: {
  store: DurableBlogStore;
  operating_date: string;
  now: string;
  candidate_id: string;
  expected_url: string;
  created_at: string;
}): DurableBlogObligation {
  const row: DurableBlogObligation = {
    id: `blog:occupancynpv:${input.operating_date}`,
    venture_id: "occupancynpv",
    operating_date: input.operating_date,
    operating_timezone: OCCUPANCYNPV_BLOG_TIMEZONE,
    required_count: 1,
    candidate_id: input.candidate_id,
    expected_url: input.expected_url,
    pipeline_state: "PLANNED",
    hold_id: CURRENT_HOLD_ID,
    qc_version: null,
    owner: "VentureBlogWorker",
    created_at: input.created_at,
    due_at: dueAtEndOfOperatingDay(input.operating_date),
    last_attempt_at: null,
    next_attempt_at: input.now,
    failure_reason: null,
    published_at: null,
    live_verified_at: null,
    live_url: null,
    recovered: false,
    clean: false,
    missed_reason: null,
    decision_owner: null,
    decided_at: null,
    updated_at: input.now,
  };
  return input.store.insertDailyObligation(row).obligation;
}
