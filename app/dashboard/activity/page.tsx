import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadHqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection/load";
import { paginateHqActivity } from "@/lib/infinity/hq-canonical-projection/activity";

type Props = { searchParams?: Promise<{ page?: string }> };

export default async function HqActivityPage({ searchParams }: Props) {
  const org = await requireOperatorOrgContext();
  const params = searchParams ? await searchParams : {};
  const projection = await loadHqCanonicalOperatingProjection(createAdminClient(), org.organizationId);
  const page = paginateHqActivity(projection.activity, Number(params.page ?? "1"));
  return (
    <article data-hq-activity="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Activity</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">Canonical activity</h1>
        <p className="mt-2 text-[14px] text-zinc-400">Founder-visible transitions from canonical records. Not a generated narrative feed.</p>
      </header>
      <p className="text-[13px] text-zinc-500">{page.total} events · page {page.page} of {page.pageCount} · page size {page.pageSize}</p>
      <ul className="space-y-3">
        {page.items.map((row) => (
          <li key={row.eventId} data-activity-row="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-3">
            <Link href={row.href} className="text-zinc-100 underline-offset-2 hover:underline">{row.summary}</Link>
            <p className="mt-1 text-[12px] text-zinc-500">{row.timestamp} · {row.domain} · {row.canonicalId}</p>
            <p className="text-[11px] text-zinc-600">Trace: {row.traceability} · venture {row.ventureId} · mission {row.missionId}</p>
          </li>
        ))}
      </ul>
      {page.pageCount > 1 ? (
        <nav data-pagination="true" className="flex gap-3 text-[13px]">
          {page.page > 1 ? <Link href={`/dashboard/activity?page=${page.page - 1}`}>Previous</Link> : null}
          {page.page < page.pageCount ? <Link href={`/dashboard/activity?page=${page.page + 1}`}>Next</Link> : null}
        </nav>
      ) : null}
    </article>
  );
}
