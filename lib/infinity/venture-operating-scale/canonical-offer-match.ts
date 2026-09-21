import { CRE_VENTURE_ID, STRIPE_PRICING_VERSION } from "./constants";

export type CanonicalOfferMatchKind = "EXACT_EXISTING_MATCH" | "PARTIAL_MATCH" | "NO_MATCH" | "CONFLICTING_MATCH";

export type CanonicalOfferId = "professional" | "per_deal";

export type CanonicalOfferSpec = {
  offerId: CanonicalOfferId;
  name: "Professional" | "Per-deal";
  amount: number;
  currency: "usd";
  recurring: "year" | null;
};

export const CANONICAL_OFFER_SPECS: CanonicalOfferSpec[] = [
  { offerId: "professional", name: "Professional", amount: 29000, currency: "usd", recurring: "year" },
  { offerId: "per_deal", name: "Per-deal", amount: 14900, currency: "usd", recurring: null },
];

function metadataOf(row: Record<string, unknown>): Record<string, string> {
  const raw = row.metadata;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
  );
}

export function offerMetadataMatches(row: Record<string, unknown>, offerId: CanonicalOfferId): boolean {
  const meta = metadataOf(row);
  return (
    meta.infinity_venture_id === CRE_VENTURE_ID &&
    meta.infinity_offer_id === offerId &&
    meta.infinity_pricing_version === STRIPE_PRICING_VERSION
  );
}

export function classifyProductMatch(
  row: Record<string, unknown>,
  spec: CanonicalOfferSpec,
): CanonicalOfferMatchKind {
  const named = row.name === spec.name;
  const meta = offerMetadataMatches(row, spec.offerId);
  const otherOffer = metadataOf(row).infinity_offer_id;
  if (meta && named) return "EXACT_EXISTING_MATCH";
  if (meta && !named) return "CONFLICTING_MATCH";
  if (named && otherOffer && otherOffer !== spec.offerId) return "CONFLICTING_MATCH";
  if (named || (otherOffer === spec.offerId && metadataOf(row).infinity_venture_id === CRE_VENTURE_ID)) {
    return "PARTIAL_MATCH";
  }
  return "NO_MATCH";
}

export function classifyPriceMatch(
  row: Record<string, unknown>,
  spec: CanonicalOfferSpec,
): CanonicalOfferMatchKind {
  const amountOk = row.unit_amount === spec.amount;
  const currencyOk = String(row.currency ?? "").toLowerCase() === spec.currency;
  const recurring = row.recurring && typeof row.recurring === "object" ? (row.recurring as Record<string, unknown>) : null;
  const interval = typeof recurring?.interval === "string" ? recurring.interval : null;
  const billingOk = spec.recurring ? interval === spec.recurring : interval == null;
  const meta = offerMetadataMatches(row, spec.offerId);
  if (meta && amountOk && currencyOk && billingOk) return "EXACT_EXISTING_MATCH";
  if (meta && (!amountOk || !currencyOk || !billingOk)) return "CONFLICTING_MATCH";
  if ((amountOk && currencyOk && billingOk) || meta) return "PARTIAL_MATCH";
  return "NO_MATCH";
}

export function summarizeOfferMatches(
  products: Array<Record<string, unknown>>,
  prices: Array<Record<string, unknown>>,
  spec: CanonicalOfferSpec,
): {
  kind: CanonicalOfferMatchKind;
  product: Record<string, unknown> | null;
  price: Record<string, unknown> | null;
  conflicting: number;
} {
  const productKinds = products.map((row) => ({ row, kind: classifyProductMatch(row, spec) }));
  const priceKinds = prices.map((row) => ({ row, kind: classifyPriceMatch(row, spec) }));
  const conflicting =
    productKinds.filter((row) => row.kind === "CONFLICTING_MATCH").length +
    priceKinds.filter((row) => row.kind === "CONFLICTING_MATCH").length;
  const exactProducts = productKinds.filter((row) => row.kind === "EXACT_EXISTING_MATCH");
  const exactPrices = priceKinds.filter((row) => row.kind === "EXACT_EXISTING_MATCH");
  const partials =
    productKinds.some((row) => row.kind === "PARTIAL_MATCH") || priceKinds.some((row) => row.kind === "PARTIAL_MATCH");
  if (conflicting > 0 || exactProducts.length > 1 || exactPrices.length > 1) {
    return { kind: "CONFLICTING_MATCH", product: exactProducts[0]?.row ?? null, price: exactPrices[0]?.row ?? null, conflicting };
  }
  if (exactProducts.length === 1 && exactPrices.length === 1) {
    return { kind: "EXACT_EXISTING_MATCH", product: exactProducts[0]!.row, price: exactPrices[0]!.row, conflicting: 0 };
  }
  if (partials || exactProducts.length === 1 || exactPrices.length === 1) {
    return {
      kind: "PARTIAL_MATCH",
      product: exactProducts[0]?.row ?? productKinds.find((row) => row.kind === "PARTIAL_MATCH")?.row ?? null,
      price: exactPrices[0]?.row ?? priceKinds.find((row) => row.kind === "PARTIAL_MATCH")?.row ?? null,
      conflicting: 0,
    };
  }
  return { kind: "NO_MATCH", product: null, price: null, conflicting: 0 };
}
