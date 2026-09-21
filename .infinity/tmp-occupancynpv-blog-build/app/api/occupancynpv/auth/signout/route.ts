import { NextResponse } from "next/server";
import { durableSignout } from "../../../../../lib/occupancynpv/durable";
export async function POST() {
  await durableSignout();
  return NextResponse.json({ ok: true });
}
