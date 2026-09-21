import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadHqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection/load";

export default async function HqGovernancePage() {
  const org = await requireOperatorOrgContext();
  const projection = await loadHqCanonicalOperatingProjection(createAdminClient(), org.organizationId);
  return (
    <article data-hq-governance="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Governance</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">Authorizations and blockers</h1>
      </header>
      <ul className="space-y-3">
        {projection.blockers.map((row) => (
          <li key={`${row.ventureId}-${row.code}`} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-3">
            <Link href={row.href} className="text-zinc-100 underline-offset-2 hover:underline">{row.code}</Link>
            <p className="mt-1 text-[12px] text-zinc-500">Venture {row.ventureId} · {row.requiredAuthorization ? "founder authorization required" : "operational blocker"}</p>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Canonical next actions</h2>
        {projection.nextActions.map((row) => (
          <p key={row.id} className="mt-2 text-[13px]">
            <Link href={row.href} className="text-zinc-100 underline-offset-2 hover:underline">{row.label}</Link>
            {" — "}{row.nextAction}
          </p>
        ))}
      </section>
    </article>
  );
}
