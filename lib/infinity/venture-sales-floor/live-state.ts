import type { CurrentWorkNarrative } from "@/lib/infinity/current-work-narrative";
import type { AffiliateHqView } from "@/lib/infinity/affiliate-referral/types";
import { SALES_ROOMS, type SalesRoomId, type SalesRoomState } from "./contract";
import type { SalesRoomAgent } from "./agents";
import { agentsForSalesRoom, buildSalesRoomAgents } from "./agents";
import { salesFloorCurrentWork, salesRoomCurrentWork } from "./narrative";
import { projectSalesRoomOrb, type SalesOrbVisual } from "./orb";
import type { SalesFloorHqView, SalesRoomProjection } from "./types";

export type SalesRoomLiveState = {
  room: SalesRoomId;
  state: SalesRoomState;
  now: CurrentWorkNarrative;
  agents: SalesRoomAgent[];
  orb: SalesOrbVisual;
  latest_result: string;
  next_action: string;
  venture_name: string;
};

export type SalesFloorLiveState = {
  floor: CurrentWorkNarrative;
  rooms: SalesRoomLiveState[];
  affiliate: AffiliateHqView | null;
};

export function projectSalesRoomLiveState(
  room: SalesRoomProjection,
  ventureName: string,
  ventureId: string,
  agents: SalesRoomAgent[],
): SalesRoomLiveState {
  return {
    room: room.room,
    state: room.state,
    now: salesRoomCurrentWork(room, ventureName, ventureId),
    agents: agentsForSalesRoom(agents, room.room),
    orb: projectSalesRoomOrb(room.state),
    latest_result: room.latest_result,
    next_action: room.next_action,
    venture_name: ventureName,
  };
}

export function projectSalesFloorLiveState(
  view: SalesFloorHqView,
  affiliate: AffiliateHqView | null = null,
): SalesFloorLiveState {
  const agents = buildSalesRoomAgents(view.rooms);
  return {
    floor: salesFloorCurrentWork(view),
    rooms: view.rooms.map((room) => projectSalesRoomLiveState(room, view.venture_name, view.venture_id, agents)),
    affiliate,
  };
}

export function oneCanonicalStatePerRoom(live: SalesRoomLiveState): boolean {
  return live.now.state === live.state
    && live.orb.state === live.state
    && live.agents.every((agent) => agent.presenceState === live.state);
}

export function liveHasAllFiveRooms(live: SalesFloorLiveState): boolean {
  return SALES_ROOMS.every((room) => live.rooms.some((row) => row.room === room));
}
