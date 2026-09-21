import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { generateAndPersistFounderDailyReportDurable, neighboringReportDatesDurable, readFounderDailyReportDurable, reportDateInTimezone } from "@/lib/infinity/founder-daily-reports";

type Props = { params: Promise<{ date: string }> };

export default async function DailyReportDetailPage({ params }: Props) {
  await requireOperatorOrgContext();
  const { date } = await params;
  const today = reportDateInTimezone(new Date().toISOString());
  if (date === today) await generateAndPersistFounderDailyReportDurable();
  const report = await readFounderDailyReportDurable(date);
  if (!report) notFound();
  const neighbors = await neighboringReportDatesDurable(date);
  return (
    <article data-hq-daily-report-detail="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Daily Reports → {report.report_date}</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">{report.report_date}</h1>
        <p className="mt-2 text-[14px] text-zinc-400">{report.status} · {report.timezone} · v{report.version}</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-4" data-report-summary-cards="true">
        <p className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-2">Completed {report.completed_count}</p>
        <p className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-2">In progress {report.in_progress_count}</p>
        <p className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-2">Planned {report.planned_count}</p>
        <p className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-2">Blocked {report.blocked_count}</p>
      </section>
      <p className="text-[15px] text-zinc-300">{report.summary}</p>
      <p className="text-[12px] text-zinc-500">Treasury verification: {report.treasury_verification} · Organic pages {report.organic_pages} · Blogs {report.blogs} · Outreach {report.outreach_sent} · Prospects {report.prospects_added} · Deployments {report.deployments}</p>
      {report.sections.map((section) => (
        <section key={section.id} data-report-section={section.id}>
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-zinc-500">{section.title}</h2>
          <ul className="mt-2 space-y-2">
            {section.items.map((item) => (
              <li key={item.item_id} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-2">
                <p className="text-[13px] text-zinc-200">{item.title}</p>
                <p className="text-[11px] text-zinc-600">{item.status} · {item.engine}</p>
                {item.href ? <Link href={item.href} className="text-[12px] text-zinc-400 underline-offset-2 hover:underline">Open</Link> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <nav data-date-navigation="true" className="flex gap-3 text-[13px]">
        {neighbors.previous ? <Link href={`/dashboard/daily-reports/${neighbors.previous}`}>Previous day</Link> : null}
        <Link href="/dashboard/daily-reports">Latest</Link>
        {neighbors.next ? <Link href={`/dashboard/daily-reports/${neighbors.next}`}>Next day</Link> : null}
      </nav>
    </article>
  );
}
