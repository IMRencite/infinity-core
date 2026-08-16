import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadOperatorVentureList } from "@/lib/infinity/operator-console";
import { VENTURE_ASSEMBLY_INTERNAL_LABEL } from "@/lib/infinity/venture-assembly/constants";

export default async function VenturesPage() {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) redirect("/login");

  const admin = createAdminClient();
  const rows = await loadOperatorVentureList(admin, orgContext.organizationId, 40);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-zinc-200">
      <header>
        <h1 className="text-lg font-semibold text-white">Ventures</h1>
        <p className="text-sm text-amber-200/90">{VENTURE_ASSEMBLY_INTERNAL_LABEL}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Open a venture to enter Infinity HQ — live operator observability from persisted engine state.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Venture</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Latest activity</th>
              <th className="px-3 py-2">Launch</th>
              <th className="px-3 py-2">Decision</th>
              <th className="px-3 py-2">HQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-zinc-600">
                  No venture assemblies yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.ventureAssemblyId} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/ventures/${row.ventureAssemblyId}`}
                      className="font-medium text-sky-400 hover:underline"
                    >
                      {row.ventureName}
                    </Link>
                    <div className="font-mono text-[10px] text-zinc-600">{row.ventureAssemblyId}</div>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    <div>{row.latestActivity ?? "—"}</div>
                    {row.latestActivityAt ? (
                      <div className="text-[10px] text-zinc-600">
                        {new Date(row.latestActivityAt).toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.launchState ?? "—"}</td>
                  <td className="px-3 py-2">{row.latestDecision ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/ventures/${row.ventureAssemblyId}`}
                      className="text-sky-400 hover:underline"
                    >
                      Open HQ
                    </Link>
                    {" · "}
                    <Link href={`/dashboard/missions/${row.missionId}`} className="text-zinc-500 hover:underline">
                      Mission
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
