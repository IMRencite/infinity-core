"use client";

import type { ZtpHqReadModel } from "@/lib/infinity/zero-to-production/hq/read-model";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";

type Props = {
  model: ZtpHqReadModel;
  inspectArtifact?: HqWorkArtifact | null;
};

export function ZtpIntelligenceStrip({ model, inspectArtifact = null }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const active = model.rows.find((row) => row.status === "RUNNING" || row.status === "WAITING");
  const compact = !active;
  const onInspect =
    inspectArtifact && inspector
      ? () => inspector.openInspector(inspectArtifact)
      : undefined;

  return (
    <section
      aria-label="Zero-to-Production"
      data-infrastructure-presentation={compact ? "COMPACT" : "EXPANDED"}
      className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-r from-zinc-950/80 via-[#070709] to-zinc-950/80"
    >
      <div className="relative flex items-center justify-between gap-3 px-4 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Zero-to-Production</h2>
        {onInspect ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInspect();
            }}
            className="shrink-0 rounded border border-zinc-700/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:text-zinc-100"
          >
            View ZTP
          </button>
        ) : null}
      </div>
      {compact ? (
        <p className="px-4 pb-2.5 text-[11px] text-zinc-500">
          {model.rows.length === 0
            ? "No persisted Zero-to-Production runs."
            : `${model.rows.length} run${model.rows.length === 1 ? "" : "s"} · ${model.rows[0]?.stage} · ${model.rows[0]?.status}`}
        </p>
      ) : (
        <div className="relative overflow-x-auto px-4 pb-3">
          <table className="w-full min-w-[860px] text-left text-xs text-zinc-300">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="pb-2 font-medium">Venture</th>
                <th className="pb-2 font-medium">Origin</th>
                <th className="pb-2 font-medium">Stage</th>
                <th className="pb-2 font-medium">Decision</th>
                <th className="pb-2 font-medium">Progress</th>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 font-medium">QA</th>
                <th className="pb-2 font-medium">Repairs</th>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">Commercial</th>
                <th className="pb-2 font-medium">Launch</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.runId} className="border-t border-zinc-800/80">
                  <td className="py-1.5">{row.venture.slice(0, 8)}</td>
                  <td>{row.origin}</td>
                  <td>{row.stage}</td>
                  <td>{row.businessDecision}</td>
                  <td>{row.progress}</td>
                  <td>{row.codingProvider}</td>
                  <td>{row.qa}</td>
                  <td>{row.repairAttempts}</td>
                  <td>{row.cost}</td>
                  <td>{row.commercialization}</td>
                  <td>{row.launchReadiness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
