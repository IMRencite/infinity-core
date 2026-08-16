"use client";

import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";

type Props = {
  activeDepartmentIds: DepartmentId[];
  activeFlowIndex: number;
  commandAtTop?: boolean;
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
  commandAtTop = false,
  closedLoopRoute,
}: Props) {
  const hasActive = activeDepartmentIds.length > 0;
  const activeStroke = hasActive ? "url(#flow-active)" : "rgba(255,255,255,0.05)";
  const flowClass = hasActive ? "hq-flow-animate" : "";

  const commandY = commandAtTop ? 8 : 18;
  const floorStartY = commandAtTop ? 22 : 18;

  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      aria-hidden
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient id="flow-active" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(56,189,248)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="rgb(56,189,248)" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="loop-active" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgb(167,139,250)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(167,139,250)" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="command-out" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="rgb(167,139,250)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(56,189,248)" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Command → floor spine */}
      {commandAtTop ? (
        <path
          d={`M 50 ${commandY} L 50 ${floorStartY}`}
          fill="none"
          stroke={closedLoopRoute.active || hasActive ? "url(#command-out)" : "rgba(167,139,250,0.15)"}
          strokeWidth="0.35"
          className={hasActive || closedLoopRoute.active ? "hq-flow-animate" : ""}
        />
      ) : null}

      <path
        d={`M 50 ${floorStartY} L 50 88`}
        fill="none"
        stroke={activeStroke}
        strokeWidth={hasActive ? "0.4" : "0.18"}
        className={flowClass}
      />

      <path
        d={`M 22 ${floorStartY - 4} L 50 ${floorStartY - 4} L 78 ${floorStartY - 4}`}
        fill="none"
        stroke={activeFlowIndex >= 1 ? "url(#flow-active)" : "rgba(255,255,255,0.04)"}
        strokeWidth="0.28"
        className={activeFlowIndex >= 1 ? "hq-flow-animate" : ""}
      />

      <path
        d={`M 50 ${floorStartY + 12} L 18 ${floorStartY + 12} L 18 ${floorStartY + 26} M 50 ${floorStartY + 12} L 50 ${floorStartY + 26} M 50 ${floorStartY + 12} L 82 ${floorStartY + 26}`}
        fill="none"
        stroke={activeFlowIndex >= 4 ? "url(#flow-active)" : "rgba(255,255,255,0.03)"}
        strokeWidth="0.22"
        className={activeFlowIndex >= 4 ? "hq-flow-animate" : ""}
      />

      {/* Signal Intelligence → Command return loop */}
      {closedLoopRoute.active ? (
        <>
          <path
            d={`M 50 82 Q 72 72 50 ${commandY + 2}`}
            fill="none"
            stroke="url(#loop-active)"
            strokeWidth="0.38"
            className="hq-flow-animate"
          />
          {closedLoopRoute.toDepartmentId ? (
            <path
              d={`M 50 ${commandY + 2} Q 28 40 50 ${floorStartY + 20}`}
              fill="none"
              stroke="url(#command-out)"
              strokeWidth="0.3"
              className="hq-flow-animate"
              strokeDasharray="3 2"
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

export function closedLoopTargetLabel(deptId: DepartmentId | null): string {
  if (!deptId) return "—";
  return getRoomDisplayNames(deptId).displayName;
}
