import { NextResponse } from "next/server";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { readOccupancynpvSession } from "@/lib/infinity/occupancynpv-product/session";
import { submitVentureImprovementIntake } from "@/lib/infinity/venture-improvement-intake/submit";
import type { IntakeSource } from "@/lib/infinity/venture-improvement-intake/types";
import { INTAKE_SOURCES } from "@/lib/infinity/venture-improvement-intake/types";

function asSource(value: unknown): IntakeSource {
  return INTAKE_SOURCES.includes(value as IntakeSource) ? value as IntakeSource : "OTHER_CANONICAL_CHANNEL";
}

export async function POST(req: Request, context: { params: Promise<{ ventureId: string }> }) {
  const { ventureId } = await context.params;
  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }
  const id = decodeURIComponent(ventureId);
  let authenticated: { customer_id: string; email: string } | null = null;
  if (id === CRE_VENTURE_ID) {
    const session = await readOccupancynpvSession().catch(() => null);
    if (session) authenticated = { customer_id: session.customer_id, email: session.email };
  }
  const result = submitVentureImprovementIntake({
    venture_id: id,
    submission_id: String(body.submission_id ?? ""),
    source: asSource(body.source),
    message: String(body.message ?? ""),
    goal_or_context: typeof body.goal_or_context === "string" ? body.goal_or_context : null,
    page_url_or_route: typeof body.page_url_or_route === "string" ? body.page_url_or_route : null,
    workflow_context: typeof body.workflow_context === "string" ? body.workflow_context : null,
    product_area: typeof body.product_area === "string" ? body.product_area : null,
    contact_email: typeof body.contact_email === "string" ? body.contact_email : null,
    customer_ref: authenticated?.customer_id ?? null,
    authenticated,
    client_key: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "local",
    byte_length: new TextEncoder().encode(raw).length,
    extra_fields: body,
  });
  return NextResponse.json({
    ok: result.ok,
    reason: result.reason,
    acknowledgement: result.acknowledgement,
    source: result.intake?.source ?? null,
    authenticated_state: result.intake?.authenticated_state ?? null,
    workflow_context: result.intake?.workflow_context ?? null,
    page_url_or_route: result.intake?.page_url_or_route ?? null,
  }, { status: result.status });
}
