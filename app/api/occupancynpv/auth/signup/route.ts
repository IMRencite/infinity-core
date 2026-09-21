import { NextResponse } from "next/server";
import { createOccupancynpvAccount } from "@/lib/infinity/occupancynpv-product/customers";
import { durableSignup, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { writeOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  if (occupancynpvProductionPersistenceEnabled()) {
    const created = await durableSignup({ email: body.email ?? "", password: body.password ?? "" });
    if (!created.ok) return NextResponse.json({ ok: false, reason: created.reason }, { status: 400 });
    return NextResponse.json({ ok: true, customerId: created.customer.customer_id });
  }
  const created = createOccupancynpvAccount({
    store: getOccupancynpvProductStore(),
    email: body.email ?? "",
    password: body.password ?? "",
    now: new Date().toISOString(),
  });
  if (!created.ok) return NextResponse.json({ ok: false, reason: created.reason }, { status: 400 });
  await writeOccupancynpvSession(created.session.auth_identity_id);
  return NextResponse.json({ ok: true, customerId: created.customer.customer_id });
}
