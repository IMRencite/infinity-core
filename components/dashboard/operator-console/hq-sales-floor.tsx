"use client";

import type { DepartmentUiState, OperatorDepartmentSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import type { RoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { ROOM_ACTIVITY_LABEL } from "@/lib/infinity/operator-console/room-activity";
import { SALES_ROOM_LABELS, type SalesRoomState } from "@/lib/infinity/venture-sales-floor/contract";
import type { SalesFloorHqView } from "@/lib/infinity/venture-sales-floor/types";
import type { SalesRoomLiveState } from "@/lib/infinity/venture-sales-floor/live-state";
import { InfinityRoomShell } from "./infinity-room/infinity-room-shell";
import { RoomStatusChip } from "./infinity-room/room-status-chip";
import { RoomPresenceTrack } from "./infinity-room/room-presence-track";
import { RoomCurrentActivity } from "./room-current-activity";

type Props = {
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes?: OperatorWorkerNode[];
  selected?: boolean;
  onSelect?: () => void;
};

function roomUiState(state: SalesRoomState): DepartmentUiState {
  if (state === "ACTIVE") return "RUNNING";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "DEGRADED") return "FAILED";
  return "WAITING";
}

function nowExplanation(room: SalesRoomLiveState): RoomActivityExplanation {
  return {
    presence: room.state === "ACTIVE" ? "ACTIVE_WORK" : room.state === "BLOCKED" ? "BLOCKED" : "PRESENT_IDLE",
    label: ROOM_ACTIVITY_LABEL,
    sentence: room.now.displayText,
    grounded: true,
    source: "currentTask",
    ventureName: room.venture_name,
    why: room.now.purpose,
    activeArtifactTitle: null,
  };
}

function SalesRoomOrb({ room }: { room: SalesRoomLiveState }) {
  return (
    <div
      className="hq-sales-room-orb-rail relative mt-2 h-6 overflow-hidden"
      data-sales-room-orb={room.room}
      data-sales-orb-state={room.orb.state}
      data-sales-orb-motion={room.orb.motion}
      data-sales-orb-active={room.orb.active ? "true" : "false"}
      data-sales-orb-reduced={room.orb.reducedMotionEquivalent}
      aria-label={room.orb.reducedMotionEquivalent}
    >
      <span
        className={`hq-sales-work-orb absolute top-1 h-3 w-3 rounded-full ${
          room.orb.motion === "TRAVEL"
            ? "hq-sales-work-orb--travel bg-sky-400"
            : room.orb.motion === "SUBDUED"
              ? "hq-sales-work-orb--subdued bg-zinc-400"
              : room.orb.motion === "PAUSED"
                ? "hq-sales-work-orb--paused bg-zinc-500"
                : room.orb.motion === "BLOCKED"
                  ? "bg-amber-400"
                  : room.orb.motion === "DEGRADED"
                    ? "bg-red-400"
                    : "bg-zinc-700"
        }`}
        aria-hidden
      />
    </div>
  );
}

export function HqSalesFloor({ snapshot, workerNodes = [], selected = false, onSelect }: Props) {
  const view = snapshot?.detail?.salesFloorView as SalesFloorHqView | undefined;
  if (!view?.live) return null;
  const live = view.live;
  const metrics = view.performance;
  const command = snapshot?.detail?.salesCommandCenter as {
    pipeline?: Record<string, number>;
    conversations?: Array<{ stage: string; latest_intent: string | null; next_best_action: string; pain: string | null }>;
  } | undefined;

  return (
    <section
      data-hq-sales-floor="true"
      data-hq-floor-room="sales_floor"
      data-hq-operating-floor="true"
      data-sales-floor-status={view.status}
      data-sales-highest-room={view.highest_priority_room}
      data-sales-visual="hq-floor"
      className={`hq-sales-operating-floor min-w-0 overflow-x-hidden rounded-none border px-3 py-3 ${
        selected ? "border-sky-400/50" : "border-zinc-600/40"
      } bg-[#07080c]`}
    >
      <button type="button" onClick={onSelect} className="mb-3 w-full min-w-0 text-left" data-hq-now-work="true">
        <p className="hq-room-title text-[9px] uppercase tracking-[0.28em] text-zinc-500">Sales Floor</p>
        <h2 className="mt-1 break-words text-sm font-semibold text-zinc-100">
          Operating floor for {view.venture_name}
        </h2>
        <p className="hq-room-now-label mt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Now</p>
        <p className="hq-room-now mt-1 break-words text-[12px] leading-snug text-zinc-100" data-sales-floor-now="true">
          {live.floor.displayText}
        </p>
        <p className="mt-1 break-words text-[10px] text-zinc-500" data-sales-worker-meta="true">
          Worker metadata secondary · Sales Floor · {view.status}
        </p>
        <p className="mt-1 break-words text-[10px] text-zinc-500" data-sales-floor-summary="true">
          {view.status} · pipeline {view.total_pipeline} · qualified {view.qualified_opportunities} ·
          deals {view.deals_in_progress} · wins {view.wins} · losses {view.losses}
        </p>
        <p className="mt-1 break-words text-[10px] text-zinc-500" data-sales-performance="true">
          {`Qualified ${metrics.qualified_prospects} · attempted ${metrics.send_attempts} · delivered ${metrics.delivered} · replies ${metrics.replies} · positive ${metrics.positive_replies} · trials ${metrics.trial_starts} · opportunities ${metrics.opportunities} · wins ${metrics.closed_wins} · attributed ${metrics.sales_attributed_revenue}`}
        </p>
        <p className="mt-1 break-words text-[10px] text-zinc-500" data-sales-current-motion="true">
          Current motion {view.current_motion} · highest priority {SALES_ROOM_LABELS[view.highest_priority_room]}
          {" — "}
          {view.highest_priority_reason}
        </p>
        {command?.pipeline ? (
          <p className="mt-1 break-words text-[10px] text-zinc-400" data-hq-sales-command-center="true">
            Pipeline · Engaged {command.pipeline.Engaged ?? 0} · Qualified {command.pipeline.Qualified ?? 0} · High intent {command.pipeline.HighIntent ?? 0} · Suppressed {command.pipeline.Suppressed ?? 0}
            {command.conversations?.[0] ? ` · ${command.conversations[0].stage} · ${command.conversations[0].next_best_action}` : ""}
          </p>
        ) : null}
        {view.recognized_campaign_id ? (
          <p className="mt-1 break-words text-[10px] text-zinc-500" data-sales-campaign-recognized="true">
            Existing outbound campaign recognized · not duplicated · outreach not sent
          </p>
        ) : null}
      </button>

      <div
        className="hq-sales-room-grid grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-5"
        data-hq-sales-rooms="true"
      >
        {live.rooms.map((room) => {
          const fromSnapshot = workerNodes.filter((node) => node.salesRoomId === room.room);
          const agents = fromSnapshot.length > 0 ? fromSnapshot : room.agents;
          const ui = roomUiState(room.state);
          const presence = deriveRoomPresence(agents, ui, false, { currentWorkCount: 1 });
          return (
            <article
              key={room.room}
              className="hq-sales-room min-w-0"
              data-sales-room={room.room}
              data-sales-room-state={room.state}
              data-sales-room-priority={view.rooms.find((row) => row.room === room.room)?.priority}
              data-hq-room-visual-state={room.orb.state}
            >
              <InfinityRoomShell
                state={ui}
                isSelected={selected && view.highest_priority_room === room.room}
                isActive={room.state === "ACTIVE"}
                size="wide"
                ariaLabel={`${SALES_ROOM_LABELS[room.room]}. ${room.now.displayText}`}
                onActivate={() => onSelect?.()}
                dataHq={{
                  "data-hq-sales-room-shell": room.room,
                }}
                header={
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <p className={`hq-room-title ${room.state === "ACTIVE" ? "hq-room-title-active" : ""}`}>
                        {SALES_ROOM_LABELS[room.room]}
                      </p>
                      <p className="hq-room-job mt-1">{room.venture_name}</p>
                    </div>
                    <RoomStatusChip
                      state={ui}
                      isActive={room.state === "ACTIVE"}
                      presence={presence.state}
                    />
                  </div>
                }
                footer={
                  <div className="min-w-0 px-1 pt-1 text-[10px] leading-snug text-zinc-500">
                    <p className="break-words" data-sales-latest-result="true">Latest: {room.latest_result}</p>
                    <p className="mt-0.5 break-words" data-sales-next-action="true">Next: {room.next_action}</p>
                  </div>
                }
              >
                <div data-hq-now-work="true">
                  <p className="px-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Now / current work</p>
                  <RoomCurrentActivity explanation={nowExplanation(room)} className="mt-1.5" />
                  <p className="mt-1 px-1 text-[10px] text-zinc-500" data-hq-now-workers>
                    Assigned agents remain present · {room.state}
                  </p>
                </div>
                <SalesRoomOrb room={room} />
                <RoomPresenceTrack presence={presence} showEmptyLabel={false} />
                {room.room === "PARTNERSHIPS_CHANNEL" && live.affiliate ? (
                  <div className="mt-2 min-w-0 px-1 text-[10px] leading-snug text-zinc-400" data-sales-affiliate-hq="true">
                    <p className="font-semibold uppercase tracking-[0.14em] text-zinc-500">Affiliate & Referral</p>
                    <p className="mt-0.5 break-words">Program {live.affiliate.programs[0]?.state ?? "UNKNOWN"}</p>
                    <p className="break-words">Applications {live.affiliate.applications} · approved {live.affiliate.approved_affiliates}</p>
                    <p className="break-words">Clicks {live.affiliate.clicks} · verified {live.affiliate.verified_referrals}</p>
                    <p className="break-words">
                      Commissions pending {String(live.affiliate.pending_commissions)} · payable {String(live.affiliate.payable_commissions)} · paid {String(live.affiliate.paid_commissions)}
                    </p>
                    <p className="break-words">Attributed revenue {String(live.affiliate.attributed_revenue)}</p>
                  </div>
                ) : null}
              </InfinityRoomShell>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid min-w-0 gap-2 text-[11px] text-zinc-500 md:grid-cols-2" data-sales-priorities="true">
        <p className="min-w-0 break-words">
          Priorities: {view.priorities.map((row) => `${SALES_ROOM_LABELS[row.room]} ${row.priority}`).join(" · ")}
        </p>
        <p className="min-w-0 break-words" data-sales-latest-outcomes="true">
          Latest outcomes: {view.latest_outcomes.join(" · ") || "UNKNOWN"}
        </p>
      </div>
      <div className="mt-2 grid min-w-0 gap-2 text-[11px] text-zinc-500 md:grid-cols-3" data-hq-sales-intelligence="true">
        <p className="break-words">Top ICP: {view.intelligence.top_converting_icp}</p>
        <p className="break-words">Best motion: {view.intelligence.best_performing_motion}</p>
        <p className="break-words">Top objection: {view.intelligence.top_recurring_objection}</p>
        <p className="break-words">Channel: {view.intelligence.highest_converting_channel}</p>
        <p className="break-words">Close rate: {view.intelligence.close_rate === "UNKNOWN" ? "UNKNOWN" : String(view.intelligence.close_rate)}</p>
        <p className="break-words">Pipeline: {view.intelligence.pipeline_health}</p>
      </div>
      {Array.isArray((snapshot?.detail as { salesLearning?: { metrics?: Array<{ label: string; value: string | number }> } } | undefined)?.salesLearning?.metrics) ? (
        <div className="mt-2 grid min-w-0 gap-2 text-[11px] text-zinc-500 md:grid-cols-3" data-hq-sales-learning="true">
          {((snapshot?.detail as { salesLearning: { metrics: Array<{ label: string; value: string | number }> } }).salesLearning.metrics).map((row) => (
            <p key={row.label} className="break-words">{row.label}: {String(row.value)}</p>
          ))}
        </div>
      ) : null}
      {Array.isArray((snapshot?.detail as { outbound?: { metrics?: Array<{ label: string; value: string | number }> } } | undefined)?.outbound?.metrics) ? (
        <div className="mt-2 grid min-w-0 gap-2 text-[11px] text-zinc-500 md:grid-cols-3" data-hq-sales-outbound="true">
          {((snapshot?.detail as { outbound: { metrics: Array<{ label: string; value: string | number }> } }).outbound.metrics).map((row) => (
            <p key={row.label} className="break-words">{row.label}: {String(row.value)}</p>
          ))}
        </div>
      ) : null}
      <style>{`
        .hq-sales-work-orb--travel { animation: hq-sales-orb-travel 2.8s linear infinite; }
        .hq-sales-work-orb--subdued { left: 18%; animation: hq-sales-orb-pulse 2.4s ease-in-out infinite; opacity: 0.55; }
        .hq-sales-work-orb--paused { left: 8%; }
        @keyframes hq-sales-orb-travel { 0% { left: 4%; } 100% { left: 86%; } }
        @keyframes hq-sales-orb-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
        @media (prefers-reduced-motion: reduce) {
          .hq-sales-work-orb--travel, .hq-sales-work-orb--subdued { animation: none; left: 18%; }
        }
      `}</style>
    </section>
  );
}
