import { NextResponse } from "next/server";
import {
  currentSecondQcHold,
  evaluateHoldActionabilityCheck,
  EXIT_CONDITION_FROZEN_AT,
  exitConditionHash,
  FOUNDER_VISUAL_QUESTION,
  persistDurableHold,
} from "@/lib/infinity/organic-growth-engine/blog-os/durable/hold";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const hold = persistDurableHold(currentSecondQcHold());
  return NextResponse.json({
    hold,
    HoldActionabilityCheck: evaluateHoldActionabilityCheck(hold),
    execute_publish: false,
    founder_review: "NOT_ACTIONABLE_ENGINEERING_BLOCKED",
    human_clock: "NOT_STARTED",
    evidence_complete: false,
    exit_condition_hash: exitConditionHash(),
    exit_condition_frozen_at: EXIT_CONDITION_FROZEN_AT(),
    exact_question: FOUNDER_VISUAL_QUESTION,
  });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    ok: false,
    reason: "LOCALHOST_HQ_SESSION_IS_NOT_INDEPENDENT_FOUNDER_FACTOR",
    execute_publish: false,
  }, { status: 403 });
}
