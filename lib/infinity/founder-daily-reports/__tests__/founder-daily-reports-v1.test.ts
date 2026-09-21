import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateFounderDailyReportDateRolloverGate,
  evaluateFounderDailyReportGate,
  evaluateFounderDailyReportIdempotencyGate,
  evaluateFounderDailyReportTruthGate,
  finalizePastFounderDailyReports,
  generateAndPersistFounderDailyReport,
  generateFounderDailyReport,
  readFounderDailyReport,
  upsertDailyReport,
} from "../index";

const NOW = "2026-09-17T12:00:00.000Z";

describe("Founder daily operations reports", () => {
  it("generates a truthful LIVE report and separates completed from planned", () => {
    const sources = {
      now: NOW,
      organic_pages_published: 1,
      blogs_published: 0,
      blogs_refreshed: 1,
      outreach_sent: 1,
      prospects_added: 14,
      deployments: [{ id: "dpl_test", target: "occupancynpv.com", status: "READY" }],
      blog_ux_events: ["Blog UX Remediation", "Blog Navigation Upgrade"],
      blog_qc_events: ["Blog Depth Upgrade"],
      blockers: ["Mercury verification degraded"],
      founder_attention: ["Review outbound canary"],
      treasury_verification: "DEGRADED" as const,
      organic_planned: ["Refresh remaining authority pages"],
    };
    const report = generateFounderDailyReport(sources);
    expect(report.report_date).toBe("2026-09-17");
    expect(report.timezone).toBe("America/New_York");
    expect(report.status).toBe("LIVE");
    expect(report.completed_count).toBeGreaterThan(0);
    expect(report.sections.find((section) => section.id === "completed")?.items.every((item) => item.status === "COMPLETED")).toBe(true);
    expect(report.sections.find((section) => section.id === "planned")?.items.every((item) => item.status === "PLANNED")).toBe(true);
    expect(report.organic_pages).toBe(1);
    expect(report.blogs).toBe(1);
    expect(report.outreach_sent).toBe(1);
    expect(report.prospects_added).toBe(14);
    expect(report.deployments).toBe(1);
    expect(report.founder_attention).toHaveLength(1);
    expect(report.treasury_verification).toBe("DEGRADED");
    expect(report.sections.find((section) => section.id === "completed")?.items.some((item) => item.title === "Blog UX Remediation")).toBe(true);
    expect(evaluateFounderDailyReportGate(report).result).toBe("PASS");
    expect(evaluateFounderDailyReportTruthGate(report, sources).result).toBe("PASS");
  });

  it("does not fabricate a quiet day and stays idempotent on restart", () => {
    const cwd = mkdtempSync(join(tmpdir(), "daily-report-"));
    const first = generateAndPersistFounderDailyReport({
      now: NOW,
      organic_pages_published: 0,
      blogs_published: 0,
      blogs_refreshed: 0,
      organic_rejects: 0,
      organic_in_progress: 0,
      outreach_sent: 0,
      prospects_added: 0,
      deployments: [],
      blockers: [],
      founder_attention: [],
      organic_planned: ["Monitor indexation"],
    }, cwd);
    const second = generateAndPersistFounderDailyReport({
      now: NOW,
      organic_pages_published: 0,
      blogs_published: 0,
      blogs_refreshed: 0,
      organic_rejects: 0,
      organic_in_progress: 0,
      outreach_sent: 0,
      prospects_added: 0,
      deployments: [],
      blockers: [],
      founder_attention: [],
      organic_planned: ["Monitor indexation"],
    }, cwd);
    expect(first.completed_count).toBe(0);
    expect(first.summary).toMatch(/Quiet operating day|Monitoring only|planned/i);
    expect(evaluateFounderDailyReportIdempotencyGate(first, upsertDailyReport(first, second)).result).toBe("PASS");
    expect(first.report_id).toBe(second.report_id);
    finalizePastFounderDailyReports("2026-09-18T12:00:00.000Z", "America/New_York", cwd);
    const finalized = JSON.parse(readFileSync(join(cwd, ".infinity", "founder-daily-reports", "2026-09-17.json"), "utf8"));
    expect(finalized.status).toBe("FINAL");
  });

  it("merges prior LIVE completed items instead of wiping them on reload", () => {
    const first = generateFounderDailyReport({
      now: NOW,
      deployments: [{ id: "dpl_keep", target: "occupancynpv.com", status: "READY" }],
    });
    const second = generateFounderDailyReport({
      now: NOW,
      organic_pages_published: 1,
    });
    const merged = upsertDailyReport(first, second);
    expect(merged.source_event_ids).toContain("dpl_keep");
    expect(merged.completed_count).toBeGreaterThanOrEqual(2);
    expect(merged.deployments).toBe(1);
    const wiped = generateFounderDailyReport({ now: NOW });
    const kept = upsertDailyReport(merged, wiped);
    expect(kept.deployments).toBe(1);
    expect(kept.source_event_ids).toContain("dpl_keep");
  });

  it("rolls LIVE to FINAL across midnight without hard-coded generator dates", () => {
    const cwd = mkdtempSync(join(tmpdir(), "daily-rollover-"));
    const dayOne = new Date("2026-01-15T17:00:00.000Z");
    const nextMorning = new Date(dayOne.getTime() + 16 * 60 * 60 * 1000);
    const same = generateAndPersistFounderDailyReport({
      now: dayOne.toISOString(),
      deployments: [{ id: "dpl_roll", target: "occupancynpv.com", status: "READY" }],
    }, cwd);
    expect(same.status).toBe("LIVE");
    const next = generateAndPersistFounderDailyReport({ now: nextMorning.toISOString() }, cwd);
    expect(next.status).toBe("LIVE");
    expect(next.report_date).not.toBe(same.report_date);
    const past = readFounderDailyReport(same.report_date, cwd);
    expect(past?.status).toBe("FINAL");
    expect(evaluateFounderDailyReportDateRolloverGate({
      same_day: same,
      next_day_finalized: past!,
      past_date: past!,
      new_current: next,
    }).result).toBe("PASS");
    finalizePastFounderDailyReports(nextMorning.toISOString(), "America/New_York", cwd);
  });

  it("keeps daily reports out of the public operations surface", () => {
    const pub = readFileSync(join(process.cwd(), "lib/infinity/public-operations-room/gates.ts"), "utf8");
    const floor = readFileSync(join(process.cwd(), "components/public/operations-room/live-operations-room.tsx"), "utf8");
    expect(pub).not.toContain("founder-daily-reports");
    expect(floor).not.toContain("FounderDailyOperationsReport");
    expect(readFileSync(join(process.cwd(), "app/dashboard/daily-reports/page.tsx"), "utf8")).toContain("data-hq-daily-reports");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/todays-report-card.tsx"), "utf8")).toContain("data-hq-todays-report");
    expect(readFileSync(join(process.cwd(), "lib/infinity/hq-navigation/items.ts"), "utf8")).toContain("Daily Reports");
  });
});
