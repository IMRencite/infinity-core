"use client";

import type {
  OperatorCostSummary,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { LineageMarker, lineageStyleForKey } from "./artifacts/lineage-accent";
import { WorkerNodeCluster } from "./worker-node";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

type Props = {
  department: OperatorDepartmentSnapshot | null;
  providers: OperatorProviderSession[];
  workerNodes: OperatorWorkerNode[];
  costs: OperatorCostSummary;
};

function ArtifactDetailTrigger({ artifact }: { artifact: HqWorkArtifact }) {
  const inspector = useOptionalHqArtifactInspector();
  return (
    <button
      type="button"
      onClick={() => inspector?.openInspector(artifact)}
      className="w-full rounded border border-zinc-800/60 bg-black/20 p-3 text-left transition hover:border-cyan-500/30 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
    >
      <div className="flex items-start gap-2">
        {artifact.lineageColorKey ? (
          <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-white/20" style={lineageStyleForKey(artifact.lineageColorKey)} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <LineageMarker artifact={artifact} />
            <p className="text-base font-medium text-zinc-100">{artifact.title}</p>
          </div>
          {artifact.subtitle ? <p className="text-sm text-zinc-400">{artifact.subtitle}</p> : null}
          <p className="mt-1.5 font-mono text-xs text-zinc-600">
            {artifact.artifactType} · {artifact.sourceRecordType} · {artifact.state}
          </p>
        </div>
      </div>
    </button>
  );
}

export function DepartmentDetailPanel({ department, providers, workerNodes, costs }: Props) {
  if (!department) {
    return (
      <aside className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-sm text-zinc-500">
        Select a department room to inspect operational data.
      </aside>
    );
  }

  const deptProviders = providers.filter((p) => p.departmentId === department.id);
  const deptNodes = workerNodes.filter((n) => n.departmentId === department.id);

  return (
    <aside className="overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-950/90 to-[#0a0a0c] shadow-xl shadow-black/10">
      <div className="border-b border-zinc-800/80 bg-black/20 px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          {department.displayName ?? department.label}
        </h2>
        <p className="text-sm text-[var(--hq-text-secondary)]">
          {department.supportingLabel ?? department.label} · {departmentStateLabel(department.state)} · {department.recordCount} records
        </p>
      </div>

      <div className="space-y-4 p-4 text-sm">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What Infinity is doing</p>
          <p className="mt-1.5 text-base leading-snug text-zinc-100">
            {department.displayHeadline ?? department.displaySummary ?? "Standing by"}
          </p>
          {department.displayTask ? (
            <p className="mt-1.5 text-sm text-zinc-400">{department.displayTask}</p>
          ) : null}
        </section>

        {deptNodes.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Agents in room</p>
            <div className="rounded-lg border border-zinc-800/60 bg-black/20 p-3">
              <WorkerNodeCluster nodes={deptNodes} />
              <ul className="mt-3 space-y-2">
                {deptNodes.map((node) => (
                  <li key={node.nodeId} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-zinc-300">{node.displayRole}</span>
                    <span className="text-right text-zinc-500">
                      {[node.provider, node.model].filter(Boolean).join(" / ") || node.displayTask || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {department.workArtifacts && department.workArtifacts.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Persisted outputs</p>
            <ul className="space-y-2">
              {department.workArtifacts.slice(0, 8).map((artifact) => (
                <li key={artifact.id}>
                  <ArtifactDetailTrigger artifact={artifact} />
                </li>
              ))}
            </ul>
          </section>
        ) : department.artifacts && department.artifacts.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Current outputs</p>
            <ul className="space-y-1">
              {department.artifacts.map((artifact) => (
                <li key={artifact.id} className="text-zinc-300">· {artifact.label}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {deptProviders.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI sessions</p>
            <ul className="space-y-2">
              {deptProviders.slice(0, 5).map((s) => (
                <li key={s.sessionId} className="rounded border border-zinc-800/60 p-2">
                  <p className="font-medium text-zinc-300">{s.displayRole ?? s.role.replace(/_/g, " ")}</p>
                  <p className="text-zinc-400">{[s.provider, s.model].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="text-zinc-500">{s.displayTask ?? s.task ?? s.status}</p>
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
          </section>
        ) : null}

        <section>
          <p className="text-zinc-500">Operational state</p>
          <p className="text-zinc-200">{departmentStateLabel(department.state)}</p>
          {department.failureSemantics && department.failureSemantics !== "UNKNOWN" ? (
            <p className="text-zinc-400">Failure context: {department.failureSemantics.replace(/_/g, " ").toLowerCase()}</p>
          ) : null}
          {department.latestRawStatus ? (
            <p className="font-mono text-[10px] text-zinc-500">Latest raw status: {department.latestRawStatus}</p>
          ) : null}
        </section>

        <section>
          <p className="text-zinc-200">
            {department.costKnown && department.costUsd != null
              ? `$${department.costUsd.toFixed(4)}`
              : department.costKnown
                ? "$0.00"
                : "Unknown"}
          </p>
        </section>

        <details className="rounded border border-zinc-800/60">
          <summary className="cursor-pointer px-2 py-1.5 text-zinc-400">Technical details</summary>
          <div className="space-y-2 border-t border-zinc-800/40 p-2 text-[10px] text-zinc-500">
            {department.currentTask ? <p>Task: {department.currentTask}</p> : null}
            {department.summary ? <p>Summary: {department.summary}</p> : null}
            <pre className="max-h-48 overflow-auto">{JSON.stringify(department.detail, null, 2)}</pre>
          </div>
        </details>

        <p className="text-[10px] text-zinc-600">
          Org spend (partial): ${costs.knownSpendUsd.toFixed(4)} · {costs.unpricedProviderCalls} unpriced
        </p>
      </div>
    </aside>
  );
}
