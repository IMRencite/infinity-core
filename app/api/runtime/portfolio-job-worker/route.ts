import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import {
  autonomousPortfolioJobWorkerQc,
  runPortfolioJobWorker,
} from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-job-worker-v1";

export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const url = new URL(request.url);
  const cycle_id = url.searchParams.get("cycle_id") ?? undefined;
  try {
    const result = await runPortfolioJobWorker({ cycle_id });
    return NextResponse.json(
      {
        AUTONOMOUS_PORTFOLIO_JOB_WORKER_V1: "AUTONOMOUS_PORTFOLIO_JOB_WORKER_V1",
        AUTONOMOUS_PORTFOLIO_JOB_WORKER_QC: autonomousPortfolioJobWorkerQc(),
        ...result,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "PORTFOLIO_JOB_WORKER_FAILED", root_cause: message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return POST(request);
}
