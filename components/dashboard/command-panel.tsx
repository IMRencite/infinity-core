"use client";

import { useActionState } from "react";
import {
  activateDefaultMission,
  runCommandCycle,
  runNextQueuedJobAction,
  type CommandActionState,
} from "@/app/dashboard/command/actions";
import type { ExecutionDiagnostics } from "@/lib/infinity/types";

const initialState: CommandActionState = {
  ok: false,
  message: "",
};

function ActionFeedback({ state }: { state: CommandActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`mt-3 text-[13px] ${state.ok ? "text-emerald-400" : "text-amber-400"}`}
      role="status"
    >
      {state.message}
    </p>
  );
}

function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: ExecutionDiagnostics & { engineJobId: string };
}) {
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        Development diagnostics
      </h3>
      <dl className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-zinc-600">Engine job</dt>
          <dd className="mt-0.5 font-mono text-zinc-300">
            {diagnostics.engineJobId.slice(0, 8)}… ({diagnostics.engineJobStatus})
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Worker run</dt>
          <dd className="mt-0.5 font-mono text-zinc-300">
            {diagnostics.workerRunId
              ? `${diagnostics.workerRunId.slice(0, 8)}… (${diagnostics.workerRunStatus})`
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Capability</dt>
          <dd className="mt-0.5 text-zinc-300">
            {diagnostics.capabilityKey}
            {diagnostics.resolvedVersion ? `@${diagnostics.resolvedVersion}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Attempts</dt>
          <dd className="mt-0.5 text-zinc-300">
            {diagnostics.attemptCount ?? 0}/{diagnostics.maxAttempts ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Duration</dt>
          <dd className="mt-0.5 text-zinc-300">
            {diagnostics.durationMs !== null ? `${diagnostics.durationMs} ms` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Retry / dead-letter</dt>
          <dd className="mt-0.5 text-zinc-300">
            {diagnostics.engineJobStatus === "dead_letter"
              ? "Dead letter"
              : diagnostics.nextAttemptAt
                ? `Retry at ${new Date(diagnostics.nextAttemptAt).toLocaleString()}`
                : diagnostics.lastError ?? "None"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CommandPanel({
  missionTitle,
  pendingDiscoveryJobs,
  lastCycleStatus,
  diagnostics,
  dueQueuedJobId,
}: {
  missionTitle: string | null;
  pendingDiscoveryJobs: number;
  lastCycleStatus: string | null;
  diagnostics: ExecutionDiagnostics;
  dueQueuedJobId: string | null;
}) {
  const [missionState, activateMission, missionPending] = useActionState(
    activateDefaultMission,
    initialState,
  );
  const [cycleState, triggerCycle, cyclePending] = useActionState(
    runCommandCycle,
    initialState,
  );
  const [queuedJobState, runQueuedJob, queuedJobPending] = useActionState(
    runNextQueuedJobAction,
    initialState,
  );

  return (
    <section aria-label="Command" className="mt-8">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        OS Foundation
      </h2>
      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-zinc-600">Mission</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {missionTitle ?? "None active"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Pending discovery jobs</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {pendingDiscoveryJobs}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Last Command cycle</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {lastCycleStatus ?? "None"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {!missionTitle ? (
            <form action={activateMission}>
              <button
                type="submit"
                disabled={missionPending}
                className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {missionPending ? "Activating…" : "Activate default mission"}
              </button>
            </form>
          ) : null}

          <form action={triggerCycle}>
            <button
              type="submit"
              disabled={cyclePending || !missionTitle}
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {cyclePending ? "Running cycle…" : "Run Command cycle"}
            </button>
          </form>
        </div>

        <ActionFeedback state={missionState} />
        <ActionFeedback state={cycleState} />
        {diagnostics.engineJobId ? (
          <>
            <DiagnosticsPanel
              diagnostics={{
                ...diagnostics,
                engineJobId: diagnostics.engineJobId,
              }}
            />
            {dueQueuedJobId ? (
              <form action={runQueuedJob} className="mt-3">
                <button
                  type="submit"
                  disabled={queuedJobPending}
                  className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[12px] font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                >
                  {queuedJobPending ? "Running queued job…" : "Run queued job"}
                </button>
              </form>
            ) : null}
            <ActionFeedback state={queuedJobState} />
          </>
        ) : (
          <p className="mt-4 text-[12px] text-zinc-500">
            No engine jobs recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}
