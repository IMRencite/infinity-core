import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadVentureAssemblyDiagnostics } from "@/lib/infinity/hq/venture-assembly";
import { VENTURE_ASSEMBLY_INTERNAL_LABEL } from "@/lib/infinity/venture-assembly/constants";

export default async function VenturesPage() {
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

  const rows = await loadVentureAssemblyDiagnostics(supabase, membership.organization_id, 40);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-zinc-200">
      <header>
        <h1 className="text-lg font-semibold text-white">Ventures</h1>
        <p className="text-sm text-amber-200/90">{VENTURE_ASSEMBLY_INTERNAL_LABEL}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Canonical internal venture assemblies — launch and deployment are separate milestones.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Venture</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Assembly</th>
              <th className="px-3 py-2">Readiness</th>
              <th className="px-3 py-2">Mission</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-zinc-600">
                  No venture assemblies yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.ventureAssemblyId} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <span className="font-medium text-zinc-300">
                      {row.workingName ?? row.ventureAssemblyId.slice(0, 8)}
                    </span>
                    <div className="font-mono text-[10px] text-zinc-600">{row.ventureAssemblyId}</div>
                  </td>
                  <td className="px-3 py-2">{row.ventureType ?? "—"}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.readinessStatus ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/missions/${row.missionId}`}
                      className="text-sky-400 hover:underline"
                    >
                      Inspector
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
