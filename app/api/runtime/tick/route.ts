import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOccupancynpvGrowthRuntimeCycle } from "@/lib/infinity/growth-engine/runtime-cycle";
import { executeAutonomousDailyOperatingLoop } from "@/lib/infinity/autonomous-operating-loop/loop";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cycle = executeOccupancynpvGrowthRuntimeCycle({ persist: true });
  const loop = executeAutonomousDailyOperatingLoop({ persist: true, createMission: true });
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "0 * * * *",
    cycleId: cycle.cycleId,
    outcome: cycle.experimentStatus,
    nextRunAt: loop.state.next_run_at ?? cycle.nextRunAt,
    sent: cycle.sent,
    autonomousLoop: {
      state: loop.portfolio_state,
      decision: loop.decision.outcome,
      reason: loop.decision.reason,
      missionCreated: loop.mission_created,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
