import type { SalesRoomState } from "./contract";
import type { SalesRoomProjection } from "./types";

export type SalesOrbVisual = {
  state: SalesRoomState;
  motion: "TRAVEL" | "SUBDUED" | "PAUSED" | "NONE" | "BLOCKED" | "DEGRADED";
  active: boolean;
  reducedMotionEquivalent: string;
};

export function projectSalesRoomOrb(state: SalesRoomState): SalesOrbVisual {
  switch (state) {
    case "ACTIVE":
      return {
        state,
        motion: "TRAVEL",
        active: true,
        reducedMotionEquivalent: "ACTIVE work in progress",
      };
    case "MONITORING":
      return {
        state,
        motion: "SUBDUED",
        active: false,
        reducedMotionEquivalent: "MONITORING — observing, not executing",
      };
    case "WAITING":
      return {
        state,
        motion: "PAUSED",
        active: false,
        reducedMotionEquivalent: "WAITING on a dependency",
      };
    case "BLOCKED":
      return {
        state,
        motion: "BLOCKED",
        active: false,
        reducedMotionEquivalent: "BLOCKED — no productive motion",
      };
    case "DEGRADED":
      return {
        state,
        motion: "DEGRADED",
        active: false,
        reducedMotionEquivalent: "DEGRADED — capability impaired",
      };
    default:
      return {
        state,
        motion: "NONE",
        active: false,
        reducedMotionEquivalent: "PRESENT_IDLE — assigned agents present, no execution",
      };
  }
}

export function salesOrbIsTruthful(room: SalesRoomProjection, orb: SalesOrbVisual): boolean {
  if (orb.state !== room.state) return false;
  if (orb.active && room.state !== "ACTIVE") return false;
  if (room.state !== "ACTIVE" && orb.motion === "TRAVEL") return false;
  if (room.state === "PRESENT_IDLE" && orb.active) return false;
  if (room.state === "BLOCKED" && orb.motion !== "BLOCKED") return false;
  if (room.state === "MONITORING" && orb.motion !== "SUBDUED") return false;
  return true;
}

export function completedWorkCannotKeepOrbAlive(input: {
  completed: boolean;
  historical: boolean;
  orbActive: boolean;
}): boolean {
  if (input.completed || input.historical) return !input.orbActive;
  return true;
}
