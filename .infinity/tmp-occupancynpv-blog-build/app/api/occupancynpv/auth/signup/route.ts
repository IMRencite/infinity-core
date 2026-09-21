import { NextResponse } from "next/server";
import { durableSignup } from "../../../../../lib/occupancynpv/durable";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const created = await durableSignup(body.email ?? "", body.password ?? "");
  if (!created.ok) return NextResponse.json(created, { status: 400 });
  return NextResponse.json(created);
}
