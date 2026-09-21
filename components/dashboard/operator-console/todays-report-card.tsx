"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FounderDailyOperationsReport } from "@/lib/infinity/founder-daily-reports";

export function TodaysReportCard() {
  const [report, setReport] = useState<FounderDailyOperationsReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/operator-console/daily-report", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: { report?: FounderDailyOperationsReport }) => {
        if (!cancelled) setReport(json.report ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section className="hq-secondary-status-panel" data-hq-todays-report="true" aria-label="Today's Report">
      <p className="hq-secondary-status-panel__title">Today&apos;s Report</p>
      <dl className="hq-secondary-status-panel__fields">
        <div className="hq-secondary-status-panel__field"><dt>Completed</dt><dd>{report?.completed_count ?? "—"}</dd></div>
        <div className="hq-secondary-status-panel__field"><dt>In Progress</dt><dd>{report?.in_progress_count ?? "—"}</dd></div>
        <div className="hq-secondary-status-panel__field"><dt>Planned</dt><dd>{report?.planned_count ?? "—"}</dd></div>
        <div className="hq-secondary-status-panel__field"><dt>Blocked</dt><dd>{report?.blocked_count ?? "—"}</dd></div>
        <div className="hq-secondary-status-panel__field"><dt>Last Updated</dt><dd>{report?.updated_at ? report.updated_at.slice(11, 16) : "—"}</dd></div>
      </dl>
      <Link href={report ? `/dashboard/daily-reports/${report.report_date}` : "/dashboard/daily-reports"} className="mt-2 inline-block text-[12px] text-zinc-300 underline-offset-2 hover:underline">
        View Report →
      </Link>
    </section>
  );
}
