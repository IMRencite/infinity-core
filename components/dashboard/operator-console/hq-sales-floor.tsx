"use client";

import type { OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";
import { SALES_ROOM_LABELS } from "@/lib/infinity/venture-sales-floor/contract";
import type { SalesFloorHqView, SalesRoomProjection } from "@/lib/infinity/venture-sales-floor/types";

type Props = {
  snapshot?: OperatorDepartmentSnapshot;
  selected?: boolean;
  onSelect?: () => void;
};

function roomStateClass(state: SalesRoomProjection["state"]): string {
  if (state === "ACTIVE") return "border-sky-400/40 bg-sky-950/30 text-sky-100";
  if (state === "MONITORING" || state === "WAITING") return "border-zinc-500/40 bg-zinc-900/80 text-zinc-200";
  if (state === "BLOCKED" || state === "DEGRADED") return "border-amber-500/40 bg-amber-950/20 text-amber-100";
  return "border-zinc-800 bg-zinc-950/70 text-zinc-400";
}

function formatMetric(value: number | "UNKNOWN" | string): string {
  return value === "UNKNOWN" ? "UNKNOWN" : String(value);
}

function kpiLine(summary: SalesRoomProjection["kpi_summary"]): string {
  return Object.entries(summary)
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, " ")} ${formatMetric(value)}`)
    .join(" · ");
}

export function HqSalesFloor({ snapshot, selected = false, onSelect }: Props) {
  const view = snapshot?.detail?.salesFloorView as SalesFloorHqView | undefined;
  if (!view) return null;
  return (
    <section
      data-hq-sales-floor="true"
      data-hq-floor-room="sales_floor"
      data-sales-floor-status={view.status}
      data-sales-highest-room={view.highest_priority_room}
      className={`min-w-0 rounded-xl border px-3 py-3 ${selected ? "border-sky-400/50" : "border-zinc-700/60"} bg-[#07080c]`}
    >
      <button type="button" onClick={onSelect} className="mb-3 w-full min-w-0 text-left">
        <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Sales Floor</p>
        <h2 className="break-words text-sm font-semibold text-zinc-100">
          Revenue conversion for {view.venture_name}
        </h2>
        <p className="mt-1 break-words text-[11px] text-zinc-400" data-sales-floor-summary="true">
          {view.status} · pipeline {view.total_pipeline} · qualified {view.qualified_opportunities} ·
          deals {view.deals_in_progress} · wins {view.wins} · losses {view.losses}
        </p>
        <p className="mt-1 break-words text-[11px] text-zinc-500" data-sales-current-motion="true">
          Current motion {view.current_motion} · highest priority {SALES_ROOM_LABELS[view.highest_priority_room]}
          {" — "}
          {view.highest_priority_reason}
        </p>
        {view.recognized_campaign_id ? (
          <p className="mt-1 break-words text-[11px] text-zinc-500" data-sales-campaign-recognized="true">
            Existing outbound campaign recognized · not duplicated · outreach not sent
          </p>
        ) : null}
      </button>

      <div className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-5" data-hq-sales-rooms="true">
        {view.rooms.map((room) => (
          <article
            key={room.room}
            className={`min-w-0 rounded-lg border p-2 ${roomStateClass(room.state)}`}
            data-sales-room={room.room}
            data-sales-room-state={room.state}
            data-sales-room-priority={room.priority}
          >
            <p className="break-words text-[10px] font-semibold uppercase tracking-wide">{room.label}</p>
            <p className="mt-1 text-[10px] opacity-80">{room.state} · {room.priority}</p>
            <p className="mt-1 break-words text-[10px] opacity-70">{room.question}</p>
            <p className="mt-2 break-words text-[11px] leading-snug">{room.contribution}</p>
            <p className="mt-1 break-words text-[10px] opacity-70">
              {room.active_ventures.join(", ")} · queue {room.queue_count}
            </p>
            <p className="mt-1 break-words text-[10px] opacity-70">{kpiLine(room.kpi_summary)}</p>
            <p className="mt-1 break-words text-[10px] opacity-70">Latest: {room.latest_result}</p>
            <p className="mt-2 break-words text-[10px] opacity-80">Next: {room.next_action}</p>
          </article>
        ))}
      </div>

      <div className="mb-2 grid min-w-0 gap-2 text-[11px] text-zinc-400 md:grid-cols-2" data-sales-priorities="true">
        <p className="min-w-0 break-words">
          Priorities: {view.priorities.map((row) => `${SALES_ROOM_LABELS[row.room]} ${row.priority}`).join(" · ")}
        </p>
        <p className="min-w-0 break-words" data-sales-latest-outcomes="true">
          Latest outcomes: {view.latest_outcomes.join(" · ") || "UNKNOWN"}
        </p>
      </div>

      <div className="grid min-w-0 gap-2 text-[11px] text-zinc-400 md:grid-cols-3" data-hq-sales-intelligence="true">
        <p className="break-words">Top ICP: {view.intelligence.top_converting_icp}</p>
        <p className="break-words">Best motion: {view.intelligence.best_performing_motion}</p>
        <p className="break-words">Top objection: {view.intelligence.top_recurring_objection}</p>
        <p className="break-words">Channel: {view.intelligence.highest_converting_channel}</p>
        <p className="break-words">Close rate: {formatMetric(view.intelligence.close_rate)}</p>
        <p className="break-words">Pipeline: {view.intelligence.pipeline_health}</p>
      </div>
    </section>
  );
}
