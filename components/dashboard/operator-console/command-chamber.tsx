"use client";

import type { DepartmentId, OperatorCurrentActivity, OperatorDepartmentSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { WorkerNode } from "./worker-node";
import { closedLoopTargetLabel } from "./hq-flow-connectors";
import { partitionCommandDecisionOrbs } from "@/lib/infinity/operator-console/command-chamber-layout";
import { RoomWorkflowStage } from "./room-workflow-stage";

type Props = {
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  closedLoopRoute: {
    active: boolean;
    toDepartmentId: DepartmentId | null;
    decisionType: string | null;
    missionStatus: string | null;
  };
  isSelected: boolean;
  onSelect: () => void;
};

export function CommandChamber({
  snapshot,
  workerNodes,
  currentActivity,
  closedLoopRoute,
  isSelected,
  onSelect,
}: Props) {
  const names = getRoomDisplayNames("executive_office");
  const missionText =
    currentActivity.displayNarration ??
    currentActivity.displayTask ??
    snapshot?.displayHeadline ??
    "Standing by for the next mission";

  const nextRoute = closedLoopRoute.active && closedLoopRoute.toDepartmentId
    ? closedLoopTargetLabel(closedLoopRoute.toDepartmentId)
    : snapshot?.isNextMissionTarget
      ? "Routing next mission"
      : null;

  const decisionText = snapshot?.displaySummary ?? (closedLoopRoute.decisionType
    ? closedLoopRoute.decisionType.replace(/_/g, " ")
    : null);

  const { primary: primaryNode, satellites: satelliteNodes } = partitionCommandDecisionOrbs(workerNodes);
  const isActive = snapshot?.isActive ?? closedLoopRoute.active;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Command — mission control"
      aria-pressed={isSelected}
      className={`
        group relative w-full overflow-hidden border border-violet-500/25 text-left transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
        bg-gradient-to-b from-violet-950/30 via-[#070709] to-[#050507]
        ${isSelected ? "ring-2 ring-violet-400/50" : ""}
        hover:border-violet-400/35
      `}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,92,246,0.1),transparent)]" aria-hidden />

      <div className="relative px-4 py-2.5 md:px-6 md:py-3">
        <div className="flex items-center gap-4 md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-400/80">{names.displayName}</p>

            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-start md:gap-6">
              <div className="space-y-1.5">
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-zinc-600">Current mission</p>
                  <p className="text-sm font-medium leading-snug text-zinc-100 md:text-base">{missionText}</p>
                </div>

                {decisionText ? (
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-zinc-600">Decision</p>
                    <p className="text-xs text-zinc-300">{decisionText}</p>
                  </div>
                ) : null}

                {nextRoute ? (
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-violet-400/70">Next route</p>
                    <p className="text-xs text-violet-200">{nextRoute}</p>
                  </div>
                ) : null}
              </div>

              <div className="hidden min-w-[140px] md:block">
                <RoomWorkflowStage
                  departmentId="executive_office"
                  nodes={[]}
                  isActive={isActive}
                  renderOrbs={false}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            {primaryNode || satelliteNodes.length > 0 ? (
              <div className="flex items-end justify-center gap-2" aria-label="Command decision sessions">
                {primaryNode ? (
                  <WorkerNode node={primaryNode} prominent={primaryNode.motionActive || isActive} />
                ) : null}
                {satelliteNodes.map((node) => (
                  <WorkerNode key={node.nodeId} node={node} compact prominent={node.motionActive} />
                ))}
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-500/40 bg-violet-950/40 shadow-[0_0_16px_rgba(139,92,246,0.2)]">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400/80" aria-hidden />
              </div>
            )}
            <span className="text-[7px] uppercase tracking-widest text-violet-400/60">Decision core</span>
          </div>
        </div>
      </div>

      <div className="relative flex justify-center pb-0.5" aria-hidden>
        <div className={`h-4 w-px ${closedLoopRoute.active || isActive ? "bg-gradient-to-b from-violet-400/60 to-sky-400/40 hq-corridor-glow" : "bg-zinc-800"}`} />
      </div>
    </button>
  );
}
