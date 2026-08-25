"use client";

import Link from "next/link";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { HQ_WELCOME_SUBTITLE, HQ_WELCOME_TITLE } from "@/lib/infinity/operator-console/room-naming";
import { VentureSelector } from "./venture-selector";
import { HqCopilotDock } from "./hq-copilot-dock";
import { InspectionContextBar } from "./inspection-context-bar";
import { useOptionalHqInspection } from "./hq-inspection-provider";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";

type Props = {
  snapshot: OperatorVentureSnapshot;
  view: "hq" | "system";
  onViewChange: (view: "hq" | "system") => void;
  ventureOptions?: OperatorVentureListItem[];
  onVentureChange?: (id: string) => void;
  live?: boolean;
  currentRoom?: DepartmentId | null;
  selectedArtifactId?: string | null;
};

export function VentureCommandBar({
  snapshot,
  view,
  onViewChange,
  ventureOptions = [],
  onVentureChange,
  live = true,
  currentRoom = null,
  selectedArtifactId = null,
}: Props) {
  const inspection = useOptionalHqInspection();
  return (
    <header className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/40 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          {ventureOptions.length > 0 && onVentureChange ? (
            <VentureSelector
              ventures={ventureOptions}
              currentVentureId={snapshot.venture.ventureAssemblyId}
              onVentureChange={onVentureChange}
            />
          ) : null}
          <span className="rounded border border-zinc-800/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
            {departmentStateLabel(snapshot.overallStatus)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/founder-ideas"
            className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/20"
          >
            Submit Idea
          </Link>
          {live ? (
            <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-emerald-400/90">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              Live
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-wider text-zinc-600">Stale</span>
          )}
          <div className="flex rounded-md border border-zinc-800/70 bg-zinc-950/50 p-0.5">
            <button
              type="button"
              onClick={() => onViewChange("hq")}
              aria-pressed={view === "hq"}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${view === "hq" ? "bg-sky-500/20 text-sky-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              HQ
            </button>
            <button
              type="button"
              onClick={() => onViewChange("system")}
              aria-pressed={view === "system"}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${view === "system" ? "bg-sky-500/20 text-sky-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              System
            </button>
          </div>
        </div>
      </div>

      {inspection ? (
        <InspectionContextBar context={inspection.context} onClear={inspection.clearInspection} />
      ) : null}

      <div data-hq-region="welcome" className="relative px-3 py-2 text-center md:py-2.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-16 max-w-2xl bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(56,189,248,0.12),transparent)]" aria-hidden />
        <h1 className="relative text-xl font-semibold tracking-[0.14em] text-white md:text-2xl md:leading-tight">
          {HQ_WELCOME_TITLE.toUpperCase()}
        </h1>
        <p className="relative mt-0.5 text-[11px] tracking-wide text-zinc-500">{HQ_WELCOME_SUBTITLE}</p>
        <div className="relative mt-3 min-w-0">
          <HqCopilotDock
            currentRoute="/dashboard"
            currentVentureId={snapshot.venture.ventureAssemblyId}
            currentRoom={currentRoom}
            selectedArtifactId={selectedArtifactId}
          />
        </div>
      </div>
    </header>
  );
}
