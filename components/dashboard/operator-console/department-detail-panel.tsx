"use client";

import type {
  OperatorCostSummary,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
} from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { CopyIdButton } from "./copy-id-button";

type Props = {
  department: OperatorDepartmentSnapshot | null;
  providers: OperatorProviderSession[];
  costs: OperatorCostSummary;
};

export function DepartmentDetailPanel({ department, providers, costs }: Props) {
  if (!department) {
    return (
      <aside className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-sm text-zinc-500">
        Select a department to inspect operational data.
      </aside>
    );
  }

  const deptProviders = providers.filter((p) => p.departmentId === department.id);

  return (
    <aside className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-[13px] font-medium text-zinc-200">{department.label}</h2>
        <p className="text-[11px] text-zinc-500">{departmentStateLabel(department.state)} · {department.recordCount} records</p>
      </div>
      <div className="space-y-4 p-4 text-xs">
        {department.currentTask ? (
          <div>
            <p className="text-zinc-500">Current assignment</p>
            <p className="text-zinc-200">{department.currentTask}</p>
          </div>
        ) : null}
        {department.provider ? (
          <div>
            <p className="text-zinc-500">Provider / Model</p>
            <p className="text-zinc-200">{department.provider}{department.model ? ` · ${department.model}` : ""}</p>
          </div>
        ) : null}
        <div>
          <p className="text-zinc-500">Cost</p>
          <p className="text-zinc-200">
            {department.costKnown && department.costUsd != null
              ? `$${department.costUsd.toFixed(4)}`
              : department.costKnown
                ? "$0.00"
                : "Unknown"}
          </p>
        </div>

        {deptProviders.length > 0 ? (
          <div>
            <p className="mb-2 text-zinc-500">AI Sessions</p>
            <ul className="space-y-2">
              {deptProviders.slice(0, 5).map((s) => (
                <li key={s.sessionId} className="rounded border border-zinc-800/60 p-2">
                  <p className="font-medium text-zinc-300">{s.role.replace(/_/g, " ")}</p>
                  <p className="text-zinc-400">{[s.provider, s.model].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="text-zinc-500">{s.task ?? s.status}</p>
                  {s.filesChanged.length > 0 ? (
                    <ul className="mt-1 font-mono text-[10px] text-emerald-300/80">
                      {s.filesChanged.slice(0, 6).map((f) => (
                        <li key={f}>+ {f}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="mb-1 text-zinc-500">Known org spend (partial)</p>
          <p className="text-zinc-300">${costs.knownSpendUsd.toFixed(4)} · {costs.unpricedProviderCalls} unpriced</p>
        </div>

        <details className="rounded border border-zinc-800/60">
          <summary className="cursor-pointer px-2 py-1.5 text-zinc-400">Raw department detail</summary>
          <pre className="max-h-48 overflow-auto p-2 text-[10px] text-zinc-500">
            {JSON.stringify(department.detail, null, 2)}
          </pre>
        </details>
      </div>
    </aside>
  );
}
