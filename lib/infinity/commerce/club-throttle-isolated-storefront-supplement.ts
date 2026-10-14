import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { clubThrottleRetailV2StorefrontFiles } from "./club-throttle-retail-v2-storefront-files.ts";
import { clubThrottleStorefrontPromotionResolveFile } from "./club-throttle-storefront-promotion-compose.ts";
import {
  CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
  CLUB_THROTTLE_SEVEN_SHIRT_MERCH,
  CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS,
} from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { CLUB_THROTTLE_CORE_TEE, CLUB_THROTTLE_SIZE_CHART } from "./club-throttle-catalog.ts";
import { auditClubThrottleVariantMap } from "./club-throttle-variant-map.ts";
import { CLUB_THROTTLE_STOREFRONT_COMMERCE_HEALTH_MODULE } from "./club-throttle-commerce-health-state.ts";

const CANONICAL_SLUGS = CLUB_THROTTLE_SEVEN_SHIRT_MERCH.map((row) => row.slug);
const SITEMAP_PRODUCT_ROUTES = CANONICAL_SLUGS.map((slug) => `/products/${slug}`);

const variantQc = auditClubThrottleVariantMap();

export function clubThrottleIsolatedCatalogExtra(): string {
  return `
export const merch = ${JSON.stringify(CLUB_THROTTLE_SEVEN_SHIRT_MERCH, null, 2)} as const;
export const retailUsd = ${CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD} as const;
export const checkoutSizes = ${JSON.stringify(variantQc.SUPPORTED_SIZES, null, 2)} as const;
export const garment = ${JSON.stringify(CLUB_THROTTLE_CORE_TEE.garment, null, 2)} as const;
export const shipping = ${JSON.stringify(CLUB_THROTTLE_CORE_TEE.shipping, null, 2)} as const;
export const returns = ${JSON.stringify(CLUB_THROTTLE_CORE_TEE.returns, null, 2)} as const;
export const canonicalSlugs = ${JSON.stringify(CANONICAL_SLUGS, null, 2)} as const;
export function productBySlug(slug: string) {
  return products.find((row) => row.slug === slug) ?? null;
}
export function merchBySlug(slug: string) {
  return merch.find((row) => row.slug === slug) ?? null;
}
export function isCanonicalPublishedSlug(slug: string) {
  return canonicalSlugs.includes(slug as (typeof canonicalSlugs)[number]);
}
`;
}

