"use client";

import type { OperatorCurrentActivity } from "@/lib/infinity/operator-console/types";
import type { DepartmentUiState } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";

type Props = {
  activity: OperatorCurrentActivity;
  overallStatus: DepartmentUiState;
};

function formatElapsed(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CurrentActivityBar({ activity }: Props) {
  return (
    <section className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-sky-300/80">Current Activity</h2>
      {activity.active ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4 lg:grid-cols-6">
          <div><dt className="text-zinc-500">Department</dt><dd className="text-zinc-100">{activity.departmentLabel ?? "—"}</dd></div>
          <div><dt className="text-zinc-500">Engine</dt><dd className="text-zinc-100">{activity.engine ?? "—"}</dd></div>
          <div><dt className="text-zinc-500">Task</dt><dd className="text-zinc-100">{activity.task ?? "—"}</dd></div>
          <div><dt className="text-zinc-500">Provider</dt><dd className="text-zinc-100">{activity.provider ?? "—"}</dd></div>
          <div><dt className="text-zinc-500">Model</dt><dd className="text-zinc-100">{activity.model ?? "—"}</dd></div>
          <div><dt className="text-zinc-500">Status</dt><dd className="text-zinc-100">{activity.status ? departmentStateLabel(activity.status as DepartmentUiState) : "—"}</dd></div>
          <div><dt className="text-zinc-500">Elapsed</dt><dd className="font-mono text-zinc-100">{formatElapsed(activity.elapsedSeconds)}</dd></div>
          <div>
            <dt className="text-zinc-500">Known cost</dt>
            <dd className="text-zinc-100">
              {activity.costKnown && activity.costUsd != null ? `$${activity.costUsd.toFixed(4)}` : activity.costKnown ? "$0" : "Unknown"}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 text-sm text-zinc-400">
          <p>No active execution</p>
          {activity.latestActivitySummary ? (
            <p className="mt-1 text-xs text-zinc-500">
              Latest: {activity.latestActivitySummary}
              {activity.latestActivityAt ? ` at ${new Date(activity.latestActivityAt).toLocaleTimeString()}` : ""}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
