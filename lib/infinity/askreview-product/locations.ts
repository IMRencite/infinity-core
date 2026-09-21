import { randomBytes } from "node:crypto";
import { generateReviewKit, normalizeReviewTarget } from "./kits";
import { emitAskReviewEvent } from "./observability";
import { getAskReviewStore, saveAskReviewStore } from "./store";
import { ASKREVIEW_KIT_HISTORY_LIMIT, type AskReviewKit, type AskReviewLocation, type AskReviewLocationInputError } from "./types";

export const ASKREVIEW_LOCATION_PAGE_SIZE = 10 as const;

export function listAskReviewLocations(input: {
  accountId: string;
  status?: "ACTIVE" | "ARCHIVED";
  page?: number;
  q?: string;
}): { items: AskReviewLocation[]; page: number; total: number; pageSize: number } {
  const store = getAskReviewStore();
  const status = input.status ?? "ACTIVE";
  const q = input.q?.trim().toLowerCase() ?? "";
  const filtered = store.locations
    .filter((row) => row.accountId === input.accountId && row.status === status)
    .filter((row) => !q || row.name.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const page = Math.max(1, input.page ?? 1);
  const start = (page - 1) * ASKREVIEW_LOCATION_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + ASKREVIEW_LOCATION_PAGE_SIZE),
    page,
    total: filtered.length,
    pageSize: ASKREVIEW_LOCATION_PAGE_SIZE,
  };
}

export function createAskReviewLocation(input: {
  accountId: string;
  name: string;
  placeId?: string | null;
  mapsUrl?: string | null;
}): { ok: true; location: AskReviewLocation } | { ok: false; reason: AskReviewLocationInputError } {
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "INVALID_LOCATION_INPUT" };
  const target = normalizeReviewTarget({ placeId: input.placeId, mapsUrl: input.mapsUrl });
  if (!target.ok) return target;
  const now = new Date().toISOString();
  const location: AskReviewLocation = {
    locationId: `loc_${randomBytes(8).toString("hex")}`,
    accountId: input.accountId,
    name,
    placeId: target.placeId,
    mapsUrl: target.mapsUrl,
    reviewUrl: target.reviewUrl,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  const store = getAskReviewStore();
  store.locations.push(location);
  saveAskReviewStore(store);
  emitAskReviewEvent({ type: "location_created", accountId: input.accountId, locationId: location.locationId, outcome: "OK" });
  return { ok: true, location };
}

export function patchAskReviewLocation(input: {
  accountId: string;
  locationId: string;
  name?: string;
  status?: "ACTIVE" | "ARCHIVED";
}): AskReviewLocation | null {
  const store = getAskReviewStore();
  const location = store.locations.find((row) => row.locationId === input.locationId && row.accountId === input.accountId);
  if (!location) return null;
  if (input.name) location.name = input.name.trim();
  if (input.status) location.status = input.status;
  location.updatedAt = new Date().toISOString();
  saveAskReviewStore(store);
  emitAskReviewEvent({
    type: input.status === "ARCHIVED" ? "location_archived" : input.status === "ACTIVE" ? "location_restored" : "location_renamed",
    accountId: input.accountId,
    locationId: location.locationId,
    outcome: "OK",
  });
  return location;
}

export function getAskReviewLocation(accountId: string, locationId: string): AskReviewLocation | null {
  return getAskReviewStore().locations.find((row) => row.locationId === locationId && row.accountId === accountId) ?? null;
}

export function listKitsForLocation(accountId: string, locationId: string): AskReviewKit[] {
  return getAskReviewStore().kits
    .filter((row) => row.accountId === accountId && row.locationId === locationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Latest kit is the primary result. Regeneration is deterministic from the
 * current Place ID / supported review destination. Prior kits stay discoverable
 * up to ASKREVIEW_KIT_HISTORY_LIMIT so history is not invisible.
 */
export function createAskReviewKit(input: {
  accountId: string;
  locationId: string;
}): { ok: true; kit: AskReviewKit } | { ok: false; reason: "NOT_FOUND" | AskReviewLocationInputError } {
  const location = getAskReviewLocation(input.accountId, input.locationId);
  if (!location || location.status === "ARCHIVED") return { ok: false, reason: "NOT_FOUND" };
  const generated = generateReviewKit({
    businessName: location.name,
    placeId: location.placeId,
    mapsUrl: location.mapsUrl,
  });
  if (!generated.ok) return generated;
  const kit: AskReviewKit = {
    kitId: `kit_${randomBytes(8).toString("hex")}`,
    locationId: location.locationId,
    accountId: input.accountId,
    reviewUrl: generated.reviewUrl,
    requestCopy: generated.requestCopy,
    copyVariants: generated.copyVariants,
    qrSvg: generated.qrSvg,
    createdAt: new Date().toISOString(),
  };
  const store = getAskReviewStore();
  const prior = store.kits
    .filter((row) => row.locationId === location.locationId && row.accountId === input.accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, ASKREVIEW_KIT_HISTORY_LIMIT - 1);
  store.kits = store.kits.filter((row) => !(row.locationId === location.locationId && row.accountId === input.accountId));
  store.kits.push(...prior, kit);
  location.reviewUrl = kit.reviewUrl;
  location.updatedAt = kit.createdAt;
  saveAskReviewStore(store);
  emitAskReviewEvent({ type: "kit_generated", accountId: input.accountId, locationId: location.locationId, outcome: "OK" });
  return { ok: true, kit };
}