export function clubThrottleIsolatedStorefrontSupplementFiles(): ComposedStorefrontFile[] {
  return [
    {
      path: "app/products/[slug]/page.tsx",
      content: `import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { merchBySlug, productBySlug, sizes, shipping, returns, retailUsd, canonicalSlugs, isCanonicalPublishedSlug } from "../../../lib/catalog";
import { productBySlug as storefrontProduct, storefrontCatalog } from "../../../lib/storefront-commerce";
import { contentProfileBySlug } from "../../../lib/product-content-profiles";
import { Suspense } from "react";
import { ProductPdpExperience } from "./product-pdp-experience";
import { ProductDetailRichContent } from "./product-detail-rich-content";

export function generateStaticParams() {
  return canonicalSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = merchBySlug(slug);
  if (!meta || !isCanonicalPublishedSlug(slug)) return { title: "Product · Club Throttle" };
  return {
    title: meta.seo_title,
    description: meta.meta_description,
    alternates: { canonical: \`https://clubthrottle.com/products/\${slug}\` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCanonicalPublishedSlug(slug)) notFound();
  const product = productBySlug(slug);
  const store = storefrontProduct(slug);
  const meta = merchBySlug(slug);
  const content = contentProfileBySlug(slug);
  if (!product || !meta || !store || !content) notFound();
  const canonicalUrl = \`https://clubthrottle.com/products/\${slug}\`;
  const relatedProducts = content.related_product_slugs
    .map((relatedSlug) => storefrontCatalog.products.find((p) => p.slug === relatedSlug))
    .filter((p): p is (typeof storefrontCatalog.products)[number] => p != null);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: content.product_summary,
    image: store.gallery,
    sku: meta.sku,
    brand: { "@type": "Brand", name: "Club Throttle" },
    category: content.product_type,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.price_usd,
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: "https://clubthrottle.com/shop" },
      { "@type": "ListItem", position: 2, name: product.title, item: canonicalUrl },
    ],
  };
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: meta.seo_title,
    description: meta.meta_description,
    url: canonicalUrl,
    isPartOf: { "@type": "WebSite", name: "Club Throttle", url: "https://clubthrottle.com" },
  };
  const faqLd =
    content.faq.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: content.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} /> : null}
      <Suspense fallback={null}>
        <ProductPdpExperience
          slug={slug}
          title={product.title}
          priceUsd={product.price_usd ?? retailUsd}
          garmentFactsBase="Gildan 5000 Heavy Cotton"
          sizeRange={store.size_range_label}
          colors={store.colors}
          defaultColor={store.default_color}
          gallery={store.gallery}
        />
      </Suspense>
      <ProductDetailRichContent
        profile={content}
        sizes={sizes}
        shipping={shipping}
        returns={returns}
        checkoutSizes={store.checkout_sizes}
        relatedProducts={relatedProducts}
      />
    </article>
  );
}
`,
    },
    {
      path: "app/products/[slug]/product-pdp-experience.tsx",
      content: `"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { mergeCartLine, readCartLines, writeCartLines } from "../../../lib/cart-storage";
import { openMiniCart } from "../../../lib/cart-continuity-events";

type ColorRow = { slug: string; display_name: string; swatch_hex: string; sizes: readonly string[]; primary_image: string; hover_image: string };

export function ProductPdpExperience({ slug, title, priceUsd, garmentFactsBase, sizeRange, colors, defaultColor, gallery }: { slug: string; title: string; priceUsd: number; garmentFactsBase: string; sizeRange: string; colors: readonly ColorRow[]; defaultColor: string; gallery: readonly string[] }) {
  const searchParams = useSearchParams();
  const initialColor = useMemo(() => {
    const fromUrl = searchParams.get("color")?.toLowerCase() ?? "";
    if (fromUrl && colors.some((c) => c.slug === fromUrl)) return fromUrl;
    return defaultColor;
  }, [colors, defaultColor, searchParams]);
  const [color, setColor] = useState(initialColor);
  useEffect(() => {
    setColor(initialColor);
  }, [initialColor]);
  const activeColor = colors.find((c) => c.slug === color) ?? colors[0];
  const allowedSizes = useMemo(() => activeColor?.sizes ?? [], [activeColor]);
  const [size, setSize] = useState(allowedSizes.includes("M") ? "M" : (allowedSizes[0] ?? "M"));
  const [qty, setQty] = useState(1);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [selectedGallerySrc, setSelectedGallerySrc] = useState<string | null>(null);
  const mediaStrip = useMemo(() => {
    const items = [activeColor?.primary_image, ...gallery].filter(Boolean) as string[];
    return [...new Set(items)];
  }, [activeColor?.primary_image, gallery]);
  const heroImage = selectedGallerySrc ?? activeColor?.primary_image ?? gallery[0] ?? "";
  const garmentSummary = \`\${garmentFactsBase} · \${activeColor?.display_name ?? "White"}\`;
  const multiColor = colors.length > 1;
  useEffect(() => {
    setSelectedGallerySrc(null);
  }, [color, activeColor?.primary_image]);
  function pickColor(next: string) {
    setColor(next);
    const row = colors.find((c) => c.slug === next);
    if (row && !row.sizes.includes(size)) setSize(row.sizes.includes("M") ? "M" : (row.sizes[0] ?? size));
  }
  function add() {
    writeCartLines(mergeCartLine(readCartLines(), { slug, size, color, qty }));
    openMiniCart();
  }
  function checkout() {
    writeCartLines(mergeCartLine(readCartLines(), { slug, size, color, qty }));
    window.location.href = "/checkout";
  }
  return (
    <div className="pdp-shell" data-pdp-layout="two-column">
      <div className="pdp-media-col">
        <div className="pdp-media-viewport" data-pdp-primary-media-viewport="true">
          <img
            className="garment"
            src={heroImage}
            alt={\`\${title} on \${activeColor?.display_name ?? "tee"}\`}
            data-primary-media-src={heroImage}
            data-selected-garment-color={color}
          />
        </div>
        {mediaStrip.length > 1 ? (
          <div className="pdp-thumb" style={{ marginTop: ".65rem" }} data-pdp-media-gallery="true" role="list">
            {mediaStrip.map((src) => (
              <button
                key={src}
                type="button"
                role="listitem"
                className={heroImage === src ? "active" : ""}
                aria-label="Show product view"
                aria-pressed={heroImage === src}
                data-gallery-thumb-src={src}
                onClick={() => setSelectedGallerySrc(src)}
              >
                <img src={src} alt="" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="pdp-purchase-col">
        <div className="buy">
          <div className="pdp-purchase-inner">
            <div className="pdp-group-identity">
              <p className="kicker">Original tee</p>
              <h1>{title}</h1>
              <p className="price" style={{ fontSize: "1.35rem", fontWeight: 700 }}>\${priceUsd.toFixed(2)}</p>
            </div>
            <div
              className="pdp-group-facts"
              data-variant-metadata-sync="garment-summary"
              data-selected-color={activeColor?.slug ?? color}
            >
              <p data-variant-metadata-sync="garment-facts-line">{garmentSummary}</p>
              <p>Sizes {sizeRange}</p>
            </div>
            <div className="pdp-group-options">
              {multiColor ? (
                <>
                  <p id="color-label">Color: {activeColor?.display_name ?? color}</p>
                  <div className="color-swatches" role="group" aria-labelledby="color-label">
                    {colors.map((c) => (
                      <button key={c.slug} type="button" className={\`color-swatch-btn \${color === c.slug ? "active" : ""}\`} aria-pressed={color === c.slug} onClick={() => pickColor(c.slug)} disabled={!c.sizes.length}>
                        <span className="color-swatch-dot" style={{ background: c.swatch_hex }} aria-hidden />
                        {c.display_name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="color-single-line" id="color-label">
                  Color: {activeColor?.display_name ?? "White"}
                  <span className="color-swatch-dot color-swatch-readonly" style={{ background: activeColor?.swatch_hex ?? "#fff" }} aria-hidden />
                </p>
              )}
              <p>Size</p>
              <div className="size-tiles" role="group" aria-label="Size">
                {allowedSizes.map((s) => (
                  <button key={s} type="button" className={\`size-tile \${size === s ? "active" : ""}\`} onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
              <p><a href="#size-guide">Size guide</a></p>
            </div>
            <div className="pdp-group-purchase">
              <div className="pdp-qty-row">
                <span>Quantity</span>
                <div className="pdp-qty-controls">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <span>{qty}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(5, qty + 1))}>+</button>
                </div>
              </div>
              <button className="cta" type="button" onClick={add}>Add to cart</button>
              <button className="cta" type="button" data-ct-checkout onClick={checkout} style={{ background: "#111" }}>Checkout</button>
            </div>
            <div className="pdp-group-support">
              <p className="note">{shippingNote()}</p>
              {checkoutNote ? <p className="note">{checkoutNote}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function shippingNote() {
  return "Printed on demand after payment. Shipping and applicable tax are calculated at checkout.";
}
`,
    },
    {
      path: "app/products/[slug]/product-buy-panel.tsx",
      content: `"use client";
import { useMemo, useState } from "react";

type ColorRow = { slug: string; display_name: string; swatch_hex: string; sizes: readonly string[]; primary_image: string; hover_image: string };
type BagLine = { slug: string; size: string; color: string; qty: number };

export function ProductBuyPanel({ slug, title, priceUsd, garmentSummary, sizeRange, colors, defaultColor, gallery }: { slug: string; title: string; priceUsd: number; garmentSummary: string; sizeRange: string; colors: readonly ColorRow[]; defaultColor: string; gallery: readonly string[] }) {
  const [color, setColor] = useState(defaultColor);
  const activeColor = colors.find((c) => c.slug === color) ?? colors[0];
  const allowedSizes = useMemo(() => activeColor?.sizes ?? [], [activeColor]);
  const [size, setSize] = useState(allowedSizes.includes("M") ? "M" : (allowedSizes[0] ?? "M"));
  const [qty, setQty] = useState(1);
  const heroImage = activeColor?.primary_image ?? gallery[0] ?? "";
  function pickColor(next: string) {
    setColor(next);
    const row = colors.find((c) => c.slug === next);
    if (row && !row.sizes.includes(size)) setSize(row.sizes.includes("M") ? "M" : (row.sizes[0] ?? size));
  }
  function add() {
    const raw = window.localStorage.getItem("ct-bag") ?? "[]";
    const bag = JSON.parse(raw) as BagLine[];
    const found = bag.find((row) => row.slug === slug && row.size === size && row.color === color);
    if (found) found.qty += qty;
    else bag.push({ slug, size, color, qty });
    window.localStorage.setItem("ct-bag", JSON.stringify(bag));
    window.dispatchEvent(new Event("ct-bag-updated"));
    window.dispatchEvent(new Event("ct-mini-cart-open"));
  }
  function checkout() {
    add();
    window.location.href = "/checkout";
  }
  const [checkoutNote, setCheckoutNote] = useState("");
  return (
    <div className="buy">
      <p className="kicker">Original tee</p>
      <h1>{title}</h1>
      <p className="price" style={{ fontSize: "1.35rem", fontWeight: 700 }}>\${priceUsd.toFixed(2)}</p>
      <p>{garmentSummary}</p>
      <p>Sizes {sizeRange}</p>
      <p id="color-label">Color: {activeColor?.display_name ?? color}</p>
      <div className="color-swatches" role="group" aria-labelledby="color-label">
        {colors.map((c) => (
          <button key={c.slug} type="button" className={\`color-swatch-btn \${color === c.slug ? "active" : ""}\`} aria-pressed={color === c.slug} onClick={() => pickColor(c.slug)} disabled={!c.sizes.length}>
            <span className="color-swatch-dot" style={{ background: c.swatch_hex }} aria-hidden />
            {c.display_name}
          </button>
        ))}
      </div>
      <p>Size</p>
      <div className="size-tiles" role="group" aria-label="Size">
        {allowedSizes.map((s) => (
          <button key={s} type="button" className={\`size-tile \${size === s ? "active" : ""}\`} onClick={() => setSize(s)}>{s}</button>
        ))}
      </div>
      <p><a href="#size-guide">Size guide</a></p>
      <label>Quantity <input type="number" min={1} max={5} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} /></label>
      <button className="cta" type="button" onClick={add}>Add to cart</button>
      <button className="cta" type="button" onClick={checkout} style={{ marginTop: "0.5rem", background: "#111" }}>Checkout</button>
      <p className="note">{shippingNote()}</p>
      {checkoutNote ? <p className="note">{checkoutNote}</p> : null}
    </div>
  );
}

function shippingNote() {
  return "Printed on demand after payment. Shipping cost and tax are calculated at checkout when live checkout is enabled.";
}
`,
    },
    {
      path: "app/checkout/success/page.tsx",
      content: `import Link from "next/link";
export default function CheckoutSuccessPage() {
  return (
    <article className="sheet">
      <h1>Order received</h1>
      <p>Payment confirmed. You will receive an email with your order reference and shipping summary.</p>
      <p>Optional: <Link href="/account/login">Create or sign in to your account</Link> for order history, tracking, and buy again.</p>
      <p><Link href="/shop">Back to shop</Link></p>
    </article>
  );
}
`,
    },
    {
      path: "app/checkout/cancel/page.tsx",
      content: `import Link from "next/link";
export default function CheckoutCancelPage() {
  return (
    <article className="sheet">
      <h1>Checkout canceled</h1>
      <p>Nothing was charged. Your bag is still saved in this browser.</p>
      <p><Link href="/cart">Return to cart</Link></p>
    </article>
  );
}
`,
    },
    {
      path: "lib/commerce-runtime-config.ts",
      content: `export const COMMERCE_RUNTIME = ${JSON.stringify(
        {
          venture_id: "club-throttle",
          retail_usd: CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
          canonical_slugs: CANONICAL_SLUGS,
          checkout_sizes: variantQc.SUPPORTED_SIZES,
          superseded_gelato_product_ids: [...CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS],
          merch: CLUB_THROTTLE_SEVEN_SHIRT_MERCH,
        },
        null,
        2,
      )} as const;
`,
    },
    ...clubThrottleIsolatedCommerceApiFiles(),
    ...clubThrottleRetailV2StorefrontFiles(),
    {
      path: "app/sitemap/page.tsx",
      content: `import Link from "next/link";
const ROUTES = ["/", "/shop", "/search", "/collections", "/cart", "/checkout/success", "/checkout/cancel", ...${JSON.stringify(SITEMAP_PRODUCT_ROUTES)}, "/suggest-a-design", "/journal", "/about", "/contact", "/privacy", "/terms"];
export default function SitemapPage() {
  return <article className="sheet"><h1>Sitemap</h1><ul>{ROUTES.map((href) => <li key={href}><Link href={href}>{href}</Link></li>)}</ul></article>;
}
`,
    },
    {
      path: "app/sitemap.ts",
      content: `import { canonicalSlugs } from "../lib/catalog";
export default function sitemap() {
  const base = "https://clubthrottle.com";
  const staticPaths = ["", "/shop", "/shop/sport-track", "/shop/adventure-dualsport", "/shop/garage-culture", "/shop/street-night", "/shop/bagger-cruiser", "/shop/all-tees", "/collections", "/cart", "/about", "/contact", "/suggest-a-design", "/journal", "/privacy", "/terms"];
  const productPaths = canonicalSlugs.map((slug) => \`/products/\${slug}\`);
  return [...staticPaths, ...productPaths].map((path) => ({ url: \`\${base}\${path}\` }));
}
`,
    },
  ];
}

