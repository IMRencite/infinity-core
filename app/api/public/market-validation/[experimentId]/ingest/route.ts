import { NextResponse } from "next/server";
import {
  corsOriginAllowed,
  handlePublicValidationIngest,
  PUBLIC_INGEST_MAX_BYTES,
} from "@/lib/infinity/market-validation-experiment/ingest";

type RouteContext = { params: Promise<{ experimentId: string }> };

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !corsOriginAllowed(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: corsOriginAllowed(origin) ? 204 : 403, headers: corsHeaders(origin) });
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const { experimentId } = await context.params;
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders(origin) });
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const clientKey = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || origin || "anonymous";
  const result = handlePublicValidationIngest({
    experimentId,
    body,
    byteLength: Buffer.byteLength(raw, "utf8"),
    clientKey,
  });
  if (raw.length > PUBLIC_INGEST_MAX_BYTES && result.status !== 413) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers: corsHeaders(origin) });
  }
  if (result.ok && (result.accepted ?? 0) > 0) {
    const { mayTriggerIngestAcquisitionReevaluation } = await import(
      "@/lib/infinity/market-validation-acquisition-runtime/ingest-guard"
    );
    const gate = mayTriggerIngestAcquisitionReevaluation({ clientKey });
    if (gate.allowed) {
      const { runAutonomousAcquisitionTick, acquisitionTriggerFromIngest } = await import(
        "@/lib/infinity/market-validation-acquisition-runtime/tick"
      );
      const eventType =
        body && typeof body === "object" && "eventType" in body
          ? String((body as { eventType?: string }).eventType)
          : "QUALIFIED_PILOT_APPLICATION";
      const trigger = acquisitionTriggerFromIngest(eventType) ?? "REAL_SUBMISSION_RECEIVED";
      void runAutonomousAcquisitionTick({
        trigger,
        liveDiscovery: false,
        lockedBy: "public-validation-ingest",
      }).catch(() => undefined);
    }
  }
  return NextResponse.json(
    result.ok ? { accepted: result.accepted, duplicates: result.duplicates } : { error: result.error },
    { status: result.status, headers: corsHeaders(origin) },
  );
}
