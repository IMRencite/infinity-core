import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadBuildFactoryDiagnostics } from "@/lib/infinity/build-factory/diagnostics";
import { BUILD_INTERNAL_LABEL } from "@/lib/infinity/build-factory/constants";

export default async function BuildsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const rows = await loadBuildFactoryDiagnostics(supabase, membership.organization_id, 30);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-zinc-200">
      <header>
        <h1 className="text-lg font-semibold text-white">Build Factory</h1>
        <p className="text-sm text-amber-200/90">{BUILD_INTERNAL_LABEL}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Development control — production builds begin through Mission Runtime and Scheduler.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Build</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Template</th>
              <th className="px-3 py-2">Review</th>
              <th className="px-3 py-2">Snapshots</th>
              <th className="px-3 py-2">Reproducibility</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-zinc-600">
                  No internal builds yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.buildId} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/builds/${row.buildId}`}
                      className="font-medium text-zinc-300 hover:text-white"
                    >
                      {row.name}
                    </Link>
                    <div className="font-mono text-[10px] text-zinc-600">{row.buildId}</div>
                  </td>
                  <td className="px-3 py-2">{row.projectType}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    {row.templateKey}@{row.templateVersion}
                  </td>
                  <td className="px-3 py-2">{row.reviewStatus}</td>
                  <td className="px-3 py-2">{row.snapshotCount}</td>
                  <td className="px-3 py-2">{row.reproducibilityStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
