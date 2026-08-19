import { parseFavc1CycleVentureId } from "@/lib/infinity/operator-console/favc1-cycle/types";
import type { Favc1CycleSnapshotMeta } from "@/lib/infinity/operator-console/favc1-cycle/types";
import { buildFavc1TerminalDisplay } from "@/lib/infinity/operator-console/favc1-cycle/terminal-messaging";

type Props = {
  meta: Favc1CycleSnapshotMeta;
};

function formatCost(meta: Favc1CycleSnapshotMeta): string {
  if (meta.knownCycleCostUsd == null) return "Unknown";
  return `$${meta.knownCycleCostUsd.toFixed(4)}`;
}

function terminalLabel(meta: Favc1CycleSnapshotMeta): { headline: string | null; decision: string | null } {
  if (meta.terminalOutcome === "RUNNING") {
    return { headline: null, decision: null };
  }

  const display =
    meta.terminalDisplay ??
    buildFavc1TerminalDisplay({
      terminalOutcome: meta.terminalOutcome,
      selectionStopReasonPath: meta.selectionStopReasonPath,
      validationOutcome: meta.validationOutcome,
      failureMessage: meta.failureMessage,
    });

  return { headline: display.headline, decision: display.decision };
}

export function Favc1CycleHeader({ meta }: Props) {
  const terminal = terminalLabel(meta);

  return (
    <section
      aria-label="Autonomous venture cycle status"
      className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-zinc-950/60 to-zinc-950/60 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300/80">
            Autonomous Venture Cycle {meta.mode === "pre_venture" ? "Active" : "Linked"}
          </p>
          <h2 className="mt-1 text-lg font-medium text-white">
            {meta.terminalOutcome === "RUNNING"
              ? "Cycle in progress"
              : terminal.headline ?? "Cycle outcome recorded"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Current stage: <span className="text-zinc-200">{meta.currentStageLabel}</span>
          </p>
          {terminal.decision ? (
            <p className="mt-1 text-sm text-amber-200/90">{terminal.decision}</p>
          ) : null}
          {meta.terminalDisplay?.systemDetail ? (
            <p className="mt-1 font-mono text-[10px] text-zinc-600">{meta.terminalDisplay.systemDetail}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-400 md:grid-cols-4">
          <div>
            <p className="uppercase tracking-wider text-zinc-600">Candidates</p>
            <p className="text-zinc-200">{meta.candidateCount ?? "Unknown"}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-zinc-600">Monetized</p>
            <p className="text-zinc-200">{meta.monetizedCandidateCount ?? "Unknown"}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-zinc-600">Research</p>
            <p className="text-zinc-200">
              {meta.activeResearchSessionCount} active / {meta.researchSessionCount} total
            </p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-zinc-600">Known cycle cost</p>
            <p className="text-zinc-200">{formatCost(meta)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 font-mono text-[10px] text-zinc-600">cycleKey: {meta.cycleKey}</p>
    </section>
  );
}

export function isFavc1PollingVentureId(ventureId: string): boolean {
  return Boolean(parseFavc1CycleVentureId(ventureId));
}

export function favc1CyclePollUrl(ventureId: string): string {
  const cycleKey = parseFavc1CycleVentureId(ventureId);
  const params = new URLSearchParams();
  if (cycleKey) params.set("cycleKey", cycleKey);
  params.set("ventureId", ventureId);
  return `/api/operator-console/favc1-cycle?${params.toString()}`;
}
