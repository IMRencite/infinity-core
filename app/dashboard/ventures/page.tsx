import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadOperatorVentureList } from "@/lib/infinity/operator-console";
import { VENTURE_ASSEMBLY_INTERNAL_LABEL } from "@/lib/infinity/venture-assembly/constants";

export default async function VenturesPage() {
  const orgContext = await requireOperatorOrgContext();
  const admin = createAdminClient();
  const rows = await loadOperatorVentureList(admin, orgContext.organizationId, 40);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 text-zinc-200">
      <header>
        <h1 className="text-lg font-semibold text-white">Ventures</h1>
        <p className="text-sm text-amber-200/90">{VENTURE_ASSEMBLY_INTERNAL_LABEL}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Every valid canonical venture appears here automatically, including ventures that are not publicly launched.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">No canonical ventures yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((row) => {
            const href = `/dashboard/ventures/${encodeURIComponent(row.ventureAssemblyId)}`;
            return (
              <li key={`${row.canonicalVentureId ?? row.ventureAssemblyId}-${row.ventureAssemblyId}`} className="rounded-lg border border-white/10 p-4">
                <Link href={href} className="text-base font-semibold text-sky-400 hover:underline">
                  {row.ventureDisplayName ?? row.ventureName}
                </Link>
                <dl className="mt-3 space-y-1 text-xs sm:text-sm">
                  {row.domain ? (
                    <div>
                      <dt className="text-zinc-500">Domain</dt>
                      <dd><a className="text-sky-400 underline" href={row.productionUrl ?? `https://${row.domain}`} target="_blank" rel="noreferrer">{row.domain}</a></dd>
                    </div>
                  ) : null}
                  {row.productionUrl ? (
                    <div>
                      <dt className="text-zinc-500">Production URL</dt>
                      <dd><a className="break-all text-sky-400 underline" href={row.productionUrl} target="_blank" rel="noreferrer">{row.productionUrl}</a></dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-zinc-500">Lifecycle</dt>
                    <dd>{row.lifecycleState ?? row.status}</dd>
                  </div>
                  {row.productState ? <div><dt className="text-zinc-500">Product</dt><dd>{row.productState}</dd></div> : null}
                  {row.fulfillmentState ? <div><dt className="text-zinc-500">Fulfillment</dt><dd>{row.fulfillmentState}</dd></div> : null}
                  {row.paymentState ? <div><dt className="text-zinc-500">Payments</dt><dd>{row.paymentState}</dd></div> : null}
                  <div>
                    <dt className="text-zinc-500">Public launch</dt>
                    <dd>{row.publicLaunch ?? (row.launchState === "PUBLICLY_LAUNCHED" ? "YES" : "NO")}</dd>
                  </div>
                  {row.blockers?.length ? <div><dt className="text-zinc-500">Blockers</dt><dd>{row.blockers.join(", ")}</dd></div> : null}
                  <div>
                    <dt className="text-zinc-500">Latest mission</dt>
                    <dd>{row.latestDecision ?? row.latestActivity ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3 text-xs">
                  <Link href={href} className="text-sky-400 hover:underline">Open venture</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
