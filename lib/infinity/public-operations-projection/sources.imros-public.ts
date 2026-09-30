/**
 * IMROS public deploy surface: no HQ venture-operating-scale or canonical-work imports.
 */
import { existsSync, readFileSync } from "node:fs";
import {
  listCanonicalPublicVentureFeedObservations,
  resolvePublicVentureCreatedAt,
} from "./canonical-public-venture-feed";
import { ensureAllowlistedPublicVentures } from "./visibility";
import type {
  InternalLoopObservation,
  InternalPublicObservation,
  InternalVentureObservation,
  InternalWorkObservation,
} from "./types";

function readJsonFile(path: string): unknown | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function isFixtureVenture(id: string, name: string): boolean {
  return /test|fixture|debug|synthetic/i.test(id) || /test|fixture|debug|synthetic/i.test(name);
}

function readVentureObservations(): InternalVentureObservation[] {
  const fromFeed = listCanonicalPublicVentureFeedObservations();
  return ensureAllowlistedPublicVentures(fromFeed.filter((row) => !isFixtureVenture(row.private_venture_id, row.private_name)));
}

function readWorkObservations(): InternalWorkObservation[] {
  return [];
}

function readLoopObservation(now: string): InternalLoopObservation | null {
  return {
    portfolio_state: "IDLE_NO_ACTION",
    last_outcome: "CONTINUE_EXISTING_ACTION",
    last_reason: "Public operations are updating",
    last_completed_mission_id: null,
    updated_at: now,
    autonomous_enabled_at: null,
  };
}

export function loadInternalPublicObservation(input?: {
  now?: string;
  observation?: InternalPublicObservation;
}): InternalPublicObservation {
  if (input?.observation) return input.observation;
  const now = input?.now ?? new Date().toISOString();
  return {
    now,
    ventures: readVentureObservations(),
    work: readWorkObservations(),
    loop: readLoopObservation(now),
  };
}

export function observeVentureRecord(): InternalVentureObservation {
  throw new Error("observeVentureRecord is unavailable on the IMROS public surface");
}

void readJsonFile;
void resolvePublicVentureCreatedAt;
