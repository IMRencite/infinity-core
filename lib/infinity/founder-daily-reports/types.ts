export const FOUNDER_DAILY_REPORT = "FounderDailyOperationsReport" as const;
export const FOUNDER_DAILY_REPORT_GATE = "FounderDailyReportGate" as const;
export const FOUNDER_DAILY_REPORT_TRUTH_GATE = "FounderDailyReportTruthGate" as const;
export const FOUNDER_DAILY_REPORT_IDEMPOTENCY_GATE = "FounderDailyReportIdempotencyGate" as const;
export const FOUNDER_DAILY_REPORT_PRODUCTION_PERSISTENCE_GATE = "FounderDailyReportProductionPersistenceGate" as const;
export const FOUNDER_HQ_TIMEZONE = "America/New_York" as const;

export type DailyReportStatus = "LIVE" | "FINAL" | "AMENDED";
export type DailyItemStatus = "COMPLETED" | "IN_PROGRESS" | "PLANNED" | "BLOCKED" | "CANCELLED";

export type FounderDailyReportItem = {
  item_id: string;
  status: DailyItemStatus;
  engine: string;
  title: string;
  href?: string;
  source_ids: string[];
};

export type FounderDailyReportSection = {
  id: string;
  title: string;
  items: FounderDailyReportItem[];
};

export type FounderDailyOperationsReport = {
  report_id: string;
  report_date: string;
  timezone: string;
  status: DailyReportStatus;
  version: number;
  generated_at: string;
  updated_at: string;
  finalized_at: string | null;
  summary: string;
  completed_count: number;
  in_progress_count: number;
  planned_count: number;
  blocked_count: number;
  venture_ids: string[];
  source_event_ids: string[];
  organic_pages: number;
  blogs: number;
  outreach_sent: number;
  prospects_added: number;
  deployments: number;
  founder_attention: FounderDailyReportItem[];
  treasury_verification: "VERIFIED" | "DEGRADED" | "UNKNOWN";
  sections: FounderDailyReportSection[];
};

export type FounderDailyReportSources = {
  now: string;
  timezone?: string;
  organic_pages_published?: number;
  blogs_published?: number;
  blogs_refreshed?: number;
  organic_rejects?: number;
  organic_in_progress?: number;
  organic_planned?: string[];
  blog_ux_events?: string[];
  blog_qc_events?: string[];
  outreach_sent?: number;
  outreach_authorized?: number;
  prospects_added?: number;
  deployments?: Array<{ id: string; target: string; status: string }>;
  blockers?: string[];
  founder_attention?: string[];
  treasury_verification?: FounderDailyOperationsReport["treasury_verification"];
  venture_ids?: string[];
  outbound_events?: string[];
};

export type DailyNamedGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };
