import { NextResponse } from "next/server";
import { durableMe, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";
import { listCustomerWorkspaces, workspaceCollectionCounts } from "@/lib/infinity/occupancynpv-product/workspaces";

export async function GET() {
  const session = await readOccupancynpvSession();
  if (!session) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  if (occupancynpvProductionPersistenceEnabled()) {
    return NextResponse.json(await durableMe(session));
  }
  const store = getOccupancynpvProductStore();
  const entitlements = [...store.fulfillment.entitlements.values()].filter((row) => row.customer_identity_id === session.customer_id);
  return NextResponse.json({
    ok: true,
    customer: session,
    entitlements: entitlements.map((row) => ({
      offer: row.offer_id,
      status: row.status,
      quantityRemaining: row.quantity_remaining,
      expiresAt: row.expires_at,
    })),
    workspaceCounts: workspaceCollectionCounts(store, session),
    workspaces: listCustomerWorkspaces(store, session).map((row) => ({ id: row.workspace_id, name: row.name, status: row.status })),
    support: "infinitemediaresources@gmail.com",
  });
}
