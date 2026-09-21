import { NextResponse } from "next/server";
import { signInOccupancynpv } from "@/lib/infinity/occupancynpv-product/customers";
import { durableSignin, occupancynpvProductionPersistenceEnabled } from "@/lib/infinity/occupancynpv-product/durable";
import { getOccupancynpvProductStore } from "@/lib/infinity/occupancynpv-product/persist";
import { writeOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  if (occupancynpvProductionPersistenceEnabled()) {
    const signed = await durableSignin({ email: body.email ?? "", password: body.password ?? "" });
    if (!signed.ok) return NextResponse.json({ ok: false, reason: signed.reason }, { status: 401 });
    return NextResponse.json({ ok: true, customerId: signed.session.customer_id });
  }
  const signed = signInOccupancynpv({
    store: getOccupancynpvProductStore(),
    email: body.email ?? "",
    password: body.password ?? "",
  });
  if (!signed.ok) return NextResponse.json({ ok: false, reason: signed.reason }, { status: 401 });
  await writeOccupancynpvSession(signed.session.auth_identity_id);
  return NextResponse.json({ ok: true, customerId: signed.session.customer_id });
}
