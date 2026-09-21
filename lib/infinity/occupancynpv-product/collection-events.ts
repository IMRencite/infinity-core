export type OccupancynpvCollectionEventType =
  | "workspace_archived"
  | "workspace_restored"
  | "workspace_renamed"
  | "scenario_created"
  | "scenario_opened"
  | "comparison_pair_selected";

export type OccupancynpvCollectionEvent = {
  type: OccupancynpvCollectionEventType;
  label: "INTERNAL_QA" | "CUSTOMER";
};

const events: OccupancynpvCollectionEvent[] = [];

export function emitOccupancynpvCollectionEvent(type: OccupancynpvCollectionEventType, qa = false): OccupancynpvCollectionEvent {
  const event: OccupancynpvCollectionEvent = { type, label: qa ? "INTERNAL_QA" : "CUSTOMER" };
  events.push(event);
  return event;
}

export function occupancynpvCollectionEvents(): OccupancynpvCollectionEvent[] {
  return [...events];
}

export function resetOccupancynpvCollectionEvents(): void {
  events.length = 0;
}
