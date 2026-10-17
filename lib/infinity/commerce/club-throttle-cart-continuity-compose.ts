import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";

export const PREMIUM_CART_CONTINUITY_STANDARD_V1 = "PREMIUM_CART_CONTINUITY_STANDARD_V1" as const;

/** Mini-cart + stay-on-PDP add-to-cart for composed Club Throttle storefront. */
export function clubThrottleCartContinuityStorefrontFiles(): ComposedStorefrontFile[] {
  return [
    {
      path: "lib/cart-continuity-events.ts",
      content: `export const CT_MINI_CART_OPEN_EVENT = "ct-mini-cart-open" as const;

export function openMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CT_MINI_CART_OPEN_EVENT));
}

export function closeMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ct-mini-cart-close"));
}
`,
    },
    {
      path: "app/components/mini-cart-drawer.tsx",
      content: `"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cartItemCount,
  CT_BAG_UPDATED_EVENT,
  readCartLines,
  type CartLine,
  updateCartLineQty,
  writeCartLines,
} from "../../lib/cart-storage";
import { CT_MINI_CART_OPEN_EVENT } from "../../lib/cart-continuity-events";
import { storefrontCatalog } from "../../lib/storefront-commerce";

function lineLabel(line: CartLine) {
  const product = storefrontCatalog.products.find((p) => p.slug === line.slug);
  const colorRow = product?.colors.find((c) => c.slug === line.color);
  return {
    title: product?.title ?? line.slug,
    colorLabel: colorRow?.display_name ?? line.color,
    priceUsd: product?.price_usd ?? storefrontCatalog.retail_usd,
  };
}

export function MiniCartDrawer() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [checkoutNote, setCheckoutNote] = useState("");
  const refresh = useCallback(() => setLines(readCartLines()), []);
  useEffect(() => {
    const onOpen = () => {
      refresh();
      setOpen(true);
      setCheckoutNote("");
    };
    const onClose = () => setOpen(false);
    window.addEventListener(CT_MINI_CART_OPEN_EVENT, onOpen);
    window.addEventListener("ct-mini-cart-close", onClose);
    window.addEventListener(CT_BAG_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(CT_MINI_CART_OPEN_EVENT, onOpen);
      window.removeEventListener("ct-mini-cart-close", onClose);
      window.removeEventListener(CT_BAG_UPDATED_EVENT, refresh);
    };
  }, [refresh]);
  const subtotal = useMemo(
    () => lines.reduce((sum, row) => sum + lineLabel(row).priceUsd * row.qty, 0),
    [lines],
  );
  function checkout() {
    if (lines.length < 1) return;
    setOpen(false);
    window.location.href = "/checkout";
  }
  function close() {
    setOpen(false);
  }
  if (!open) return null;
  return (
    <div className="mini-cart-backdrop" role="presentation" onClick={close}>
      <aside
        className="mini-cart-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mini-cart-head">
          <h2>Your bag</h2>
          <button type="button" className="mini-cart-close" aria-label="Close bag" onClick={close}>
            ×
          </button>
        </header>
        {lines.length < 1 ? (
          <p className="note">Your bag is empty.</p>
        ) : (
          <ul className="mini-cart-lines">
            {lines.map((row, index) => {
              const meta = lineLabel(row);
              return (
                <li key={row.variant_id}>
                  <div>
                    <strong>{meta.title}</strong>
                    <p className="note">
                      {meta.colorLabel} · {row.size} · Qty {row.qty}
                    </p>
                  </div>
                  <div className="mini-cart-line-actions">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => writeCartLines(updateCartLineQty(lines, index, -1))}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => writeCartLines(updateCartLineQty(lines, index, 1))}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mini-cart-subtotal">
          Subtotal ({cartItemCount(lines)} items): <strong>\${subtotal.toFixed(2)}</strong>
        </p>
        {checkoutNote ? <p className="note">{checkoutNote}</p> : null}
        <div className="mini-cart-actions">
          <button type="button" className="cta" disabled={lines.length < 1} onClick={() => void checkout()}>
            Checkout
          </button>
          <Link className="cta secondary" href="/cart" onClick={close}>
            View full cart
          </Link>
          <button type="button" className="linkish" onClick={close}>
            Continue shopping
          </button>
        </div>
      </aside>
    </div>
  );
}
`,
    },
    {
      path: "app/components/cart-continuity-shell.tsx",
      content: `"use client";
import { MiniCartDrawer } from "./mini-cart-drawer";
export function CartContinuityShell() {
  return <MiniCartDrawer />;
}
`,
    },
  ];
}
