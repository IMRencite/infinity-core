import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOccupancynpvGrowthRuntimeCycle } from "@/lib/infinity/growth-engine/runtime-cycle";
import { executePostLaunchOperatingCycle } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { executeAutonomousDailyOperatingLoop } from "@/lib/infinity/autonomous-operating-loop/loop";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cycle = executeOccupancynpvGrowthRuntimeCycle({ persist: true });
  const postLaunch = executePostLaunchOperatingCycle({ persist: true });
  const loop = executeAutonomousDailyOperatingLoop({ persist: true, createMission: true });
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "0 12 * * *",
    cycleId: cycle.cycleId,
    outcome: loop.decision.outcome,
    nextRunAt: loop.state.next_daily_review_at ?? cycle.nextRunAt,
    improvementMissionCreated: false,
    postLaunchOutcome: postLaunch.daily.snapshot.dailyResult,
    autonomousLoop: {
      state: loop.portfolio_state,
      decision: loop.decision.outcome,
      reason: loop.decision.reason,
      dailyReview: loop.daily_review_ran,
      missionCreated: loop.mission_created,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
