"use client";

import type { DepartmentId, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { getRoomWorkZones } from "@/lib/infinity/operator-console/room-work-zones";
import { WorkerNode } from "./worker-node";
import { RoomMotif } from "./room-motif";

type Props = {
  departmentId: DepartmentId;
  nodes: OperatorWorkerNode[];
  outputLabel?: string | null;
  isActive?: boolean;
  showZoneLabels?: boolean;
  /** When false, render workflow rails/pads only — orbs shown elsewhere (e.g. Command chamber). */
  renderOrbs?: boolean;
};

export function RoomWorkflowStage({
  departmentId,
  nodes,
  outputLabel,
  isActive = false,
  showZoneLabels = false,
  renderOrbs = true,
}: Props) {
  const zones = getRoomWorkZones(departmentId);
  const movingNodes = nodes.filter((n) => n.motionActive);
  const staticNodes = nodes.filter((n) => !n.motionActive);
  const hasMotion = movingNodes.length > 0;

  if (nodes.length === 0 && !isActive) {
    return null;
  }

  return (
    <div className="relative mt-1.5 min-h-0 w-full">
      <RoomMotif motif={zones.motif} active={isActive || hasMotion} />

      {showZoneLabels || isActive ? (
        <div className="relative z-10 flex justify-between px-0.5 text-[7px] uppercase tracking-[0.18em] text-zinc-600">
          <span className={isActive ? "text-zinc-500" : ""}>{zones.intake}</span>
          <span className={hasMotion ? "text-sky-400/70" : ""}>{zones.process}</span>
          <span className={isActive ? "text-zinc-500" : ""}>{zones.output}</span>
        </div>
      ) : null}

      <div
        className={`relative z-10 mt-3 h-12 rounded-sm border border-white/[0.06] bg-black/30 ${
          isActive ? "hq-room-floor-active" : ""
        }`}
      >
        <div className="absolute inset-y-2 left-[33%] w-px bg-zinc-600/45" aria-hidden />
        <div className="absolute inset-y-2 left-[66%] w-px bg-zinc-600/45" aria-hidden />

        {/* Workstation pads */}
        <div className="absolute bottom-1 left-[8%] h-1.5 w-6 rounded-sm bg-zinc-700/85" aria-hidden />
        <div className="absolute bottom-1 left-[42%] h-2 w-8 rounded-sm bg-zinc-700/95" aria-hidden />
        <div className="absolute bottom-1 right-[8%] h-1.5 w-6 rounded-sm bg-zinc-700/85" aria-hidden />

        <div
          className={`absolute inset-x-3 top-1/2 h-px -translate-y-1/2 ${
            hasMotion
              ? "bg-gradient-to-r from-transparent via-sky-400/45 to-transparent"
              : "bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent"
          }`}
          aria-hidden
        />

        {renderOrbs ? (
          <>
            {movingNodes.map((node, index) => (
              <div
                key={node.nodeId}
                className="hq-orb-moving absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ animationDelay: `${index * 1.4}s` }}
              >
                <WorkerNode node={node} prominent />
              </div>
            ))}

            {staticNodes.length > 0 ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-4">
                {staticNodes.map((node) => (
                  <WorkerNode key={node.nodeId} node={node} compact={!node.isActive} prominent={node.isActive} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {outputLabel ? (
        <p className="relative z-10 mt-2 text-center text-[9px] text-zinc-500">{outputLabel}</p>
      ) : null}
    </div>
  );
}
