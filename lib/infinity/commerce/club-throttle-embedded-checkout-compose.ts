import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { CLUB_THROTTLE_CHECKOUT_BRAND } from "./venture-specific-checkout-branding-v1.ts";
import { defaultRegistryPath } from "./stripe-promotion-resource-provisioner-v1.ts";

/** First-party /checkout with Stripe Embedded Checkout for Club Throttle. */
export function clubThrottleEmbeddedCheckoutStorefrontFiles(cwd = process.cwd()): ComposedStorefrontFile[] {
  const publishableKeyAtCompose =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    "";
  const brandJson = JSON.stringify(CLUB_THROTTLE_CHECKOUT_BRAND, null, 2);
  const promotionRegistryJson = readFileSync(defaultRegistryPath(cwd), "utf8");
  return [
    {
      path: "lib/stripe-publishable-runtime.ts",
      content: `/** Public Stripe key bound at compose/deploy time (safe to expose in browser). */
export const STRIPE_PUBLISHABLE_KEY_RUNTIME = ${JSON.stringify(publishableKeyAtCompose)} as const;
`,
    },
    {
      path: "lib/venture-checkout-brand.ts",
      content: `export const CLUB_THROTTLE_CHECKOUT_BRAND = ${brandJson} as const;
export const IMR_LEGAL_OPERATOR = "Infinite Media Resources LLC" as const;
`,
    },
    {
      path: "lib/checkout-authority.ts",
      content: `import { COMMERCE_RUNTIME } from "./commerce-runtime-config";
import { storefrontCatalog } from "./storefront-commerce";
import { resolveClubThrottlePromotion } from "./promotion-resolve";

export type LineInput = { slug: string; size: string; quantity: number; color?: string };

export type ResolvedLine = {
  unit_amount: number;
  meta: (typeof COMMERCE_RUNTIME.merch)[number];
  size: string;
  garment_color: string;
  quantity: number;
  variant_id: string;
};

export function authoritativeCheckoutLine(line: LineInput): { ok: true; line: ResolvedLine } | { ok: false; reason: string } {
  if (!(COMMERCE_RUNTIME.canonical_slugs as readonly string[]).includes(line.slug)) {
    return { ok: false, reason: "UNKNOWN_SKU" };
  }
  if (line.quantity < 1 || line.quantity > 5) return { ok: false, reason: "INVALID_QUANTITY" };
  const allowed = new Set(COMMERCE_RUNTIME.checkout_sizes as readonly string[]);
  if (!allowed.has(line.size)) return { ok: false, reason: "INVALID_VARIANT" };
  const garment_color = (line.color ?? "white").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(garment_color)) return { ok: false, reason: "INVALID_COLOR" };
  const product = storefrontCatalog.products.find((row) => row.slug === line.slug);
  const colorRow = product?.colors?.find((c) => c.slug === garment_color);
  if (!colorRow || !(colorRow.sizes as readonly string[]).includes(line.size)) {
    return { ok: false, reason: "UNSUPPORTED_COLOR_SIZE" };
  }
  const meta = COMMERCE_RUNTIME.merch.find((row) => row.slug === line.slug);
  if (!meta) return { ok: false, reason: "SKU_NOT_PUBLISHED" };
  const variant_id = \`\${COMMERCE_RUNTIME.venture_id}|\${line.slug}|\${garment_color}|\${line.size.toUpperCase()}\`;
  return {
    ok: true,
    line: {
      unit_amount: Math.round(COMMERCE_RUNTIME.retail_usd * 100),
      meta,
      size: line.size,
      garment_color,
      quantity: line.quantity,
      variant_id,
    },
  };
}

export function resolveCheckoutPromotion(input: {
  promotion_code: string;
  resolved: ResolvedLine[];
}): { ok: true; unit_discount_cents: number; discount_usd: number; total_discount_cents: number; promoMeta: Record<string, string> } | { ok: false; reason: string } {
  const subtotalUsd = input.resolved.reduce((sum, row) => sum + (row.unit_amount * row.quantity) / 100, 0);
  const promo = resolveClubThrottlePromotion({
    public_code: input.promotion_code,
    retail_usd: COMMERCE_RUNTIME.retail_usd,
    line_count: input.resolved.reduce((n, row) => n + row.quantity, 0),
    subtotal_usd: subtotalUsd,
    garment_colors: input.resolved.flatMap((row) => Array.from({ length: row.quantity }, () => row.garment_color)),
  });
  if (!promo.ok) return { ok: false, reason: promo.reason };
  return {
    ok: true,
    unit_discount_cents: promo.unit_discount_cents,
    discount_usd: promo.discount_usd,
    total_discount_cents: Math.round(promo.discount_usd * 100),
    promoMeta: {
      promotion_id: promo.promotion_id,
      promotion_code: promo.public_code,
      discount_type: promo.discount_type,
    },
  };
}
`,
    },
    {
      path: "lib/stripe-promotion-resource-registry.json",
      content: promotionRegistryJson,
    },
    {
      path: "lib/stripe-promotion-checkout-resolve.ts",
      content: `import promotionRegistry from "./stripe-promotion-resource-registry.json";

export function infinityStripeCouponResourceId(input: {
  venture_id: string;
  public_code: string;
  amount_off_cents: number;
  resource_version: string;
}): string {
  const code = input.public_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const raw = \`\${input.venture_id}_\${code}_\${input.amount_off_cents}OFF_\${input.resource_version}\`;
  return raw.slice(0, 40);
}

export function resolveStripeCouponIdForCheckout(input: {
  venture_id: string;
  public_code: string;
  discount_usd: number;
}): string {
  const code = input.public_code.trim().toUpperCase();
  const envOverride =
    process.env[\`CLUB_THROTTLE_STRIPE_COUPON_\${code}\`]?.trim()
    || (code === "RIDEFIRST" ? process.env.CLUB_THROTTLE_STRIPE_COUPON_RIDEFIRST?.trim() : undefined);
  if (envOverride) return envOverride;
  const mapped = promotionRegistry.mappings.find(
    (row) => row.venture_id === input.venture_id && row.public_code === code && row.status === "ACTIVE",
  );
  if (mapped?.stripe_coupon_id) return mapped.stripe_coupon_id;
  return infinityStripeCouponResourceId({
    venture_id: input.venture_id,
    public_code: code,
    amount_off_cents: Math.round(input.discount_usd * 100),
    resource_version: "v1",
  });
}
`,
    },
    {
      path: "app/api/checkout/config/route.ts",
      content: `import { NextResponse } from "next/server";
import { STRIPE_PUBLISHABLE_KEY_RUNTIME } from "../../../../lib/stripe-publishable-runtime";

export async function GET() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    STRIPE_PUBLISHABLE_KEY_RUNTIME?.trim() ||
    "";
  return NextResponse.json({
    publishable_key: publishableKey,
    ui_mode: "embedded",
    checkout_path: "/checkout",
  });
}
`,
    },
    {
      path: "app/api/checkout/session/route.ts",
      content: `import { NextResponse } from "next/server";
import Stripe from "stripe";
import { COMMERCE_RUNTIME } from "../../../../lib/commerce-runtime-config";
import { clubThrottleLiveCheckoutEnabled } from "../../../../lib/checkout-gate";
import { authoritativeCheckoutLine, resolveCheckoutPromotion, type LineInput } from "../../../../lib/checkout-authority";
import { resolveStripeCouponIdForCheckout } from "../../../../lib/stripe-promotion-checkout-resolve";
import { CLUB_THROTTLE_CHECKOUT_BRAND } from "../../../../lib/venture-checkout-brand";

export async function POST(request: Request) {
  if (!clubThrottleLiveCheckoutEnabled()) {
    return NextResponse.json({ error: "CHECKOUT_CLOSED" }, { status: 503 });
  }
  const body = (await request.json()) as { lines?: LineInput[]; promotion_code?: string };
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const promotionCode = typeof body.promotion_code === "string" ? body.promotion_code.trim().toUpperCase() : "";
  if (!lines.length) return NextResponse.json({ error: "EMPTY_CART" }, { status: 400 });

  const resolved = [];
  for (const line of lines) {
    const row = authoritativeCheckoutLine(line);
    if (!row.ok) return NextResponse.json({ error: "CART_VALIDATION_FAILED", reason: row.reason }, { status: 400 });
    resolved.push(row.line);
  }

  const merchandiseSubtotalUsd = resolved.reduce((sum, row) => sum + (row.unit_amount * row.quantity) / 100, 0);
  let promoMeta: Record<string, string> = {};
  let promotionPresentation: {
    promotion_code: string;
    base_merchandise_subtotal_usd: number;
    promotion_discount_usd: number;
    discounted_merchandise_subtotal_usd: number;
  } | null = null;

  if (promotionCode) {
    const promo = resolveCheckoutPromotion({ promotion_code: promotionCode, resolved });
    if (!promo.ok) return NextResponse.json({ error: "PROMOTION_INVALID", reason: promo.reason }, { status: 400 });
    promoMeta = promo.promoMeta;
    promotionPresentation = {
      promotion_code: promoMeta.promotion_code ?? promotionCode,
      base_merchandise_subtotal_usd: merchandiseSubtotalUsd,
      promotion_discount_usd: promo.discount_usd,
      discounted_merchandise_subtotal_usd: Math.max(0, merchandiseSubtotalUsd - promo.discount_usd),
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  const origin = process.env.CLUB_THROTTLE_PUBLIC_ORIGIN ?? CLUB_THROTTLE_CHECKOUT_BRAND.public_origin;
  const automaticTax = process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED";

  let checkoutDiscounts: { coupon: string }[] | undefined;
  if (promotionPresentation) {
    const couponId = resolveStripeCouponIdForCheckout({
      venture_id: COMMERCE_RUNTIME.venture_id,
      public_code: promotionPresentation.promotion_code,
      discount_usd: promotionPresentation.promotion_discount_usd,
    });
    checkoutDiscounts = [{ coupon: couponId }];
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      redirect_on_completion: "if_required",
      return_url: \`\${origin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}\`,
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
      ...(checkoutDiscounts ? { discounts: checkoutDiscounts } : {}),
      line_items: resolved.map((row) => ({
      quantity: row.quantity,
      price_data: {
        currency: "usd",
        unit_amount: row.unit_amount,
        product_data: {
          name: row.meta.title,
          metadata: {
            venture_id: COMMERCE_RUNTIME.venture_id,
            product_id: row.meta.product_id,
            slug: row.meta.slug,
            size: row.size,
            garment_color: row.garment_color,
            variant_id: row.variant_id,
            gelato_product_id: row.meta.gelato_product_id,
            base_unit_amount_cents: String(row.unit_amount),
            ...promoMeta,
          },
        },
      },
      })),
      metadata: {
        venture_id: COMMERCE_RUNTIME.venture_id,
        checkout_display_name: CLUB_THROTTLE_CHECKOUT_BRAND.checkout_display_name,
        legal_operator: CLUB_THROTTLE_CHECKOUT_BRAND.legal_operator,
        merchandise_subtotal_usd: String(merchandiseSubtotalUsd),
        ...(promotionPresentation
          ? {
              promotion_code: promotionPresentation.promotion_code,
              promotion_discount_usd: String(promotionPresentation.promotion_discount_usd),
              discounted_merchandise_subtotal_usd: String(promotionPresentation.discounted_merchandise_subtotal_usd),
            }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STRIPE_SESSION_FAILED";
    if (promotionPresentation && /no such coupon/i.test(message)) {
      return NextResponse.json(
        {
          error: "STRIPE_PROMOTION_COUPON_NOT_PROVISIONED",
          reason: "RIDEFIRST requires a live Stripe coupon on this account. Provision via scripts/provision-club-throttle-stripe-promotion-coupons.mjs or set CLUB_THROTTLE_STRIPE_COUPON_RIDEFIRST.",
          promotion_code: promotionPresentation.promotion_code,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "STRIPE_SESSION_FAILED", reason: message.slice(0, 240) }, { status: 500 });
  }

  if (!session.client_secret) {
    return NextResponse.json({ error: "EMBEDDED_SESSION_NO_CLIENT_SECRET" }, { status: 500 });
  }
  return NextResponse.json({
    client_secret: session.client_secret,
    session_id: session.id,
    venture_id: COMMERCE_RUNTIME.venture_id,
    checkout_display_name: CLUB_THROTTLE_CHECKOUT_BRAND.checkout_display_name,
    promotion_presentation: promotionPresentation,
    stripe_discount_applied: Boolean(promotionPresentation),
    merchandise_subtotal_usd: merchandiseSubtotalUsd,
  });
}
`,
    },
    {
      path: "app/checkout/page.tsx",
      content: `"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { readCartLines, type CartLine } from "../../lib/cart-storage";
import { CLUB_THROTTLE_CHECKOUT_BRAND, IMR_LEGAL_OPERATOR } from "../../lib/venture-checkout-brand";
import { productBySlug as storefrontProduct } from "../../lib/storefront-commerce";
import { COMMERCE_RUNTIME } from "../../lib/commerce-runtime-config";

const PROMO_STORAGE_KEY = "ct-checkout-promo";

function readStoredPromo(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PROMO_STORAGE_KEY)?.trim().toUpperCase() ?? "";
}

function promoPreviewMessage(reason: string): string {
  if (reason === "MIN_SUBTOTAL" || reason === "MARGIN_FLOOR") return "That promo code isn't valid.";
  if (reason === "EXPIRED") return "That promo code isn't valid.";
  if (reason === "UNKNOWN_CODE") return "That promo code isn't valid.";
  return "That promo code isn't valid.";
}

export default function CheckoutPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [activePromoCode, setActivePromoCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoFieldError, setPromoFieldError] = useState<string | null>(null);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promotionPresentation, setPromotionPresentation] = useState<{
    promotion_code: string;
    base_merchandise_subtotal_usd: number;
    promotion_discount_usd: number;
    discounted_merchandise_subtotal_usd: number;
  } | null>(null);

  useEffect(() => {
    setLines(readCartLines());
    setActivePromoCode(readStoredPromo());
  }, []);

  async function createCheckoutSession(promoCode: string) {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    const cart = readCartLines();
    if (cart.length < 1) {
      setError("Your bag is empty.");
      setLoading(false);
      return;
    }
    try {
      if (!publishableKey) {
        const cfg = await fetch("/api/checkout/config").then((r) => r.json());
        if (!cfg.publishable_key) {
          setError("Checkout is not configured yet.");
          setLoading(false);
          return;
        }
        setPublishableKey(cfg.publishable_key);
      }
      const sessionRes = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.map((row) => ({ slug: row.slug, size: row.size, color: row.color, quantity: row.qty })),
          promotion_code: promoCode || undefined,
        }),
      });
      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok) {
        if (sessionJson.error === "CHECKOUT_CLOSED") setError("Checkout is not open yet.");
        else if (sessionJson.error === "STRIPE_PROMOTION_COUPON_NOT_PROVISIONED") {
          setError("Promotion is recognized but payment setup is incomplete. Contact support — your card has not been charged.");
        } else if (sessionJson.error === "PROMOTION_INVALID") setError("That promo code isn't valid.");
        else setError("Could not start checkout.");
        setLoading(false);
        return;
      }
      setClientSecret(sessionJson.client_secret);
      setPromotionPresentation(sessionJson.promotion_presentation ?? null);
      setSessionEpoch((n) => n + 1);
    } catch {
      setError("Could not reach checkout.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const promo = readStoredPromo();
    setActivePromoCode(promo);
    void createCheckoutSession(promo);
  }, []);

  async function applyCheckoutPromo() {
    const code = promoInput.trim();
    if (!code) return;
    if (activePromoCode && activePromoCode === code.toUpperCase()) {
      setPromoFieldError(null);
      return;
    }
    setPromoApplying(true);
    setPromoFieldError(null);
    const cart = readCartLines();
    try {
      const preview = await fetch("/api/promotion/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.map((row) => ({ slug: row.slug, size: row.size, color: row.color, quantity: row.qty })),
          promotion_code: code,
        }),
      });
      const json = await preview.json();
      if (!json.ok) {
        setPromoFieldError(promoPreviewMessage(String(json.reason ?? "INVALID")));
        return;
      }
      const normalized = String(json.public_code ?? code).toUpperCase();
      window.sessionStorage.setItem(PROMO_STORAGE_KEY, normalized);
      setActivePromoCode(normalized);
      setPromoInput("");
      await createCheckoutSession(normalized);
    } finally {
      setPromoApplying(false);
    }
  }

  async function removeCheckoutPromo() {
    window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
    setActivePromoCode("");
    setPromoInput("");
    setPromoFieldError(null);
    await createCheckoutSession("");
  }

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const unitUsd = COMMERCE_RUNTIME.retail_usd;
  const summary = lines.map((row) => {
    const p = storefrontProduct(row.slug);
    const color = p?.colors.find((c) => c.slug === row.color);
    const lineTotal = unitUsd * row.qty;
    return {
      title: p?.title ?? row.slug,
      color: color?.display_name ?? row.color,
      size: row.size,
      qty: row.qty,
      lineTotal,
    };
  });
  const subtotalUsd = summary.reduce((sum, row) => sum + row.lineTotal, 0);

  return (
    <article
      className="sheet checkout-shell"
      data-checkout-route="/checkout"
      data-checkout-brand-compact="true"
      data-venture={CLUB_THROTTLE_CHECKOUT_BRAND.venture_id}
      data-checkout-promotion-entry="first-party"
      data-stripe-native-promotion-entry="disabled"
    >
      <header className="checkout-compact-head">
        <Link href="/" aria-label={CLUB_THROTTLE_CHECKOUT_BRAND.venture_name}>
          <img
            className="checkout-compact-logo"
            src={CLUB_THROTTLE_CHECKOUT_BRAND.logo_path}
            alt=""
            height={36}
            width={120}
          />
        </Link>
        <div className="checkout-compact-copy">
          <p className="checkout-compact-kicker">Secure checkout</p>
          <h1 className="checkout-compact-title">{CLUB_THROTTLE_CHECKOUT_BRAND.checkout_display_name}</h1>
          <p className="checkout-compact-legal">
            {CLUB_THROTTLE_CHECKOUT_BRAND.venture_name} is operated by {IMR_LEGAL_OPERATOR}.
          </p>
        </div>
      </header>
      <div className="checkout-body-grid" data-checkout-body-grid="true">
        <aside className="checkout-order-panel" data-checkout-order-summary="true" aria-label="Order summary">
          <h2>Your order</h2>
          {summary.length > 0 ? (
            <>
              <ul className="checkout-order-lines">
                {summary.map((row) => (
                  <li key={\`\${row.title}-\${row.color}-\${row.size}\`}>
                    <span className="checkout-order-line-title">{row.title}</span>
                    <span className="checkout-order-line-meta">
                      {row.color} · Size {row.size} · Qty {row.qty}
                    </span>
                    <span className="checkout-order-line-price">\${row.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="checkout-promo-entry" data-checkout-promotion-field="true">
                {!activePromoCode ? (
                  <>
                    <label htmlFor="checkout-promo-input">Promo code</label>
                    <div className="checkout-promo-row">
                      <input
                        id="checkout-promo-input"
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Enter code"
                        autoComplete="off"
                        disabled={promoApplying || loading}
                      />
                      <button
                        type="button"
                        className="checkout-promo-apply"
                        disabled={promoApplying || loading || !promoInput.trim()}
                        onClick={() => void applyCheckoutPromo()}
                      >
                        {promoApplying ? "Applying…" : "Apply"}
                      </button>
                    </div>
                    {promoFieldError ? (
                      <p className="checkout-promo-error" data-checkout-promo-error="true">
                        {promoFieldError}
                      </p>
                    ) : (
                      <p className="checkout-promo-hint">Codes are validated by Club Throttle before payment.</p>
                    )}
                  </>
                ) : (
                  <div className="checkout-promo-active" data-checkout-promo-applied="true">
                    <span>
                      {activePromoCode} applied
                      {promotionPresentation
                        ? " — -$" + promotionPresentation.promotion_discount_usd.toFixed(2)
                        : null}
                    </span>
                    <button
                      type="button"
                      className="checkout-promo-remove"
                      disabled={loading}
                      onClick={() => void removeCheckoutPromo()}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="checkout-order-subtotal" data-checkout-merchandise-subtotal="true">
                <span>Subtotal</span>
                <span>\${subtotalUsd.toFixed(2)}</span>
              </div>
              {promotionPresentation ? (
                <>
                  <div className="checkout-order-promo-line discount" data-checkout-promotion-line="true">
                    <span>{promotionPresentation.promotion_code}</span>
                    <span>{"-$" + promotionPresentation.promotion_discount_usd.toFixed(2)}</span>
                  </div>
                  <div className="checkout-order-discounted-subtotal" data-checkout-discounted-subtotal="true">
                    <span>Discounted subtotal</span>
                    <span>{"$" + promotionPresentation.discounted_merchandise_subtotal_usd.toFixed(2)}</span>
                  </div>
                </>
              ) : null}
              <p className="checkout-compact-legal">Tax and shipping are calculated in secure payment.</p>
            </>
          ) : (
            <p className="checkout-compact-legal">Your bag is empty.</p>
          )}
        </aside>
        <div className="checkout-payment-panel" data-checkout-payment-surface="true">
          {loading ? <p>Preparing secure checkout…</p> : null}
          {error ? (
            <p className="note">
              {error} <Link href="/cart">Return to cart</Link>
            </p>
          ) : null}
          {clientSecret && stripePromise ? (
            <div
              className="checkout-embedded-frame"
              data-stripe-ui-mode="embedded"
              data-checkout-session-ready="true"
              data-checkout-ui-mode="embedded"
            >
              <EmbeddedCheckoutProvider
                key={\`checkout-session-\${sessionEpoch}\`}
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : null}
          <p className="checkout-legal">
            Payments processed securely by Stripe. Merchant of record: {IMR_LEGAL_OPERATOR}.
          </p>
        </div>
      </div>
    </article>
  );
}
`,
    },
    {
      path: "app/api/checkout/route.ts",
      content: `import { NextResponse } from "next/server";

/** Legacy hosted redirect removed — first-party embedded checkout only. */
export async function POST() {
  return NextResponse.json(
    {
      first_party_checkout: true,
      path: "/checkout",
      message: "Use clubthrottle.com/checkout for secure payment.",
    },
    { status: 400 },
  );
}
`,
    },
    {
      path: "app/api/checkout/order-presentation/route.ts",
      content: `import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ error: "MISSING_SESSION" }, { status: 400 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const md = session.metadata ?? {};
  const base = Number(md.merchandise_subtotal_usd);
  const discount = Number(md.promotion_discount_usd);
  const discounted = Number(md.discounted_merchandise_subtotal_usd);
  const promotion_presentation = md.promotion_code
    ? {
        promotion_code: md.promotion_code,
        base_merchandise_subtotal_usd: Number.isFinite(base) ? base : undefined,
        promotion_discount_usd: Number.isFinite(discount) ? discount : undefined,
        discounted_merchandise_subtotal_usd: Number.isFinite(discounted) ? discounted : undefined,
      }
    : null;
  return NextResponse.json({ promotion_presentation, session_id: sessionId });
}
`,
    },
    {
      path: "app/checkout/complete/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CompleteInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [presentation, setPresentation] = useState<{
    promotion_code?: string;
    promotion_discount_usd?: number;
    base_merchandise_subtotal_usd?: number;
    discounted_merchandise_subtotal_usd?: number;
  } | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    fetch(\`/api/checkout/order-presentation?session_id=\${encodeURIComponent(sessionId)}\`)
      .then((r) => r.json())
      .then((j) => setPresentation(j.promotion_presentation ?? null))
      .catch(() => null);
  }, [sessionId]);
  return (
    <article className="sheet checkout-shell">
      <h1>Order received</h1>
      <p>Thank you — your payment is being confirmed.</p>
      {sessionId ? <p className="note">Reference: {sessionId}</p> : null}
      {presentation?.promotion_code ? (
        <div className="checkout-order-panel" data-order-confirmation-promotion="true">
          <p className="checkout-compact-kicker">Promotion applied</p>
          <div className="checkout-order-subtotal">
            <span>Subtotal</span>
            <span>$\${(presentation.base_merchandise_subtotal_usd ?? 0).toFixed(2)}</span>
          </div>
          <div className="checkout-order-promo-line discount">
            <span>{presentation.promotion_code}</span>
            <span>{"-$" + (presentation.promotion_discount_usd ?? 0).toFixed(2)}</span>
          </div>
          <div className="checkout-order-discounted-subtotal">
            <span>Discounted subtotal</span>
            <span>{"$" + (presentation.discounted_merchandise_subtotal_usd ?? 0).toFixed(2)}</span>
          </div>
        </div>
      ) : null}
      <p>Confirmation email and fulfillment updates follow the signed Stripe webhook — not this page alone.</p>
      <p><Link href="/shop">Back to shop</Link></p>
    </article>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<article className="sheet"><p>Loading…</p></article>}>
      <CompleteInner />
    </Suspense>
  );
}
`,
    },
  ];
}
