"use client";

import type { OperatorCurrentActivity } from "@/lib/infinity/operator-console/types";

type Props = {
  activity: OperatorCurrentActivity;
  compact?: boolean;
};

export function CurrentActivityBar({ activity, compact = false }: Props) {
  const narration =
    activity.displayNarration ??
    activity.displayTask ??
    (activity.active ? "Working on the venture" : "No active work right now");

  if (compact) {
    return (
      <section className="text-center md:text-left" aria-label="Current activity">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-400/70">
          {activity.active ? "Infinity is currently" : "Latest activity"}
        </h2>
        <p className="mt-1 text-lg font-medium leading-snug text-zinc-50">{narration}</p>
        {(activity.departmentDisplayName ?? activity.departmentLabel) ? (
          <p className="mt-1 text-sm text-zinc-500">
            {activity.departmentDisplayName ?? activity.departmentLabel}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Technical Activity</h2>
      <p className="mt-2 text-sm text-zinc-300">{narration}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
        {(activity.provider || activity.model) ? (
          <div>
            <dt className="text-zinc-600">Provider</dt>
            <dd className="text-zinc-400">{[activity.provider, activity.model].filter(Boolean).join(" · ")}</dd>
          </div>
        ) : null}
        {activity.costKnown ? (
          <div>
            <dt className="text-zinc-600">Known cost</dt>
            <dd className="text-zinc-400">
              {activity.costUsd != null ? `$${activity.costUsd.toFixed(4)}` : "$0.00"}
            </dd>
          </div>
        ) : null}
        {activity.latestActivityAt ? (
          <div>
            <dt className="text-zinc-600">Updated</dt>
            <dd className="text-zinc-500">{new Date(activity.latestActivityAt).toLocaleTimeString()}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
