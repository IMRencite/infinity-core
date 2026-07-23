"use client";

import { useActionState } from "react";
import {
  activateDefaultMission,
  runCommandCycle,
  type CommandActionState,
} from "@/app/dashboard/command/actions";

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

export function CommandPanel({
  missionTitle,
  pendingDiscoveryJobs,
  lastCycleStatus,
}: {
  missionTitle: string | null;
  pendingDiscoveryJobs: number;
  lastCycleStatus: string | null;
}) {
  const [missionState, activateMission, missionPending] = useActionState(
    activateDefaultMission,
    initialState,
  );
  const [cycleState, triggerCycle, cyclePending] = useActionState(
    runCommandCycle,
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
      </div>
    </section>
  );
}
