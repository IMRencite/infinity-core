import { CRE_VENTURE_ID } from "./constants";

export type OccupancynpvStripeOfferId = "PROFESSIONAL" | "PER_DEAL";

export type OccupancynpvStripeOfferSpec = {
  offer: OccupancynpvStripeOfferId;
  name: string;
  aliasNames: string[];
  legacyOfferId: "professional" | "per_deal";
  description: string;
  amount: number;
  currency: "usd";
  recurring: "year" | null;
  intervalCount: 1 | null;
};

export const OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS: OccupancynpvStripeOfferSpec[] = [
  {
    offer: "PROFESSIONAL",
    name: "OccupancyNPV Professional",
    aliasNames: ["OccupancyNPV Professional", "Professional"],
    legacyOfferId: "professional",
    description: "Professional annual access to OccupancyNPV.",
    amount: 29000,
    currency: "usd",
    recurring: "year",
    intervalCount: 1,
  },
  {
    offer: "PER_DEAL",
    name: "OccupancyNPV Per-Deal",
    aliasNames: ["OccupancyNPV Per-Deal", "Per-Deal", "Per-deal"],
    legacyOfferId: "per_deal",
    description: "Single-deal access to OccupancyNPV.",
    amount: 14900,
    currency: "usd",
    recurring: null,
    intervalCount: null,
  },
];

function metadataOf(row: Record<string, unknown>): Record<string, string> {
  const raw = row.metadata;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
  );
}

function conflictingVenture(meta: Record<string, string>): boolean {
  if (meta.infinity_venture && meta.infinity_venture !== "occupancynpv") return true;
  if (meta.infinity_venture_id && meta.infinity_venture_id !== CRE_VENTURE_ID) return true;
  return false;
}

export function isCanonicalOccupancynpvProduct(row: Record<string, unknown>, spec: OccupancynpvStripeOfferSpec): boolean {
  if (row.active === false) return false;
  const meta = metadataOf(row);
  if (conflictingVenture(meta)) return false;
  if (meta.infinity_venture === "occupancynpv" && meta.infinity_offer === spec.offer) return true;
  if (meta.infinity_venture_id === CRE_VENTURE_ID && meta.infinity_offer_id === spec.legacyOfferId) return true;
  return spec.aliasNames.includes(String(row.name ?? ""));
}

export function priceBillingMatches(row: Record<string, unknown>, spec: OccupancynpvStripeOfferSpec): boolean {
  if (row.unit_amount !== spec.amount) return false;
  if (String(row.currency ?? "").toLowerCase() !== spec.currency) return false;
  const recurring = row.recurring && typeof row.recurring === "object" ? (row.recurring as Record<string, unknown>) : null;
  const interval = typeof recurring?.interval === "string" ? recurring.interval : null;
  const count = typeof recurring?.interval_count === "number" ? recurring.interval_count : interval ? 1 : null;
  if (spec.recurring) return interval === spec.recurring && count === spec.intervalCount;
  return interval == null;
}

export function isCanonicalOccupancynpvPrice(
  row: Record<string, unknown>,
  spec: OccupancynpvStripeOfferSpec,
  productId?: string | null,
): boolean {
  if (row.active === false) return false;
  if (!priceBillingMatches(row, spec)) return false;
  const meta = metadataOf(row);
  if (conflictingVenture(meta)) return false;
  if (meta.infinity_venture === "occupancynpv" && meta.infinity_offer === spec.offer) return true;
  if (meta.infinity_venture_id === CRE_VENTURE_ID && meta.infinity_offer_id === spec.legacyOfferId) return true;
  return Boolean(productId && row.product === productId);
}

export function findCanonicalOccupancynpvObjects(
  products: Array<Record<string, unknown>>,
  prices: Array<Record<string, unknown>>,
  spec: OccupancynpvStripeOfferSpec,
): {
  products: Array<Record<string, unknown>>;
  prices: Array<Record<string, unknown>>;
  product: Record<string, unknown> | null;
  price: Record<string, unknown> | null;
  conflicting: boolean;
} {
  const matchedProducts = products.filter((row) => isCanonicalOccupancynpvProduct(row, spec));
  const product = matchedProducts[0] ?? null;
  const productId = typeof product?.id === "string" ? product.id : null;
  const matchedPrices = prices.filter((row) => isCanonicalOccupancynpvPrice(row, spec, productId));
  return {
    products: matchedProducts,
    prices: matchedPrices,
    product,
    price: matchedPrices[0] ?? null,
    conflicting: matchedProducts.length > 1 || matchedPrices.length > 1,
  };
}
