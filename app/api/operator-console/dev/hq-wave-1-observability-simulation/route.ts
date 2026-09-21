import { NextResponse } from "next/server";
import {
  CRE_WAVE_1_BOUNDED_SEND_MISSION,
  CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
  CRE_WAVE_1_OBSERVABILITY_SIMULATION_PHASE_MS,
  runCreWave1HqObservabilitySimulation,
} from "@/lib/infinity/market-validation-experiment/cre-wave-1-bounded-send-mission";

export const dynamic = "force-dynamic";

let simulationInFlight: Promise<unknown> | null = null;

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
  const alreadyRunning = Boolean(simulationInFlight);
  if (!simulationInFlight) {
    simulationInFlight = runCreWave1HqObservabilitySimulation().finally(() => {
      simulationInFlight = null;
    });
  }
  return NextResponse.json(
    {
      accepted: true,
      alreadyRunning,
      mission: CRE_WAVE_1_BOUNDED_SEND_MISSION,
      missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
      simulation: true,
      providerWrites: 0,
      prospectEmails: 0,
      verificationEmails: 0,
      expectedRuntimeMs: CRE_WAVE_1_OBSERVABILITY_SIMULATION_PHASE_MS * 7,
    },
    { status: 202 },
  );
}
