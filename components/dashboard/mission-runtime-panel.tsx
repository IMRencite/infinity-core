"use client";

import { useActionState } from "react";
import {
  cancelMissionRuntimeAction,
  pauseMissionRuntimeAction,
  resumeMissionRuntimeAction,
  runMissionRuntimeTickAction,
  startMissionRuntimeAction,
  type RuntimeActionState,
} from "@/app/dashboard/runtime/actions";
import type { MissionRuntimeDiagnostics } from "@/lib/infinity/mission-runtime/diagnostics";

const initialState: RuntimeActionState = { ok: false, message: "" };

export function MissionRuntimePanel({
  instances,
  transitions,
  checkpoints,
  diagnostics,
}: {
  instances: Array<Record<string, unknown>>;
  transitions: Array<Record<string, unknown>>;
  checkpoints: Array<Record<string, unknown>>;
  diagnostics: MissionRuntimeDiagnostics | null;
}) {
  const [startState, startAction, startPending] = useActionState(
    startMissionRuntimeAction,
    initialState,
  );
  const [tickState, tickAction, tickPending] = useActionState(
    runMissionRuntimeTickAction,
    initialState,
  );
  const [pauseState, pauseAction, pausePending] = useActionState(
    pauseMissionRuntimeAction,
    initialState,
  );
  const [resumeState, resumeAction, resumePending] = useActionState(
    resumeMissionRuntimeAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelMissionRuntimeAction,
    initialState,
  );

  const primary = instances[0];
  const runtimeInstanceId = primary ? String(primary.id) : "";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h2 className="text-sm font-medium text-zinc-200">Active runtimes</h2>
        {instances.length === 0 ? (
          <p className="mt-2 text-[13px] text-zinc-500">No mission runtime instances yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {instances.map((row) => (
              <li
                key={String(row.id)}
                className="rounded-md border border-white/[0.04] bg-black/20 px-3 py-2 text-[13px]"
              >
                <p className="font-medium text-zinc-200">
                  Mission {String(row.mission_id).slice(0, 8)}… — {String(row.status)} /{" "}
                  {String(row.current_stage)}
                </p>
                <p className="text-zinc-500">
                  Last advanced: {String(row.last_advanced_at ?? "—")} · Wake:{" "}
                  {String(row.wake_at ?? "—")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {diagnostics ? (
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h2 className="text-sm font-medium text-zinc-200">Diagnostics</h2>
          <dl className="mt-2 grid gap-1 text-[13px] text-zinc-400">
            <div>State version: {diagnostics.stateVersion}</div>
            <div>Lock: {diagnostics.lockedBy ?? "none"}</div>
            <div>Blocking: {diagnostics.blockingReason ?? "none"}</div>
            <div>Last work key: {diagnostics.lastWorkRequestKey ?? "none"}</div>
          </dl>
        </section>
      ) : null}

      <section className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-amber-200/90">
          Development control — production mission advancement runs autonomously
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={startAction}>
            <button
              type="submit"
              disabled={startPending}
              className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-100 hover:bg-white/[0.12]"
            >
              Start runtime
            </button>
          </form>
          <form action={tickAction}>
            <button
              type="submit"
              disabled={tickPending}
              className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-100 hover:bg-white/[0.12]"
            >
              Run one tick
            </button>
          </form>
          {runtimeInstanceId ? (
            <>
              <form action={pauseAction}>
                <input type="hidden" name="runtimeInstanceId" value={runtimeInstanceId} />
                <button
                  type="submit"
                  disabled={pausePending}
                  className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-100"
                >
                  Pause
                </button>
              </form>
              <form action={resumeAction}>
                <input type="hidden" name="runtimeInstanceId" value={runtimeInstanceId} />
                <button
                  type="submit"
                  disabled={resumePending}
                  className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-100"
                >
                  Resume
                </button>
              </form>
              <form action={cancelAction}>
                <input type="hidden" name="runtimeInstanceId" value={runtimeInstanceId} />
                <button
                  type="submit"
                  disabled={cancelPending}
                  className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-100"
                >
                  Cancel
                </button>
              </form>
            </>
          ) : null}
        </div>
        <p className="mt-2 text-[12px] text-zinc-500">
          {[startState, tickState, pauseState, resumeState, cancelState]
            .filter((s) => s.message)
            .map((s) => s.message)
            .join(" · ")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h2 className="text-sm font-medium text-zinc-200">Recent transitions</h2>
          <ul className="mt-2 space-y-2 text-[12px] text-zinc-400">
            {transitions.map((t) => (
              <li key={String(t.id)}>
                {String(t.from_stage)} → {String(t.to_stage)} ({String(t.transition_key)})
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h2 className="text-sm font-medium text-zinc-200">Checkpoints</h2>
          <ul className="mt-2 space-y-2 text-[12px] text-zinc-400">
            {checkpoints.map((c) => (
              <li key={String(c.id)}>
                {String(c.checkpoint_key)} — v{String(c.state_version)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
