import { NextResponse } from "next/server";
import {
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_MISSION_ID,
  CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
} from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-outcome-observation";
import { executeCreContextRichChallengerOutcomeObservationMission } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-outcome-observation-mission";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  try {
    if (!missionInFlight) {
      missionInFlight = executeCreContextRichChallengerOutcomeObservationMission().finally(() => {
        missionInFlight = null;
      });
    }
    const result = await missionInFlight;
    return NextResponse.json({
      accepted: true,
      mission: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
      missionId: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_MISSION_ID,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        accepted: false,
        mission: CRE_CONTEXT_RICH_CHALLENGER_OUTCOME_OBSERVATION_V1,
        error: error instanceof Error ? error.message : "OBSERVATION_FAILED",
      },
      { status: 500 },
    );
  }
}
