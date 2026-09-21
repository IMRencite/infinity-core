import { readOrganicContinuousStateLocal } from "@/lib/infinity/organic-growth-engine/continuous/persist";
import { getOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/store";
import { getDefaultProductionOutboundState } from "@/lib/infinity/production-outbound/store";
import { founderDailyOutboundEventTitles, getClosedLoopDurableState, hydrateClosedLoopDurableState } from "@/lib/infinity/production-outbound/closed-loop-durable";
import { generateFounderDailyReport, reportDateInTimezone, upsertDailyReport } from "./generator";
import { listFounderDailyReports, readFounderDailyReport, writeFounderDailyReport } from "./persist";
import { listFounderDailyReportsDurable, readFounderDailyReportDurable, writeFounderDailyReportDurable } from "./persist-store";
import { FOUNDER_HQ_TIMEZONE, type FounderDailyOperationsReport, type FounderDailyReportSources } from "./types";

export function collectFounderDailyReportSources(input: Partial<FounderDailyReportSources> = {}): FounderDailyReportSources {
  const organic = readOrganicContinuousStateLocal("occupancynpv") ?? getOrganicContinuousState("occupancynpv");
  const outbound = getDefaultProductionOutboundState();
  const blogs = organic.assets.filter((row) => (row.content_type === "BLOG" || row.url.includes("/blog/")) && (row.status === "PUBLISHED" || row.status === "REFRESHED"));
  const completeQueuedBlogs = (organic.blog_remediation_queue ?? []).filter((row) => row.url.includes("/blog/") && row.classification === "BLOG_COMPLETE");
  const planned = organic.queue
    .filter((row) => row.stage === "PLAN" || row.stage === "RESEARCH" || row.stage === "DISCOVER")
    .map((row) => `Queued ${row.work_kind} ${row.opportunity_id}`);
  return {
    now: input.now ?? new Date().toISOString(),
    timezone: input.timezone ?? FOUNDER_HQ_TIMEZONE,
    organic_pages_published: input.organic_pages_published ?? organic.published_today,
    blogs_published: input.blogs_published ?? blogs.filter((row) => row.status === "PUBLISHED").length,
    blogs_refreshed: input.blogs_refreshed ?? Math.max(blogs.filter((row) => row.status === "REFRESHED").length, completeQueuedBlogs.length),
    organic_rejects: input.organic_rejects ?? organic.rejected_quality,
    organic_in_progress: input.organic_in_progress ?? organic.queue.filter((row) => ["WRITE", "VALIDATE", "PUBLISH"].includes(row.stage)).length,
    organic_planned: input.organic_planned ?? (planned.length ? planned : ["Monitor indexation and content quality gates"]),
    outreach_sent: input.outreach_sent ?? outbound.metrics.sent,
    outreach_authorized: input.outreach_authorized ?? outbound.metrics.authorized,
    prospects_added: input.prospects_added ?? 0,
    deployments: input.deployments ?? [],
    blockers: input.blockers ?? (organic.blog_editorial_quality === "NEEDS_REMEDIATION" ? ["OccupancyNPV blog editorial quality needs remediation"] : []),
    founder_attention: input.founder_attention ?? [],
    treasury_verification: input.treasury_verification ?? "UNKNOWN",
    venture_ids: input.venture_ids ?? ["occupancynpv"],
    blog_ux_events: input.blog_ux_events,
    blog_qc_events: input.blog_qc_events,
    outbound_events: input.outbound_events ?? founderDailyOutboundEventTitles(getClosedLoopDurableState()),
  };
}

export function finalizePastFounderDailyReports(now = new Date().toISOString(), timezone: string = FOUNDER_HQ_TIMEZONE, cwd = process.cwd()): void {
  const today = reportDateInTimezone(now, timezone);
  for (const report of listFounderDailyReports(cwd)) {
    if (report.report_date < today && report.status === "LIVE") {
      writeFounderDailyReport({ ...report, status: "FINAL", finalized_at: report.finalized_at ?? now }, cwd);
    }
  }
}

export function generateAndPersistFounderDailyReport(input: Partial<FounderDailyReportSources> = {}, cwd = process.cwd()): FounderDailyOperationsReport {
  const sources = collectFounderDailyReportSources(input);
  finalizePastFounderDailyReports(sources.now, sources.timezone, cwd);
  const date = reportDateInTimezone(sources.now, sources.timezone);
  const prior = readFounderDailyReport(date, cwd);
  const generated = generateFounderDailyReport(sources, prior);
  const next = upsertDailyReport(prior, generated);
  writeFounderDailyReport(next, cwd);
  return next;
}

export function loadFounderDailyReportIndex(cwd = process.cwd()): FounderDailyOperationsReport[] {
  return listFounderDailyReports(cwd);
}

export async function finalizePastFounderDailyReportsDurable(
  now = new Date().toISOString(),
  timezone: string = FOUNDER_HQ_TIMEZONE,
  cwd = process.cwd(),
): Promise<void> {
  const today = reportDateInTimezone(now, timezone);
  for (const report of await listFounderDailyReportsDurable(cwd)) {
    if (report.report_date < today && report.status === "LIVE") {
      await writeFounderDailyReportDurable({ ...report, status: "FINAL", finalized_at: report.finalized_at ?? now }, cwd);
    }
  }
}

export async function generateAndPersistFounderDailyReportDurable(
  input: Partial<FounderDailyReportSources> = {},
  cwd = process.cwd(),
): Promise<FounderDailyOperationsReport> {
  await hydrateClosedLoopDurableState().catch(() => undefined);
  const sources = collectFounderDailyReportSources(input);
  await finalizePastFounderDailyReportsDurable(sources.now, sources.timezone, cwd);
  const date = reportDateInTimezone(sources.now, sources.timezone);
  const prior = await readFounderDailyReportDurable(date, cwd);
  const generated = generateFounderDailyReport(sources, prior);
  const next = upsertDailyReport(prior, generated);
  await writeFounderDailyReportDurable(next, cwd);
  return next;
}

export async function loadFounderDailyReportIndexDurable(cwd = process.cwd()): Promise<FounderDailyOperationsReport[]> {
  return listFounderDailyReportsDurable(cwd);
}

export async function neighboringReportDatesDurable(
  date: string,
  cwd = process.cwd(),
): Promise<{ previous: string | null; next: string | null }> {
  const dates = (await listFounderDailyReportsDurable(cwd)).map((row) => row.report_date);
  const index = dates.indexOf(date);
  return {
    previous: dates[index + 1] ?? null,
    next: index > 0 ? dates[index - 1] ?? null : null,
  };
}

export function neighboringReportDates(date: string, cwd = process.cwd()): { previous: string | null; next: string | null } {
  const dates = listFounderDailyReports(cwd).map((row) => row.report_date);
  const index = dates.indexOf(date);
  return {
    previous: dates[index + 1] ?? null,
    next: index > 0 ? dates[index - 1] ?? null : null,
  };
}
