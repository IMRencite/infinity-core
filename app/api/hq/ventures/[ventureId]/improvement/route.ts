import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { hqPrivateApiDecision } from "@/lib/infinity/hq-production-deployment/private-api";
import { askInfinityToReviewVenture, submitVentureImprovementSuggestion } from "@/lib/infinity/venture-operating-scale/improvement";
import { projectVentureImprovementHq } from "@/lib/infinity/product-improvement-loop/hq";
import { projectVentureCustomerSuggestions } from "@/lib/infinity/product-improvement-loop/suggestions";
import { hydrateProductImprovementLoop } from "@/lib/infinity/product-improvement-loop/store";
import { hydrateCanonicalImprovementIntakeFromOutbox } from "@/lib/infinity/venture-improvement-intake/durable-outbox";

function deny(decision: { status: number; body: { ok: false; reason: string } }) {
  return NextResponse.json(decision.body, {
    status: decision.status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ ventureId: string }> }) {
  const decision = hqPrivateApiDecision(await getOperatorOrgContext());
  if (!decision.ok) return deny(decision);
  const { ventureId } = await context.params;
  hydrateProductImprovementLoop();
  await hydrateCanonicalImprovementIntakeFromOutbox();
  const id = decodeURIComponent(ventureId);
  return NextResponse.json({
    ok: true,
    view: projectVentureImprovementHq(id),
    suggestions: projectVentureCustomerSuggestions(id),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request, context: { params: Promise<{ ventureId: string }> }) {
  const decision = hqPrivateApiDecision(await getOperatorOrgContext());
  if (!decision.ok) return deny(decision);
  const { ventureId } = await context.params;
  const body = await req.json().catch(() => ({})) as { kind?: string; text?: string };
  const id = decodeURIComponent(ventureId);
  if (body.kind === "review") {
    return NextResponse.json({ ok: true, proposal: askInfinityToReviewVenture(id) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "EMPTY_SUGGESTION" }, { status: 400 });
  return NextResponse.json({ ok: true, suggestion: submitVentureImprovementSuggestion({ ventureId: id, text }) }, { headers: { "Cache-Control": "private, no-store" } });
}
