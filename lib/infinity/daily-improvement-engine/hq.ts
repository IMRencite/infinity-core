import { readLatestDailyImprovementCycle } from "./store";
import { runDailyImprovementCycle } from "./cycle";
import { reportDateInTimezone } from "@/lib/infinity/founder-daily-reports/generator";
import type { DailyImprovementCycle } from "./types";

export type DailyImprovementHqView = {
  room_label: "Performance Intelligence & Continuous Improvement";
  sections: Array<{ id: string; title: string; items: string[] }>;
  cycle: DailyImprovementCycle;
};

export function projectDailyImprovementHq(now = new Date().toISOString(), cwd = process.cwd()): DailyImprovementHqView {
  const cycle = readLatestDailyImprovementCycle(cwd) ?? runDailyImprovementCycle({
    now,
    date: reportDateInTimezone(now),
    trigger: "MANUAL",
  });
  return {
    room_label: "Performance Intelligence & Continuous Improvement",
    sections: [
      { id: "daily_improvement", title: "DAILY IMPROVEMENT", items: cycle.report.next_day_priorities },
      { id: "system_benchmarks", title: "SYSTEM BENCHMARKS", items: cycle.run.benchmarks.map((row) => `${row.system}: ${row.benchmark_state}`) },
      { id: "improvement_queue", title: "IMPROVEMENT QUEUE", items: cycle.run.candidates.map((row) => `${row.system} · ${row.status}`) },
      { id: "canary_experiments", title: "CANARY EXPERIMENTS", items: cycle.report.changes_in_canary.map((row) => row.candidate_id) },
      { id: "changes_applied", title: "CHANGES APPLIED", items: cycle.report.changes_auto_applied.map((row) => row.candidate_id) },
      { id: "founder_approval", title: "FOUNDER APPROVAL NEEDED", items: cycle.approvals.map((row) => `${row.candidate_id}: ${row.change}`) },
      { id: "rollbacks", title: "ROLLBACKS", items: cycle.report.changes_rolled_back.map((row) => row.candidate_id) },
      { id: "qc_escapes", title: "QC ESCAPES", items: cycle.report.qc_escapes },
      { id: "nightly_review", title: "NIGHTLY REVIEW", items: [
        ...cycle.report.top_sales_learnings.slice(3),
        ...cycle.report.top_content_learnings.slice(2),
      ] },
      { id: "market_changes", title: "MARKET CHANGES", items: cycle.report.market_changes },
      { id: "next_day_plan", title: "NEXT-DAY PLAN", items: cycle.next_day.priorities.map((row) => `${row.rank}. ${row.item}`) },
    ],
    cycle,
  };
}
