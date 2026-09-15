import type { PublicSalesFloorProjection, SalesFloorHqView } from "./types";

const PRIVATE = /@|pipeline value|\$\d|deal value|close details|AskReview|candidate:|Mercury|Treasury|spend authority/i;

export function projectPublicSalesFloor(view?: SalesFloorHqView): PublicSalesFloorProjection {
  return {
    floor: "Sales Floor",
    rooms: [
      { public_name: "Outbound Acquisition", public_activity: "Prospecting" },
      { public_name: "Inbound Conversion", public_activity: "Monitoring interest" },
      { public_name: "Expansion & Retention", public_activity: "Monitoring accounts" },
      { public_name: "Partnerships", public_activity: "Developing channels" },
      { public_name: "Offer & Closing", public_activity: "Advancing opportunities" },
    ],
    public_agent_count: view ? view.rooms.filter((room) => room.state === "ACTIVE").length : 0,
  };
}

export function publicSalesFloorIsSafe(serialized: string): boolean {
  return !PRIVATE.test(serialized) && !serialized.includes("pipeline") && !serialized.includes("@");
}

export function salesFloorExposedInPublicOperations(publicProjectionJson: string): boolean {
  return /Sales Floor|Outbound Acquisition|Offer & Closing/.test(publicProjectionJson);
}
