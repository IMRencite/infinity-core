import { reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { digestOfAuthorityFiles } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { premiumAuthorityArtifactIdFor } from "@/lib/infinity/venture-website-architecture/compose-authority-artifact";
import { CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS } from "./occupancynpv-canonical-webhook";

export const OCCUPANCYNPV_PAYMENT_ACTIVATION_SITE_CONTRACT = "occupancynpv_first_live_payment_activation_v1";

export function occupancynpvCheckoutStartRouteSource(): string {
  const professional = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL;
  const perDeal = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL;
  return `import { NextResponse } from "next/server";

const ACCOUNT = "acct_18h5CjLdvXKx7R7G";
const SUCCESS = "https://occupancynpv.com/early-access?checkout=success";
const CANCEL = "https://occupancynpv.com/pricing";
const BINDINGS = {
  PROFESSIONAL: { priceId: "${professional.priceId}", productId: "${professional.productId}", mode: "subscription", amount: ${professional.amount}, currency: "usd" },
  PER_DEAL: { priceId: "${perDeal.priceId}", productId: "${perDeal.productId}", mode: "payment", amount: ${perDeal.amount}, currency: "usd" },
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
    activated: true,
    createSession: false,
    offers: ["PROFESSIONAL", "PER_DEAL"],
    account: ACCOUNT,
  });
}

export async function POST(req: Request) {
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
  const body = new URLSearchParams();
  body.set("mode", resolved.binding.mode);
  body.set("line_items[0][price]", resolved.binding.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", SUCCESS);
  body.set("cancel_url", CANCEL);
  body.set("metadata[infinity_venture]", "occupancynpv");
  body.set("metadata[infinity_offer]", resolved.offer);
  body.set("metadata[infinity_environment]", "production");
  body.set("metadata[infinity_stripe_account]", ACCOUNT);
  const created = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: \`Bearer \${key}\`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await created.json().catch(() => ({})) as { url?: string; error?: { message?: string } };
  if (!created.ok || !json.url) {
    return NextResponse.json({ ok: false, reason: "CHECKOUT_SESSION_CREATE_FAILED", createSession: false }, { status: 502 });
  }
  return NextResponse.redirect(json.url, 303);
}
`;
}

export function occupancynpvStripeWebhookRouteSource(): string {
  const events = OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS.map((event) => `"${event}"`).join(", ");
  return `import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const ALLOWED = new Set([${events}]);
const seen = new Set<string>();

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
  const digest = createHmac("sha256", secret).update(\`\${timestamp}.\${rawBody}\`).digest("hex");
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
  let parsed: { id?: string; type?: string } = {};
  try { parsed = JSON.parse(rawBody) as { id?: string; type?: string }; } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }
  if (!parsed.id || !parsed.type || !ALLOWED.has(parsed.type)) {
    return NextResponse.json({ ok: false, reason: "UNSUBSCRIBED_OR_INVALID" }, { status: 400 });
  }
  if (seen.has(parsed.id)) return NextResponse.json({ ok: true, duplicate: true });
  seen.add(parsed.id);
  return NextResponse.json({ ok: true, duplicate: false, eventId: parsed.id, type: parsed.type });
}
`;
}

function patchPricing(content: string): string {
  let next = content
    .replace("Interest only — not a purchase", "Canonical live checkout")
    .replace(
      "Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.",
      "Professional is $290 per year. Per-Deal is $149 per deal. Checkout uses only the canonical Stripe prices.",
    )
    .replace(
      "It does not include unlimited seats, a start free trial, or checkout on this page.",
      "Checkout on this page starts the canonical Per-Deal payment.",
    )
    .replace(/Payment is not collected\./g, "Live checkout is available for the two canonical OccupancyNPV prices.");
  if (!next.includes("/api/checkout/start")) {
    next = next.replace(
      "</div>\n            <h2>Why pricing is being tested</h2>",
      `</div>
            <div data-payment-surface="occupancynpv-canonical">
              <form action="/api/checkout/start" method="post">
                <input type="hidden" name="offer" value="PROFESSIONAL" />
                <button type="submit">Continue to Professional checkout — $290/year</button>
              </form>
              <form action="/api/checkout/start" method="post">
                <input type="hidden" name="offer" value="PER_DEAL" />
                <button type="submit">Continue to Per-Deal checkout — $149/deal</button>
              </form>
            </div>
            <h2>Why pricing is being tested</h2>`,
    );
  }
  return next;
}

function patchFaq(content: string): string {
  return content
    .replace("this site does not collect payment.", "live checkout is available on the pricing page for the two canonical prices.")
    .replace("Payment is not collected on this site. Pricing hypotheses of $290 per year or $149 per deal are interest signals only.", "Live checkout is available at /pricing for $290/year Professional and $149/deal Per-Deal.")
    .replace("No. Pricing shown is a hypothesis. A form selection indicates interest only. Payment is not collected.", "Yes, for the two canonical OccupancyNPV prices on /pricing. The success query parameter alone does not mark payment success.");
}

function patchEarlyAccess(content: string): string {
  if (content.includes("DOES_NOT_MARK_PAYMENT_SUCCESS")) return content;
  return content.replace(
    "<h1>Request pilot access</h1>",
    "<h1>Request pilot access</h1>\n        <p>If you returned from checkout, the checkout=success query parameter DOES_NOT_MARK_PAYMENT_SUCCESS. Provider verification is required.</p>",
  );
}

export function composeOccupancynpvPaymentActivationFiles() {
  const legal = reconstructOccupancynpvLegalSurfaceSuccessor();
  const changedPaths = [
    "app/api/checkout/start/route.ts",
    "app/api/webhooks/stripe/route.ts",
    "app/pricing/page.tsx",
    "app/faq/page.tsx",
    "app/early-access/page.tsx",
  ];
  const files = legal.files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/pricing/page.tsx") return { ...file, content: patchPricing(file.content) };
    if (path === "app/faq/page.tsx") return { ...file, content: patchFaq(file.content) };
    if (path === "app/early-access/page.tsx") return { ...file, content: patchEarlyAccess(file.content) };
    return file;
  });
  files.push({ path: "app/api/checkout/start/route.ts", content: occupancynpvCheckoutStartRouteSource(), encoding: "utf8" });
  files.push({ path: "app/api/webhooks/stripe/route.ts", content: occupancynpvStripeWebhookRouteSource(), encoding: "utf8" });
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
    packageId: "occupancynpv-first-live-payment-activation-v1",
    packageVersion: "1",
    contract: OCCUPANCYNPV_PAYMENT_ACTIVATION_SITE_CONTRACT,
  });
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: legal.artifactId,
    predecessorDigest: legal.digest,
    files,
    changedPaths,
    routes: legal.routes,
    purchaseSurfaceReady: files.some((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx" && file.content.includes("/api/checkout/start")),
  };
}
