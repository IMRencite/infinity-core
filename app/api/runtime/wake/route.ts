import { NextResponse } from "next/server";
import {
  authorizeCloudRuntimeWake,
  createProductionCloudRuntimeStore,
  executeCloudRuntimeWake,
  verifyCloudRuntimeEventSignature,
  type CloudRuntimeEventType,
} from "@/lib/infinity/cloud-runtime";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = authorizeCloudRuntimeWake(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as {
    source?: "EVENT" | "MANUAL" | "RETRY";
    event_id?: string;
    type?: CloudRuntimeEventType;
    reason?: string;
    fixture?: boolean;
    production?: boolean;
  };
  if (body.source === "EVENT") {
    const signed = verifyCloudRuntimeEventSignature(request);
    if (!signed.ok) {
      return NextResponse.json({ error: "Unauthorized", reason: signed.reason }, { status: 401 });
    }
  }
  if (body.production === true) {
    return NextResponse.json({ ok: false, reason: "PRODUCTION_EVENT_REJECTED_IN_QC" }, { status: 400 });
  }
  const cloud = await executeCloudRuntimeWake({
    source: body.source === "MANUAL" ? "MANUAL" : body.source === "RETRY" ? "RETRY" : "EVENT",
    store: createProductionCloudRuntimeStore(),
    createMission: false,
    event: body.event_id && body.type
      ? {
          event_id: body.event_id,
          type: body.type,
          at: new Date().toISOString(),
          venture_id: null,
          reason: body.reason ?? "wake",
          fixture: body.fixture !== false,
        }
      : undefined,
  });
  return NextResponse.json({
    ok: true,
    deferred: cloud.deferred,
    duplicate: cloud.duplicate,
    decision: cloud.decision,
    cloudRuntime: cloud.hq,
    sales_outreach_sent: false,
    affiliate_outreach_sent: false,
    payout_executed: false,
  });
}
