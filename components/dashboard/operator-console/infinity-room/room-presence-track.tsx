"use client";

import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import type { RoomPresenceModel } from "@/lib/infinity/operator-console/room-presence";
import { WorkerNode } from "../worker-node";

type Props = {
  presence: RoomPresenceModel;
  showEmptyLabel?: boolean;
};

function agentTitle(node: OperatorWorkerNode, stateLabel: string): string {
  return [node.displayRole, node.provider, node.model, node.displayTask, stateLabel].filter(Boolean).join(" · ");
}

function idleStateLabel(node: OperatorWorkerNode, presenceState: RoomPresenceModel["state"]): string {
  if (presenceState === "BLOCKED" || node.status === "BLOCKED" || node.status === "FAILED") return "BLOCKED";
  return "PRESENT_IDLE";
}

function countLabel(presence: RoomPresenceModel): string {
  if (presence.state === "EMPTY" || presence.agentsPresent === 0) return "NO AGENTS PRESENT";
  if (presence.state === "BLOCKED" || presence.agentsBlocked > 0 && presence.agentsActive === 0) {
    return `${presence.agentsPresent} PRESENT`;
  }
  if (presence.agentsActive > 0 && presence.agentsIdle > 0) {
    return `${presence.agentsActive} ACTIVE · ${presence.agentsIdle} IDLE`;
  }
  if (presence.agentsActive > 0) return `${presence.agentsActive} ACTIVE`;
  return `${presence.agentsPresent} PRESENT`;
}

export function RoomPresenceTrack({ presence, showEmptyLabel = true }: Props) {
  const empty = presence.state === "EMPTY" || presence.agentsPresent === 0;
  if (empty && !showEmptyLabel) return null;

  const blocked = presence.state === "BLOCKED";
  const orbs = presence.presenceNodes;

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
            const stateLabel = idleStateLabel(node, presence.state);
            return (
              <div key={node.nodeId} className="relative z-10" title={agentTitle(node, stateLabel)}>
                <WorkerNode
                  node={node}
                  compact
                  idle={!blocked && !node.motionActive}
                  blocked={blocked || node.status === "BLOCKED" || node.status === "FAILED"}
                />
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
