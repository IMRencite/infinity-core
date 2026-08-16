"use client";

import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";

type Props = {
  ventureName: string;
  overallStatus: string;
  knownSpendUsd: number;
  unpricedCalls: number;
  latestDecision: string | null;
  activeDepartments: DepartmentId[];
  missionStatus: string | null;
};

export function VentureCore({
  ventureName,
  overallStatus,
  knownSpendUsd,
  unpricedCalls,
  latestDecision,
  activeDepartments,
  missionStatus,
}: Props) {
  return (
    <div
      className="mx-auto max-w-md rounded-2xl border border-sky-500/20 bg-gradient-to-b from-zinc-900/90 to-[#0a0a0c] px-6 py-5 text-center shadow-[0_0_40px_rgba(14,165,233,0.08)]"
      role="status"
      aria-label={`Venture core: ${ventureName}`}
    >
      <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Venture Core</p>
      <h3 className="mt-1 truncate text-lg font-semibold text-white">{ventureName}</h3>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-sky-300/90">
        {departmentStateLabel(overallStatus as Parameters<typeof departmentStateLabel>[0])}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-left text-xs">
        <div>
          <dt className="text-zinc-500">Known spend</dt>
          <dd className="font-mono text-zinc-200">
            {knownSpendUsd > 0 ? `$${knownSpendUsd.toFixed(2)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Unpriced</dt>
          <dd className="text-zinc-200">{unpricedCalls > 0 ? unpricedCalls : "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Latest decision</dt>
          <dd className="text-zinc-200">{latestDecision ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Mission</dt>
          <dd className="text-zinc-200">{missionStatus ?? "—"}</dd>
        </div>
      </dl>

      {activeDepartments.length > 0 ? (
        <p className="mt-3 text-[10px] text-zinc-500">
          Active: {activeDepartments.map((d) => d.replace(/_/g, " ")).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
