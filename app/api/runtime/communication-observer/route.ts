import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { hydrateCommunicationHeartbeats } from "@/lib/infinity/production-outbound/obligation/heartbeat";
import { hydrateCommunicationReleaseState } from "@/lib/infinity/production-outbound/obligation/release";
import { hydrateCommunicationObligationStore } from "@/lib/infinity/production-outbound/obligation/persist";
import {
  evaluateExternalCommunicationObserver,
  persistExternalObserverSnapshot,
} from "@/lib/infinity/production-outbound/obligation/observer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const now = new Date().toISOString();
  await hydrateCommunicationHeartbeats().catch(() => undefined);
  await hydrateCommunicationReleaseState().catch(() => undefined);
  await hydrateCommunicationObligationStore().catch(() => undefined);
  const snapshot = evaluateExternalCommunicationObserver({ now });
  await persistExternalObserverSnapshot(snapshot, now).catch(() => undefined);
  return NextResponse.json({
    observer: "infinity-hq",
    worker: "infinity-runtime",
    snapshot,
    now,
  });
}
