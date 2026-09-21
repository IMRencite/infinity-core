import { NextResponse } from "next/server";
import {
  CRE_WAVE_1_V3_MISSION,
  CRE_WAVE_1_V3_MISSION_ID,
  executeCreWave1V3CanonicalSendMission,
} from "@/lib/infinity/market-validation-experiment/cre-wave-1-bounded-send-mission";

export const dynamic = "force-dynamic";

const PHASE_MS = 10000;

let missionInFlight: Promise<unknown> | null = null;

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
    missionInFlight = executeCreWave1V3CanonicalSendMission({ phaseMs: PHASE_MS }).finally(() => {
      missionInFlight = null;
    });
  }
  return NextResponse.json(
    {
      accepted: true,
      alreadyRunning,
      mission: CRE_WAVE_1_V3_MISSION,
      missionId: CRE_WAVE_1_V3_MISSION_ID,
      simulation: false,
      source: "cre_wave_1_canonical_send_v3",
      expectedRuntimeMs: PHASE_MS * 7,
    },
    { status: 202 },
  );
}
