"use client";

import type { OperatorActivityEvent } from "@/lib/infinity/operator-console/types";

type Props = {
  events: OperatorActivityEvent[];
};

export function ActivityFeedPanel({ events }: Props) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-[13px] font-medium text-zinc-200">Office Activity Feed</h2>
        <p className="text-[11px] text-zinc-500">Chronological events from persisted records</p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <p className="px-4 py-5 text-[13px] text-zinc-500">No activity events for this venture yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {events.map((e) => (
              <li key={e.id} className="px-4 py-3 text-xs">
                <div className="flex gap-3">
                  <time className="shrink-0 font-mono text-[10px] text-zinc-500">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </time>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-300">{e.departmentLabel}</p>
                    <p className="text-zinc-400">{e.summary}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-600">
                      {e.status ? <span>{e.status}</span> : null}
                      {e.provider ? <span>{e.provider}</span> : null}
                      {e.model ? <span>{e.model}</span> : null}
                      {e.costKnown && e.costUsd != null ? <span>${e.costUsd.toFixed(4)}</span> : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
