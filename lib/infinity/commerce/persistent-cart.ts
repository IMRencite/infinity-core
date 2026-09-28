import { authorizeBrowserPrice } from "./imr-stripe-authority";
import { getCanonicalProduct, type CanonicalProductRecord } from "./canonical-product-inventory";

export type CommerceCartLine = {
  product_id: string;
  variant_id: string;
  size: string;
  color: string;
  quantity: number;
  browser_unit_price_usd: number;
};

export type PersistentCart = {
  cart_id: string;
  venture_id: string;
  account_id: string | null;
  guest_id: string | null;
  lines: CommerceCartLine[];
  saved_for_later: CommerceCartLine[];
  recently_viewed: string[];
  favorites: string[];
};

const carts = new Map<string, PersistentCart>();

function key(venture_id: string, owner: string): string {
  return `${venture_id}:${owner}`;
}

export function createPersistentCart(input: {
  venture_id: string;
  account_id?: string | null;
  guest_id?: string | null;
}): PersistentCart {
  const owner = input.account_id ?? input.guest_id ?? "guest";
  const cart: PersistentCart = {
    cart_id: `cart_${input.venture_id}_${owner}`,
    venture_id: input.venture_id,
    account_id: input.account_id ?? null,
    guest_id: input.guest_id ?? null,
    lines: [],
    saved_for_later: [],
    recently_viewed: [],
    favorites: [],
  };
  carts.set(key(input.venture_id, owner), cart);
  return cart;
}

export function getPersistentCart(venture_id: string, owner: string): PersistentCart | null {
  return carts.get(key(venture_id, owner)) ?? null;
}

export function mergeGuestCartIntoAccount(input: {
  venture_id: string;
  guest_id: string;
  account_id: string;
}): PersistentCart {
  const guest = carts.get(key(input.venture_id, input.guest_id));
  const account = carts.get(key(input.venture_id, input.account_id))
    ?? createPersistentCart({ venture_id: input.venture_id, account_id: input.account_id });
  if (guest) {
    account.lines.push(...guest.lines);
    account.saved_for_later.push(...guest.saved_for_later);
    account.recently_viewed = [...new Set([...guest.recently_viewed, ...account.recently_viewed])].slice(0, 12);
    carts.delete(key(input.venture_id, input.guest_id));
  }
  return account;
}

export function recordRecentlyViewed(cart: PersistentCart, product_id: string): PersistentCart {
  cart.recently_viewed = [product_id, ...cart.recently_viewed.filter((id) => id !== product_id)].slice(0, 12);
  return cart;
}

export function addLineToCart(cart: PersistentCart, line: CommerceCartLine): PersistentCart {
  cart.lines.push(line);
  return cart;
}

export function saveLineForLater(cart: PersistentCart, product_id: string): PersistentCart {
  const index = cart.lines.findIndex((row) => row.product_id === product_id);
  if (index < 0) return cart;
  const [line] = cart.lines.splice(index, 1);
  if (line) cart.saved_for_later.push(line);
  return cart;
}

export function buyAgainToCart(input: {
  cart: PersistentCart;
  product: CanonicalProductRecord;
  variant_id: string;
  size: string;
  color: string;
  quantity: number;
  browser_unit_price_usd: number;
}): { ok: boolean; charged: false; ordered: false; reason: string; cart: PersistentCart } {
  if (!input.product.published || !input.product.sellable || input.product.price_usd == null) {
    return { ok: false, charged: false, ordered: false, reason: "PRODUCT_NOT_SELLABLE", cart: input.cart };
  }
  const price = authorizeBrowserPrice({
    server_unit_price_usd: input.product.price_usd,
    browser_unit_price_usd: input.browser_unit_price_usd,
    quantity: input.quantity,
    currency: "usd",
    live_checkout: false,
  });
  if (!price.ok) {
    return { ok: false, charged: false, ordered: false, reason: price.reason, cart: input.cart };
  }
  input.cart.lines.push({
    product_id: input.product.product_id,
    variant_id: input.variant_id,
    size: input.size,
    color: input.color,
    quantity: input.quantity,
    browser_unit_price_usd: input.product.price_usd,
  });
  return { ok: true, charged: false, ordered: false, reason: "ADDED_TO_CART", cart: input.cart };
}

export function resolveCartLineFromInventory(venture_id: string, line: CommerceCartLine): {
  product: CanonicalProductRecord | null;
  price_ok: boolean;
} {
  const product = getCanonicalProduct(venture_id, line.product_id);
  if (!product || product.price_usd == null) return { product, price_ok: false };
  const price = authorizeBrowserPrice({
    server_unit_price_usd: product.price_usd,
    browser_unit_price_usd: line.browser_unit_price_usd,
    quantity: line.quantity,
    currency: "usd",
    live_checkout: false,
  });
  return { product, price_ok: price.ok };
}

export function resetPersistentCartsForTests(): void {
  carts.clear();
}
