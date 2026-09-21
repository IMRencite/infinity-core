import {
  FOUNDER_DAILY_REPORT_GATE,
  FOUNDER_DAILY_REPORT_IDEMPOTENCY_GATE,
  FOUNDER_DAILY_REPORT_TRUTH_GATE,
  type DailyNamedGate,
  type FounderDailyOperationsReport,
  type FounderDailyReportSources,
} from "./types";

export function evaluateFounderDailyReportGate(report: FounderDailyOperationsReport): DailyNamedGate {
  const reasons: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.report_date)) reasons.push("report_date_invalid");
  if (!report.timezone) reasons.push("timezone_missing");
  const mixed = report.sections.find((section) => section.id === "completed")?.items.some((item) => item.status === "PLANNED");
  if (mixed) reasons.push("completed_planned_mixed");
  if (!report.summary.trim()) reasons.push("summary_missing");
  if (report.sections.some((section) => section.items.some((item) => /lorem|fabricated accomplishment that did not happen/i.test(item.title)))) {
    reasons.push("fabricated_activity");
  }
  if (!report.report_id.startsWith("daily:")) reasons.push("persistence_id_missing");
  return { gate: FOUNDER_DAILY_REPORT_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateFounderDailyReportTruthGate(report: FounderDailyOperationsReport, sources: FounderDailyReportSources): DailyNamedGate {
  const reasons: string[] = [];
  if (report.organic_pages !== (sources.organic_pages_published ?? 0)) reasons.push("organic_page_mismatch");
  if (report.outreach_sent !== (sources.outreach_sent ?? 0)) reasons.push("outreach_mismatch");
  if (report.prospects_added !== (sources.prospects_added ?? 0)) reasons.push("prospect_mismatch");
  if (report.deployments !== (sources.deployments ?? []).length) reasons.push("deployment_mismatch");
  return { gate: FOUNDER_DAILY_REPORT_TRUTH_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateFounderDailyReportDateRolloverGate(input: {
  same_day: FounderDailyOperationsReport;
  next_day_finalized: FounderDailyOperationsReport;
  past_date: FounderDailyOperationsReport;
  new_current: FounderDailyOperationsReport;
}): DailyNamedGate {
  const reasons: string[] = [];
  if (input.same_day.status !== "LIVE") reasons.push("SAME_DAY_NOT_LIVE");
  if (input.next_day_finalized.status !== "FINAL") reasons.push("PAST_NOT_FINAL");
  if (input.past_date.status !== "FINAL") reasons.push("EXPLICIT_PAST_NOT_FINAL");
  if (input.new_current.status !== "LIVE") reasons.push("NEW_CURRENT_NOT_LIVE");
  if (input.same_day.report_date === input.new_current.report_date) reasons.push("DATES_DID_NOT_ROLL");
  return {
    gate: "FounderDailyReportDateRolloverGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["DATE_ROLLOVER_HOLDS"],
  };
}

export function evaluateFounderDailyReportIdempotencyGate(first: FounderDailyOperationsReport, second: FounderDailyOperationsReport): DailyNamedGate {
  const reasons: string[] = [];
  if (first.report_id !== second.report_id) reasons.push("duplicate_report_id");
  if (first.report_date !== second.report_date) reasons.push("date_drift");
  if (first.version !== second.version) reasons.push("duplicate_version");
  return { gate: FOUNDER_DAILY_REPORT_IDEMPOTENCY_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}
