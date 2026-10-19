import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { CANONICAL_VARIANT_IDENTITY_V1_STOREFRONT_SOURCE } from "./canonical-variant-identity-v1.storefront-embed.ts";

const canonicalVariantIdentitySource = CANONICAL_VARIANT_IDENTITY_V1_STOREFRONT_SOURCE;

/** Retail V2 — authoritative cart, customer account surfaces, shared cart storage. */
export function clubThrottleRetailV2StorefrontFiles(): ComposedStorefrontFile[] {
  return [
    {
      path: "lib/canonical-variant-identity.ts",
      content: canonicalVariantIdentitySource,
    },
    {
      path: "lib/cart-storage.ts",
      content: `import { cartLineKey, normalizeGarmentColorSlug } from "./canonical-variant-identity";

export const CT_BAG_STORAGE_KEY = "ct-bag";
export const CT_BAG_UPDATED_EVENT = "ct-bag-updated";

export type CartLine = {
  slug: string;
  size: string;
  color: string;
  qty: number;
  variant_id: string;
};

function normalizeLine(row: Partial<CartLine> & { qty: number }): CartLine | null {
  if (!row.slug || !row.size || !(row.qty > 0)) return null;
  const color = normalizeGarmentColorSlug(row.color);
  const size = String(row.size).trim().toUpperCase();
  const slug = String(row.slug).trim();
  const variant_id = cartLineKey({ slug, size, color });
  return { slug, size, color, qty: row.qty, variant_id };
}

export function readCartLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CT_BAG_STORAGE_KEY) ?? "[]";
    const parsed = JSON.parse(raw) as Array<Partial<CartLine> & { qty: number }>;
    if (!Array.isArray(parsed)) return [];
    const out: CartLine[] = [];
    for (const row of parsed) {
      const norm = normalizeLine(row);
      if (norm) out.push(norm);
    }
    return out;
  } catch {
    return [];
  }
}

export function writeCartLines(lines: CartLine[]) {
  const normalized = lines.map((row) => normalizeLine(row)).filter((row): row is CartLine => row != null);
  window.localStorage.setItem(CT_BAG_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CT_BAG_UPDATED_EVENT));
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, row) => sum + row.qty, 0);
}

export function mergeCartLine(lines: CartLine[], line: Omit<CartLine, "variant_id"> & { qty: number }): CartLine[] {
  const incoming = normalizeLine(line);
  if (!incoming) return lines;
  const next = lines.map((r) => normalizeLine(r)).filter((r): r is CartLine => r != null);
  const found = next.find((row) => row.variant_id === incoming.variant_id);
  if (found) found.qty += incoming.qty;
  else next.push(incoming);
  return next;
}

export function updateCartLineQty(lines: CartLine[], index: number, delta: number): CartLine[] {
  const next = lines.map((row) => normalizeLine(row)).filter((r): r is CartLine => r != null);
  const row = next[index];
  if (!row) return lines;
  row.qty += delta;
  if (row.qty <= 0) next.splice(index, 1);
  return next;
}
`,
    },
    {
      path: "lib/customer-supabase-client.ts",
      content: `import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function customerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  if (!client) client = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
`,
    },
    {
      path: "lib/customer-session.ts",
      content: `"use client";
import { customerSupabase } from "./customer-supabase-client";

export async function getCustomerAccessToken(): Promise<string | null> {
  const supabase = customerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCustomerSessionEmail(): Promise<string | null> {
  const supabase = customerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signInCustomerMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const supabase = customerSupabase();
  if (!supabase) return { ok: false, message: "Customer sign-in is not configured yet." };
  const origin = window.location.origin;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: \`\${origin}/account\` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your email for a secure sign-in link." };
}

export async function signOutCustomer(): Promise<void> {
  const supabase = customerSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
`,
    },
    {
      path: "lib/customer-api.ts",
      content: `"use client";
import { getCustomerAccessToken } from "./customer-session";

async function customerFetch(path: string, init?: RequestInit) {
  const token = await getCustomerAccessToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", \`Bearer \${token}\`);
  return fetch(path, { ...init, headers });
}

export async function fetchCustomerOrders() {
  const res = await customerFetch("/api/customer/orders");
  if (res.status === 401) return { ok: false as const, orders: [] };
  const json = await res.json();
  return { ok: res.ok, orders: (json.orders ?? []) as Array<Record<string, unknown>> };
}

export async function fetchCustomerOrder(publicOrderId: string) {
  const res = await customerFetch(\`/api/customer/orders/\${encodeURIComponent(publicOrderId)}\`);
  if (res.status === 401 || res.status === 404) return null;
  return (await res.json()) as Record<string, unknown>;
}

export async function fetchBuyAgainRows() {
  const res = await customerFetch("/api/customer/buy-again");
  if (res.status === 401) return [];
  const json = await res.json();
  return (json.rows ?? []) as Array<Record<string, unknown>>;
}

export async function claimGuestOrder(input: { email: string; publicOrderId: string }) {
  const res = await customerFetch("/api/customer/claim-order", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (await res.json()) as { ok: boolean; message?: string };
}
`,
    },
    {
      path: "lib/club-throttle-order-rest.ts",
      content: `export type CtRest = { url: string; key: string };

export function clubThrottleSupabaseRest(): CtRest | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return { url: url.replace(/\\/$/, ""), key: key.trim() };
}

export async function ctRestGet(rest: CtRest, path: string): Promise<unknown> {
  const response = await fetch(\`\${rest.url}/rest/v1/\${path}\`, {
    headers: { apikey: rest.key, Authorization: \`Bearer \${rest.key}\` },
  });
  if (!response.ok) throw new Error(\`SUPABASE_READ_\${response.status}\`);
  return response.json();
}

export async function ctRestPatch(rest: CtRest, table: string, filterQuery: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(\`\${rest.url}/rest/v1/\${table}?\${filterQuery}\`, {
    method: "PATCH",
    headers: {
      apikey: rest.key,
      Authorization: \`Bearer \${rest.key}\`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(\`SUPABASE_PATCH_\${response.status}\`);
}
`,
    },
    {
      path: "lib/club-throttle-customer-orders.ts",
      content: `import { clubThrottleSupabaseRest, ctRestGet } from "./club-throttle-order-rest";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listCustomerOrdersByEmail(email: string) {
  const rest = clubThrottleSupabaseRest();
  if (!rest) return [];
  const rows = (await ctRestGet(
    rest,
    \`club_throttle_orders?customer_email=eq.\${encodeURIComponent(normalizeEmail(email))}&select=id,internal_order_id,created_at,total_usd,payment_status,fulfillment_status,tracking_url&order=created_at.desc\`,
  )) as Array<Record<string, unknown>> | null;
  if (!Array.isArray(rows)) return [];
  const summaries = [];
  for (const row of rows) {
    const publicId = String(row.internal_order_id ?? "");
    if (!publicId) continue;
    const items = (await ctRestGet(
      rest,
      \`club_throttle_order_items?order_id=eq.\${encodeURIComponent(String(row.id ?? ""))}&select=id\`,
    )) as unknown[] | null;
    summaries.push({
      public_order_id: publicId,
      order_date: String(row.created_at ?? ""),
      total_usd: Number(row.total_usd ?? 0),
      payment_status: String(row.payment_status ?? ""),
      fulfillment_status: String(row.fulfillment_status ?? ""),
      tracking_url: row.tracking_url ? String(row.tracking_url) : null,
      item_count: Array.isArray(items) ? items.length : 0,
    });
  }
  return summaries;
}

export async function getCustomerOrderByPublicId(email: string, publicOrderId: string) {
  const rest = clubThrottleSupabaseRest();
  if (!rest) return null;
  const orders = (await ctRestGet(
    rest,
    \`club_throttle_orders?internal_order_id=eq.\${encodeURIComponent(publicOrderId)}&customer_email=eq.\${encodeURIComponent(normalizeEmail(email))}&select=id,internal_order_id,created_at,total_usd,payment_status,fulfillment_status,tracking_url,tracking_number,carrier\`,
  )) as Array<Record<string, unknown>> | null;
  const order = Array.isArray(orders) ? orders[0] : null;
  if (!order) return null;
  const itemsRaw = (await ctRestGet(
    rest,
    \`club_throttle_order_items?order_id=eq.\${encodeURIComponent(String(order.id))}&select=slug,size,garment_color,quantity,unit_price_usd\`,
  )) as Array<Record<string, unknown>> | null;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((line) => ({
        slug: String(line.slug ?? ""),
        size: String(line.size ?? ""),
        garment_color: String(line.garment_color ?? "white"),
        quantity: Number(line.quantity ?? 0),
        unit_price_usd: Number(line.unit_price_usd ?? 0),
      }))
    : [];
  return {
    public_order_id: String(order.internal_order_id),
    order_date: String(order.created_at ?? ""),
    total_usd: Number(order.total_usd ?? 0),
    payment_status: String(order.payment_status ?? ""),
    fulfillment_status: String(order.fulfillment_status ?? ""),
    tracking_url: order.tracking_url ? String(order.tracking_url) : null,
    carrier: order.carrier ? String(order.carrier) : null,
    tracking_number: order.tracking_number ? String(order.tracking_number) : null,
    item_count: items.length,
    items,
  };
}
`,
    },
    {
      path: "lib/customer-order-server.ts",
      content: `import { createClient } from "@supabase/supabase-js";

export function customerServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function resolveCustomerEmailFromAuthHeader(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice("Bearer ".length).trim();
  const supabase = customerServiceSupabase();
  if (!supabase || !jwt) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user?.email) return null;
  return data.user.email.trim().toLowerCase();
}
`,
    },
    {
      path: "app/cart/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { productBySlug, retailUsd } from "../../lib/catalog";
import { productBySlug as storefrontProduct } from "../../lib/storefront-commerce";
import {
  cartItemCount,
  CT_BAG_UPDATED_EVENT,
  readCartLines,
  updateCartLineQty,
  writeCartLines,
  type CartLine,
} from "../../lib/cart-storage";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    setMounted(true);
    const sync = () => setLines(readCartLines());
    sync();
    window.addEventListener(CT_BAG_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CT_BAG_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  function persist(next: CartLine[]) {
    writeCartLines(next);
    setLines(next);
  }
  function remove(idx: number) {
    persist(lines.filter((_, i) => i !== idx));
  }
  function changeQty(idx: number, delta: number) {
    persist(updateCartLineQty(lines, idx, delta));
  }
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoNote, setPromoNote] = useState("");
  const [discountUsd, setDiscountUsd] = useState(0);
  const [promoApplying, setPromoApplying] = useState(false);
  const subtotal = lines.reduce((sum, row) => {
    const p = productBySlug(row.slug);
    return sum + (p?.price_usd ?? retailUsd) * row.qty;
  }, 0);
  const estimatedTotal = Math.max(0, subtotal - discountUsd);
  function promoMessage(reason: string): string {
    if (reason === "MIN_SUBTOTAL") return "This code requires at least one full-price tee at the current retail price.";
    if (reason === "EXPIRED") return "That promotion has expired.";
    if (reason === "UNKNOWN_CODE") return "That code is not recognized.";
    if (reason === "MARGIN_FLOOR") return "That code cannot be applied to this cart.";
    return "That code is not valid for this cart.";
  }
  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setAppliedPromo("");
      setDiscountUsd(0);
      setPromoNote("");
      return;
    }
    setPromoApplying(true);
    setPromoNote("");
    try {
      const response = await fetch("/api/promotion/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((row) => ({ slug: row.slug, size: row.size, color: row.color ?? "white", quantity: row.qty })),
          promotion_code: code,
        }),
      });
      const json = await response.json();
      if (json.ok) {
        setAppliedPromo(json.public_code ?? code.toUpperCase());
        setDiscountUsd(Number(json.discount_usd) || 0);
        setPromoNote(\`Code \${json.public_code} applied — you save $\${(Number(json.discount_usd) || 0).toFixed(2)}.\`);
      } else {
        setAppliedPromo("");
        setDiscountUsd(0);
        setPromoNote(promoMessage(String(json.reason ?? "INVALID")));
      }
    } finally {
      setPromoApplying(false);
    }
  }
  function clearPromo() {
    setPromoInput("");
    setAppliedPromo("");
    setDiscountUsd(0);
    setPromoNote("");
  }
  function checkout() {
    if (lines.length < 1) return;
    const code = (appliedPromo || promoInput.trim()).toUpperCase();
    if (code) window.sessionStorage.setItem("ct-checkout-promo", code);
    else window.sessionStorage.removeItem("ct-checkout-promo");
    window.location.href = "/checkout";
  }
  return (
    <article className="sheet cart-page" data-cart-route="/cart" data-cart-promo-field="visible">
      <h1>Cart</h1>
      <p className="note" data-cart-promo-hint="static">Promo and coupon codes are entered on this page before checkout.</p>
      {!mounted ? (
        <p>Loading your cart…</p>
      ) : lines.length < 1 ? (
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <p><Link className="cta" href="/shop">Shop tees</Link></p>
          <div className="cart-summary" data-cart-promo-field="visible" style={{ marginTop: "1.25rem" }}>
            <div className="cart-promo-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>
              <label className="note" style={{ flex: "1 1 12rem" }}>
                Promo / coupon code
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter code"
                  autoComplete="off"
                  style={{ display: "block", marginTop: "0.25rem", width: "100%", maxWidth: "16rem" }}
                />
              </label>
              <button type="button" className="cta" style={{ background: "#333" }} disabled>
                Apply
              </button>
            </div>
            <p className="note">Add a tee to your cart, then apply a code before checkout.</p>
          </div>
        </div>
      ) : (
        <>
          {lines.map((row, idx) => {
            const p = productBySlug(row.slug);
            const store = storefrontProduct(row.slug);
            if (!p) return null;
            const colorRow = store?.colors?.find((c) => c.slug === (row.color ?? "white"));
            const unit = p.price_usd ?? retailUsd;
            const thumb = colorRow?.primary_image ?? store?.primary_image ?? p.primary_image;
            const colorLabel = colorRow?.display_name ?? (row.color === "black" ? "Black" : row.color === "ash" ? "Ash" : "White");
            return (
              <div
                className="cart-line"
                key={row.variant_id}
                data-cart-line
                data-cart-variant-id={row.variant_id}
                data-cart-line-color={row.color}
              >
                <img src={thumb} alt="" />
                <div>
                  <h2>{p.title}</h2>
                  <p data-cart-line-identity>
                    Color: {colorLabel} · Size {row.size}
                  </p>
                  <p className="price">\${unit.toFixed(2)} each</p>
                  <div className="cart-line-actions">
                    <span>Qty</span>
                    <button type="button" aria-label="Decrease quantity" onClick={() => changeQty(idx, -1)}>−</button>
                    <span>{row.qty}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => changeQty(idx, 1)}>+</button>
                    <span>Line \${(unit * row.qty).toFixed(2)}</span>
                    <button type="button" onClick={() => remove(idx)}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="cart-summary" data-cart-promo-field="visible">
            <p><strong>Subtotal:</strong> \${subtotal.toFixed(2)}</p>
            {discountUsd > 0 ? <p><strong>Promotion:</strong> −\${discountUsd.toFixed(2)}{appliedPromo ? \` (\${appliedPromo})\` : ""}</p> : null}
            <p><strong>Estimated total:</strong> \${estimatedTotal.toFixed(2)}</p>
            <div className="cart-promo-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.75rem" }}>
              <label className="note" style={{ flex: "1 1 12rem" }}>
                Promo / coupon code
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); if (appliedPromo) clearPromo(); }}
                  placeholder="Enter code"
                  autoComplete="off"
                  style={{ display: "block", marginTop: "0.25rem", width: "100%", maxWidth: "16rem" }}
                />
              </label>
              <button type="button" className="cta" style={{ background: "#333" }} disabled={promoApplying || lines.length < 1} onClick={applyPromo}>
                {promoApplying ? "Applying…" : "Apply"}
              </button>
              {appliedPromo ? (
                <button type="button" onClick={clearPromo}>Remove</button>
              ) : null}
            </div>
            {promoNote ? <p className="note" role="status">{promoNote}</p> : null}
            <p className="note">Shipping and applicable tax calculated at checkout. Discounts are validated on the server.</p>
            <button className="cta" type="button" onClick={checkout}>Proceed to checkout</button>
          </div>
        </>
      )}
      <p className="note" style={{ marginTop: "1rem" }}>{cartItemCount(lines)} item{cartItemCount(lines) === 1 ? "" : "s"} in cart</p>
    </article>
  );
}
`,
    },
    {
      path: "app/account/login/page.tsx",
      content: `"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { signInCustomerMagicLink } from "../../../lib/customer-session";

export default function AccountLoginPage() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await signInCustomerMagicLink(email);
    setNote(result.message);
  }
  return (
    <article className="sheet account-shell">
      <h1>Account</h1>
      <p>Sign in to view orders and buy again. Guest checkout stays available — no account required to purchase.</p>
      <form onSubmit={onSubmit}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <p><button className="cta" type="submit">Email me a sign-in link</button></p>
      </form>
      {note ? <p>{note}</p> : null}
      <p><Link href="/shop">Continue shopping</Link></p>
    </article>
  );
}
`,
    },
    {
      path: "app/account/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCustomerOrders } from "../../lib/customer-api";
import { getCustomerSessionEmail, signOutCustomer } from "../../lib/customer-session";

export default function AccountHomePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void (async () => {
      const sessionEmail = await getCustomerSessionEmail();
      setEmail(sessionEmail);
      if (sessionEmail) {
        const res = await fetchCustomerOrders();
        if (res.ok) setOrders(res.orders.slice(0, 3));
      }
    })();
  }, []);
  if (!email) {
    return (
      <article className="sheet account-shell">
        <h1>Account</h1>
        <p>Sign in to access order history and buy again.</p>
        <p><Link className="cta" href="/account/login">Sign in</Link></p>
      </article>
    );
  }
  return (
    <article className="sheet account-shell">
      <h1>Account</h1>
      <p>Signed in as {email}</p>
      <p><Link href="/account/orders">View all orders</Link> · <Link href="/account/buy-again">Buy again</Link></p>
      <h2>Recent orders</h2>
      {orders.length < 1 ? <p>No orders linked to this account yet.</p> : (
        <ul className="account-list">
          {orders.map((order) => (
            <li key={String(order.public_order_id)}>
              <Link href={\`/account/orders/\${String(order.public_order_id)}\`}>{String(order.public_order_id)}</Link>
              {" · "}{String(order.order_date).slice(0, 10)} · \${Number(order.total_usd ?? 0).toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      <p><button type="button" onClick={() => void signOutCustomer()}>Sign out</button></p>
    </article>
  );
}
`,
    },
    {
      path: "app/account/orders/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCustomerOrders } from "../../../lib/customer-api";
import { getCustomerSessionEmail } from "../../../lib/customer-session";

export default function AccountOrdersPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void (async () => {
      const sessionEmail = await getCustomerSessionEmail();
      setEmail(sessionEmail);
      if (!sessionEmail) return;
      const res = await fetchCustomerOrders();
      if (res.ok) setOrders(res.orders);
    })();
  }, []);
  if (!email) {
    return (
      <article className="sheet account-shell">
        <h1>Orders</h1>
        <p><Link href="/account/login">Sign in</Link> to view your orders. Guest checkout does not require an account.</p>
      </article>
    );
  }
  return (
    <article className="sheet account-shell">
      <h1>Orders</h1>
      {orders.length < 1 ? <p>No orders for this account yet.</p> : (
        <ul className="account-list">
          {orders.map((order) => (
            <li key={String(order.public_order_id)}>
              <Link href={\`/account/orders/\${String(order.public_order_id)}\`}>{String(order.public_order_id)}</Link>
              <p>{String(order.order_date).slice(0, 10)} · {String(order.payment_status)} · {String(order.fulfillment_status)} · \${Number(order.total_usd ?? 0).toFixed(2)}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
`,
    },
    {
      path: "app/account/orders/[publicId]/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchCustomerOrder } from "../../../../lib/customer-api";
import { getCustomerSessionEmail } from "../../../../lib/customer-session";

export default function AccountOrderDetailPage() {
  const params = useParams<{ publicId: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    void (async () => {
      const sessionEmail = await getCustomerSessionEmail();
      setEmail(sessionEmail);
      if (!sessionEmail) return;
      const detail = await fetchCustomerOrder(params.publicId);
      setOrder(detail);
    })();
  }, [params.publicId]);
  if (!email) {
    return (
      <article className="sheet account-shell">
        <h1>Order</h1>
        <p><Link href="/account/login">Sign in</Link> to view this order.</p>
      </article>
    );
  }
  if (!order) {
    return (
      <article className="sheet account-shell">
        <h1>Order</h1>
        <p>Order not found or not linked to your account.</p>
      </article>
    );
  }
  const items = (order.items ?? []) as Array<Record<string, unknown>>;
  return (
    <article className="sheet account-shell">
      <h1>Order {String(order.public_order_id)}</h1>
      <p>{String(order.order_date).slice(0, 10)} · {String(order.payment_status)} · {String(order.fulfillment_status)}</p>
      <ul className="account-list">
        {items.map((line, idx) => (
          <li key={idx}>{String(line.slug)} · {String(line.garment_color)} · {String(line.size)} × {String(line.quantity)}</li>
        ))}
      </ul>
      {order.tracking_url ? <p><a href={String(order.tracking_url)} rel="noreferrer">Tracking</a></p> : null}
      <p><Link href="/account/orders">Back to orders</Link></p>
    </article>
  );
}
`,
    },
    {
      path: "app/account/buy-again/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchBuyAgainRows } from "../../../lib/customer-api";
import { getCustomerSessionEmail } from "../../../lib/customer-session";
import { mergeCartLine, readCartLines, writeCartLines } from "../../../lib/cart-storage";

export default function BuyAgainPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void (async () => {
      const sessionEmail = await getCustomerSessionEmail();
      setEmail(sessionEmail);
      if (!sessionEmail) return;
      setRows(await fetchBuyAgainRows());
    })();
  }, []);
  function add(row: Record<string, unknown>) {
    if (row.status !== "AVAILABLE") return;
    const next = mergeCartLine(readCartLines(), {
      slug: String(row.slug),
      size: String(row.size),
      color: String(row.color),
      qty: 1,
    });
    writeCartLines(next);
    window.location.href = "/cart";
  }
  if (!email) {
    return (
      <article className="sheet account-shell">
        <h1>Buy again</h1>
        <p><Link href="/account/login">Sign in</Link> to reorder from your purchase history.</p>
      </article>
    );
  }
  return (
    <article className="sheet account-shell">
      <h1>Buy again</h1>
      {rows.length < 1 ? <p>No prior purchases to reorder yet.</p> : (
        <ul className="account-list">
          {rows.map((row, idx) => (
            <li key={idx}>
              <strong>{String(row.title ?? row.slug)}</strong>
              <p>{String(row.color_label)} · {String(row.size)} · \${Number(row.current_price_usd ?? 0).toFixed(2)}</p>
              {row.status === "AVAILABLE" ? (
                <button type="button" className="cta" onClick={() => add(row)}>Add to cart</button>
              ) : (
                <p>This exact option is no longer available. <Link href={\`/products/\${String(row.slug)}\`}>View current product</Link></p>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
`,
    },
    {
      path: "app/api/customer/orders/route.ts",
      content: `import { NextResponse } from "next/server";
import { listCustomerOrdersByEmail } from "../../../../lib/club-throttle-customer-orders";
import { resolveCustomerEmailFromAuthHeader } from "../../../../lib/customer-order-server";

export async function GET(request: Request) {
  const email = await resolveCustomerEmailFromAuthHeader(request.headers.get("authorization"));
  if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const orders = await listCustomerOrdersByEmail(email);
  return NextResponse.json({ orders });
}
`,
    },
    {
      path: "app/api/customer/orders/[publicId]/route.ts",
      content: `import { NextResponse } from "next/server";
import { getCustomerOrderByPublicId } from "../../../../../lib/club-throttle-customer-orders";
import { resolveCustomerEmailFromAuthHeader } from "../../../../../lib/customer-order-server";

export async function GET(request: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const email = await resolveCustomerEmailFromAuthHeader(request.headers.get("authorization"));
  if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { publicId } = await ctx.params;
  const order = await getCustomerOrderByPublicId(email, publicId);
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(order);
}
`,
    },
    {
      path: "app/api/customer/buy-again/route.ts",
      content: `import { NextResponse } from "next/server";
import { COMMERCE_RUNTIME } from "../../../../lib/commerce-runtime-config";
import { storefrontCatalog } from "../../../../lib/storefront-commerce";
import { getCustomerOrderByPublicId, listCustomerOrdersByEmail } from "../../../../lib/club-throttle-customer-orders";
import { resolveCustomerEmailFromAuthHeader } from "../../../../lib/customer-order-server";

export async function GET(request: Request) {
  const email = await resolveCustomerEmailFromAuthHeader(request.headers.get("authorization"));
  if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const orders = await listCustomerOrdersByEmail(email);
  const sizes = new Set(COMMERCE_RUNTIME.checkout_sizes as readonly string[]);
  const slugs = new Set(COMMERCE_RUNTIME.canonical_slugs as readonly string[]);
  const rows: Array<Record<string, unknown>> = [];
  for (const summary of orders.slice(0, 20)) {
    const detail = await getCustomerOrderByPublicId(email, summary.public_order_id);
    if (!detail) continue;
    for (const line of detail.items) {
      const product = storefrontCatalog.products.find((p) => p.slug === line.slug);
      const colorOk = Boolean(
        product?.colors?.some((c) => c.slug === String(line.garment_color ?? "white").toLowerCase()),
      );
      const sizeOk = sizes.has(line.size);
      const slugOk = slugs.has(line.slug);
      rows.push({
        slug: line.slug,
        title: line.slug,
        size: line.size,
        color: line.garment_color,
        color_label: line.garment_color,
        current_price_usd: COMMERCE_RUNTIME.retail_usd,
        status: colorOk && sizeOk && slugOk ? "AVAILABLE" : "UNAVAILABLE",
      });
    }
  }
  return NextResponse.json({ rows });
}
`,
    },
    {
      path: "app/api/customer/claim-order/route.ts",
      content: `import { NextResponse } from "next/server";
import { clubThrottleSupabaseRest, ctRestGet, ctRestPatch } from "../../../../lib/club-throttle-order-rest";
import { resolveCustomerEmailFromAuthHeader } from "../../../../lib/customer-order-server";

export async function POST(request: Request) {
  const sessionEmail = await resolveCustomerEmailFromAuthHeader(request.headers.get("authorization"));
  if (!sessionEmail) return NextResponse.json({ ok: false, message: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as { email?: string; publicOrderId?: string };
  const claimEmail = (body.email ?? "").trim().toLowerCase();
  const publicOrderId = (body.publicOrderId ?? "").trim();
  if (!claimEmail || !publicOrderId) return NextResponse.json({ ok: false, message: "Missing fields" }, { status: 400 });
  if (claimEmail !== sessionEmail) {
    return NextResponse.json({ ok: false, message: "Order email must match signed-in account" }, { status: 403 });
  }
  const rest = clubThrottleSupabaseRest();
  if (!rest) return NextResponse.json({ ok: false, message: "Order database unavailable" }, { status: 503 });
  const rows = (await ctRestGet(
    rest,
    \`club_throttle_orders?internal_order_id=eq.\${encodeURIComponent(publicOrderId)}&customer_email=eq.\${encodeURIComponent(claimEmail)}&select=id\`,
  )) as Array<{ id?: string }> | null;
  if (!Array.isArray(rows) || !rows[0]?.id) {
    return NextResponse.json({ ok: false, message: "No matching guest order for this email" }, { status: 404 });
  }
  await ctRestPatch(rest, "club_throttle_orders", \`id=eq.\${encodeURIComponent(String(rows[0].id))}\`, { updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, message: "Order linked to your account" });
}
`,
    },
  ];
}
