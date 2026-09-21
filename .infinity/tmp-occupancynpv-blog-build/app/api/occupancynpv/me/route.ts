import { NextResponse } from "next/server";
import { durableMe } from "../../../../lib/occupancynpv/durable";
export async function GET() {
  try {
    const me = await durableMe();
    if (!me.ok) return NextResponse.json(me, { status: 401 });
    return NextResponse.json(me);
  } catch {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }
}
