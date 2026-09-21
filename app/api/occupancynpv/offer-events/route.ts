import { NextResponse } from "next/server";
import { recordOccupancyNpvOfferEvent, OCCUPANCYNPV_OFFER_EVENT_NAMES } from "@/lib/infinity/offer-architecture/occupancynpv-live-activation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { event?: string; offer_id?: string; source?: string };
  if (!OCCUPANCYNPV_OFFER_EVENT_NAMES.includes(body.event as (typeof OCCUPANCYNPV_OFFER_EVENT_NAMES)[number])) {
    return NextResponse.json({ ok: false, reason: "UNKNOWN_OFFER_EVENT" }, { status: 400 });
  }
  const recorded = recordOccupancyNpvOfferEvent({
    event: body.event as (typeof OCCUPANCYNPV_OFFER_EVENT_NAMES)[number],
    offer_id: String(body.offer_id ?? ""),
    at: new Date().toISOString(),
    source: body.source,
  });
  return NextResponse.json({ ok: true, event: recorded.event });
}
