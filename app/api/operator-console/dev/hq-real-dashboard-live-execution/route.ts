import { NextResponse } from "next/server";
import {
  HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION,
  HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID,
  runHqRealDashboardLiveExecutionProof,
} from "@/lib/infinity/mission-activity";

export const dynamic = "force-dynamic";

let proofInFlight: Promise<unknown> | null = null;

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
  const alreadyRunning = Boolean(proofInFlight);
  if (!proofInFlight) {
    proofInFlight = runHqRealDashboardLiveExecutionProof().finally(() => {
      proofInFlight = null;
    });
  }
  return NextResponse.json(
    {
      accepted: true,
      alreadyRunning,
      mission: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION,
      missionId: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID,
      providerWrites: 0,
    },
    { status: 202 },
  );
}
