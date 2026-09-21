import { NextResponse } from "next/server";
import { durablePersistImprovementIntake } from "../../../../lib/occupancynpv/durable";
const ACK = "Thanks — your suggestion has been received and will be evaluated as product feedback.";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    source?: string;
    submission_id?: string;
    goal_or_context?: string | null;
    page_url_or_route?: string | null;
    workflow_context?: string | null;
    contact_email?: string | null;
    synthetic?: boolean;
  };
  if (!String(body.message ?? "").trim()) return NextResponse.json({ ok: false, reason: "MESSAGE_REQUIRED" }, { status: 400 });
  if (body.synthetic === true && req.headers.get("x-infinity-qc-force-intake-failure") === "1") {
    return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
  }
  const persisted = await durablePersistImprovementIntake(body);
  const runtime = process.env.INFINITY_IMPROVEMENT_INTAKE_URL;
  if (runtime) {
    try {
      const forwarded = await fetch(runtime.replace(/\/$/, "") + "/api/occupancynpv/improvement-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await forwarded.json().catch(() => ({})) as { ok?: boolean; acknowledgement?: string; source?: string };
      if (forwarded.ok && json.ok) {
        return NextResponse.json({
          ok: true,
          acknowledgement: typeof json.acknowledgement === "string" ? json.acknowledgement : ACK,
          source: json.source ?? body.source ?? "PUBLIC_SITE_FEEDBACK",
        }, { status: forwarded.status });
      }
      if (!persisted.ok) return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
    } catch {
      if (!persisted.ok) return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
    }
  } else if (!persisted.ok) {
    return NextResponse.json({ ok: false, reason: "CANONICAL_INTAKE_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    acknowledgement: ACK,
    source: body.source ?? "PUBLIC_SITE_FEEDBACK",
  });
}
