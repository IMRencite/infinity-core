"use client";

import type { CSSProperties, ReactNode } from "react";
import type { DepartmentId, OperatorDepartmentSnapshot, OperatorCurrentActivity, OperatorWorkerNode, OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { LIFECYCLE_ROOM_SEQUENCE, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import {
  HQ_FLOOR_LAYOUT_SECTIONS,
  hqFloorCanonicalIndex,
  hqFloorSpan,
  hqFloorWing,
} from "@/lib/infinity/operator-console/floor-layout";
import { DepartmentRoom } from "./department-room";
import { HqFlowConnectors, closedLoopTargetLabel } from "./hq-flow-connectors";

type Props = {
  departments: OperatorDepartmentSnapshot[];
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  activeDepartments: DepartmentId[];
  closedLoopRoute: OperatorVentureSnapshot["closedLoopRoute"];
  selectedDepartment: DepartmentId | null;
  onSelectDepartment: (id: DepartmentId) => void;
  handoffStage?: "discovery_to_monetization" | "monetization_to_selection" | "selection_to_validation" | null;
  handoffLineageColorKey?: string | null;
  isTerminalCycle?: boolean;
  ventureName?: string | null;
};

export const FLOW_SEQUENCE = [...LIFECYCLE_ROOM_SEQUENCE, "executive_office"] as DepartmentId[];

function RoomCell({
  deptId,
  departments,
  workerNodes,
  currentActivity,
  ventureName,
  activeSet,
  activeFlowIndex,
  selectedDepartment,
  closedLoopRoute,
  onSelectDepartment,
  isTerminalCycle = false,
}: {
  deptId: DepartmentId;
  departments: Map<string, OperatorDepartmentSnapshot>;
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  ventureName?: string | null;
  activeSet: Set<DepartmentId>;
  activeFlowIndex: number;
  selectedDepartment: DepartmentId | null;
  closedLoopRoute: Props["closedLoopRoute"];
  onSelectDepartment: (id: DepartmentId) => void;
  isTerminalCycle?: boolean;
}) {
  const names = getRoomDisplayNames(deptId);
  const dept = departments.get(deptId);
  const deptNodes = workerNodes.filter((n) => n.departmentId === deptId);
  const idx = LIFECYCLE_ROOM_SEQUENCE.indexOf(deptId);
  const span = hqFloorSpan(deptId);
  const wing = hqFloorWing(deptId);
  return (
    <div
      className={`hq-floor-room hq-floor-room--${span} hq-floor-room--wing-${wing}`}
      data-hq-floor-room={deptId}
      data-hq-floor-column={span}
      data-hq-floor-span={span}
      style={{ "--hq-floor-order": hqFloorCanonicalIndex(deptId) } as CSSProperties}
    >
      <DepartmentRoom
        departmentId={deptId}
        displayName={names.displayName}
        supportingLabel={names.supportingLabel}
        snapshot={dept}
        workerNodes={deptNodes}
        currentActivity={currentActivity}
        closedLoopRoute={closedLoopRoute}
        ventureName={ventureName}
        isSelected={selectedDepartment === deptId}
        isActive={activeSet.has(deptId)}
        isNextMissionTarget={dept?.isNextMissionTarget ?? false}
        isOnActivePath={activeFlowIndex >= 0 && idx >= 0 && idx <= activeFlowIndex}
        closedLoopTarget={closedLoopRoute.toDepartmentId === deptId && closedLoopRoute.active}
        isTerminal={isTerminalCycle}
        onSelect={() => onSelectDepartment(deptId)}
        span={span === "full" ? "full" : "standard"}
      />
    </div>
  );
}

function FloorColumns({
  left,
  right,
  renderRoom,
}: {
  left: DepartmentId[];
  right: DepartmentId[];
  renderRoom: (id: DepartmentId) => ReactNode;
}) {
  if (left.length === 0 && right.length === 0) return null;
  return (
    <div className="hq-floor-columns relative min-w-0">
      <div className="hq-floor-column hq-floor-column--left" data-hq-floor-column="left">
        {left.map((id) => renderRoom(id))}
      </div>
      <div className="hq-floor-column hq-floor-column--right" data-hq-floor-column="right">
        {right.map((id) => renderRoom(id))}
      </div>
    </div>
  );
}

export function HqSpatialFloor({
  departments,
  workerNodes,
  currentActivity,
  activeDepartments,
  closedLoopRoute,
  selectedDepartment,
  onSelectDepartment,
  handoffStage = null,
  handoffLineageColorKey = null,
  isTerminalCycle = false,
  ventureName = null,
}: Props) {
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const activeSet = new Set(activeDepartments);
  const activeFlowIndex = LIFECYCLE_ROOM_SEQUENCE.findIndex((id) => activeSet.has(id));
  const sections = HQ_FLOOR_LAYOUT_SECTIONS;

  const cell = (deptId: DepartmentId) => (
    <RoomCell
      key={deptId}
      deptId={deptId}
      departments={deptMap}
      workerNodes={workerNodes}
      currentActivity={currentActivity}
      ventureName={ventureName}
      activeSet={activeSet}
      activeFlowIndex={activeFlowIndex}
      selectedDepartment={selectedDepartment}
      closedLoopRoute={closedLoopRoute}
      onSelectDepartment={onSelectDepartment}
      isTerminalCycle={isTerminalCycle}
    />
  );

  return (
    <section
      aria-label="Infinity HQ operating floor"
      data-hq-region="operating-floor"
      className="relative overflow-x-hidden rounded-xl border border-zinc-500/32 bg-[#040406] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
    >
      <div className="pointer-events-none absolute inset-0 hq-floor-grid opacity-48" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hq-floor-tracks opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_40%,rgba(14,165,233,0.06),transparent)]" />

      <div className="relative">
        <div className="relative p-2 md:p-3">
          <p className="mb-1 text-center text-[9px] uppercase tracking-[0.35em] text-zinc-600">HQ Operating Floor</p>
          <p className="mb-2 text-center text-[8px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            Discovery wing · Production wing · Deployment &amp; intelligence wing
          </p>

          <HqFlowConnectors
            activeDepartmentIds={activeDepartments}
            closedLoopRoute={closedLoopRoute}
            activeFlowIndex={activeFlowIndex}
            commandAtTop={false}
            handoffStage={handoffStage}
            handoffLineageColorKey={handoffLineageColorKey}
          />

          <div className="hq-floor-stack relative min-w-0">
            <FloorColumns left={sections.above.left} right={sections.above.right} renderRoom={cell} />
            {sections.full.map((id) => (
              <div key={id} className="hq-floor-full-row" data-hq-floor-full-row={id}>
                {cell(id)}
              </div>
            ))}
            <FloorColumns left={sections.below.left} right={sections.below.right} renderRoom={cell} />
          </div>

          {closedLoopRoute.active ? (
            <div className="mx-auto mt-3 max-w-md border border-violet-500/25 bg-violet-950/15 px-3 py-1.5 text-center text-[10px] text-violet-300/80">
              Signal Intelligence → Command → {closedLoopTargetLabel(closedLoopRoute.toDepartmentId)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
