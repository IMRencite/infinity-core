import Link from "next/link";
import type { BuildFactoryDiagnosticsRow } from "@/lib/infinity/build-factory/diagnostics";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";

export function BuildFactoryDiagnosticsPanel({
  rows,
}: {
  rows: BuildFactoryDiagnosticsRow[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Build Factory</h2>
        <Link href={HQ_ROUTES.builds} className="text-[11px] text-sky-400 hover:underline">
          View builds
        </Link>
      </div>
      <p className="mb-3 text-[10px] text-amber-200/80">Internal build only — not deployed.</p>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-600">No internal builds recorded.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {rows.slice(0, 5).map((row) => (
            <li key={row.buildId} className="flex justify-between gap-2 border-t border-white/5 pt-2">
              <span className="text-zinc-400">{row.name}</span>
              <span className="text-zinc-500">{row.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
