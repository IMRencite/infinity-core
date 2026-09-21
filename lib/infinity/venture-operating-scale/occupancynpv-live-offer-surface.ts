import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_LIVE_OFFER_SURFACE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-offer-surface.json" as const;

export type OccupancynpvLiveOfferSurface = {
  captured_at: string;
  origin: string;
  html: string;
  status: number;
  offer_block: boolean;
  primary_cta: boolean;
};

export function persistOccupancynpvLiveOfferSurface(surface: OccupancynpvLiveOfferSurface): OccupancynpvLiveOfferSurface {
  mkdirSync(dirname(OCCUPANCYNPV_LIVE_OFFER_SURFACE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_LIVE_OFFER_SURFACE_PATH, `${JSON.stringify(surface, null, 2)}\n`);
  return surface;
}

export function readOccupancynpvLiveOfferSurface(): OccupancynpvLiveOfferSurface | null {
  if (!existsSync(OCCUPANCYNPV_LIVE_OFFER_SURFACE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_LIVE_OFFER_SURFACE_PATH, "utf8")) as OccupancynpvLiveOfferSurface;
  } catch {
    return null;
  }
}
