"use client";

import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import type { RoomPresenceModel } from "@/lib/infinity/operator-console/room-presence";
import { projectWorkerVisualState } from "@/lib/infinity/hq-live-activity";
import { WorkerNode } from "../worker-node";

type Props = {
  presence: RoomPresenceModel;
  showEmptyLabel?: boolean;
};

function agentTitle(node: OperatorWorkerNode, stateLabel: string): string {
  return [node.displayRole, node.provider, node.model, node.displayTask, stateLabel].filter(Boolean).join(" · ");
}

function idleStateLabel(node: OperatorWorkerNode, presenceState: RoomPresenceModel["state"]): string {
  const visual = projectWorkerVisualState(node);
  if (visual.visualState !== "IDLE") return visual.visualState;
  if (presenceState === "BLOCKED" || node.status === "BLOCKED" || node.status === "FAILED") return "BLOCKED";
  return "PRESENT_IDLE";
}

function countLabel(presence: RoomPresenceModel): string {
  if (presence.agentsPresent === 0) return "NO AGENTS PRESENT";
  if (presence.agentsActive > 0 && presence.agentsIdle > 0) {
    return `${presence.agentsActive} ACTIVE · ${presence.agentsIdle} IDLE`;
  }
  if (presence.agentsActive > 0) return `${presence.agentsActive} ACTIVE`;
  if (presence.state === "BLOCKED" || (presence.agentsBlocked > 0 && presence.agentsActive === 0)) {
    return "AGENTS BLOCKED";
  }
  const waiting = presence.presenceNodes.filter((node) => projectWorkerVisualState(node).visualState === "WAITING").length;
  if (waiting > 0) return "AGENTS WAITING";
  return "AGENTS IDLE";
}

export function RoomPresenceTrack({ presence, showEmptyLabel = true }: Props) {
  const empty = presence.agentsPresent === 0;
  if (empty && !showEmptyLabel) return null;

  const orbs = [...presence.activeNodes, ...presence.presenceNodes.filter((node) => !presence.activeNodes.some((active) => active.nodeId === node.nodeId))];

  return (
    <div
      className="hq-agent-presence-rail relative mt-2 w-full px-2 py-1.5"
      aria-label={empty ? "No agents present" : "Agents in room"}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Agents in room</p>
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{countLabel(presence)}</p>
      </div>
      {empty ? (
        <p className="hq-room-presence-empty pb-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-600">
          No agents present
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          {orbs.map((node) => {
            const visual = projectWorkerVisualState(node);
            const stateLabel = visual.visualState === "ACTIVE" ? "ACTIVE_WORK" : idleStateLabel(node, presence.state);
            return (
              <div
                key={node.nodeId}
                className="relative z-10"
                title={agentTitle(node, visual.accessibleState)}
                data-hq-worker-role={node.displayRole}
                data-hq-worker-task={node.displayTask ?? ""}
                data-hq-worker-status={stateLabel}
                data-hq-worker-visual-state={visual.visualState}
                data-hq-worker-glow={visual.glow ? "true" : "false"}
              >
                <WorkerNode
                  node={node}
                  compact
                  prominent={visual.glow}
                />
                {node.displayTask ? (
                  <p className="mt-0.5 max-w-[120px] truncate text-[8px] leading-tight text-zinc-400">{node.displayTask}</p>
                ) : null}
              </div>
            );
          })}
          {presence.overflowWorkerCount > 0 ? (
            <span className="relative z-10 mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              +{presence.overflowWorkerCount} agents
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
