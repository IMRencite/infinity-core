"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";

type Props = {
  snapshot: OperatorVentureSnapshot;
};

export function OperationsSummaryStrip({ snapshot }: Props) {
  const { venture, costs, closedLoopRoute, currentActivity } = snapshot;

  return (
    <section
      className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-4"
      aria-label="Operations summary"
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Operations Summary</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4 lg:grid-cols-6">
        <div>
          <dt className="text-zinc-600">Venture</dt>
          <dd className="mt-0.5 truncate text-zinc-200">{venture.ventureName}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Status</dt>
          <dd className="mt-0.5 text-zinc-300">{departmentStateLabel(snapshot.overallStatus)}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Mission</dt>
          <dd className="mt-0.5 font-mono text-[11px] text-zinc-400">{venture.missionId.slice(0, 12)}…</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Known spend</dt>
          <dd className="mt-0.5 text-zinc-200">
            {costs.knownSpendUsd > 0 ? `$${costs.knownSpendUsd.toFixed(4)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Active sessions</dt>
          <dd className="mt-0.5 text-zinc-300">{snapshot.providers.length}</dd>
        </div>
        {closedLoopRoute.decisionType ? (
          <div>
            <dt className="text-zinc-600">Latest decision</dt>
            <dd className="mt-0.5 text-zinc-300">{closedLoopRoute.decisionType}</dd>
          </div>
        ) : null}
        {(currentActivity.provider || currentActivity.model) ? (
          <div className="col-span-2">
            <dt className="text-zinc-600">Active provider</dt>
            <dd className="mt-0.5 text-zinc-400">
              {[currentActivity.provider, currentActivity.model].filter(Boolean).join(" · ")}
            </dd>
          </div>
        ) : null}
        {venture.launchStage ? (
          <div>
            <dt className="text-zinc-600">Launch</dt>
            <dd className="mt-0.5 text-zinc-300">{venture.launchStage}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-600">Pipeline</dt>
          <dd className="mt-0.5 text-zinc-300">
            {snapshot.pipeline.stagesCompleted}/{snapshot.pipeline.stagesTotal}
          </dd>
        </div>
      </dl>
    </section>
  );
}
