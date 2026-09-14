"use client";

import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import { codingActiveRun, codingActiveRunCount, codingPresentation } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";

type Props = {
  model: CodingHqReadModel;
  inspectArtifact?: HqWorkArtifact | null;
};

export function CodingIntelligenceStrip({ model, inspectArtifact = null }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const presentation = codingPresentation(model);
  const active = codingActiveRun(model);
  const native = model.providers.find((provider) => /native/i.test(provider.provider));
  const cursor = model.providers.find((provider) => /cursor/i.test(provider.provider));
  const onInspect =
    inspectArtifact && inspector
      ? () => inspector.openInspector(inspectArtifact)
      : undefined;

  return (
    <section
      aria-label="Coding Intelligence"
      data-infrastructure-presentation={presentation}
      className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-r from-zinc-950/80 via-[#070709] to-zinc-950/80"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.05),transparent)]" aria-hidden />
      <div className="relative flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Coding Intelligence</h2>
          {presentation === "EXPANDED" ? (
            <p className="text-[11px] uppercase tracking-[0.16em] text-sky-300">Active</p>
          ) : null}
        </div>
        {onInspect ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInspect();
            }}
            className="shrink-0 rounded border border-zinc-700/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-sky-400/40 hover:text-sky-100"
          >
            View Coding
          </button>
        ) : null}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-1 px-4 pb-2.5 text-[11px] text-zinc-400">
        <span>
          Native Coder <span className="font-medium uppercase text-zinc-200">{native?.status ?? "UNKNOWN"}</span>
        </span>
        <span>
          External Agent{" "}
          <span className="font-medium uppercase text-zinc-200" data-hq-cursor-status={cursor?.status ?? "UNKNOWN"}>
            {cursor?.status ?? "UNKNOWN"}
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">Cursor</span>
        </span>
        <span>
          API Connection{" "}
          <span className="font-medium uppercase text-zinc-200" data-hq-cursor-connector={cursor?.connectorStatus ?? "NOT_CONNECTED"}>
            {cursor?.connectorStatus ?? "NOT_CONNECTED"}
          </span>
        </span>
        <span>
          Active Runs{" "}
          <span className="font-medium text-zinc-200" data-hq-active-runs={codingActiveRunCount(model)}>
            {codingActiveRunCount(model)}
          </span>
        </span>
      </div>

      {presentation === "EXPANDED" && (active || model.rows.length > 0) ? (
        <div className="relative space-y-2 px-4 pb-3">
          {active ? (
            <div className="rounded border border-sky-500/20 bg-sky-950/20 px-3 py-2 text-xs text-zinc-300">
              <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/80">
                {active.provider} · {active.executionMode}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{active.task}</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {active.filesAffected} files · {active.tests} tests · {active.knownCost} · {active.duration} · {active.validationState}
              </p>
            </div>
          ) : null}
          <div className="hq-reflow-table-wrap">
            <table className="hq-reflow-table text-left text-xs text-zinc-300">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                <tr>
                  <th className="pb-2 font-medium">Venture</th>
                  <th className="pb-2 font-medium">Task</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">Mode</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Known cost</th>
                  <th className="pb-2 font-medium">Files</th>
                  <th className="pb-2 font-medium">Tests</th>
                  <th className="pb-2 font-medium">Build</th>
                  <th className="pb-2 font-medium">Repairs</th>
                  <th className="pb-2 font-medium">Validation</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <tr key={row.runId} className="border-t border-zinc-800/80">
                    <td className="py-1.5" data-label="Venture">{row.venture}</td>
                    <td data-label="Task">{row.task.slice(0, 8)}</td>
                    <td data-label="Provider">{row.provider}</td>
                    <td data-label="Mode">{row.executionMode}</td>
                    <td data-label="Status">{row.status}</td>
                    <td data-label="Duration">{row.duration}</td>
                    <td data-label="Known cost">{row.knownCost}</td>
                    <td data-label="Files">{row.filesAffected}</td>
                    <td data-label="Tests">{row.tests}</td>
                    <td data-label="Build">{row.build}</td>
                    <td data-label="Repairs">{row.repairAttempts}</td>
                    <td data-label="Validation">{row.validationState}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
