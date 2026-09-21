import { NextResponse } from "next/server";
import { authorizeCoverageScan, runProductionCoverageScan } from "@/lib/infinity/production-outbound/obligation/coverage-scan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeCoverageScan(request);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized", reason: auth.reason, invoked_by: "SMOKE" }, { status: 401 });
  const url = new URL(request.url);
  const windowStart = url.searchParams.get("window_start") || "2026-09-20T23:35:31.322Z";
  const windowEnd = url.searchParams.get("window_end") || new Date().toISOString();
  const scan = await runProductionCoverageScan({ window_start: windowStart, window_end: windowEnd });
  return NextResponse.json({
    ...scan,
    business_send: false,
    send_capability: false,
  });
}