function clubThrottleIsolatedCommerceApiFiles(): ComposedStorefrontFile[] {
  return [
    clubThrottleStorefrontPromotionResolveFile(),
    {
      path: "lib/commerce-health.ts",
      content: CLUB_THROTTLE_STOREFRONT_COMMERCE_HEALTH_MODULE,
    },
    {
      path: "lib/checkout-gate.ts",
      content: `export function clubThrottleLiveCheckoutEnabled(): boolean {
  if (process.env.CLUB_THROTTLE_GLOBAL_COMMERCE_KILL_SWITCH === "true") return false;
  if (process.env.CLUB_THROTTLE_VENTURE_COMMERCE_KILL_SWITCH === "true") return false;
  if (process.env.CLUB_THROTTLE_LIVE_CHECKOUT !== "ENABLED") return false;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
`,
    },
    {
      path: "app/api/checkout/route.ts",
      content: `import { NextResponse } from "next/server";
import Stripe from "stripe";
import { COMMERCE_RUNTIME } from "../../../lib/commerce-runtime-config";
import { clubThrottleLiveCheckoutEnabled } from "../../../lib/checkout-gate";
import { storefrontCatalog } from "../../../lib/storefront-commerce";
import { resolveClubThrottlePromotion } from "../../../lib/promotion-resolve";

type LineInput = { slug: string; size: string; quantity: number; color?: string };

function authoritativeLine(line: LineInput) {
  if (!(COMMERCE_RUNTIME.canonical_slugs as readonly string[]).includes(line.slug)) {
    return { ok: false as const, reason: "UNKNOWN_SKU" };
  }
  if (line.quantity < 1 || line.quantity > 5) return { ok: false as const, reason: "INVALID_QUANTITY" };
  const allowed = new Set(COMMERCE_RUNTIME.checkout_sizes as readonly string[]);
  if (!allowed.has(line.size)) return { ok: false as const, reason: "INVALID_VARIANT" };
  const garment_color = (line.color ?? "white").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(garment_color)) return { ok: false as const, reason: "INVALID_COLOR" };
  const product = storefrontCatalog.products.find((row) => row.slug === line.slug);
  const colorRow = product?.colors?.find((c) => c.slug === garment_color);
  if (!colorRow || !(colorRow.sizes as readonly string[]).includes(line.size)) {
    return { ok: false as const, reason: "UNSUPPORTED_COLOR_SIZE" };
  }
  const meta = COMMERCE_RUNTIME.merch.find((row) => row.slug === line.slug);
  if (!meta) return { ok: false as const, reason: "SKU_NOT_PUBLISHED" };
  return {
    ok: true as const,
    unit_amount: Math.round(COMMERCE_RUNTIME.retail_usd * 100),
    meta,
    size: line.size,
    garment_color,
    quantity: line.quantity,
  };
}

export async function POST(request: Request) {
  if (!clubThrottleLiveCheckoutEnabled()) {
    return NextResponse.json({
      checkout_available: false,
      live_checkout: false,
      message: "Checkout is not open yet. You can browse, pick your size, and save your bag.",
    });
  }
  const body = (await request.json()) as { lines?: LineInput[]; promotion_code?: string };
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const promotionCode = typeof body.promotion_code === "string" ? body.promotion_code.trim().toUpperCase() : "";
  if (!lines.length) return NextResponse.json({ error: "EMPTY_CART" }, { status: 400 });
  const resolved = lines.map(authoritativeLine).filter((row): row is Extract<typeof row, { ok: true }> => row.ok);
  if (resolved.length !== lines.length) {
    return NextResponse.json({ error: "CART_VALIDATION_FAILED" }, { status: 400 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  const origin = process.env.CLUB_THROTTLE_PUBLIC_ORIGIN ?? "https://clubthrottle.com";
  const automaticTax = process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED";
  const subtotalUsd = resolved.reduce((sum, row) => sum + row.unit_amount * row.quantity, 0) / 100;
  let unitDiscountCents = 0;
  let promoMeta: Record<string, string> = {};
  if (promotionCode) {
    const promo = resolveClubThrottlePromotion({
      public_code: promotionCode,
      retail_usd: COMMERCE_RUNTIME.retail_usd,
      line_count: resolved.reduce((n, row) => n + row.quantity, 0),
      subtotal_usd: subtotalUsd,
      garment_colors: resolved.map((row) => row.garment_color),
    });
    if (!promo.ok) {
      return NextResponse.json({ error: "PROMOTION_INVALID", reason: promo.reason }, { status: 400 });
    }
    unitDiscountCents = promo.unit_discount_cents;
    promoMeta = {
      promotion_id: promo.promotion_id,
      promotion_code: promo.public_code,
      discount_type: promo.discount_type,
    };
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: \`\${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url: \`\${origin}/checkout/cancel\`,
    shipping_address_collection: { allowed_countries: ["US", "CA"] },
    allow_promotion_codes: !promotionCode,
    ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
    line_items: resolved.map((row) => ({
      quantity: row.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.max(50, row.unit_amount - unitDiscountCents),
        product_data: {
          name: row.meta.title,
          metadata: {
            venture_id: COMMERCE_RUNTIME.venture_id,
            product_id: row.meta.product_id,
            slug: row.meta.slug,
            size: row.size,
            garment_color: row.garment_color,
            gelato_product_id: row.meta.gelato_product_id,
            ...promoMeta,
          },
        },
      },
    })),
    metadata: { venture_id: COMMERCE_RUNTIME.venture_id, ...(promotionCode ? { promotion_code: promotionCode } : {}) },
  } as Stripe.Checkout.SessionCreateParams);
  return NextResponse.json({ url: session.url, session_id: session.id });
}
`,
    },
    {
      path: "app/api/promotion/preview/route.ts",
      content: `import { NextResponse } from "next/server";
import { COMMERCE_RUNTIME } from "../../../../lib/commerce-runtime-config";
import { storefrontCatalog } from "../../../../lib/storefront-commerce";
import { resolveClubThrottlePromotion } from "../../../../lib/promotion-resolve";

type LineInput = { slug: string; size: string; quantity: number; color?: string };

export async function POST(request: Request) {
  const body = (await request.json()) as { lines?: LineInput[]; promotion_code?: string };
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const promotionCode = typeof body.promotion_code === "string" ? body.promotion_code.trim() : "";
  if (!promotionCode) return NextResponse.json({ ok: false, reason: "EMPTY_CODE" }, { status: 400 });
  if (!lines.length) return NextResponse.json({ ok: false, reason: "EMPTY_CART" }, { status: 400 });
  let subtotalUsd = 0;
  let lineCount = 0;
  const garmentColors: string[] = [];
  for (const line of lines) {
    if (!(COMMERCE_RUNTIME.canonical_slugs as readonly string[]).includes(line.slug)) {
      return NextResponse.json({ ok: false, reason: "UNKNOWN_SKU" }, { status: 400 });
    }
    const product = storefrontCatalog.products.find((row) => row.slug === line.slug);
    const garment_color = (line.color ?? "white").trim().toLowerCase();
    const colorRow = product?.colors?.find((c) => c.slug === garment_color);
    if (!colorRow || !(colorRow.sizes as readonly string[]).includes(line.size)) {
      return NextResponse.json({ ok: false, reason: "UNSUPPORTED_COLOR_SIZE" }, { status: 400 });
    }
    const qty = line.quantity < 1 ? 1 : Math.min(5, line.quantity);
    subtotalUsd += COMMERCE_RUNTIME.retail_usd * qty;
    lineCount += qty;
    for (let i = 0; i < qty; i += 1) garmentColors.push(garment_color);
  }
  const promo = resolveClubThrottlePromotion({
    public_code: promotionCode,
    retail_usd: COMMERCE_RUNTIME.retail_usd,
    line_count: lineCount,
    subtotal_usd: subtotalUsd,
    garment_colors: garmentColors,
  });
  if (!promo.ok) return NextResponse.json({ ok: false, reason: promo.reason });
  return NextResponse.json({
    ok: true,
    promotion_id: promo.promotion_id,
    public_code: promo.public_code,
    discount_usd: promo.discount_usd,
    subtotal_usd: subtotalUsd,
    estimated_total_usd: Math.max(0, subtotalUsd - promo.discount_usd),
  });
}
`,
    },
    {
      path: "app/api/webhooks/stripe/route.ts",
      content: `import { NextResponse } from "next/server";
import Stripe from "stripe";
import { persistPaidCheckoutEvent } from "../../../../lib/order-bridge";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const sessionObj = event.data.object as Stripe.Checkout.Session;
    const session = await stripe.checkout.sessions.retrieve(sessionObj.id, {
      expand: ["line_items.data.price.product"],
    });
    await persistPaidCheckoutEvent({ stripe_event_id: event.id, session });
  }
  return NextResponse.json({ received: true });
}
`,
    },
    {
      path: "lib/order-bridge.ts",
      content: `import type Stripe from "stripe";

function sanitizeCheckoutSession(session: Stripe.Checkout.Session) {
  const lineItems = session.line_items?.data ?? [];
  return {
    id: session.id,
    payment_intent:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    customer_email: session.customer_email,
    customer_details: session.customer_details,
    amount_total: session.amount_total,
    currency: session.currency,
    shipping_details: session.shipping_details ?? session.collected_information?.shipping_details,
    metadata: session.metadata ?? undefined,
    total_details: session.total_details,
    line_items: lineItems.map((li) => {
      const product =
        li.price && typeof li.price === "object" && li.price.product && typeof li.price.product === "object"
          ? li.price.product
          : null;
      const productMeta = product && "metadata" in product ? (product.metadata as Record<string, string>) : {};
      const lineMeta =
        li && typeof li === "object" && "metadata" in li && li.metadata && typeof li.metadata === "object"
          ? (li.metadata as Record<string, string>)
          : {};
      return {
        quantity: li.quantity ?? 1,
        description: li.description ?? null,
        metadata: { ...lineMeta, ...productMeta },
      };
    }),
  };
}

export async function persistPaidCheckoutEvent(input: {
  stripe_event_id: string;
  session: Stripe.Checkout.Session;
}): Promise<{ duplicate: boolean; internal_order_id?: string }> {
  const url = process.env.INFINITY_COMMERCE_BRIDGE_URL?.trim();
  const token = process.env.INFINITY_COMMERCE_BRIDGE_TOKEN?.trim();
  if (!url || !token) {
    console.info("[club-throttle] commerce bridge not configured; event acknowledged only", input.stripe_event_id);
    return { duplicate: false };
  }
  const session = sanitizeCheckoutSession(input.session);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
    body: JSON.stringify({ stripe_event_id: input.stripe_event_id, session }),
  });
  if (!response.ok) throw new Error("COMMERCE_BRIDGE_FAILED");
  return (await response.json()) as { duplicate: boolean; internal_order_id?: string };
}
`,
    },
    {
      path: "app/api/health/route.ts",
      content: `import { NextResponse } from "next/server";
import { resolveClubThrottleStorefrontCommerceHealth } from "../../../lib/commerce-health";
export async function GET() {
  const commerce = resolveClubThrottleStorefrontCommerceHealth();
  return NextResponse.json({
    ok: true,
    venture: "club-throttle",
    ...commerce,
    automatic_tax_env_enabled: process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED",
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
`,
    },
    {
      path: "app/api/commerce/tax-readiness/route.ts",
      content: `import { NextResponse } from "next/server";

async function stripeGet(path: string, secret: string) {
  const res = await fetch(\`https://api.stripe.com/v1\${path}\`, {
    headers: { Authorization: \`Bearer \${secret}\`, Accept: "application/json" },
  });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

export async function GET() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const appTax = process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED";
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }
  const settings = await stripeGet("/tax/settings", secret);
  const registrations = await stripeGet("/tax/registrations?limit=100", secret);
  const settingsStatus = typeof settings.json.status === "string" ? settings.json.status : "unknown";
  const regRows = Array.isArray(registrations.json.data) ? registrations.json.data : [];
  const collecting: string[] = [];
  let ohioCollecting = false;
  for (const row of regRows as Array<Record<string, unknown>>) {
    const country = String(row.country ?? "").toUpperCase();
    const state = String(row.state ?? "").toUpperCase();
    const status = String(row.status ?? "").toLowerCase();
    const label = state ? \`\${country}-\${state}\` : country;
    if (status === "active") {
      collecting.push(label);
      if (country === "US" && state === "OH") ohioCollecting = true;
    }
  }
  const ohioAttested = process.env.CLUB_THROTTLE_STRIPE_TAX_OHIO_COLLECTING === "CONFIRMED";
  if (!ohioCollecting && ohioAttested) {
    ohioCollecting = true;
    if (!collecting.includes("US-OH")) collecting.push("US-OH");
  }
  let checkoutAutomaticTax = false;
  if (secret.startsWith("sk_live") || secret.startsWith("rk_live")) {
    const origin = process.env.CLUB_THROTTLE_PUBLIC_ORIGIN?.trim() || "https://clubthrottle.com";
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", \`\${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}\`);
    body.set("cancel_url", \`\${origin}/checkout/cancel\`);
    body.set("automatic_tax[enabled]", "true");
    body.set("shipping_address_collection[allowed_countries][0]", "US");
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "usd");
    body.set("line_items[0][price_data][unit_amount]", "4200");
    body.set("line_items[0][price_data][product_data][name]", "Club Throttle tax probe");
    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: \`Bearer \${secret}\`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const sessionJson = (await sessionRes.json().catch(() => ({}))) as Record<string, unknown>;
    const automaticTax = sessionJson.automatic_tax as { enabled?: boolean } | undefined;
    checkoutAutomaticTax = sessionRes.ok && automaticTax?.enabled === true;
  }
  const taxApiDenied = settings.status === 403 || registrations.status === 403;
  const registrationEvidenceTier = ohioCollecting
    ? taxApiDenied && ohioAttested
      ? "LEVEL_3_FOUNDER_PROVIDER_ATTESTATION"
      : "LEVEL_1_PROVIDER_API_PROOF"
    : ohioAttested
      ? "LEVEL_3_FOUNDER_PROVIDER_ATTESTATION"
      : taxApiDenied
        ? "LEVEL_4_CONFIG_ONLY"
        : "LEVEL_4_CONFIG_ONLY";
  return NextResponse.json({
    ok: true,
    automatic_tax_env_enabled: appTax,
    STRIPE_TAX_SETTINGS_STATUS: settingsStatus,
    STRIPE_TAX_COLLECTING_LOCATIONS: collecting,
    STRIPE_TAX_REGISTRATION_QC: ohioCollecting ? "PASS" : "FAIL",
    STRIPE_TAX_ACCOUNT_STATE: settingsStatus === "active" || ohioCollecting ? "ENABLED" : "AVAILABLE_NOT_ENABLED",
    STRIPE_AUTOMATIC_TAX_RUNTIME_CONFIG_QC: checkoutAutomaticTax ? "PASS" : "FAIL",
    STRIPE_TAX_EVIDENCE_TIER: registrationEvidenceTier,
    ohio_registration_attested: ohioAttested,
    stripe_tax_api_permission_denied: taxApiDenied,
    settings_http: settings.status,
    registrations_http: registrations.status,
  });
}
`,
    },
  ];
}

/** Paths removed from composed bundle when canonical seven replace legacy PDPs. */
export const CLUB_THROTTLE_LEGACY_PRODUCT_PAGE_PATHS = [
  "app/products/club-throttle-core-tee/page.tsx",
  "app/products/kickstands-up-tee/page.tsx",
] as const;

export function clubThrottleIsolatedVercelRedirectExtras(): Array<{ source: string; destination: string; permanent: boolean }> {
  return [
    { source: "/products/club-throttle-core-tee", destination: "/shop", permanent: true },
    { source: "/products/kickstands-up-tee", destination: "/shop", permanent: true },
  ];
}
