import { NextResponse } from "next/server";
import { durablePersistOfferEvent } from "../../../../lib/occupancynpv/durable";

const EVENTS = [
  "offer_view", "offer_cta_click", "offer_start", "offer_activation", "meaningful_use",
  "checkout_start", "paid_conversion", "cancel", "refund", "offer_limit_hit", "upgrade_prompt", "upgrade_conversion",
];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { event?: string; offer_id?: string; source?: string };
  if (!EVENTS.includes(String(body.event ?? ""))) {
    return NextResponse.json({ ok: false, reason: "UNKNOWN_OFFER_EVENT" }, { status: 400 });
  }
  const persisted = await durablePersistOfferEvent({
    event: String(body.event),
    offer_id: String(body.offer_id ?? "offer:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:paid-first-rendered-v2"),
    source: body.source ?? "pricing",
  });
  const runtime = process.env.INFINITY_OFFER_EVENTS_URL || process.env.INFINITY_IMPROVEMENT_INTAKE_URL;
  if (runtime) {
    try {
      await fetch(runtime.replace(/\/$/, "") + "/api/occupancynpv/offer-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // live measurement still persisted locally
    }
  }
  return NextResponse.json({ ok: persisted.ok, event: body.event });
}
