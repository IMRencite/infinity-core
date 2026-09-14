"use client";

import Link from "next/link";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { HqCopilotDock } from "./hq-copilot-dock";
import { InfinityOsHero } from "./infinity-os-hero";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HqConnectionStatus } from "@/lib/infinity/operator-console/hq-live-policy";
import type { HqLiveDiagnostics } from "./use-hq-live-projection";

type Props = {
  snapshot: OperatorVentureSnapshot;
  view: "hq" | "system";
  onViewChange: (view: "hq" | "system") => void;
  live?: boolean;
  connectionStatus?: HqConnectionStatus;
  lastUpdatedAt?: string | null;
  liveDiagnostics?: HqLiveDiagnostics;
  currentRoom?: DepartmentId | null;
  selectedArtifactId?: string | null;
};

const HQ_CONNECTION_LABELS: Record<HqConnectionStatus, string> = {
  LIVE: "LIVE",
  RECONNECTING: "RECONNECTING",
  STALE: "STALE",
  DISCONNECTED: "DISCONNECTED",
};

function connectionTone(status: HqConnectionStatus): string {
  if (status === "LIVE") return "text-emerald-400/90";
  if (status === "RECONNECTING") return "text-zinc-500";
  if (status === "STALE") return "text-amber-500/80";
  return "text-zinc-600";
}

function formatLastUpdated(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function VentureCommandBar({
  snapshot,
  view,
  onViewChange,
  live = true,
  connectionStatus,
  lastUpdatedAt = null,
  liveDiagnostics,
  currentRoom = null,
  selectedArtifactId = null,
}: Props) {
  const status = connectionStatus ?? (live ? "LIVE" : "STALE");
  const updated = formatLastUpdated(lastUpdatedAt);
  return (
    <InfinityOsHero
      controls={
        <>
          <Link
            href="/dashboard/founder-ideas"
            className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/20"
          >
            Submit Idea
          </Link>
          <span
            className={`flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider ${connectionTone(status)}`}
            data-hq-connection-status={status}
            title={updated ? `Last updated ${updated}` : undefined}
          >
            {status === "LIVE" ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" aria-hidden />
            )}
            {HQ_CONNECTION_LABELS[status]}
            {updated ? (
              <span className="normal-case tracking-normal text-[8px] text-zinc-600" data-hq-last-updated>
                {updated}
              </span>
            ) : null}
          </span>
          {liveDiagnostics ? (
            <span
              className="inline-block max-w-full min-w-0 truncate text-[9px] font-medium uppercase tracking-wider text-zinc-300"
              data-hq-live-diagnostics="true"
              data-hq-sse-state={liveDiagnostics.sseState}
              data-hq-last-event-type={liveDiagnostics.lastEventType ?? ""}
              data-hq-last-event-at={liveDiagnostics.lastEventAt ?? ""}
              data-hq-last-snapshot-at={liveDiagnostics.lastSnapshotAt ?? ""}
              data-hq-canonical-version={liveDiagnostics.canonicalVersion ?? ""}
              title={`SSE ${liveDiagnostics.sseState} · event ${liveDiagnostics.lastEventType ?? "none"} @ ${liveDiagnostics.lastEventAt ?? "none"} · snapshot ${liveDiagnostics.lastSnapshotAt ?? "none"} · v ${liveDiagnostics.canonicalVersion ?? "none"}`}
            >
              SSE {liveDiagnostics.sseState}
              {liveDiagnostics.lastEventType ? ` · ${liveDiagnostics.lastEventType}` : " · no-event"}
              {liveDiagnostics.lastEventAt ? ` · evt ${liveDiagnostics.lastEventAt.slice(11, 19)}` : ""}
              {liveDiagnostics.lastSnapshotAt ? ` · snap ${liveDiagnostics.lastSnapshotAt.slice(11, 19)}` : ""}
              {liveDiagnostics.canonicalVersion ? ` · v ${liveDiagnostics.canonicalVersion.slice(11, 19) || liveDiagnostics.canonicalVersion}` : ""}
            </span>
          ) : null}
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
        </>
      }
    >
      <HqCopilotDock
        currentRoute="/dashboard"
        currentVentureId={snapshot.venture.ventureAssemblyId}
        currentRoom={currentRoom}
        selectedArtifactId={selectedArtifactId}
      />
    </InfinityOsHero>
  );
}
