import type { InternalVentureObservation } from "./types";

export const CLUB_THROTTLE_VENTURE_ID = "club-throttle" as const;
export const CLUB_THROTTLE_VENTURE_CREATED_AT = "2026-09-22T12:00:00.000Z" as const;
export const OCCUPANCYNPV_VENTURE_CREATED_AT = "2026-06-06T06:00:00.000Z" as const;

export function resolvePublicVentureCreatedAt(input: {
  private_venture_id: string;
  venture_created_at?: string;
}): string {
  if (input.venture_created_at) return input.venture_created_at;
  if (input.private_venture_id === CLUB_THROTTLE_VENTURE_ID) return CLUB_THROTTLE_VENTURE_CREATED_AT;
  if (input.private_venture_id === "occupancynpv") return OCCUPANCYNPV_VENTURE_CREATED_AT;
  return input.private_venture_id;
}

export function listCanonicalPublicVentureFeedObservations(): InternalVentureObservation[] {
  return [
    {
      private_venture_id: "occupancynpv",
      private_name: "OccupancyNPV",
      venture_status: "ACTIVE",
      operating_stage: "PUBLICLY_LAUNCHED",
      public_launch_state: "YES",
      venture_created_at: OCCUPANCYNPV_VENTURE_CREATED_AT,
      is_operating: true,
      is_started: true,
      is_fixture: false,
      has_active_artifact: true,
    },
    {
      private_venture_id: CLUB_THROTTLE_VENTURE_ID,
      private_name: "Club Throttle",
      venture_status: "ACTIVE",
      operating_stage: "PUBLICLY_LAUNCHED",
      public_launch_state: "YES",
      venture_created_at: CLUB_THROTTLE_VENTURE_CREATED_AT,
      is_operating: true,
      is_started: true,
      is_fixture: false,
      has_active_artifact: true,
    },
  ];
}
