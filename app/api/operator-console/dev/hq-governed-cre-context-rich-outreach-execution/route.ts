import { NextResponse } from "next/server";
import {
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_MISSION_ID,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
} from "@/lib/infinity/market-validation-experiment/governed-cre-context-rich-outreach-execution";
import { executeGovernedCreContextRichOutreachExecutionMission } from "@/lib/infinity/market-validation-experiment/governed-cre-context-rich-outreach-execution-mission";

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
      missionInFlight = executeGovernedCreContextRichOutreachExecutionMission({
        hydrateCapability: true,
        sendAuthorized: true,
        providerWrite: true,
      }).finally(() => {
        missionInFlight = null;
      });
    }
    const result = await missionInFlight;
    return NextResponse.json({
      accepted: true,
      mission: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
      missionId: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_MISSION_ID,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        accepted: false,
        mission: GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
        error: error instanceof Error ? error.message : "EXECUTION_FAILED",
      },
      { status: 500 },
    );
  }
}
