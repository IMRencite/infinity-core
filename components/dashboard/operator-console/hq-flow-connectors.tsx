"use client";

import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { HQ_OPERATING_FLOOR_ORDER } from "@/lib/infinity/operator-console/floor-layout";
import { getRoomDisplayNames, LIFECYCLE_ROOM_SEQUENCE } from "@/lib/infinity/operator-console/room-naming";

type Props = {
  activeDepartmentIds: DepartmentId[];
  activeFlowIndex: number;
  commandAtTop?: boolean;
  handoffStage?: "discovery_to_monetization" | "monetization_to_selection" | "selection_to_validation" | null;
  handoffLineageColorKey?: string | null;
  closedLoopRoute: {
    active: boolean;
    fromDepartmentId: DepartmentId | null;
    viaDepartmentId: DepartmentId | null;
    toDepartmentId: DepartmentId | null;
  };
};

export function HqFlowConnectors({
  activeDepartmentIds,
  activeFlowIndex,
  handoffStage = null,
  handoffLineageColorKey = null,
  closedLoopRoute,
}: Props) {
  const hasActive = activeDepartmentIds.length > 0;
  const handoffActive = Boolean(handoffStage) && hasActive;

  return (
    <div className="hq-floor-flow-legend mb-2.5" aria-hidden>
      <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        {HQ_OPERATING_FLOOR_ORDER.map((id, index) => {
          const lifecycleIndex = LIFECYCLE_ROOM_SEQUENCE.indexOf(id);
          const active = lifecycleIndex >= 0 && lifecycleIndex <= activeFlowIndex && activeFlowIndex >= 0;
          return (
            <li key={id} className="flex items-center gap-1.5">
              <span
                className={`text-[8px] font-semibold uppercase tracking-[0.14em] ${
                  active ? "text-cyan-200/80" : "text-zinc-600"
                }`}
              >
                {getRoomDisplayNames(id).displayName}
              </span>
              {index < HQ_OPERATING_FLOOR_ORDER.length - 1 ? (
                <span className="text-[8px] text-zinc-700" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {handoffActive ? (
        <span
          className="hq-handoff-packet mx-auto mt-1 block h-1.5 w-1.5 rounded-full"
          style={
            handoffLineageColorKey
              ? { background: `var(--hq-lineage-${handoffLineageColorKey})` }
              : { background: "rgb(34,211,238)" }
          }
        />
      ) : null}
      {closedLoopRoute.active ? (
        <p className="mt-1 text-center text-[8px] uppercase tracking-[0.16em] text-violet-300/70">Closed loop active</p>
      ) : null}
    </div>
  );
}

export function closedLoopTargetLabel(deptId: DepartmentId | null): string {
  if (!deptId) return "—";
  return getRoomDisplayNames(deptId).displayName;
}
