import type { HqBlueprintRow } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { EmptyState, HqSection } from "./empty-state";

export function BlueprintTable({ rows }: { rows: HqBlueprintRow[] }) {
  return (
    <HqSection
      id="venture-blueprints"
      title="Venture Blueprints"
      subtitle="Blueprint only — execution not started. Build Factory is not implemented."
    >
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-[12px]">
            <thead className="border-b border-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Model</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Budget</th>
                <th className="px-2 py-2">Assets / Workers</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-100">{row.name}</p>
                    <p className="text-[10px] text-amber-500/90">Blueprint only — not executed</p>
                  </td>
                  <td className="px-2 py-2">{row.ventureType}</td>
                  <td className="px-2 py-2">{row.businessModel}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{row.estimatedBudget ?? "No data yet"}</td>
                  <td className="px-2 py-2">
                    {row.requiredAssetsCount} / {row.requiredWorkersCount}
                  </td>
                  <td className="px-2 py-2">{formatIsoTime(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HqSection>
  );
}
