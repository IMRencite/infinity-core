"use client";

import type { DepartmentId, OperatorDepartmentSnapshot, OperatorCurrentActivity, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { LIFECYCLE_ROOM_SEQUENCE, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { DepartmentRoom } from "./department-room";
import { CommandChamber } from "./command-chamber";
import { HqFlowConnectors, closedLoopTargetLabel } from "./hq-flow-connectors";

type Props = {
  departments: OperatorDepartmentSnapshot[];
  workerNodes: OperatorWorkerNode[];
  currentActivity: OperatorCurrentActivity;
  activeDepartments: DepartmentId[];
  closedLoopRoute: {
    active: boolean;
    fromDepartmentId: DepartmentId | null;
    viaDepartmentId: DepartmentId | null;
    toDepartmentId: DepartmentId | null;
    decisionType: string | null;
    missionStatus: string | null;
  };
  selectedDepartment: DepartmentId | null;
  onSelectDepartment: (id: DepartmentId) => void;
};

export const FLOW_SEQUENCE = [...LIFECYCLE_ROOM_SEQUENCE, "executive_office"] as DepartmentId[];

function WingLabel({ children }: { children: string }) {
  return (
    <p className="border-b border-zinc-500/35 bg-zinc-900/35 px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
      {children}
    </p>
  );
}

function RoomCell({
  deptId,
  departments,
  workerNodes,
  activeSet,
  activeFlowIndex,
  selectedDepartment,
  closedLoopRoute,
  onSelectDepartment,
  wide = false,
}: {
  deptId: DepartmentId;
  departments: Map<string, OperatorDepartmentSnapshot>;
  workerNodes: OperatorWorkerNode[];
  activeSet: Set<DepartmentId>;
  activeFlowIndex: number;
  selectedDepartment: DepartmentId | null;
  closedLoopRoute: Props["closedLoopRoute"];
  onSelectDepartment: (id: DepartmentId) => void;
  wide?: boolean;
}) {
  const names = getRoomDisplayNames(deptId);
  const dept = departments.get(deptId);
  const deptNodes = workerNodes.filter((n) => n.departmentId === deptId);
  const idx = LIFECYCLE_ROOM_SEQUENCE.indexOf(deptId);
  return (
    <DepartmentRoom
      departmentId={deptId}
      displayName={names.displayName}
      supportingLabel={names.supportingLabel}
      snapshot={dept}
      workerNodes={deptNodes}
      isSelected={selectedDepartment === deptId}
      isActive={activeSet.has(deptId)}
      isNextMissionTarget={dept?.isNextMissionTarget ?? false}
      isOnActivePath={activeFlowIndex >= 0 && idx >= 0 && idx <= activeFlowIndex}
      closedLoopTarget={closedLoopRoute.toDepartmentId === deptId && closedLoopRoute.active}
      onSelect={() => onSelectDepartment(deptId)}
      wide={wide}
    />
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
}: Props) {
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const activeSet = new Set(activeDepartments);
  const activeFlowIndex = LIFECYCLE_ROOM_SEQUENCE.findIndex((id) => activeSet.has(id));
  const commandSnapshot = deptMap.get("executive_office");

  const cell = (deptId: DepartmentId, opts?: { wide?: boolean }) => (
    <RoomCell
      key={deptId}
      deptId={deptId}
      departments={deptMap}
      workerNodes={workerNodes}
      activeSet={activeSet}
      activeFlowIndex={activeFlowIndex}
      selectedDepartment={selectedDepartment}
      closedLoopRoute={closedLoopRoute}
      onSelectDepartment={onSelectDepartment}
      wide={opts?.wide}
    />
  );

  const wall = "border-zinc-500/38";
  const floorBg = "bg-zinc-950/30";

  return (
    <section
      aria-label="Infinity HQ operating floor"
      className="relative overflow-hidden rounded-xl border border-zinc-500/32 bg-[#040406] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
    >
      <div className="pointer-events-none absolute inset-0 hq-floor-grid opacity-48" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hq-floor-tracks opacity-58" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_40%,rgba(14,165,233,0.06),transparent)]" />

      <div className="relative">
        <div className={`border-b ${wall}`}>
          <CommandChamber
            snapshot={commandSnapshot}
            workerNodes={workerNodes}
            currentActivity={currentActivity}
            closedLoopRoute={closedLoopRoute}
            isSelected={selectedDepartment === "executive_office"}
            onSelect={() => onSelectDepartment("executive_office")}
          />
        </div>

        <div className="relative min-h-[180px] p-2 md:p-3">
          <p className="mb-2 text-center text-[9px] uppercase tracking-[0.35em] text-zinc-600">HQ Operating Floor</p>

          <HqFlowConnectors
            activeDepartmentIds={activeDepartments}
            closedLoopRoute={closedLoopRoute}
            activeFlowIndex={activeFlowIndex}
            commandAtTop
          />

          <div className="relative hidden md:block">
            {/* Discovery wing */}
            <div className={`border ${wall} ${floorBg}`}>
              <WingLabel>Discovery wing</WingLabel>
              <div className={`grid grid-cols-12 border-b ${wall}`}>
                <div className={`col-span-7 hq-doorway-cut border-r ${wall}`}>{cell("opportunity_lab", { wide: true })}</div>
                <div className={`col-span-1 hq-corridor-cell flex items-center justify-center border-r ${wall} ${
                  activeFlowIndex >= 1 ? "hq-corridor-active" : ""
                }`} aria-hidden>
                  <div className={`hq-floor-channel h-full w-px ${activeFlowIndex >= 1 ? "bg-sky-400/50" : "bg-zinc-600/55"}`} />
                </div>
                <div className="col-span-4">{cell("research_department")}</div>
              </div>
              <div className={`grid grid-cols-2`}>
                <div className={`border-r ${wall}`}>{cell("strategy_finance")}</div>
                <div>{cell("company_operations")}</div>
              </div>
            </div>

            {/* Production wing */}
            <div className={`mt-2 border ${wall} ${floorBg}`}>
              <WingLabel>Production wing</WingLabel>
              <div className={`grid grid-cols-4 border-b ${wall}`}>
                <div className={`border-r ${wall}`}>{cell("growth_department")}</div>
                <div className={`border-r ${wall}`}>{cell("creative_studio")}</div>
                <div className={`border-r ${wall}`}>{cell("product_lab")}</div>
                <div>{cell("quality_control")}</div>
              </div>
            </div>

            {/* Deployment & intelligence wing */}
            <div className={`mt-2 border ${wall} ${floorBg}`}>
              <WingLabel>Deployment &amp; intelligence wing</WingLabel>
              <div className="grid grid-cols-2">
                <div className={`border-r ${wall}`}>{cell("launch_operations")}</div>
                <div>{cell("intelligence_center")}</div>
              </div>
            </div>

            {closedLoopRoute.active ? (
              <div className="mx-auto mt-3 max-w-md border border-violet-500/25 bg-violet-950/15 px-3 py-1.5 text-center text-[10px] text-violet-300/80">
                Signal Intelligence → Command → {closedLoopTargetLabel(closedLoopRoute.toDepartmentId)}
              </div>
            ) : null}
          </div>

          <div className="relative space-y-2 md:hidden">
            {LIFECYCLE_ROOM_SEQUENCE.map((id) => (
              <div key={id} className={`overflow-hidden border ${wall}`}>
                {cell(id)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
