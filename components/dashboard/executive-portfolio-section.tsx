"use client";

import type { ExecutiveDecisionWithOpportunity } from "@/lib/infinity/executive/queries";
import type { Tables } from "@/lib/supabase/database.types";

type QueueEntry = Tables<"enterprise_queue_entries">;

type ExecutivePortfolioSectionProps = {
  decisions: ExecutiveDecisionWithOpportunity[];
  queue: QueueEntry[];
};

function formatDecision(decision: string): string {
  return decision.replace(/_/g, " ");
}

export function ExecutivePortfolioSection({
  decisions,
  queue,
}: ExecutivePortfolioSectionProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <div className="border-b border-zinc-800/80 px-4 py-3">
          <p className="text-[13px] font-medium text-zinc-200">Latest executive decisions</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Read-only deterministic Executive outcomes after validation approval. No LLM or Build
            Factory.
          </p>
        </div>
        {decisions.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-zinc-500">No executive decisions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {decisions.map((decision) => (
              <li key={decision.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">
                    {decision.opportunityName ?? decision.opportunity_id.slice(0, 8)}
                  </span>
                  <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-300">
                    {formatDecision(decision.decision)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-zinc-400">
                  Priority {Number(decision.priority_score).toFixed(1)} · Planning eligible{" "}
                  {decision.planning_eligible ? "yes" : "no"} · {decision.record_status}
                </p>
                {Array.isArray(decision.rationale) && decision.rationale.length > 0 ? (
                  <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">
                    {String(decision.rationale[0])}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <div className="border-b border-zinc-800/80 px-4 py-3">
          <p className="text-[13px] font-medium text-zinc-200">Enterprise build queue</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Ordered by executive priority. Queue status does not create ventures or assets.
          </p>
        </div>
        {queue.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-zinc-500">No active queue entries.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {queue.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-zinc-200">
                    #{entry.queue_position} · {entry.opportunity_id.slice(0, 8)}…
                  </span>
                  <span className="text-[12px] text-zinc-400">{entry.entry_status}</span>
                </div>
                <p className="mt-1 text-[12px] text-zinc-500">
                  Priority {Number(entry.queue_priority).toFixed(1)} · Planning eligible{" "}
                  {entry.planning_eligible ? "yes" : "no"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
