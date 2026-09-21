export const BLOG_PIPELINE_STATES = [
  "PLANNED",
  "DRAFTED",
  "QC_PASSED",
  "PUBLISHED",
  "LIVE_VERIFIED",
  "MISSED_RECORDED",
] as const;
export type BlogPipelineState = (typeof BLOG_PIPELINE_STATES)[number];

export const BLOG_TERMINAL_STATES: BlogPipelineState[] = ["LIVE_VERIFIED", "MISSED_RECORDED"];

export const CURRENT_BLOG_QC_VERSION = "blog-render-qc-v3" as const;
export const SECOND_QC_ESCAPE_EXIT_VERSION = "second-qc-escape-v3" as const;
export const OCCUPANCYNPV_BLOG_TIMEZONE = "America/New_York" as const;
export const CURRENT_HOLD_ID = "hold:occupancynpv:second-qc-escape-v1" as const;

export const BLOG_BACKLOG_POLICY = {
  NORMAL_REQUIRED_PUBLICATIONS_PER_DAY: 1,
  MAX_TOTAL_PUBLICATIONS_PER_DAY: 2,
  MAX_CATCHUP_PUBLICATIONS_PER_DAY: 1,
} as const;

export type CheckResult = {
  check: string;
  result: "PASS" | "FAIL" | "NOT_RUN" | "NOT_PROVEN" | "HUMAN_REVIEW_REQUIRED";
  reasons: string[];
};

export type DurableBlogHold = {
  hold_id: string;
  venture_id: string;
  reason: string;
  created_at: string;
  owner: string;
  engineering_owner: string;
  founder_decision_owner: string;
  due_at: string;
  next_review_at: string;
  requested_at: string | null;
  renotify_at: string | null;
  escalation_count: number;
  exit_condition_version: string;
  exit_condition_frozen_at: string;
  exit_condition_hash: string;
  evidence_required: string[];
  evidence_pack_url: string;
  founder_review_status: "NOT_STARTED" | "NOT_ACTIONABLE" | "NOT_ACTIONABLE_ENGINEERING_BLOCKED" | "AWAITING_HUMAN" | "CLEAR" | "KEEP";
  resolved_at: string | null;
};

export type DurableBlogObligation = {
  id: string;
  venture_id: string;
  operating_date: string;
  operating_timezone: string;
  required_count: number;
  candidate_id: string | null;
  expected_url: string | null;
  pipeline_state: BlogPipelineState;
  hold_id: string | null;
  qc_version: string | null;
  owner: string;
  created_at: string;
  due_at: string;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  failure_reason: string | null;
  published_at: string | null;
  live_verified_at: string | null;
  live_url: string | null;
  recovered: boolean;
  clean: boolean;
  missed_reason: string | null;
  decision_owner: string | null;
  decided_at: string | null;
  updated_at: string;
};

export type BlogObligationEvent = {
  id: string;
  obligation_id: string;
  from_state: BlogPipelineState | null;
  to_state: BlogPipelineState | null;
  actor: string;
  invoked_by: string;
  event_type: string;
  at: string;
  deployment_id: string | null;
  evidence_ref: string | null;
};

export type BlogSchedulerEvent = {
  id: string;
  deployment_id: string | null;
  started_at: string;
  completed_at: string | null;
  venture_id: string;
  operating_date: string;
  insert_attempted: boolean;
  insert_result: "INSERTED" | "CONFLICT_NOOP" | "ERROR" | "ALREADY_EXISTS";
  invoked_by: "VERCEL_CRON" | "HTTP" | "TEST";
  error: string | null;
};

export type DayAccountingStatus = "DUE" | "LIVE_VERIFIED" | "MISSED" | "MISSED_RECORDED" | "NOT_MEASURED";
