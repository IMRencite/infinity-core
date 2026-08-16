"use client";

import { getDepartment } from "@/lib/infinity/operator-console/department-registry";
import type { OperatorDepartmentSnapshot, OperatorCostSummary } from "@/lib/infinity/operator-console/types";

type Props = {
  departments: OperatorDepartmentSnapshot[];
  costs: OperatorCostSummary;
};

export function CostBreakdownStrip({ departments, costs }: Props) {
  const withCost = departments.filter((d) => d.costKnown && d.costUsd != null && d.costUsd > 0);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/40 px-3 py-2 text-[10px]">
      <span className="text-zinc-500">
        Known spend:{" "}
        <span className="font-mono text-zinc-300">
          {costs.knownSpendUsd > 0 ? `$${costs.knownSpendUsd.toFixed(4)}` : "—"}
        </span>
      </span>
      {costs.unpricedProviderCalls > 0 ? (
        <span className="text-zinc-500">
          Unpriced: <span className="text-amber-300/90">{costs.unpricedProviderCalls}</span>
        </span>
      ) : null}
      {withCost.map((d) => (
        <span key={d.id} className="text-zinc-600">
          {getDepartment(d.id).shortLabel}:{" "}
          <span className="font-mono text-zinc-400">${d.costUsd!.toFixed(4)}</span>
        </span>
      ))}
    </div>
  );
}
