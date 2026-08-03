import { redirect } from "next/navigation";
import { listRecentReasoningSessions } from "@/lib/infinity/governed-reasoning/persistence";
import { createClient } from "@/lib/supabase/server";

export default async function ReasoningPage() {
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

  const sessions = await listRecentReasoningSessions(supabase, membership.organization_id, 15);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white">Reasoning</h1>
        <p className="mt-2 text-[13px] text-zinc-500">
          Read-only governed advisory reasoning sessions. Production reasoning is initiated by
          Mission Runtime.
        </p>
      </header>

      <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h2 className="text-sm font-medium text-zinc-200">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-[13px] text-zinc-500">No reasoning sessions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sessions.map((session) => {
              const output = session.structuredOutput as {
                summary?: string;
                missingInformation?: string[];
                risks?: { title: string; severity: string }[];
              };
              const usage = session.usage as { inputTokens?: number; outputTokens?: number };
              const failure =
                session.error && typeof session.error === "object" && "message" in session.error
                  ? String((session.error as { message?: string }).message)
                  : null;

              return (
              <li
                key={session.id}
                className="rounded-md border border-white/[0.04] bg-black/20 px-3 py-2 text-[13px]"
              >
                <p className="font-medium text-zinc-200">
                  {session.status} — {session.provider}/{session.model} ({session.mode})
                </p>
                <p className="text-zinc-500">
                  Recommendation: {session.recommendation ?? "—"} · Confidence:{" "}
                  {session.confidence ?? "—"} · Latency: {session.latencyMs ?? "—"}ms · Cost:{" "}
                  {session.estimatedCost != null ? `$${session.estimatedCost.toFixed(4)}` : "—"}
                </p>
                <p className="text-zinc-500">
                  Tokens: in {usage.inputTokens ?? "—"} / out {usage.outputTokens ?? "—"} · Executive
                  review: advisory only (non-binding)
                </p>
                {output.summary ? (
                  <p className="mt-1 text-zinc-400">{output.summary}</p>
                ) : null}
                {output.missingInformation && output.missingInformation.length > 0 ? (
                  <p className="mt-1 text-zinc-500">
                    Missing: {output.missingInformation.slice(0, 5).join("; ")}
                  </p>
                ) : null}
                {output.risks && output.risks.length > 0 ? (
                  <p className="mt-1 text-zinc-500">
                    Risks:{" "}
                    {output.risks
                      .slice(0, 3)
                      .map((r) => `${r.title} (${r.severity})`)
                      .join("; ")}
                  </p>
                ) : null}
                {failure ? <p className="mt-1 text-red-400/80">Failure: {failure}</p> : null}
              </li>
            );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <h2 className="text-sm font-medium text-amber-200/90">Development control</h2>
        <p className="mt-2 text-[13px] text-zinc-500">
          Production reasoning is initiated by Mission Runtime at the reasoning stage. To exercise
          shadow or advisory flows locally, set <code className="text-zinc-400">AI_REASONING_MODE</code>{" "}
          to <code className="text-zinc-400">shadow</code> or <code className="text-zinc-400">advisory</code>
          , configure server-only <code className="text-zinc-400">OPENAI_API_KEY</code>, run the worker
          runtime, and advance a mission via <code className="text-zinc-400">/dashboard/runtime</code>.
        </p>
      </section>
    </div>
  );
}
