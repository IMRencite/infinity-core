"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import {
  hqDashboardInspectionPath,
  inspectionRefFromVentureId,
} from "@/lib/infinity/operator-console/inspection-context";
import { HqVentureInspectionLink } from "./hq-venture-inspection-link";
import { VentureSelector } from "./venture-selector";
import { HqCopilotDock } from "./hq-copilot-dock";

type Props = {
  ventures: OperatorVentureListItem[];
  showPortfolioLink?: boolean;
};

export function HqIdleShell({ ventures, showPortfolioLink = true }: Props) {
  const router = useRouter();
  const recent = ventures.slice(0, 5);

  function inspectVenture(id: string) {
    const ref = inspectionRefFromVentureId(id);
    if (!ref) return;
    router.replace(hqDashboardInspectionPath(ref), { scroll: false });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-950/80 to-[#080808] p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Infinity HQ</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Operations Center</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          No venture is currently selected. The headquarters floor is idle — select a venture to observe real engine activity.
        </p>
        <div className="mt-4 min-w-0 max-w-2xl">
          <HqCopilotDock currentRoute="/dashboard" />
        </div>
        <Link
          href="/dashboard/founder-ideas"
          className="mt-4 inline-flex rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100 hover:bg-sky-500/20"
        >
          Submit an Idea
        </Link>
        {ventures.length > 0 ? (
          <div className="mt-4 max-w-xs">
            <VentureSelector
              ventures={ventures}
              currentVentureId={null}
              onVentureChange={inspectVenture}
            />
          </div>
        ) : null}
      </header>

      <section
        aria-label="Idle Infinity HQ floorplan"
        className="relative min-h-[420px] overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#060608] p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.04),transparent_65%)]" />
        <div className="relative flex h-full min-h-[360px] flex-col items-center justify-center text-center">
          <div className="rounded-full border border-zinc-700/50 bg-zinc-900/40 px-8 py-6">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Venture Core</p>
            <p className="mt-2 text-lg font-medium text-zinc-300">No venture currently active</p>
            <p className="mt-1 text-xs text-zinc-600">Departments await persisted operational data</p>
          </div>
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Recent ventures</h2>
          <ul className="mt-3 space-y-2">
            {recent.map((v) => (
              <li key={v.ventureAssemblyId}>
                <HqVentureInspectionLink
                  ventureId={v.ventureAssemblyId}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2 text-sm hover:border-sky-500/30 hover:bg-sky-500/5"
                >
                  <span className="text-zinc-200">{v.ventureName}</span>
                  <span className="text-xs text-zinc-500">{v.status}</span>
                </HqVentureInspectionLink>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">No venture assemblies exist yet. Engine activity will appear here when ventures are created.</p>
      )}

      {showPortfolioLink ? (
        <p className="text-xs text-zinc-600">
          Mission pipeline observability:{" "}
          <Link href="/dashboard/portfolio" className="text-sky-400 hover:underline">
            Portfolio command view
          </Link>
        </p>
      ) : null}
    </div>
  );
}
