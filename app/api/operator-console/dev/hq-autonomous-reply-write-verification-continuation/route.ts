import { NextResponse } from "next/server";
import {
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
  executeAutonomousReplyWriteVerificationContinuationMission,
} from "@/lib/infinity/inbound-communication-runtime";

export const dynamic = "force-dynamic";

const PHASE_MS = 3000;

let missionInFlight: Promise<unknown> | null = null;
let lastResult: unknown = null;

function allowLocalDev(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!allowLocalDev(request)) {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }
  const alreadyRunning = Boolean(missionInFlight);
  if (!missionInFlight) {
    missionInFlight = executeAutonomousReplyWriteVerificationContinuationMission({ phaseMs: PHASE_MS })
      .then((result) => {
        lastResult = result;
        return result;
      })
      .finally(() => {
        missionInFlight = null;
      });
  }
  return NextResponse.json(
    {
      accepted: true,
      alreadyRunning,
      mission: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
      missionId: AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID,
      simulation: false,
      source: "autonomous_email_reply_write_verification_continuation_v1",
      expectedRuntimeMs: PHASE_MS * 8,
    },
    { status: 202 },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!allowLocalDev(request)) {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }
  if (missionInFlight) {
    const result = await missionInFlight;
    return NextResponse.json({ running: false, result }, { status: 200 });
  }
  return NextResponse.json({ running: false, result: lastResult }, { status: 200 });
}
