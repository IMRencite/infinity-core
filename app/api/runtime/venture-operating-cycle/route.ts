import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { executeOccupancynpvGrowthRuntimeCycleDurable } from "@/lib/infinity/growth-engine/runtime-cycle";
import { executePostLaunchOperatingCycle } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { createProductionCloudRuntimeStore, executeCloudRuntimeWake } from "@/lib/infinity/cloud-runtime";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const cycle = await executeOccupancynpvGrowthRuntimeCycleDurable({ persist: true });
  const postLaunch = executePostLaunchOperatingCycle({ persist: true });
  const cloud = await executeCloudRuntimeWake({
    source: "CRON_DAILY",
    store: createProductionCloudRuntimeStore(),
    createMission: false,
  });
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "0 12 * * *",
    cycleId: cycle.cycleId,
    outcome: cloud.decision,
    nextRunAt: cloud.state.heartbeat.next_review_at ?? cycle.nextRunAt,
    improvementMissionCreated: false,
    postLaunchOutcome: postLaunch.daily.snapshot.dailyResult,
    autonomousLoop: {
      state: cloud.state.loop.portfolio_state,
      decision: cloud.decision,
      reason: cloud.state.heartbeat.last_meaningful_action,
      dailyReview: Boolean(cloud.state.loop.last_daily_review_at),
      missionCreated: cloud.mission_created,
    },
    cloudRuntime: cloud.hq,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
