import { createHash, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { FulfillmentStore } from "@/lib/infinity/fulfillment";
import { createFulfillmentStore } from "@/lib/infinity/fulfillment";
import type { OccupancynpvEntitlementOverlay } from "./policy";
import type { DealWorkspace, OccupancynpvAuthSession, OccupancynpvCustomer, StoredLeaseScenario } from "./types";

export type OccupancynpvAuthRecord = {
  auth_identity_id: string;
  email: string;
  password_hash: string;
};

export type OccupancynpvProductStore = {
  customers: Map<string, OccupancynpvCustomer>;
  auth: Map<string, OccupancynpvAuthRecord>;
  sessions: Map<string, OccupancynpvAuthSession>;
  workspaces: Map<string, DealWorkspace>;
  scenarios: Map<string, StoredLeaseScenario>;
  billing: Map<string, OccupancynpvEntitlementOverlay>;
  fulfillment: FulfillmentStore;
};

export function createOccupancynpvProductStore(): OccupancynpvProductStore {
  return {
    customers: new Map(),
    auth: new Map(),
    sessions: new Map(),
    workspaces: new Map(),
    scenarios: new Map(),
    billing: new Map(),
    fulfillment: createFulfillmentStore(),
  };
}

export function hashPassword(password: string, salt = "occupancynpv_v1"): string {
  return scryptSync(password, salt, 32).toString("hex");
}

export function passwordsMatch(password: string, hash: string): boolean {
  const actual = Buffer.from(hashPassword(password));
  const wanted = Buffer.from(hash);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function newId(prefix: string): string {
  return `${prefix}_${createHash("sha256").update(randomUUID()).digest("hex").slice(0, 16)}`;
}

export function nowIso(now?: string): string {
  return now ?? "2026-09-07T00:00:00.000Z";
}
