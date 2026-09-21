import Link from "next/link";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { generateAndPersistFounderDailyReportDurable, loadFounderDailyReportIndexDurable } from "@/lib/infinity/founder-daily-reports";

export default async function DailyReportsIndexPage() {
  await requireOperatorOrgContext();
  await generateAndPersistFounderDailyReportDurable();
  const reports = await loadFounderDailyReportIndexDurable();
  return (
    <article data-hq-daily-reports="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Daily Reports</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">Daily operations reports</h1>
        <p className="mt-2 text-[14px] text-zinc-400">Founder briefings from canonical system state. Not a public surface.</p>
      </header>
      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.report_id} data-daily-report-row="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-3">
            <Link href={`/dashboard/daily-reports/${report.report_date}`} className="text-zinc-100 underline-offset-2 hover:underline">
              {report.report_date} · {report.status}
            </Link>
            <p className="mt-1 text-[13px] text-zinc-400">{report.summary}</p>
            <p className="text-[12px] text-zinc-500">Completed {report.completed_count} · Planned {report.planned_count} · Blocked {report.blocked_count} · Ventures {report.venture_ids.length}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
