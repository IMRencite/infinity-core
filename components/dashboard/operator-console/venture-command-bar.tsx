"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { StatusBadge } from "@/components/dashboard/hq/status-badge";

type Props = {
  snapshot: OperatorVentureSnapshot;
  view: "hq" | "system";
  onViewChange: (view: "hq" | "system") => void;
};

export function VentureCommandBar({ snapshot, view, onViewChange }: Props) {
  const { venture, pipeline, costs, closedLoopRoute } = snapshot;

  return (
    <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Infinity HQ</p>
          <h1 className="text-xl font-semibold text-white">{venture.ventureName}</h1>
          <p className="font-mono text-[10px] text-zinc-600">{venture.ventureAssemblyId}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
            <span>Mission: <span className="font-mono text-zinc-500">{venture.missionId.slice(0, 8)}…</span></span>
            <span>Assembly: {venture.assemblyStatus}</span>
            {venture.launchStage ? <span>Launch: {venture.launchStage}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-zinc-700/60 p-0.5">
            <button
              type="button"
              onClick={() => onViewChange("hq")}
              className={`rounded-md px-3 py-1 text-xs ${view === "hq" ? "bg-sky-500/20 text-sky-200" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              HQ View
            </button>
            <button
              type="button"
              onClick={() => onViewChange("system")}
              className={`rounded-md px-3 py-1 text-xs ${view === "system" ? "bg-sky-500/20 text-sky-200" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              System View
            </button>
          </div>
          <StatusBadge status={snapshot.overallStatus.toLowerCase()} label={departmentStateLabel(snapshot.overallStatus)} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4 lg:grid-cols-6">
        <div>
          <dt className="text-zinc-500">Stages</dt>
          <dd className="text-zinc-200">{pipeline.stagesCompleted} of {pipeline.stagesTotal}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Known spend</dt>
          <dd className="text-zinc-200">
            {costs.knownSpendUsd > 0 ? `$${costs.knownSpendUsd.toFixed(4)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Unpriced calls</dt>
          <dd className="text-zinc-200">{costs.unpricedProviderCalls || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Latest decision</dt>
          <dd className="text-zinc-200">{closedLoopRoute.decisionType ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Active dept(s)</dt>
          <dd className="text-zinc-200">
            {snapshot.currentDepartments.length
              ? snapshot.currentDepartments.map((d) => d.replace(/_/g, " ")).join(", ")
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Next mission</dt>
          <dd className="font-mono text-[10px] text-zinc-400">{closedLoopRoute.missionId?.slice(0, 8) ?? "—"}</dd>
        </div>
      </dl>
    </header>
  );
}
