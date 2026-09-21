import { NextResponse } from "next/server";
import { executeAutonomousReplyContinuationZeroWriteAudit } from "@/lib/infinity/inbound-communication-runtime";

export const dynamic = "force-dynamic";

function allowLocalDev(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!allowLocalDev(request)) {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }
  const result = await executeAutonomousReplyContinuationZeroWriteAudit();
  return NextResponse.json({ write: false, result }, { status: 200 });
}
