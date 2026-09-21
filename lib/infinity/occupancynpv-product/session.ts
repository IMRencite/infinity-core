import { cookies } from "next/headers";
import { resolveOccupancynpvSession } from "./customers";
import { durableSession } from "./durable";
import { occupancynpvProductionPersistenceEnabled } from "./durable";
import { getOccupancynpvProductStore } from "./persist";
import type { OccupancynpvAuthSession } from "./types";

export const OCCUPANCYNPV_SESSION_COOKIE = "occupancynpv_customer_session";

export async function readOccupancynpvSession(): Promise<OccupancynpvAuthSession | null> {
  if (occupancynpvProductionPersistenceEnabled()) return durableSession();
  const jar = await cookies();
  return resolveOccupancynpvSession(getOccupancynpvProductStore(), jar.get(OCCUPANCYNPV_SESSION_COOKIE)?.value ?? null);
}

export async function writeOccupancynpvSession(authIdentityId: string): Promise<void> {
  if (occupancynpvProductionPersistenceEnabled()) return;
  const jar = await cookies();
  jar.set(OCCUPANCYNPV_SESSION_COOKIE, authIdentityId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function clearOccupancynpvSession(): Promise<void> {
  if (occupancynpvProductionPersistenceEnabled()) return;
  const jar = await cookies();
  jar.delete(OCCUPANCYNPV_SESSION_COOKIE);
}
