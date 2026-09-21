"use client";

import type { HqInfinitySymbolState } from "@/lib/infinity/hq-live-activity";

export type InfinityDecisionCoreState = "ACTIVE_WORK" | "READY_BLOCKED" | "PRESENT_IDLE" | "FAILED";

type Props = {
  state: InfinityDecisionCoreState;
  symbolState?: HqInfinitySymbolState;
  label?: string;
};

export function infinitySymbolToDecisionCore(symbol: HqInfinitySymbolState): InfinityDecisionCoreState {
  switch (symbol) {
    case "ACTIVE":
      return "ACTIVE_WORK";
    case "BLOCKED":
    case "AUTHORIZATION":
      return "READY_BLOCKED";
    case "STANDBY":
    case "IDLE":
      return "PRESENT_IDLE";
  }
}

export function decisionCoreToInfinitySymbol(state: InfinityDecisionCoreState): HqInfinitySymbolState {
  switch (state) {
    case "ACTIVE_WORK":
      return "ACTIVE";
    case "READY_BLOCKED":
      return "BLOCKED";
    case "FAILED":
      return "BLOCKED";
    case "PRESENT_IDLE":
      return "STANDBY";
  }
}

export function deriveInfinityDecisionCoreState(input: {
  commandRoomStatus?: string | null;
  nowInspectingStatus?: string | null;
  departmentState?: string | null;
}): InfinityDecisionCoreState {
  const status = input.commandRoomStatus ?? input.nowInspectingStatus ?? "";
  if (status === "FAILED" || input.departmentState === "FAILED") return "FAILED";
  if (status === "ACTIVE_WORK") return "ACTIVE_WORK";
  if (status === "READY_BLOCKED" || status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") {
    return "READY_BLOCKED";
  }
  if (status) return "PRESENT_IDLE";
  if (input.departmentState === "BLOCKED") return "READY_BLOCKED";
  if (input.departmentState === "RUNNING") return "ACTIVE_WORK";
  return "PRESENT_IDLE";
}

const INFINITY_PATH =
  "M12 32 C12 14 32 14 50 32 C68 50 88 50 88 32 C88 14 68 14 50 32 C32 50 12 50 12 32";

export function InfinityDecisionCore({ state, symbolState, label = "Command decision core" }: Props) {
  const resolvedSymbol = symbolState ?? decisionCoreToInfinitySymbol(state);
  const decision = symbolState ? infinitySymbolToDecisionCore(symbolState) : state;
  return (
    <div
      className="hq-infinity-core"
      data-hq-decision-core={decision}
      data-hq-infinity-symbol={resolvedSymbol}
      data-hq-decision-shape="INFINITY_SYMBOL"
      data-hq-command-agent={decision}
      aria-label={`${label} · ${resolvedSymbol}`}
    >
      <span className="hq-infinity-halo hq-infinity-halo--near" aria-hidden />
      <span className="hq-infinity-halo hq-infinity-halo--far" aria-hidden />
      <span className="hq-infinity-orbit" aria-hidden />
      <div className="hq-infinity-scale">
        <svg
          className="hq-infinity-svg"
          viewBox="0 0 100 64"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <filter id="hq-infinity-blur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
            <linearGradient id="hq-infinity-energy" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="50%" stopColor="#e040fb" />
              <stop offset="100%" stopColor="#c026d3" />
            </linearGradient>
          </defs>
          <path className="hq-infinity-glow" d={INFINITY_PATH} filter="url(#hq-infinity-blur)" />
          <path className="hq-infinity-stroke" d={INFINITY_PATH} />
          <path className="hq-infinity-energy" d={INFINITY_PATH} />
        </svg>
      </div>
    </div>
  );
}
