import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { durableFulfillStripeEvent } from "../../../../lib/occupancynpv/durable";

const ALLOWED = new Set(["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted", "payment_intent.payment_failed"]);

function verify(secret: string, signature: string, rawBody: string) {
  if (!secret || !signature || !rawBody) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...rest] = part.split("=");
    return [key?.trim() ?? "", rest.join("=")];
  }));
  const timestamp = Number(parts.t);
  const expected = parts.v1;
  if (!Number.isFinite(timestamp) || !expected) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const actual = Buffer.from(digest);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function GET() {
  return NextResponse.json({ ready: true, createCustomerState: false });
}

export async function POST(req: Request) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();
  if (!verify(secret, signature, rawBody)) {
    return NextResponse.json({ ok: false, reason: "INVALID_SIGNATURE" }, { status: 400 });
  }
  let parsed: { id?: string; type?: string; data?: { object?: Record<string, unknown> } } = {};
  try { parsed = JSON.parse(rawBody) as typeof parsed; } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }
  if (!parsed.id || !parsed.type || !ALLOWED.has(parsed.type)) {
    return NextResponse.json({ ok: false, reason: "UNSUBSCRIBED_OR_INVALID" }, { status: 400 });
  }
  const fulfilled = await durableFulfillStripeEvent({ eventId: parsed.id, type: parsed.type, object: parsed.data?.object ?? {} });
  return NextResponse.json(fulfilled);
}
