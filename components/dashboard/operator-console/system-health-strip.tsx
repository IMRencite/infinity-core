"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

type Props = {
  snapshot: OperatorVentureSnapshot;
};

/** Minimal system health — only shows measurable states, no fabricated greens */
export function SystemHealthStrip({ snapshot }: Props) {
  const checks: Array<{ label: string; state: string }> = [
    {
      label: "Venture",
      state: snapshot.overallStatus,
    },
    {
      label: "Performance",
      state: snapshot.departments.find((d) => d.id === "intelligence_center")?.state ?? "UNKNOWN",
    },
    {
      label: "Product Lab",
      state: snapshot.departments.find((d) => d.id === "product_lab")?.state ?? "UNKNOWN",
    },
    {
      label: "Media",
      state: snapshot.departments.find((d) => d.id === "creative_studio")?.state ?? "UNKNOWN",
    },
    {
      label: "Launch",
      state: snapshot.departments.find((d) => d.id === "launch_operations")?.state ?? "UNKNOWN",
    },
  ];

  function tone(state: string): string {
    if (state === "RUNNING" || state === "COMPLETE") return "text-emerald-400/90";
    if (state === "FAILED" || state === "BLOCKED") return "text-amber-400/90";
    if (state === "NOT_STARTED") return "text-zinc-600";
    return "text-zinc-500";
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2 text-[10px]">
      <span className="uppercase tracking-wider text-zinc-600">Systems</span>
      {checks.map((c) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span className="text-zinc-500">{c.label}</span>
          <span className={`font-medium uppercase ${tone(c.state)}`}>{c.state.replace(/_/g, " ")}</span>
        </span>
      ))}
    </div>
  );
}
