"use client";

import type { ReactNode, KeyboardEvent } from "react";
import type { DepartmentUiState, FailureSemantics } from "@/lib/infinity/operator-console/types";
import { departmentStateClasses } from "@/lib/infinity/operator-console/status-derivation";
import { handleRoomKeyboardActivate } from "./room-keyboard";

export type InfinityRoomVariant = "standard" | "command";
export type InfinityRoomSize = "standard" | "wide" | "hero";

type Props = {
  variant?: InfinityRoomVariant;
  size?: InfinityRoomSize;
  state: DepartmentUiState;
  failureSemantics?: FailureSemantics;
  isSelected: boolean;
  isActive: boolean;
  isOnActivePath?: boolean;
  isNextMissionTarget?: boolean;
  closedLoopTarget?: boolean;
  partition?: "top" | "right" | "bottom" | "left" | "none";
  ariaLabel: string;
  onActivate: () => void;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  corridor?: ReactNode;
  span?: "standard" | "full";
};

function partitionClass(partition: Props["partition"]): string {
  switch (partition) {
    case "top":
      return "border-t border-zinc-500/38";
    case "right":
      return "border-r border-zinc-500/38";
    case "bottom":
      return "border-b border-zinc-500/38";
    case "left":
      return "border-l border-zinc-500/38";
    default:
      return "";
  }
}

function stateModifier(state: DepartmentUiState, isActive: boolean): string {
  if (isActive) return "hq-room-shell--active";
  switch (state) {
    case "COMPLETE":
      return "hq-room-shell--complete";
    case "BLOCKED":
      return "hq-room-shell--blocked";
    case "NOT_STARTED":
      return "hq-room-shell--not-started";
    case "FAILED":
      return "hq-room-shell--failed";
    default:
      return "hq-room-shell--idle";
  }
}

function sizeClass(size: InfinityRoomSize): string {
  if (size === "hero") return "min-h-[148px]";
  if (size === "wide") return "min-h-[128px]";
  return "min-h-[118px]";
}

export function InfinityRoomShell({
  variant = "standard",
  size = "standard",
  state,
  failureSemantics,
  isSelected,
  isActive,
  isOnActivePath = false,
  isNextMissionTarget = false,
  closedLoopTarget = false,
  partition = "none",
  ariaLabel,
  onActivate,
  header,
  children,
  footer,
  corridor,
  span = "standard",
}: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => handleRoomKeyboardActivate(event, onActivate);

  const variantClass =
    variant === "command"
      ? "hq-room-shell--command border-violet-500/25 hover:border-violet-400/35"
      : "border-zinc-600/35 hover:border-zinc-500/45";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={`
        hq-room-shell group relative min-h-0 min-w-0 w-full self-start overflow-x-hidden text-left transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60
        ${variantClass}
        ${partitionClass(partition)}
        ${departmentStateClasses(state, failureSemantics)}
        ${stateModifier(state, isActive)}
        ${isSelected ? (variant === "command" ? "ring-2 ring-violet-400/50" : "ring-1 ring-inset ring-sky-400/35") : ""}
        ${isActive ? "hq-room-active hq-room-grid-sweep" : ""}
        ${isOnActivePath && !isActive ? "hq-room-shell--on-path" : ""}
        ${isNextMissionTarget || closedLoopTarget ? "outline outline-1 outline-violet-400/35 -outline-offset-1" : ""}
        ${sizeClass(size)}
        ${span === "full" ? "hq-room-shell--full-span" : ""}
      `}
    >
      {isActive ? (
        <div
          className={`pointer-events-none absolute inset-0 ${
            variant === "command"
              ? "bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,92,246,0.1),transparent)]"
              : "bg-[radial-gradient(ellipse_85%_70%_at_50%_100%,rgba(34,211,238,0.22),transparent)]"
          }`}
          aria-hidden
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-500/38 to-transparent" aria-hidden />

      <div className={`relative min-w-0 ${variant === "command" ? "px-4 py-2.5 md:px-6 md:py-3" : "px-3 py-2.5"}`}>
        {header}
        {children}
        {footer}
      </div>

      {corridor}
    </div>
  );
}
