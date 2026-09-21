import { NextResponse } from "next/server";
import { durableSignin } from "../../../../../lib/occupancynpv/durable";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const signed = await durableSignin(body.email ?? "", body.password ?? "");
  if (!signed.ok) return NextResponse.json(signed, { status: 401 });
  return NextResponse.json(signed);
}
