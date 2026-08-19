"use client";

import type { DepartmentUiState, FailureSemantics } from "@/lib/infinity/operator-console/types";
import { departmentStateLabel, departmentVisualState } from "@/lib/infinity/operator-console/status-derivation";

type Props = {
  state: DepartmentUiState;
  failureSemantics?: FailureSemantics;
  isActive?: boolean;
};

function failureBadge(failureSemantics?: FailureSemantics): string | null {
  if (failureSemantics === "HISTORICAL_FAILURE") return "Previous issue";
  if (failureSemantics === "CURRENT_BLOCKING_FAILURE") return "Needs attention";
  return null;
}

export function RoomStatusChip({ state, failureSemantics, isActive = false }: Props) {
  const visualState = departmentVisualState(state, failureSemantics);
  const badge = failureBadge(failureSemantics);

  if (badge) {
    return (
      <span
        className={`hq-room-status shrink-0 rounded px-1.5 py-0.5 ${
          failureSemantics === "CURRENT_BLOCKING_FAILURE" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-200"
        }`}
      >
        {badge}
      </span>
    );
  }

  if (isActive) {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[var(--hq-neon-cyan)] shadow-[var(--hq-glow-active)]" aria-hidden />
        <span className="hq-room-status text-cyan-200">ACTIVE</span>
      </span>
    );
  }

  const tone =
    visualState === "COMPLETE"
      ? "bg-blue-500/10 text-blue-200"
      : visualState === "FAILED"
        ? "bg-red-500/10 text-red-300"
        : visualState === "BLOCKED"
          ? "bg-amber-500/12 text-amber-200"
          : visualState === "NOT_STARTED"
            ? "bg-zinc-800/80 text-zinc-400"
            : "bg-zinc-800/60 text-[var(--hq-text-secondary)]";

  return (
    <span className={`hq-room-status shrink-0 rounded px-1.5 py-0.5 ${tone}`}>
      {departmentStateLabel(visualState)}
    </span>
  );
}
