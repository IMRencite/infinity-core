import Link from "next/link";
import type { HqMissionRow } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { EmptyState, HqSection } from "./empty-state";

export function MissionStageBoard({ missions }: { missions: HqMissionRow[] }) {
  return (
    <HqSection
      id="mission-pipeline"
      title="Mission Pipeline"
      subtitle="Active mission runtimes grouped by current stage."
    >
      {missions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[12px]">
            <thead className="border-b border-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-2 font-medium">Mission</th>
                <th className="px-2 py-2 font-medium">Stage</th>
                <th className="px-2 py-2 font-medium">Runtime</th>
                <th className="px-2 py-2 font-medium">Lifecycle</th>
                <th className="px-2 py-2 font-medium">Last advanced</th>
                <th className="px-2 py-2 font-medium">Wake</th>
                <th className="px-2 py-2 font-medium">Block</th>
                <th className="px-2 py-2 font-medium">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {missions.map((m) => (
                <tr key={m.runtimeInstanceId} className="text-zinc-300">
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-100">{m.title}</p>
                    <p className="font-mono text-[10px] text-zinc-600">{m.missionId.slice(0, 8)}…</p>
                  </td>
                  <td className="px-2 py-2">{m.currentStage}</td>
                  <td className="px-2 py-2">{m.runtimeStatus}</td>
                  <td className="px-2 py-2">
                    v{m.lifecycleVersion} · sv{m.stateVersion}
                  </td>
                  <td className="px-2 py-2">{formatIsoTime(m.lastAdvancedAt)}</td>
                  <td className="px-2 py-2">{formatIsoTime(m.wakeAt)}</td>
                  <td className="max-w-[140px] truncate px-2 py-2 text-zinc-500">
                    {m.blockingReason ?? "—"}
                  </td>
                  <td className="px-2 py-2">
                    <Link href={m.inspectorHref} className="text-sky-400 hover:underline">
                      Open
                    </Link>
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
