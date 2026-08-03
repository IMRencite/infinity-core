import type { WorkerCapabilityDiagnosticsRow } from "@/lib/infinity/workers/types";
import { EmptyState, HqSection } from "./empty-state";

export function WorkerCapabilityDiagnosticsPanel({
  rows,
}: {
  rows: WorkerCapabilityDiagnosticsRow[];
}) {
  return (
    <HqSection
      id="worker-capabilities"
      title="Worker Capabilities (v1)"
      subtitle="Read-only governed worker diagnostics. Production workers execute through Scheduler and Worker Runtime."
    >
      {rows.length === 0 ? (
        <EmptyState message="No governed worker capability jobs yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[12px]">
            <thead className="border-b border-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-2">Capability</th>
                <th className="px-2 py-2">Job</th>
                <th className="px-2 py-2">Run</th>
                <th className="px-2 py-2">Result</th>
                <th className="px-2 py-2">Review</th>
                <th className="px-2 py-2">Artifact</th>
                <th className="px-2 py-2">Block / error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {rows.map((row) => (
                <tr key={`${row.capabilityKey}-${row.engineJobId ?? "none"}`}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-100">{row.capabilityKey}</p>
                    <p className="text-[10px] text-zinc-600">v{row.capabilityVersion}</p>
                  </td>
                  <td className="px-2 py-2">{row.engineJobStatus ?? "—"}</td>
                  <td className="px-2 py-2">{row.workerRunStatus ?? "—"}</td>
                  <td className="px-2 py-2">{row.resultStatus ?? "—"}</td>
                  <td className="px-2 py-2">{row.reviewStatus ?? "—"}</td>
                  <td className="px-2 py-2">{row.artifactType ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-2 py-2 text-zinc-500">
                    {row.blockingReason ?? row.errorClassification ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HqSection>
  );
}
