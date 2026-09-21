"use client";

import { useRouter } from "next/navigation";
import type {
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorVentureSnapshot,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import { OPERATIONS_ROOM_ID, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { HQ_OPERATIONS_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import { aggregateRoomVisualState } from "@/lib/infinity/hq-live-activity";
import { hqOperatingFloorIndex } from "@/lib/infinity/operator-console/floor-layout";
import { DepartmentRoom } from "./department-room";

type Props = {
  snapshot?: OperatorDepartmentSnapshot;
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  closedLoopRoute: OperatorVentureSnapshot["closedLoopRoute"];
  selected: boolean;
  onSelect: () => void;
  ventureName?: string | null;
  liveStatus?: string | null;
  liveSummary?: string | null;
  nowInspectingTask?: string | null;
};

export function HqOperationsFloorRoom({
  snapshot,
  workerNodes,
  currentActivity,
  closedLoopRoute,
  selected,
  onSelect,
  ventureName = null,
  liveStatus = null,
  liveSummary = null,
  nowInspectingTask = null,
}: Props) {
  const router = useRouter();
  const names = getRoomDisplayNames(OPERATIONS_ROOM_ID);
  const opsWorkers = workerNodes.filter((node) => node.departmentId === OPERATIONS_ROOM_ID);
  const roomActive = aggregateRoomVisualState(opsWorkers) === "ACTIVE" || liveStatus === "ACTIVE_WORK";

  return (
    <div
      className="hq-floor-room hq-floor-room--full hq-floor-room--wing-deployment"
      data-hq-floor-room="operations"
      data-hq-operations-floor-room="true"
      data-hq-operating-floor-index={hqOperatingFloorIndex(OPERATIONS_ROOM_ID)}
      data-hq-room-visual-state={aggregateRoomVisualState(opsWorkers)}
    >
      <DepartmentRoom
        departmentId={OPERATIONS_ROOM_ID}
        displayName={names.displayName}
        supportingLabel={names.supportingLabel}
        snapshot={snapshot}
        workerNodes={opsWorkers}
        currentActivity={currentActivity}
        closedLoopRoute={closedLoopRoute}
        ventureName={ventureName}
        isSelected={selected}
        isActive={roomActive}
        isNextMissionTarget={false}
        isOnActivePath={false}
        liveStatus={liveStatus}
        liveSummary={liveSummary}
        nowInspectingTask={nowInspectingTask}
        onSelect={() => {
          onSelect();
          router.push(HQ_OPERATIONS_ROUTE);
        }}
        span="full"
      />
    </div>
  );
}
