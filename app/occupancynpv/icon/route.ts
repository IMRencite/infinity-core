import { NextResponse } from "next/server";
import { occupancynpvPng } from "@/lib/infinity/venture-operating-scale/occupancynpv-favicon";

export const runtime = "nodejs";

const BODY = Uint8Array.from(occupancynpvPng(32));

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(BODY.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
