"use client";

import type { OperatorActivityEvent } from "@/lib/infinity/operator-console/types";

type Props = {
  events: OperatorActivityEvent[];
  variant?: "default" | "rail";
};

export function ActivityFeedPanel({ events, variant = "default" }: Props) {
  const isRail = variant === "rail";

  return (
    <section
      className={`rounded-xl border border-zinc-800/80 bg-zinc-950/60 ${isRail ? "flex flex-col" : ""}`}
      aria-label="Mission log"
    >
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Mission Log</h2>
        {!isRail ? (
          <p className="text-[11px] text-zinc-600">What Infinity has done, in order</p>
        ) : null}
      </div>
      <div className={isRail ? "max-h-[480px] flex-1 overflow-y-auto" : "max-h-80 overflow-y-auto"}>
        {events.length === 0 ? (
          <p className="px-4 py-5 text-[13px] text-zinc-500">No activity events yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/40">
            {events.map((e) => (
              <li key={e.id} className="px-3 py-2.5 text-xs">
                <time className="font-mono text-[10px] text-zinc-600">{new Date(e.timestamp).toLocaleTimeString()}</time>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{e.departmentLabel}</p>
                <p className="text-zinc-300">{e.displaySummary ?? e.summary}</p>
                {(e.status || e.provider) && (
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {[e.displayStatus ?? e.status, e.provider, e.model].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
