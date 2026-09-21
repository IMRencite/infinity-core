import { NextResponse } from "next/server";
import { signOutOccupancynpv } from "@/lib/infinity/occupancynpv-product/customers";
import { durableSignout, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { clearOccupancynpvSession, readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";

export async function POST() {
  if (occupancynpvProductionPersistenceEnabled()) {
    await durableSignout();
    return NextResponse.json({ ok: true });
  }
  const session = await readOccupancynpvSession();
  if (session) signOutOccupancynpv(getOccupancynpvProductStore(), session.auth_identity_id);
  await clearOccupancynpvSession();
  return NextResponse.json({ ok: true });
}
