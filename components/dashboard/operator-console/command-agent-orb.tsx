"use client";

import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

type Props = {
  active: boolean;
  node?: OperatorWorkerNode | null;
};

export function CommandAgentOrb({ active, node = null }: Props) {
  const title = [node?.displayRole ?? "Command", node?.displayTask, active ? "ACTIVE_WORK" : "PRESENT_IDLE"]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`hq-command-agent ${active ? "hq-command-agent--active" : "hq-command-agent--idle"}`}
      title={title}
      data-hq-command-agent={active ? "ACTIVE_WORK" : "PRESENT_IDLE"}
      data-hq-worker-motion={active ? "true" : "false"}
      data-hq-worker-role={node?.displayRole ?? "Command"}
      data-hq-worker-task={node?.displayTask ?? ""}
      data-hq-worker-status={active ? "ACTIVE_WORK" : "PRESENT_IDLE"}
      aria-label={title}
    >
      {active ? (
        <>
          <span className="hq-command-agent-halo hq-command-agent-halo--near hq-orb-pulse" aria-hidden />
          <span className="hq-command-agent-halo hq-command-agent-halo--far hq-worker-orb--motion" aria-hidden />
          <span className="hq-command-agent-orbit" aria-hidden />
        </>
      ) : null}
      <div className="hq-command-agent-core">
        <span className="hq-command-agent-nucleus" aria-hidden />
      </div>
    </div>
  );
}
