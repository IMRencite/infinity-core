import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadLaunchControlDiagnostics } from "@/lib/infinity/hq/launch-control";
import { LAUNCH_GATEWAY_SIMULATION_LABEL } from "@/lib/infinity/launch-gateway/constants";

export default async function LaunchControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/dashboard/onboarding");

  const diagnostics = await loadLaunchControlDiagnostics(supabase, membership.organization_id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-zinc-200">
      <header>
        <h1 className="text-lg font-semibold text-white">Launch Control Center</h1>
        <p className="text-sm font-medium text-amber-300">{diagnostics.mode} — NOT LIVE</p>
        <p className="text-sm text-amber-200/90">{LAUNCH_GATEWAY_SIMULATION_LABEL}</p>
      </header>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-100">
        Live external execution is disabled. There is no Execute button in v1. All actions shown are
        simulated gateway results.
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Launch plans</h2>
        <pre className="max-h-64 overflow-auto rounded border border-white/10 p-3 text-[11px] text-zinc-400">
          {JSON.stringify(diagnostics.launchPlans, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">External resources</h2>
        <p className="mb-2 text-[11px] text-zinc-500">
          SIMULATED vs LIVE — check execution_mode on each row.
        </p>
        <pre className="max-h-96 overflow-auto rounded border border-white/10 p-3 text-[11px] text-zinc-400">
          {JSON.stringify(diagnostics.externalResources, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">External action queue</h2>
        <p className="mb-2 text-[11px] text-zinc-500">
          Authorization: AUTONOMOUS (autonomous_policy) vs HUMAN vs BLOCKED — see authorization_source
          and policy_decision on each row.
        </p>
        <pre className="max-h-96 overflow-auto rounded border border-white/10 p-3 text-[11px] text-zinc-400">
          {JSON.stringify(diagnostics.externalActions, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Authorization records</h2>
        <pre className="max-h-96 overflow-auto rounded border border-white/10 p-3 text-[11px] text-zinc-400">
          {JSON.stringify(diagnostics.externalAuthorizations, null, 2)}
        </pre>
      </section>
    </div>
  );
}
