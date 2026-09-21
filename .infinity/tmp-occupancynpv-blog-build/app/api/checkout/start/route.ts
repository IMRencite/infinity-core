import { NextResponse } from "next/server";
import { durableUser } from "../../../../lib/occupancynpv/durable";

const ACCOUNT = "acct_18h5CjLdvXKx7R7G";
const SUCCESS = "https://occupancynpv.com/occupancynpv/app/checkout/complete";
const CANCEL = "https://occupancynpv.com/pricing";
const paymentActivation: boolean = true;
const fulfillmentReady: boolean = true;
const BINDINGS = {
  PROFESSIONAL: { priceId: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", mode: "subscription", amount: 29000, currency: "usd" },
  PER_DEAL: { priceId: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", mode: "payment", amount: 14900, currency: "usd" },
} as const;

function resolveOffer(offer: string | null, priceId: string | null, amount: string | null, currency: string | null) {
  if (offer !== "PROFESSIONAL" && offer !== "PER_DEAL") return { ok: false as const, reason: "UNKNOWN_OFFER" };
  const binding = BINDINGS[offer];
  if (priceId && priceId !== binding.priceId) return { ok: false as const, reason: "ARBITRARY_PRICE_BLOCKED" };
  if (amount && Number(amount) !== binding.amount) return { ok: false as const, reason: "ARBITRARY_AMOUNT_BLOCKED" };
  if (currency && currency.toLowerCase() !== binding.currency) return { ok: false as const, reason: "ARBITRARY_CURRENCY_BLOCKED" };
  return { ok: true as const, reason: "CANONICAL_OFFER", binding, offer };
}

export async function GET() {
  return NextResponse.json({
    activated: paymentActivation === true && fulfillmentReady === true,
    createSession: false,
    paymentActivation,
    fulfillment: fulfillmentReady === true ? "PASS" : "FAIL",
    offers: ["PROFESSIONAL", "PER_DEAL"],
    account: ACCOUNT,
  });
}

export async function POST(req: Request) {
  if (fulfillmentReady !== true) {
    return NextResponse.json({ ok: false, reason: "FULFILLMENT_NOT_READY", createSession: false, paymentActivation }, { status: 403 });
  }
  if (paymentActivation !== true) {
    return NextResponse.json({ ok: false, reason: "PAYMENT_ACTIVATION_NOT_AUTHORIZED", createSession: false, paymentActivation }, { status: 403 });
  }
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) return NextResponse.json({ ok: false, reason: "STRIPE_SECRET_KEY_MISSING", createSession: false }, { status: 503 });
  const contentType = req.headers.get("content-type") ?? "";
  let offer: string | null = null;
  let clientPriceId: string | null = null;
  let clientAmount: string | null = null;
  let clientCurrency: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    offer = typeof body.offer === "string" ? body.offer : null;
    clientPriceId = typeof body.priceId === "string" ? body.priceId : null;
    clientAmount = body.amount != null ? String(body.amount) : null;
    clientCurrency = typeof body.currency === "string" ? body.currency : null;
  } else {
    const form = await req.formData().catch(() => null);
    offer = form?.get("offer") ? String(form.get("offer")) : null;
    clientPriceId = form?.get("priceId") ? String(form.get("priceId")) : null;
    clientAmount = form?.get("amount") ? String(form.get("amount")) : null;
    clientCurrency = form?.get("currency") ? String(form.get("currency")) : null;
  }
  const resolved = resolveOffer(offer, clientPriceId, clientAmount, clientCurrency);
  if (!resolved.ok) return NextResponse.json({ ok: false, reason: resolved.reason, createSession: false }, { status: 400 });
  const session = await durableUser();
  if (!session) {
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html") || !contentType.includes("application/json")) {
      return NextResponse.redirect("https://occupancynpv.com/occupancynpv/app/login", 303);
    }
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED", createSession: false }, { status: 401 });
  }
  const body = new URLSearchParams();
  body.set("mode", resolved.binding.mode);
  body.set("line_items[0][price]", resolved.binding.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", SUCCESS);
  body.set("cancel_url", CANCEL);
  body.set("client_reference_id", session.customer_id);
  body.set("metadata[infinity_venture]", "occupancynpv");
  body.set("metadata[infinity_offer]", resolved.offer);
  body.set("metadata[infinity_environment]", "production");
  body.set("metadata[infinity_stripe_account]", ACCOUNT);
  body.set("metadata[infinity_customer_id]", session.customer_id);
  const created = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await created.json().catch(() => ({})) as { url?: string; error?: { type?: string; code?: string; request_id?: string } };
  if (!created.ok || !json.url) {
    const accept = req.headers.get("accept") ?? "";
    const html = accept.includes("text/html") || !contentType.includes("application/json");
    console.error(JSON.stringify({
      provider: "stripe",
      errorType: json.error?.type ?? "UNKNOWN",
      errorCode: json.error?.code ?? "CHECKOUT_SESSION_CREATE_FAILED",
      requestId: json.error?.request_id ?? null,
      binding: resolved.binding.priceId,
      offer: resolved.offer,
      venture: "occupancynpv",
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "UNKNOWN",
      timestamp: new Date().toISOString(),
    }));
    if (html) {
      return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Checkout unavailable</title></head><body><main><h1>Checkout unavailable</h1><p>We couldn't start checkout. Please try again or contact support.</p><p><a href="/pricing">Return to pricing</a></p></main></body></html>`, {
        status: 502,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ ok: false, reason: "CHECKOUT_UNAVAILABLE", createSession: false }, { status: 502 });
  }
  return NextResponse.redirect(json.url, 303);
}
